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

// Client defines the interface for NixOS maintenance and generation operations.
type Client interface {
	GetStatus(ctx context.Context) (*Status, error)
	RunGarbageCollect(ctx context.Context, deleteOlderThan string) (*MaintenanceResult, error)
	RunStoreOptimise(ctx context.Context) (*MaintenanceResult, error)
	ListGenerations(ctx context.Context) ([]Generation, error)
	GetGenerationDiff(ctx context.Context, fromGen, toGen int) (*GenerationDiff, error)
	SwitchGeneration(ctx context.Context, targetGen int) (*SwitchResult, error)
	RollbackGeneration(ctx context.Context) (*SwitchResult, error)
	GetFlakeInfo(ctx context.Context, flakePath string) (*FlakeInfo, error)
	TriggerRebuild(ctx context.Context, req RebuildRequest) (*RebuildJob, error)
	GetRebuildJob(id string) (*RebuildJob, bool)
	ListRebuildJobs() []*RebuildJob
	CancelRebuildJob(id string) error
}

type systemNixOSClient struct {
	mu         sync.Mutex
	rebuildMgr *RebuildManager
}

// NewClient creates a new NixOS system manager client.
func NewClient() Client {
	return &systemNixOSClient{
		rebuildMgr: NewRebuildManager(),
	}
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

	freedMB := parseFreedMB(outputStr)

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

	freedMB := parseFreedMB(outputStr)

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

// parseFreedMB parses various Nix store GC and optimise output formats to calculate freed space in MB.
func parseFreedMB(output string) uint64 {
	// Patterns like:
	// "123.45 MiB freed" / "freed 123.45 MiB" / "123.45 MB freed" / "1.23 GiB freed" / "12345 bytes freed"
	re := regexp.MustCompile(`(?i)(?:freed\s+)?([0-9.]+)\s*(bytes|b|kib|kb|mib|mb|gib|gb)\s*(?:freed)?`)
	matches := re.FindAllStringSubmatch(output, -1)
	if len(matches) == 0 {
		return 0
	}

	// Use the last match (summary usually at the end)
	lastMatch := matches[len(matches)-1]
	val, err := strconv.ParseFloat(lastMatch[1], 64)
	if err != nil {
		return 0
	}

	unit := strings.ToLower(lastMatch[2])
	switch {
	case strings.HasPrefix(unit, "g"):
		return uint64(val * 1024)
	case strings.HasPrefix(unit, "m"):
		return uint64(val)
	case strings.HasPrefix(unit, "k"):
		return uint64(val / 1024)
	case strings.HasPrefix(unit, "b"):
		return uint64(val / (1024 * 1024))
	default:
		return uint64(val)
	}
}
