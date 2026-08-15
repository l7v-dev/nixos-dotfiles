package storage

import (
	"testing"
)

func TestParseSnapperConfigs(t *testing.T) {
	rawOutput := `Config | Subvolume
-------+----------
root   | /
home   | /home
`

	configs := parseSnapperConfigs(rawOutput)
	if len(configs) != 2 {
		t.Fatalf("expected 2 configs, got %d", len(configs))
	}

	if configs[0].Name != "root" || configs[0].Subvolume != "/" {
		t.Errorf("expected root -> /, got %+v", configs[0])
	}
	if configs[1].Name != "home" || configs[1].Subvolume != "/home" {
		t.Errorf("expected home -> /home, got %+v", configs[1])
	}
}

func TestParseSnapperListOutput(t *testing.T) {
	rawOutput := `  # | Type   | Pre # | Date                     | User | Cleanup  | Description       | Userdata
----+--------+-------+--------------------------+------+----------+-------------------+---------
  0 | single |       |                          | root |          | current           |
  1 | single |       | 2026-08-15 00:00:01      | root | timeline | timeline snapshot |
 42 | pre    |       | 2026-08-15 01:15:30      | root | number   | Pre-nixos switch  |
 43 | post   | 42    | 2026-08-15 01:16:05      | root | number   | Post-nixos switch |
`

	snapshots := parseSnapperListOutput(rawOutput, "root")
	if len(snapshots) != 4 {
		t.Fatalf("expected 4 snapshots, got %d", len(snapshots))
	}

	// Verify snapshot 0 (current)
	if snapshots[0].ID != 0 || snapshots[0].Description != "current" {
		t.Errorf("snapshot 0 mismatch: %+v", snapshots[0])
	}

	// Verify snapshot 1 (timeline)
	if snapshots[1].ID != 1 || snapshots[1].Cleanup != "timeline" {
		t.Errorf("snapshot 1 mismatch: %+v", snapshots[1])
	}

	// Verify snapshot 42 (pre)
	if snapshots[2].ID != 42 || snapshots[2].Type != "pre" || snapshots[2].Description != "Pre-nixos switch" {
		t.Errorf("snapshot 42 mismatch: %+v", snapshots[2])
	}

	// Verify snapshot 43 (post with pre_id = 42)
	if snapshots[3].ID != 43 || snapshots[3].PreID == nil || *snapshots[3].PreID != 42 {
		t.Errorf("snapshot 43 pre_id mismatch: %+v", snapshots[3])
	}
}
