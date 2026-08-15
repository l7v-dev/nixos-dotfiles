package storage

import (
	"bufio"
	"context"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

// SnapperConfig represents a configured Btrfs subvolume for Snapper.
type SnapperConfig struct {
	Name      string `json:"name"`
	Subvolume string `json:"subvolume"`
}

// SnapperSnapshot represents a single Btrfs snapshot created by Snapper.
type SnapperSnapshot struct {
	ID          int       `json:"id"`
	Config      string    `json:"config"`
	Type        string    `json:"type"` // "single", "pre", "post"
	PreID       *int      `json:"pre_id,omitempty"`
	Date        time.Time `json:"date"`
	DateString  string    `json:"date_string"`
	Cleanup     string    `json:"cleanup,omitempty"` // "timeline", "number", etc.
	Description string    `json:"description"`
	UserData    string    `json:"user_data,omitempty"`
}

// CreateSnapshotRequest defines parameters for creating a new snapshot.
type CreateSnapshotRequest struct {
	Config      string `json:"config"`                 // "root" (default) or "home"
	Description string `json:"description"`            // e.g. "Pre-switch upgrade"
	Cleanup     string `json:"cleanup,omitempty"`      // "number", "timeline", ""
	Type        string `json:"type,omitempty"`         // "single" (default)
	UserData    string `json:"user_data,omitempty"`
}

// ListSnapperConfigs lists all configured snapper configs (e.g. root, home).
func ListSnapperConfigs(ctx context.Context) ([]SnapperConfig, error) {
	if _, err := exec.LookPath("snapper"); err != nil {
		// Fallback default config on NixOS
		return []SnapperConfig{{Name: "root", Subvolume: "/"}}, nil
	}

	cmd := exec.CommandContext(ctx, "snapper", "list-configs")
	out, err := cmd.Output()
	if err != nil {
		return []SnapperConfig{{Name: "root", Subvolume: "/"}}, nil
	}

	return parseSnapperConfigs(string(out)), nil
}

func parseSnapperConfigs(output string) []SnapperConfig {
	var configs []SnapperConfig
	scanner := bufio.NewScanner(strings.NewReader(output))

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "Config") || strings.HasPrefix(line, "--") {
			continue
		}

		parts := strings.Split(line, "|")
		if len(parts) >= 2 {
			name := strings.TrimSpace(parts[0])
			subvol := strings.TrimSpace(parts[1])
			if name != "" {
				configs = append(configs, SnapperConfig{
					Name:      name,
					Subvolume: subvol,
				})
			}
		} else {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				configs = append(configs, SnapperConfig{
					Name:      fields[0],
					Subvolume: fields[1],
				})
			}
		}
	}

	if len(configs) == 0 {
		configs = append(configs, SnapperConfig{Name: "root", Subvolume: "/"})
	}
	return configs
}

// ListSnapperSnapshots lists all snapshots for a given config.
func ListSnapperSnapshots(ctx context.Context, configName string) ([]SnapperSnapshot, error) {
	if configName == "" {
		configName = "root"
	}

	if _, err := exec.LookPath("snapper"); err != nil {
		return nil, fmt.Errorf("snapper command not found in PATH")
	}

	cmd := exec.CommandContext(ctx, "snapper", "-c", configName, "list")
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("snapper list failed: %w", err)
	}

	return parseSnapperListOutput(string(out), configName), nil
}

// parseSnapperListOutput parses the tabular output from `snapper -c <config> list`.
// Output format:
//   # | Type   | Pre # | Date                     | User | Cleanup  | Description | Userdata
//  ---+--------+-------+--------------------------+------+----------+-------------+---------
//   0 | single |       |                          | root |          | current     |
//   1 | single |       | Sat 15 Aug 2026 01:00:00 | root | timeline | timeline    |
func parseSnapperListOutput(output string, configName string) []SnapperSnapshot {
	var snapshots []SnapperSnapshot
	scanner := bufio.NewScanner(strings.NewReader(output))

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, "-") {
			continue
		}

		parts := strings.Split(line, "|")
		if len(parts) >= 6 {
			idStr := strings.TrimSpace(parts[0])
			id, err := strconv.Atoi(idStr)
			if err != nil {
				continue
			}

			snapType := strings.TrimSpace(parts[1])
			preIDStr := strings.TrimSpace(parts[2])
			var preID *int
			if pID, err := strconv.Atoi(preIDStr); err == nil && preIDStr != "" {
				preID = &pID
			}

			dateStr := strings.TrimSpace(parts[3])
			var dateVal time.Time
			// Try standard timestamp layouts
			layouts := []string{
				"2006-01-02 15:04:05",
				"Mon 02 Jan 2006 15:04:05 PM MST",
				"Mon 02 Jan 2006 15:04:05 MST",
				"Mon Jan _2 15:04:05 2006",
				time.RFC3339,
			}
			for _, layout := range layouts {
				if t, err := time.Parse(layout, dateStr); err == nil {
					dateVal = t
					break
				}
			}

			cleanup := ""
			if len(parts) >= 6 {
				cleanup = strings.TrimSpace(parts[5])
			}

			description := ""
			if len(parts) >= 7 {
				description = strings.TrimSpace(parts[6])
			}

			userdata := ""
			if len(parts) >= 8 {
				userdata = strings.TrimSpace(parts[7])
			}

			snapshots = append(snapshots, SnapperSnapshot{
				ID:          id,
				Config:      configName,
				Type:        snapType,
				PreID:       preID,
				Date:        dateVal,
				DateString:  dateStr,
				Cleanup:     cleanup,
				Description: description,
				UserData:    userdata,
			})
		}
	}

	return snapshots
}

// CreateSnapperSnapshot creates a new manual or pre/post snapshot.
func CreateSnapperSnapshot(ctx context.Context, req CreateSnapshotRequest) (*SnapperSnapshot, error) {
	if req.Config == "" {
		req.Config = "root"
	}
	if req.Description == "" {
		req.Description = fmt.Sprintf("Panel snapshot %s", time.Now().Format("2006-01-02 15:04:05"))
	}

	args := []string{"-c", req.Config, "create", "-d", req.Description}

	if req.Cleanup != "" {
		args = append(args, "-c", req.Cleanup)
	}
	if req.Type != "" {
		args = append(args, "-t", req.Type)
	}
	if req.UserData != "" {
		args = append(args, "-u", req.UserData)
	}

	cmd := exec.CommandContext(ctx, "snapper", args...)
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("snapper create failed: %w", err)
	}

	// Fetch updated list to find the newly created snapshot
	list, err := ListSnapperSnapshots(ctx, req.Config)
	if err == nil && len(list) > 0 {
		return &list[len(list)-1], nil
	}

	return &SnapperSnapshot{
		ID:          -1,
		Config:      req.Config,
		Type:        "single",
		Date:        time.Now(),
		DateString:  time.Now().Format("2006-01-02 15:04:05"),
		Description: req.Description,
	}, nil
}

// DeleteSnapperSnapshot deletes a snapshot by ID.
func DeleteSnapperSnapshot(ctx context.Context, configName string, id int) error {
	if configName == "" {
		configName = "root"
	}
	if id < 1 {
		return fmt.Errorf("invalid snapshot ID %d (snapshot 0 is current subvolume and cannot be deleted)", id)
	}

	cmd := exec.CommandContext(ctx, "snapper", "-c", configName, "delete", strconv.Itoa(id))
	return cmd.Run()
}
