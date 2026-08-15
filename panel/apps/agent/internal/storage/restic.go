package storage

import (
	"context"
	"encoding/json"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

// ResticStatus represents the health and scheduled state of the Restic offsite backup capability.
type ResticStatus struct {
	Enabled         bool       `json:"enabled"`
	Repository      string     `json:"repository"`
	Backend         string     `json:"backend"` // "s3", "sftp", "local"
	ServiceActive   bool       `json:"service_active"`
	ServiceSubState string     `json:"service_substate"`
	LastRunTime     *time.Time `json:"last_run_time,omitempty"`
	LastRunSuccess  bool       `json:"last_run_success"`
	NextRunTime     *time.Time `json:"next_run_time,omitempty"`
	SnapshotCount   int        `json:"snapshot_count"`
	Paths           []string   `json:"paths"`
}

// ResticSnapshot represents an offsite snapshot stored in the Restic repository.
type ResticSnapshot struct {
	ID       string    `json:"id"`
	ShortID  string    `json:"short_id"`
	Time     time.Time `json:"time"`
	Paths    []string  `json:"paths"`
	Hostname string    `json:"hostname"`
	Username string    `json:"username"`
	Tags     []string  `json:"tags"`
}

// GetResticStatus queries systemd status for restic-backups-l7v.service and .timer.
func GetResticStatus(ctx context.Context) (*ResticStatus, error) {
	status := &ResticStatus{
		Enabled:    false,
		Repository: "s3:s3.amazonaws.com/l7v-backups/restic",
		Backend:    "s3",
		Paths:      []string{"/var/lib", "/var/backup", "/etc", "/home"},
	}

	// 1. Query systemd unit properties for service
	svcCmd := exec.CommandContext(ctx, "systemctl", "show", "restic-backups-l7v.service",
		"--property=ActiveState,SubState,ExecMainExitTimestamp,ExecMainStatus,Result")
	if out, err := svcCmd.Output(); err == nil && len(out) > 0 {
		status.Enabled = true
		lines := strings.Split(string(out), "\n")
		for _, line := range lines {
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				val := strings.TrimSpace(parts[1])
				switch key {
				case "ActiveState":
					status.ServiceActive = (val == "active" || val == "activating")
				case "SubState":
					status.ServiceSubState = val
				case "Result":
					status.LastRunSuccess = (val == "success")
				case "ExecMainExitTimestamp":
					if val != "" && val != "0" {
						if t, err := time.Parse("Mon 2006-01-02 15:04:05 MST", val); err == nil {
							status.LastRunTime = &t
						}
					}
				}
			}
		}
	}

	// 2. Query timer for next run
	timerCmd := exec.CommandContext(ctx, "systemctl", "show", "restic-backups-l7v.timer",
		"--property=NextElapseUSecRealtime,LastTriggerUSec")
	if out, err := timerCmd.Output(); err == nil && len(out) > 0 {
		lines := strings.Split(string(out), "\n")
		for _, line := range lines {
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				val := strings.TrimSpace(parts[1])
				if key == "NextElapseUSecRealtime" && val != "" {
					if usec, err := strconv.ParseInt(val, 10, 64); err == nil && usec > 0 {
						nextT := time.UnixMicro(usec)
						status.NextRunTime = &nextT
					}
				}
			}
		}
	}

	return status, nil
}

// ListResticSnapshots attempts to query restic snapshots if credentials are present.
func ListResticSnapshots(ctx context.Context) ([]ResticSnapshot, error) {
	if _, err := exec.LookPath("restic"); err != nil {
		return []ResticSnapshot{}, nil
	}

	// We can query with --no-cache
	cmd := exec.CommandContext(ctx, "restic", "snapshots", "--json")
	out, err := cmd.Output()
	if err != nil {
		// Return empty list if remote repository credentials are not directly unlocked in CLI
		return []ResticSnapshot{}, nil
	}

	var rawList []struct {
		ID       string    `json:"id"`
		ShortID  string    `json:"short_id"`
		Time     time.Time `json:"time"`
		Paths    []string  `json:"paths"`
		Hostname string    `json:"hostname"`
		Username string    `json:"username"`
		Tags     []string  `json:"tags"`
	}

	if err := json.Unmarshal(out, &rawList); err != nil {
		return []ResticSnapshot{}, nil
	}

	res := make([]ResticSnapshot, 0, len(rawList))
	for _, r := range rawList {
		short := r.ShortID
		if short == "" && len(r.ID) >= 8 {
			short = r.ID[:8]
		}
		res = append(res, ResticSnapshot{
			ID:       r.ID,
			ShortID:  short,
			Time:     r.Time,
			Paths:    r.Paths,
			Hostname: r.Hostname,
			Username: r.Username,
			Tags:     r.Tags,
		})
	}

	return res, nil
}

// TriggerResticBackup triggers the restic systemd backup unit immediately.
func TriggerResticBackup(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "systemctl", "start", "restic-backups-l7v.service")
	return cmd.Run()
}
