package nixos

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
)

// PackageDiffItem represents a single package change between closures.
type PackageDiffItem struct {
	Name       string `json:"name"`
	ChangeType string `json:"change_type"` // "added", "removed", "updated", "rebuilt"
	OldVersion string `json:"old_version,omitempty"`
	NewVersion string `json:"new_version,omitempty"`
	SizeDelta  string `json:"size_delta,omitempty"`
	Raw        string `json:"raw"`
}

// DiffSummary provides aggregate metrics on the differences.
type DiffSummary struct {
	AddedCount   int `json:"added_count"`
	RemovedCount int `json:"removed_count"`
	UpdatedCount int `json:"updated_count"`
	RebuiltCount int `json:"rebuilt_count"`
	TotalChanges int `json:"total_changes"`
}

// GenerationDiff represents the diff between two generations.
type GenerationDiff struct {
	FromGeneration int               `json:"from_generation"`
	ToGeneration   int               `json:"to_generation"`
	FromStorePath  string            `json:"from_store_path"`
	ToStorePath    string            `json:"to_store_path"`
	Summary        DiffSummary       `json:"summary"`
	Items          []PackageDiffItem `json:"items"`
	RawOutput      string            `json:"raw_output"`
}

// GetGenerationDiff compares two NixOS generations using `nix store diff-closures`.
func (c *systemNixOSClient) GetGenerationDiff(ctx context.Context, fromGen, toGen int) (*GenerationDiff, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	fromLink := fmt.Sprintf("/nix/var/nix/profiles/system-%d-link", fromGen)
	toLink := fmt.Sprintf("/nix/var/nix/profiles/system-%d-link", toGen)

	fromTarget, err := os.Readlink(fromLink)
	if err != nil {
		return nil, fmt.Errorf("failed to read from generation %d: %w", fromGen, err)
	}
	toTarget, err := os.Readlink(toLink)
	if err != nil {
		return nil, fmt.Errorf("failed to read to generation %d: %w", toGen, err)
	}

	cmd := exec.CommandContext(ctx, "nix", "store", "diff-closures", fromLink, toLink)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	diffErr := cmd.Run()
	rawOutput := stdout.String()
	if stderr.Len() > 0 && rawOutput == "" {
		rawOutput = stderr.String()
	}

	diff := parseDiffClosuresOutput(rawOutput)
	diff.FromGeneration = fromGen
	diff.ToGeneration = toGen
	diff.FromStorePath = fromTarget
	diff.ToStorePath = toTarget

	if diffErr != nil && len(diff.Items) == 0 {
		return diff, fmt.Errorf("diff-closures command error: %w (%s)", diffErr, strings.TrimSpace(stderr.String()))
	}

	return diff, nil
}

var ansiRegex = regexp.MustCompile(`\x1b\[[0-9;]*[a-zA-Z]`)

// stripANSI removes ANSI color and formatting escape sequences from text.
func stripANSI(str string) string {
	return ansiRegex.ReplaceAllString(str, "")
}

// parseDiffClosuresOutput parses the standard output of `nix store diff-closures`.
func parseDiffClosuresOutput(output string) *GenerationDiff {
	cleanOutput := stripANSI(output)
	diff := &GenerationDiff{
		Items:     make([]PackageDiffItem, 0),
		RawOutput: strings.TrimSpace(cleanOutput),
	}

	lines := strings.Split(cleanOutput, "\n")
	// Patterns:
	// 1. "pkg: ∅ → 1.2.3, 10.5 MiB" or "pkg: ∅ → ε"
	// 2. "pkg: 1.2.3 → ∅, -10.5 MiB" or "pkg: ε → ∅"
	// 3. "pkg: 1.0.0 → 2.0.0, 5.2 KiB"
	// 4. "pkg: 264.8 KiB" or "pkg: -12.4 KiB" or "pkg: 12.0 KiB"
	reArrow := regexp.MustCompile(`^([^:]+):\s*(.+?)\s*→\s*(.+?)(?:,\s*([+-]?[0-9.]+\s*[KMGT]?i?B))?$`)
	reSimpleSize := regexp.MustCompile(`^([^:]+):\s*([+-]?[0-9.]+\s*[KMGT]?i?B)$`)

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}

		item := PackageDiffItem{
			Raw: trimmed,
		}

		if match := reArrow.FindStringSubmatch(trimmed); len(match) > 1 {
			item.Name = strings.TrimSpace(match[1])
			oldV := strings.TrimSpace(match[2])
			newV := strings.TrimSpace(match[3])
			if len(match) > 4 {
				item.SizeDelta = strings.TrimSpace(match[4])
			}

			item.OldVersion = oldV
			item.NewVersion = newV

			if newV == "∅" {
				item.ChangeType = "removed"
				diff.Summary.RemovedCount++
			} else if oldV == "∅" {
				item.ChangeType = "added"
				diff.Summary.AddedCount++
			} else if newV == "ε" {
				item.ChangeType = "added"
				diff.Summary.AddedCount++
			} else if oldV == "ε" {
				item.ChangeType = "removed"
				diff.Summary.RemovedCount++
			} else {
				item.ChangeType = "updated"
				diff.Summary.UpdatedCount++
			}
			diff.Summary.TotalChanges++
			diff.Items = append(diff.Items, item)
			continue
		}

		if match := reSimpleSize.FindStringSubmatch(trimmed); len(match) > 1 {
			item.Name = strings.TrimSpace(match[1])
			item.SizeDelta = strings.TrimSpace(match[2])
			item.ChangeType = "rebuilt"
			diff.Summary.RebuiltCount++
			diff.Summary.TotalChanges++
			diff.Items = append(diff.Items, item)
			continue
		}

		// Fallback for non-matching lines:
		colonIdx := strings.Index(trimmed, ":")
		if colonIdx > 0 {
			item.Name = strings.TrimSpace(trimmed[:colonIdx])
			item.ChangeType = "updated"
			diff.Summary.UpdatedCount++
		} else {
			item.Name = trimmed
			item.ChangeType = "rebuilt"
			diff.Summary.RebuiltCount++
		}
		diff.Summary.TotalChanges++
		diff.Items = append(diff.Items, item)
	}

	return diff
}

// ParseGenerationNumbers extracts from/to generations from query parameters.
func ParseGenerationNumbers(fromStr, toStr string, currentGen int) (int, int) {
	toGen := currentGen
	if val, err := strconv.Atoi(toStr); err == nil && val > 0 {
		toGen = val
	}

	fromGen := toGen - 1
	if fromGen <= 0 {
		fromGen = 1
	}
	if val, err := strconv.Atoi(fromStr); err == nil && val > 0 {
		fromGen = val
	}

	return fromGen, toGen
}
