package nixos

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

// Generation represents a single NixOS system generation.
type Generation struct {
	Number                int       `json:"number"`
	Timestamp             time.Time `json:"timestamp"`
	DateFormatted         string    `json:"date_formatted"`
	Current               bool      `json:"current"`
	NixOSVersion          string    `json:"nixos_version"`
	KernelVersion         string    `json:"kernel_version"`
	ConfigurationRevision string    `json:"configuration_revision,omitempty"`
	StorePath             string    `json:"store_path"`
}

// SwitchResult represents the outcome of switching or rolling back generations.
type SwitchResult struct {
	Action            string    `json:"action"`
	TargetGeneration  int       `json:"target_generation"`
	CurrentGeneration int       `json:"current_generation"`
	Status            string    `json:"status"`
	Output            string    `json:"output"`
	DurationMs        int64     `json:"duration_ms"`
	Timestamp         time.Time `json:"timestamp"`
}

// ListGenerations scans /nix/var/nix/profiles and returns all system generations sorted descending by generation number.
func (c *systemNixOSClient) ListGenerations(ctx context.Context) ([]Generation, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	return listGenerationsFromDir(ctx, "/nix/var/nix/profiles")
}

// listGenerationsFromDir is a testable helper for scanning generations in a directory.
func listGenerationsFromDir(ctx context.Context, profilesDir string) ([]Generation, error) {
	systemLink := filepath.Join(profilesDir, "system")
	currentTarget := ""
	if target, err := os.Readlink(systemLink); err == nil {
		currentTarget = filepath.Base(target)
	}

	pattern := filepath.Join(profilesDir, "system-*-link")
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return nil, fmt.Errorf("failed to glob system profiles: %w", err)
	}

	reGen := regexp.MustCompile(`system-(\d+)-link$`)
	reRev := regexp.MustCompile(`[0-9a-f]{7,40}$`)

	var gens []Generation

	for _, m := range matches {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}

		base := filepath.Base(m)
		match := reGen.FindStringSubmatch(base)
		if len(match) < 2 {
			continue
		}

		genNum, err := strconv.Atoi(match[1])
		if err != nil {
			continue
		}

		gen := Generation{
			Number:  genNum,
			Current: base == currentTarget,
		}

		// Read symlink target (Store path)
		if target, err := os.Readlink(m); err == nil {
			if !filepath.IsAbs(target) {
				target = filepath.Join(profilesDir, target)
			}
			gen.StorePath = target

			// Extract configuration revision from store path if available
			storeBase := filepath.Base(target)
			if revMatch := reRev.FindString(storeBase); revMatch != "" {
				gen.ConfigurationRevision = revMatch
			}
		}

		// Read file info for timestamp (mtime or ctime)
		if fi, err := os.Lstat(m); err == nil {
			gen.Timestamp = fi.ModTime()
			gen.DateFormatted = fi.ModTime().Format("2006-01-02 15:04:05")
		}

		// Read nixos-version if available
		verPath := filepath.Join(m, "nixos-version")
		if verBytes, err := os.ReadFile(verPath); err == nil {
			gen.NixOSVersion = strings.TrimSpace(string(verBytes))
		}

		// Read kernel info if available
		kernelModulesLink := filepath.Join(m, "kernel-modules")
		if kTarget, err := os.Readlink(kernelModulesLink); err == nil {
			// e.g. /nix/store/...-linux-zen-7.1.8-modules -> linux-zen-7.1.8
			kBase := filepath.Base(kTarget)
			kBase = strings.TrimSuffix(kBase, "-modules")
			parts := strings.SplitN(kBase, "-", 2)
			if len(parts) > 1 {
				gen.KernelVersion = parts[1]
			} else {
				gen.KernelVersion = kBase
			}
		} else {
			// Fallback: check kernel symlink
			kernelLink := filepath.Join(m, "kernel")
			if kTarget, err := os.Readlink(kernelLink); err == nil {
				kDir := filepath.Base(filepath.Dir(kTarget))
				parts := strings.SplitN(kDir, "-", 2)
				if len(parts) > 1 {
					gen.KernelVersion = parts[1]
				}
			}
		}

		gens = append(gens, gen)
	}

	// Sort descending by generation number (latest first)
	sort.Slice(gens, func(i, j int) bool {
		return gens[i].Number > gens[j].Number
	})

	return gens, nil
}

