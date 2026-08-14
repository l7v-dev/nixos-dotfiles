package security

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
)

// VPNTunnel represents Tailscale or WireGuard VPN state.
type VPNTunnel struct {
	Type       string `json:"type"` // "tailscale" | "wireguard"
	Active     bool   `json:"active"`
	IPAddress  string `json:"ip_address,omitempty"`
	Status     string `json:"status"` // "connected", "stopped", "not_installed"
	PeersCount int    `json:"peers_count,omitempty"`
}

// OpenPort represents a listening TCP/UDP network socket.
type OpenPort struct {
	Protocol string `json:"protocol"` // "tcp" or "udp"
	Port     int    `json:"port"`
	Address  string `json:"address"`
	Process  string `json:"process,omitempty"`
}

// UserSession represents an active login session on the machine.
type UserSession struct {
	ID   string `json:"id"`
	User string `json:"user"`
	Seat string `json:"seat,omitempty"`
	TTY  string `json:"tty,omitempty"`
	Type string `json:"type,omitempty"` // "wayland", "x11", "tty"
}

// Status holds network security, VPN and session states.
type Status struct {
	VPN        VPNTunnel     `json:"vpn"`
	OpenPorts  []OpenPort    `json:"open_ports"`
	Sessions   []UserSession `json:"sessions"`
	FirewallOn bool          `json:"firewall_on"`
}

// Client defines the interface for security and VPN operations.
type Client interface {
	GetStatus(ctx context.Context) (*Status, error)
	ToggleVPN(ctx context.Context) error
}

type systemSecurityClient struct {
	mu sync.Mutex
}

// NewClient creates a new security client.
func NewClient() Client {
	return &systemSecurityClient{}
}

// GetStatus checks Tailscale/VPN status, open listening ports, and active user sessions.
func (c *systemSecurityClient) GetStatus(ctx context.Context) (*Status, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	status := &Status{
		VPN: VPNTunnel{
			Type:   "tailscale",
			Active: false,
			Status: "not_installed",
		},
		OpenPorts:  make([]OpenPort, 0),
		Sessions:   make([]UserSession, 0),
		FirewallOn: true,
	}

	// 1. Tailscale inspection
	if _, err := exec.LookPath("tailscale"); err == nil {
		status.VPN.Status = "stopped"
		out, err := exec.CommandContext(ctx, "tailscale", "status", "--json").Output()
		if err == nil {
			var tsData struct {
				BackendState string `json:"BackendState"`
				Self         struct {
					TailscaleIPs []string `json:"TailscaleIPs"`
					Online       bool     `json:"Online"`
				} `json:"Self"`
				Peer map[string]any `json:"Peer"`
			}
			if err := json.Unmarshal(out, &tsData); err == nil {
				if tsData.BackendState == "Running" {
					status.VPN.Active = true
					status.VPN.Status = "connected"
					if len(tsData.Self.TailscaleIPs) > 0 {
						status.VPN.IPAddress = tsData.Self.TailscaleIPs[0]
					}
					status.VPN.PeersCount = len(tsData.Peer)
				}
			}
		}
	}

	// 2. Open listening ports (via /proc/net/tcp and /proc/net/tcp6 or ss fallback)
	c.readListeningPorts(ctx, status)

	// 3. Active user sessions via loginctl
	if _, err := exec.LookPath("loginctl"); err == nil {
		if out, err := exec.CommandContext(ctx, "loginctl", "list-sessions", "--no-legend").Output(); err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				fields := strings.Fields(line)
				if len(fields) >= 3 {
					sess := UserSession{
						ID:   fields[0],
						User: fields[2],
					}
					if len(fields) >= 4 {
						sess.Seat = fields[3]
					}
					if len(fields) >= 5 {
						sess.TTY = fields[4]
					}
					status.Sessions = append(status.Sessions, sess)
				}
			}
		}
	}

	return status, nil
}

func (c *systemSecurityClient) readListeningPorts(ctx context.Context, status *Status) {
	// Try parsing /proc/net/tcp
	parseProcTCP := func(path string, isV6 bool) {
		data, err := os.ReadFile(path)
		if err != nil {
			return
		}
		lines := strings.Split(string(data), "\n")
		for i, line := range lines {
			if i == 0 {
				continue // header
			}
			fields := strings.Fields(line)
			if len(fields) < 4 {
				continue
			}
			state := fields[3]
			if state != "0A" { // 0A = TCP_LISTEN
				continue
			}
			localAddr := fields[1]
			parts := strings.Split(localAddr, ":")
			if len(parts) == 2 {
				portHex := parts[1]
				if portNum, err := strconv.ParseInt(portHex, 16, 64); err == nil && portNum > 0 {
					status.OpenPorts = append(status.OpenPorts, OpenPort{
						Protocol: "tcp",
						Port:     int(portNum),
						Address:  "0.0.0.0",
					})
				}
			}
		}
	}

	parseProcTCP("/proc/net/tcp", false)
	parseProcTCP("/proc/net/tcp6", true)

	// Deduplicate ports
	seen := make(map[int]bool)
	unique := make([]OpenPort, 0, len(status.OpenPorts))
	for _, p := range status.OpenPorts {
		if !seen[p.Port] {
			seen[p.Port] = true
			unique = append(unique, p)
		}
	}
	status.OpenPorts = unique
}

// ToggleVPN toggles Tailscale Up or Down.
func (c *systemSecurityClient) ToggleVPN(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if _, err := exec.LookPath("tailscale"); err != nil {
		return fmt.Errorf("tailscale not installed")
	}

	out, err := exec.CommandContext(ctx, "tailscale", "status", "--json").Output()
	isRunning := false
	if err == nil {
		var tsData struct {
			BackendState string `json:"BackendState"`
		}
		if err := json.Unmarshal(out, &tsData); err == nil && tsData.BackendState == "Running" {
			isRunning = true
		}
	}

	if isRunning {
		return exec.CommandContext(ctx, "tailscale", "down").Run()
	}
	return exec.CommandContext(ctx, "tailscale", "up", "--accept-routes").Run()
}
