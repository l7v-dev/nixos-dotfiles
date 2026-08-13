// panel-agent: systemd socket-activated REST/SSE API for l7v-panel.
// Communicates with the frontend via a Unix socket.
// Phase 2 will add JWT RS256 authentication via SOPS-managed keys.
package main

import (
	"context"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"

	"github.com/coreos/go-systemd/v22/activation"
	"github.com/l7v/panel-agent/internal/api"
	agentdbus "github.com/l7v/panel-agent/internal/dbus"
	"github.com/l7v/panel-agent/internal/journal"
	"github.com/l7v/panel-agent/internal/metrics"
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
	// Falls back to a manual Unix socket for local development.
	var ln net.Listener
	listeners, err := activation.Listeners()
	if err == nil && len(listeners) > 0 {
		ln = listeners[0]
		logger.Info("using systemd socket activation")
	} else {
		sockPath := "/run/panel-agent/panel-agent.sock"
		if devMode() {
			sockPath = "/tmp/panel-agent-dev.sock"
			os.Remove(sockPath) //nolint:errcheck
		}
		ln, err = net.Listen("unix", sockPath)
		if err != nil {
			logger.Error("listen failed", "path", sockPath, "err", err)
			os.Exit(1)
		}
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

	deps := api.Deps{
		Systemd:    systemd,
		Logind:     logind,
		Network:    network,
		Bluetooth:  bluetooth,
		Procfs:     metrics.NewProcfsReader(),
		Journal:    journal.NewReader(),
		Logger:     logger,
		Version:    version,
		Thresholds: thresholds,
	}

	srv := &http.Server{Handler: api.NewRouter(deps)}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()

	go func() {
		logger.Info("panel-agent started", "version", version)
		if err := srv.Serve(ln); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "err", err)
		}
	}()

	<-ctx.Done()
	logger.Info("shutting down")
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