// SwitchGeneration switches the running system to a specified generation.
func (c *systemNixOSClient) SwitchGeneration(ctx context.Context, targetGen int) (*SwitchResult, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	startTime := time.Now()
	res := &SwitchResult{
		Action:           "switch_generation",
		TargetGeneration: targetGen,
		Timestamp:        startTime,
	}

	if targetGen <= 0 {
		res.Status = "error"
		res.Output = "invalid generation number"
		return res, fmt.Errorf("invalid generation number: %d", targetGen)
	}

	profileLink := fmt.Sprintf("/nix/var/nix/profiles/system-%d-link", targetGen)
	if _, err := os.Lstat(profileLink); err != nil {
		res.Status = "error"
		res.Output = fmt.Sprintf("generation %d does not exist at %s", targetGen, profileLink)
		return res, fmt.Errorf("generation link not found: %w", err)
	}

	// Step 1: Update the /nix/var/nix/profiles/system profile symlink
	// nix-env --profile /nix/var/nix/profiles/system --set /nix/var/nix/profiles/system-<N>-link
	setCmd := exec.CommandContext(ctx, "sudo", "nix-env", "--profile", "/nix/var/nix/profiles/system", "--set", profileLink)
	var setOut bytes.Buffer
	setCmd.Stdout = &setOut
	setCmd.Stderr = &setOut

	if err := setCmd.Run(); err != nil {
		// Fallback: direct ln -sfn if nix-env fails
		lnCmd := exec.CommandContext(ctx, "sudo", "ln", "-sfn", profileLink, "/nix/var/nix/profiles/system")
		if lnErr := lnCmd.Run(); lnErr != nil {
			res.Status = "error"
			res.Output = fmt.Sprintf("failed to update system profile link: %v (nix-env: %s)", lnErr, setOut.String())
			res.DurationMs = time.Since(startTime).Milliseconds()
			return res, fmt.Errorf("failed to update system profile: %w", lnErr)
		}
	}

	// Step 2: Run switch-to-configuration switch
	switchBin := filepath.Join(profileLink, "bin", "switch-to-configuration")
	if _, err := os.Stat(switchBin); err != nil {
		// Older/alternate path: profileLink/activate or /nix/var/nix/profiles/system/bin/switch-to-configuration
		switchBin = "/nix/var/nix/profiles/system/bin/switch-to-configuration"
	}

	cmd := exec.CommandContext(ctx, "sudo", switchBin, "switch")
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	outputStr := stdout.String()
	if stderr.Len() > 0 {
		if outputStr != "" {
			outputStr += "\n"
		}
		outputStr += stderr.String()
	}

	res.Output = strings.TrimSpace(outputStr)
	res.DurationMs = time.Since(startTime).Milliseconds()

	// Get current active generation after switch
	if target, err := os.Readlink("/nix/var/nix/profiles/system"); err == nil {
		re := regexp.MustCompile(`system-(\d+)-link`)
		if m := re.FindStringSubmatch(target); len(m) > 1 {
			if g, err := strconv.Atoi(m[1]); err == nil {
				res.CurrentGeneration = g
			}
		}
	}

	if err != nil {
		res.Status = "error"
		return res, fmt.Errorf("switch-to-configuration failed: %w", err)
	}

	res.Status = "completed"
	return res, nil
}

// RollbackGeneration reverts to the previous generation.
func (c *systemNixOSClient) RollbackGeneration(ctx context.Context) (*SwitchResult, error) {
	// First find the current and previous generations
	gens, err := listGenerationsFromDir(ctx, "/nix/var/nix/profiles")
	if err != nil || len(gens) < 2 {
		return nil, fmt.Errorf("cannot rollback: insufficient generations found")
	}

	// Find the current generation index in the sorted list
	currentIdx := -1
	for i, g := range gens {
		if g.Current {
			currentIdx = i
			break
		}
	}

	targetGen := -1
	if currentIdx != -1 && currentIdx+1 < len(gens) {
		// Next older generation in descending list
		targetGen = gens[currentIdx+1].Number
	} else if currentIdx == -1 && len(gens) > 1 {
		targetGen = gens[1].Number
	}

	if targetGen == -1 {
		return nil, fmt.Errorf("no previous generation available for rollback")
	}

	return c.SwitchGeneration(ctx, targetGen)
}
