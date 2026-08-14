// panel-agent: systemd socket-activated REST/SSE API for l7v-panel.
// Communicates with the frontend via a Unix socket.
// Phase 2 will add JWT RS256 authentication via SOPS-managed keys.
package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"

	"github.com/coreos/go-systemd/v22/activation"
	"github.com/l7v/panel-agent/internal/api"
	"github.com/l7v/panel-agent/internal/audio"
	agentdbus "github.com/l7v/panel-agent/internal/dbus"
	"github.com/l7v/panel-agent/internal/display"
	"github.com/l7v/panel-agent/internal/hardware"
	"github.com/l7v/panel-agent/internal/journal"
	"github.com/l7v/panel-agent/internal/metrics"
	"github.com/l7v/panel-agent/internal/nixos"
	"github.com/l7v/panel-agent/internal/security"
	"github.com/l7v/panel-agent/internal/storage"
	"github.com/l7v/panel-agent/internal/terminal"
)

// version is injected at build time via -ldflags "-X main.version=<ver>"
var version = "dev"

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	// Read metric thresholds from environment (injected by the NixOS module).
	thresholds := metrics.Thresholds{
		CPUWarnPct:  envInt("PANEL_CPU_WARN", 70),
		CPUCritPct:  envInt("PANEL_CPU_CRIT", 90),
		RAMWarnPct:  envInt("PANEL_RAM_WARN", 80),
		RAMCritPct:  envInt("PANEL_RAM_CRIT", 95),
		DiskWarnPct: envInt("PANEL_DISK_WARN", 80),
		DiskCritPct: envInt("PANEL_DISK_CRIT", 90),
	}

	// Receive listener from systemd socket activation (sd_listen_fds).
	// Falls back to manual Unix socket and TCP for local development.
	var listeners []net.Listener
	sdListeners, err := activation.Listeners()
	if err == nil && len(sdListeners) > 0 {
		listeners = sdListeners
		logger.Info("using systemd socket activation")
	} else if devMode() {
		// In dev mode, listen on BOTH Unix socket (for Next.js dev server proxy)
		// AND TCP (for browser WebSockets)
		sockPath := "/tmp/panel-agent-dev.sock"
		_ = os.Remove(sockPath)
		unixLn, err := net.Listen("unix", sockPath)
		if err != nil {
			logger.Error("listen unix failed", "path", sockPath, "err", err)
			os.Exit(1)
		}
		listeners = append(listeners, unixLn)
		logger.Info("listening on Unix socket", "path", sockPath)

		tcpAddr := os.Getenv("PANEL_LISTEN_ADDR")
		if tcpAddr == "" {
			tcpAddr = "127.0.0.1:8080"
		}
		tcpLn, err := net.Listen("tcp", tcpAddr)
		if err != nil {
			logger.Warn("listen tcp failed in dev mode", "addr", tcpAddr, "err", err)
		} else {
			listeners = append(listeners, tcpLn)
			logger.Info("listening on TCP", "addr", tcpAddr)
		}
	} else if tcpAddr := os.Getenv("PANEL_LISTEN_ADDR"); tcpAddr != "" {
		tcpLn, err := net.Listen("tcp", tcpAddr)
		if err != nil {
			logger.Error("listen tcp failed", "addr", tcpAddr, "err", err)
			os.Exit(1)
		}
		listeners = append(listeners, tcpLn)
		logger.Info("listening on TCP", "addr", tcpAddr)
	} else {
		sockPath := "/run/panel-agent/panel-agent.sock"
		ln, err := net.Listen("unix", sockPath)
		if err != nil {
			logger.Error("listen failed", "path", sockPath, "err", err)
			os.Exit(1)
		}
		listeners = append(listeners, ln)
		logger.Info("listening on Unix socket", "path", sockPath)
	}

	// Wire real implementations (D-Bus clients, procfs reader, journal reader).
	systemd, err := agentdbus.NewSystemdClient()
	if err != nil {
		logger.Warn("systemd D-Bus unavailable at startup", "err", err)
		systemd = &stubSystemd{}
	}
	logind, err := agentdbus.NewLogindClient()
	if err != nil {
		logger.Warn("logind D-Bus unavailable at startup", "err", err)
		logind = &stubLogind{}
	}
	network, err := agentdbus.NewNetworkClient()
	if err != nil {
		logger.Warn("NetworkManager D-Bus unavailable at startup", "err", err)
		network = &stubNetwork{}
	}
	bluetooth, err := agentdbus.NewBluetoothClient()
	if err != nil {
		logger.Warn("BlueZ D-Bus unavailable at startup", "err", err)
		bluetooth = &stubBluetooth{}
	}

	termManager := terminal.NewSessionManager(logger)

	deps := api.Deps{
		Systemd:          systemd,
		Logind:           logind,
		Network:          network,
		Bluetooth:        bluetooth,
		Audio:            audio.NewClient(),
		Display:          display.NewClient(),
		Hardware:         hardware.NewClient(),
		NixOS:            nixos.NewClient(),
		Security:         security.NewClient(),
		Storage:          storage.NewClient(),
		Procfs:           metrics.NewProcfsReader(),
		Journal:          journal.NewReader(),
		Logger:           logger,
		Version:          version,
		Thresholds:       thresholds,
		WoLHosts:         parseWoLHosts(os.Getenv("PANEL_WOL_HOSTS")),
		PrometheusWidget: os.Getenv("PANEL_PROMETHEUS_WIDGET") == "1",
		TerminalManager:  termManager,
	}

	srv := &http.Server{Handler: api.NewRouter(deps)}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()

	logger.Info("panel-agent starting", "version", version)
	for _, ln := range listeners {
		listener := ln
		go func() {
			logger.Info("serving listener", "addr", listener.Addr().String())
			if err := srv.Serve(listener); err != nil && err != http.ErrServerClosed {
				logger.Error("server error", "addr", listener.Addr().String(), "err", err)
			}
		}()
	}

	<-ctx.Done()
	logger.Info("shutting down")
	termManager.CloseAll()
	srv.Shutdown(context.Background()) //nolint:errcheck
}

func devMode() bool {
	for _, arg := range os.Args[1:] {
		if arg == "--dev" {
			return true
		}
	}
	return false
}

func envInt(key string, defaultVal int) int {
	v := os.Getenv(key)
	if v == "" {
		return defaultVal
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return defaultVal
	}
	return n
}

// parseWoLHosts parses PANEL_WOL_HOSTS env var.
// Expected format: JSON object {"server":"aa:bb:cc:dd:ee:ff","builder":"11:22:33:44:55:66"}
// Returns an empty map on parse error or empty input.
func parseWoLHosts(raw string) map[string]string {
	hosts := make(map[string]string)
	if raw == "" {
		return hosts
	}
	if err := json.Unmarshal([]byte(raw), &hosts); err != nil {
		return hosts
	}
	return hosts
}
