package nixos

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"
)

// FlakeInput represents a single locked input from flake.lock.
type FlakeInput struct {
	Name                 string    `json:"name"`
	Type                 string    `json:"type"`
	Owner                string    `json:"owner,omitempty"`
	Repo                 string    `json:"repo,omitempty"`
	Ref                  string    `json:"ref,omitempty"`
	Revision             string    `json:"revision,omitempty"`
	ShortRevision        string    `json:"short_revision,omitempty"`
	LastModified         time.Time `json:"last_modified,omitempty"`
	LastModifiedRelative string    `json:"last_modified_relative,omitempty"`
	NarHash              string    `json:"nar_hash,omitempty"`
	URL                  string    `json:"url,omitempty"`
}

// FlakeInfo provides metadata about the system flake and its dependencies.
type FlakeInfo struct {
	FlakePath   string       `json:"flake_path"`
	LockVersion int          `json:"lock_version"`
	TotalInputs int          `json:"total_inputs"`
	Inputs      []FlakeInput `json:"inputs"`
	LastUpdated time.Time    `json:"last_updated"`
}

// RawFlakeLock models the JSON structure of flake.lock.
type RawFlakeLock struct {
	Version int                    `json:"version"`
	Root    string                 `json:"root"`
	Nodes   map[string]RawLockNode `json:"nodes"`
}

// RawLockNode models a single node in flake.lock.
type RawLockNode struct {
	Inputs   map[string]interface{} `json:"inputs,omitempty"`
	Locked   *RawLockedDetails      `json:"locked,omitempty"`
	Original *RawOriginalDetails    `json:"original,omitempty"`
}

// RawLockedDetails models the 'locked' section of a node.
type RawLockedDetails struct {
	Type         string `json:"type"`
	Owner        string `json:"owner,omitempty"`
	Repo         string `json:"repo,omitempty"`
	Rev          string `json:"rev,omitempty"`
	LastModified int64  `json:"lastModified,omitempty"`
	NarHash      string `json:"narHash,omitempty"`
	URL          string `json:"url,omitempty"`
	Ref          string `json:"ref,omitempty"`
}

// RawOriginalDetails models the 'original' section of a node.
type RawOriginalDetails struct {
	Type  string `json:"type"`
	Owner string `json:"owner,omitempty"`
	Repo  string `json:"repo,omitempty"`
	Ref   string `json:"ref,omitempty"`
	URL   string `json:"url,omitempty"`
}

// GetFlakeInfo reads and parses flake.lock from the default or specified flake directory.
func (c *systemNixOSClient) GetFlakeInfo(ctx context.Context, flakePath string) (*FlakeInfo, error) {
	if flakePath == "" {
		// Look in known standard locations
		candidates := []string{
			"/home/l7v/dev/projects/company/active/nixos",
			"/etc/nixos",
			".",
		}
		for _, cand := range candidates {
			if _, err := os.Stat(filepath.Join(cand, "flake.lock")); err == nil {
				flakePath = cand
				break
			}
		}
	}

	lockPath := filepath.Join(flakePath, "flake.lock")
	data, err := os.ReadFile(lockPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read flake.lock at %s: %w", lockPath, err)
	}

	return parseFlakeLock(data, flakePath)
}

// parseFlakeLock parses flake.lock data into FlakeInfo.
func parseFlakeLock(data []byte, flakePath string) (*FlakeInfo, error) {
	var raw RawFlakeLock
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, fmt.Errorf("failed to parse flake.lock JSON: %w", err)
	}

	info := &FlakeInfo{
		FlakePath:   flakePath,
		LockVersion: raw.Version,
		Inputs:      make([]FlakeInput, 0),
	}

	// Identify top-level root inputs if available
	rootNode, hasRoot := raw.Nodes[raw.Root]
	rootInputNames := make(map[string]bool)
	if hasRoot && rootNode.Inputs != nil {
		for inputKey := range rootNode.Inputs {
			rootInputNames[inputKey] = true
		}
	}

	var latestMod time.Time

	for name, node := range raw.Nodes {
		if name == raw.Root || node.Locked == nil {
			continue
		}

		locked := node.Locked
		shortRev := locked.Rev
		if len(shortRev) > 7 {
			shortRev = shortRev[:7]
		}

		var modTime time.Time
		if locked.LastModified > 0 {
			modTime = time.Unix(locked.LastModified, 0)
			if modTime.After(latestMod) {
				latestMod = modTime
			}
		}

		ref := locked.Ref
		if ref == "" && node.Original != nil {
			ref = node.Original.Ref
		}

		url := locked.URL
		if url == "" && locked.Owner != "" && locked.Repo != "" {
			url = fmt.Sprintf("https://github.com/%s/%s", locked.Owner, locked.Repo)
		}

		input := FlakeInput{
			Name:                 name,
			Type:                 locked.Type,
			Owner:                locked.Owner,
			Repo:                 locked.Repo,
			Ref:                  ref,
			Revision:             locked.Rev,
			ShortRevision:        shortRev,
			LastModified:         modTime,
			LastModifiedRelative: formatRelativeTime(modTime),
			NarHash:              locked.NarHash,
			URL:                  url,
		}

		info.Inputs = append(info.Inputs, input)
	}

	// Sort inputs: root direct inputs first, then alphabetically
	sort.Slice(info.Inputs, func(i, j int) bool {
		iIsRoot := rootInputNames[info.Inputs[i].Name]
		jIsRoot := rootInputNames[info.Inputs[j].Name]
		if iIsRoot != jIsRoot {
			return iIsRoot // root inputs first
		}
		return info.Inputs[i].Name < info.Inputs[j].Name
	})

	info.TotalInputs = len(info.Inputs)
	info.LastUpdated = latestMod

	return info, nil
}

func formatRelativeTime(t time.Time) string {
	if t.IsZero() {
		return "bilinmiyor"
	}
	diff := time.Since(t)
	if diff < time.Minute {
		return "az önce"
	}
	if diff < time.Hour {
		return fmt.Sprintf("%d dk önce", int(diff.Minutes()))
	}
	if diff < 24*time.Hour {
		return fmt.Sprintf("%d saat önce", int(diff.Hours()))
	}
	days := int(diff.Hours() / 24)
	if days < 30 {
		return fmt.Sprintf("%d gün önce", days)
	}
	months := days / 30
	return fmt.Sprintf("%d ay önce", months)
}
