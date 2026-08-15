package ai

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"sync"
)

type MicroVMManager struct {
	mu sync.RWMutex
}

func NewMicroVMManager() *MicroVMManager {
	return &MicroVMManager{}
}

// GetHostStatus inspects virtualization capabilities on the system.
func (m *MicroVMManager) GetHostStatus(ctx context.Context) (*MicroVMHostStatus, error) {
	status := &MicroVMHostStatus{
		Supported:        false,
		KVMEnabled:       false,
		VirtiofsdRunning: false,
		AvailableVMs:     []string{"coding-agent"},
		Hypervisor:       "kvm/qemu",
	}

	// Check /dev/kvm
	if _, err := os.Stat("/dev/kvm"); err == nil {
		status.KVMEnabled = true
		status.Supported = true
	}

	// Check if microvm binary or systemd units exist
	if _, err := exec.LookPath("microvm"); err == nil {
		status.Supported = true
	}

	// Check virtiofs socket directory or daemon
	if _, err := os.Stat("/run/virtiofsd"); err == nil {
		status.VirtiofsdRunning = true
	} else if _, err := exec.LookPath("virtiofsd"); err == nil {
		status.VirtiofsdRunning = true
	}

	return status, nil
}

// ListMicroVMs returns configured MicroVM instances on this host.
func (m *MicroVMManager) ListMicroVMs(ctx context.Context) ([]MicroVMInfo, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Default configured Tier 2 MicroVM for AI coding tasks
	vms := []MicroVMInfo{
		{
			Name:        "coding-agent",
			Status:      "stopped",
			VCPU:        4,
			MemoryMB:    4096,
			SystemdUnit: "microvm@coding-agent.service",
			SSHCommand:  "ssh coding-agent",
			SocketPath:  "/run/microvm/coding-agent/control.sock",
			Shares: []VirtioShare{
				{
					Tag:        "ro-store",
					Source:     "/nix/store",
					MountPoint: "/nix/.ro-store",
					Proto:      "virtiofs",
				},
				{
					Tag:        "workspace",
					Source:     "/home/l7v/dev/projects/company/active",
					MountPoint: "/workspace",
					Proto:      "virtiofs",
				},
			},
		},
	}

	// Check live status via systemctl or microvm -l
	for i := range vms {
		vm := &vms[i]
		if _, err := exec.LookPath("systemctl"); err == nil {
			cmd := exec.CommandContext(ctx, "systemctl", "is-active", vm.SystemdUnit)
			out, err := cmd.Output()
			st := strings.TrimSpace(string(out))
			if err == nil && st == "active" {
				vm.Status = "running"
			} else if st == "failed" {
				vm.Status = "failed"
			} else {
				// Also check if control socket exists
				if _, sErr := os.Stat(vm.SocketPath); sErr == nil {
					vm.Status = "running"
				} else {
					vm.Status = "stopped"
				}
			}
		}
	}

	return vms, nil
}

// StartMicroVM starts the specified MicroVM.
func (m *MicroVMManager) StartMicroVM(ctx context.Context, name string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	unit := fmt.Sprintf("microvm@%s.service", name)

	// Try systemctl first
	if _, err := exec.LookPath("systemctl"); err == nil {
		cmd := exec.CommandContext(ctx, "systemctl", "start", unit)
		if err := cmd.Run(); err == nil {
			return nil
		}
	}

	// Fallback to microvm CLI
	if _, err := exec.LookPath("microvm"); err == nil {
		cmd := exec.CommandContext(ctx, "microvm", "-r", name)
		return cmd.Start()
	}

	return fmt.Errorf("neither systemctl nor microvm CLI found on host")
}

// StopMicroVM stops the specified MicroVM.
func (m *MicroVMManager) StopMicroVM(ctx context.Context, name string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	unit := fmt.Sprintf("microvm@%s.service", name)

	if _, err := exec.LookPath("systemctl"); err == nil {
		cmd := exec.CommandContext(ctx, "systemctl", "stop", unit)
		if err := cmd.Run(); err == nil {
			return nil
		}
	}

	if _, err := exec.LookPath("microvm"); err == nil {
		cmd := exec.CommandContext(ctx, "microvm", "-s", name)
		return cmd.Run()
	}

	return fmt.Errorf("neither systemctl nor microvm CLI found on host")
}

// RestartMicroVM restarts the specified MicroVM.
func (m *MicroVMManager) RestartMicroVM(ctx context.Context, name string) error {
	_ = m.StopMicroVM(ctx, name)
	return m.StartMicroVM(ctx, name)
}
