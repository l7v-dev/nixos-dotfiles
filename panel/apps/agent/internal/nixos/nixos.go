package nixos

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"syscall"
)

// Status represents the current NixOS system generation, kernel, uptime and store statistics.
type Status struct {
	CurrentGeneration int      `json:"current_generation"`
	Version           string   `json:"version"`
	KernelVersion     string   `json:"kernel_version"`
	UptimeSeconds     uint64   `json:"uptime_seconds"`
	NixStoreSizeMB    uint64   `json:"nix_store_size_mb,omitempty"`
	RecentGenerations []string `json:"recent_generations,omitempty"`
}

// MaintenanceResult represents the output of a GC or optimise command.
type MaintenanceResult struct {
	Action  string `json:"action"`
	Status  string `json:"status"`
	Output  string `json:"output"`
	FreedMB uint64 `json:"freed_mb,omitempty"`
}

// Client defines the interface for NixOS maintenance operations.
type Client interface {
	GetStatus(ctx context.Context) (*Status, error)
	RunGarbageCollect(ctx context.Context, deleteOlderThan string) (*MaintenanceResult, error)
	RunStoreOptimise(ctx context.Context) (*MaintenanceResult, error)
}

type systemNixOSClient struct {
	mu sync.Mutex
}

// NewClient creates a new NixOS system manager client.
func NewClient() Client {
	return &systemNixOSClient{}
}

// GetStatus retrieves NixOS system generation and kernel information.
func (c *systemNixOSClient) GetStatus(ctx context.Context) (*Status, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	status := &Status{
		CurrentGeneration: 1,
		Version:           "NixOS",
		KernelVersion:     "Linux",
		UptimeSeconds:     0,
		RecentGenerations: make([]string, 0),
	}

	// 1. Kernel version
	if kout, err := exec.CommandContext(ctx, "uname", "-r").Output(); err == nil {
		status.KernelVersion = strings.TrimSpace(string(kout))
	}

	// 2. NixOS Version
	if vout, err := exec.CommandContext(ctx, "nixos-version").Output(); err == nil {
		status.Version = strings.TrimSpace(string(vout))
	} else if osRelease, err := os.ReadFile("/etc/os-release"); err == nil {
		re := regexp.MustCompile(`PRETTY_NAME="?([^"\n]+)"?`)
		if matches := re.FindStringSubmatch(string(osRelease)); len(matches) > 1 {
			status.Version = matches[1]
		}
	}

	// 3. Uptime
	var sysInfo syscall.Sysinfo_t
	if err := syscall.Sysinfo(&sysInfo); err == nil {
		status.UptimeSeconds = uint64(sysInfo.Uptime)
	}

	// 4. Current system generation number
	// NixOS stores system profiles under /nix/var/nix/profiles/system
	if target, err := os.Readlink("/nix/var/nix/profiles/system"); err == nil {
		// e.g. system-42-link
		re := regexp.MustCompile(`system-(\d+)-link`)
		if matches := re.FindStringSubmatch(target); len(matches) > 1 {
			if gen, err := strconv.Atoi(matches[1]); err == nil {
				status.CurrentGeneration = gen
			}
		}
	}

	// 5. Recent system generations
	matches, _ := filepath.Glob("/nix/var/nix/profiles/system-*-link")
	for _, m := range matches {
		base := filepath.Base(m)
		status.RecentGenerations = append(status.RecentGenerations, base)
	}

	return status, nil
}

// RunGarbageCollect runs nix-collect-garbage with the specified options.
func (c *systemNixOSClient) RunGarbageCollect(ctx context.Context, deleteOlderThan string) (*MaintenanceResult, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	args := []string{"-d"}
	if deleteOlderThan != "" {
		args = []string{"--delete-older-than", deleteOlderThan}
	}

	cmd := exec.CommandContext(ctx, "nix-collect-garbage", args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	outputStr := stdout.String()
	if stderr.Len() > 0 {
		outputStr += "\n" + stderr.String()
	}

	var freedMB uint64
	// Match "... freeing 123.45 MiB" or "... deleted X bytes"
	re := regexp.MustCompile(`([0-9.]+)\s+(?:MiB|MB|GiB|GB)\s+freed`)
	if matches := re.FindStringSubmatch(outputStr); len(matches) > 1 {
		if val, err := strconv.ParseFloat(matches[1], 64); err == nil {
			freedMB = uint64(val)
		}
	}

	res := &MaintenanceResult{
		Action:  "garbage_collection",
		Status:  "completed",
		Output:  strings.TrimSpace(outputStr),
		FreedMB: freedMB,
	}

	if err != nil {
		res.Status = "error"
		return res, err
	}

	return res, nil
}

// RunStoreOptimise runs nix-store --optimise to hardlink duplicate objects.
func (c *systemNixOSClient) RunStoreOptimise(ctx context.Context) (*MaintenanceResult, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	cmd := exec.CommandContext(ctx, "nix-store", "--optimise")
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	outputStr := stdout.String()
	if stderr.Len() > 0 {
		outputStr += "\n" + stderr.String()
	}

	var freedMB uint64
	re := regexp.MustCompile(`([0-9.]+)\s+(?:MiB|MB|GiB|GB)\s+freed`)
	if matches := re.FindStringSubmatch(outputStr); len(matches) > 1 {
		if val, err := strconv.ParseFloat(matches[1], 64); err == nil {
			freedMB = uint64(val)
		}
	}

	res := &MaintenanceResult{
		Action:  "store_optimise",
		Status:  "completed",
		Output:  strings.TrimSpace(outputStr),
		FreedMB: freedMB,
	}

	if err != nil {
		res.Status = "error"
		return res, err
	}

	return res, nil
}
