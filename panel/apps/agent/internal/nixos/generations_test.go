package nixos

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestListGenerationsFromDir(t *testing.T) {
	tempDir := t.TempDir()

	// Create fake system generations: system-10-link, system-11-link, system-12-link
	for _, genNum := range []int{10, 11, 12} {
		genDir := filepath.Join(tempDir, "store", "pkg", "nixos-system-test-25.11")
		_ = os.MkdirAll(genDir, 0755)
		_ = os.WriteFile(filepath.Join(genDir, "nixos-version"), []byte("25.11.20260815.abcdef1"), 0644)

		linkPath := filepath.Join(tempDir, "system-"+string(rune('0'+genNum/10))+string(rune('0'+genNum%10))+"-link")
		if err := os.Symlink(genDir, linkPath); err != nil {
			t.Fatalf("failed to create symlink %s: %v", linkPath, err)
		}
	}

	// Create system -> system-12-link
	systemLink := filepath.Join(tempDir, "system")
	if err := os.Symlink("system-12-link", systemLink); err != nil {
		t.Fatalf("failed to create current system symlink: %v", err)
	}

	gens, err := listGenerationsFromDir(context.Background(), tempDir)
	if err != nil {
		t.Fatalf("listGenerationsFromDir returned error: %v", err)
	}

	if len(gens) != 3 {
		t.Fatalf("expected 3 generations, got %d", len(gens))
	}

	// Verify descending order
	if gens[0].Number != 12 || !gens[0].Current {
		t.Errorf("expected gen 12 to be first and current, got gen %d (current=%v)", gens[0].Number, gens[0].Current)
	}
	if gens[1].Number != 11 || gens[1].Current {
		t.Errorf("expected gen 11 to be second and not current, got gen %d (current=%v)", gens[1].Number, gens[1].Current)
	}
	if gens[2].Number != 10 || gens[2].Current {
		t.Errorf("expected gen 10 to be third and not current, got gen %d (current=%v)", gens[2].Number, gens[2].Current)
	}

	if gens[0].NixOSVersion != "25.11.20260815.abcdef1" {
		t.Errorf("expected nixos-version '25.11.20260815.abcdef1', got %q", gens[0].NixOSVersion)
	}
}

func TestParseDiffClosuresOutput(t *testing.T) {
	rawOutput := `
delve: ∅ → 1.27.1, 30.8 MiB
iflow-cli: 0.5.19 → ∅, -171.5 MiB
claude-desktop: 1.24012.11 → 1.30096.1, 24.5 MiB
panel-agent: 264.8 KiB
unit-panel-agent.service: ∅ → ε
unit-thermald.service: ε → ∅
`

	diff := parseDiffClosuresOutput(rawOutput)

	if diff.Summary.AddedCount != 2 { // delve, unit-panel-agent
		t.Errorf("expected 2 added, got %d", diff.Summary.AddedCount)
	}
	if diff.Summary.RemovedCount != 2 { // iflow-cli, unit-thermald
		t.Errorf("expected 2 removed, got %d", diff.Summary.RemovedCount)
	}
	if diff.Summary.UpdatedCount != 1 { // claude-desktop
		t.Errorf("expected 1 updated, got %d", diff.Summary.UpdatedCount)
	}
	if diff.Summary.RebuiltCount != 1 { // panel-agent
		t.Errorf("expected 1 rebuilt, got %d", diff.Summary.RebuiltCount)
	}
	if diff.Summary.TotalChanges != 6 {
		t.Errorf("expected 6 total changes, got %d", diff.Summary.TotalChanges)
	}

	// Verify specific items
	for _, item := range diff.Items {
		if item.Name == "delve" {
			if item.ChangeType != "added" || item.NewVersion != "1.27.1" || item.SizeDelta != "30.8 MiB" {
				t.Errorf("delve parse mismatch: %+v", item)
			}
		}
		if item.Name == "iflow-cli" {
			if item.ChangeType != "removed" || item.OldVersion != "0.5.19" || item.SizeDelta != "-171.5 MiB" {
				t.Errorf("iflow-cli parse mismatch: %+v", item)
			}
		}
		if item.Name == "claude-desktop" {
			if item.ChangeType != "updated" || item.OldVersion != "1.24012.11" || item.NewVersion != "1.30096.1" {
				t.Errorf("claude-desktop parse mismatch: %+v", item)
			}
		}
	}
}

func TestParseFlakeLock(t *testing.T) {
	fakeLock := []byte(`{
  "nodes": {
    "nixpkgs": {
      "locked": {
        "lastModified": 1786534138,
        "narHash": "sha256-fBJMdnKUTUDtfi/BYLr71HLaC9dG382arxLF2Egg2uo=",
        "owner": "NixOS",
        "repo": "nixpkgs",
        "rev": "044bfe75bfe4c7bbe043dc17b5e42ea823b84a09",
        "type": "github"
      },
      "original": {
        "owner": "NixOS",
        "ref": "nixpkgs-unstable",
        "repo": "nixpkgs",
        "type": "github"
      }
    },
    "root": {
      "inputs": {
        "nixpkgs": "nixpkgs"
      }
    }
  },
  "root": "root",
  "version": 7
}`)

	info, err := parseFlakeLock(fakeLock, "/fake/repo")
	if err != nil {
		t.Fatalf("parseFlakeLock failed: %v", err)
	}

	if info.TotalInputs != 1 {
		t.Fatalf("expected 1 input, got %d", info.TotalInputs)
	}

	inp := info.Inputs[0]
	if inp.Name != "nixpkgs" || inp.Owner != "NixOS" || inp.ShortRevision != "044bfe7" {
		t.Errorf("input parsing mismatch: %+v", inp)
	}
}

func TestRebuildJobManager(t *testing.T) {
	mgr := NewRebuildManager()

	job := &RebuildJob{
		ID:          "test-job-1",
		Action:      ActionSwitch,
		Status:      "running",
		Logs:        []string{"line1", "line2"},
		subscribers: make(map[chan string]struct{}),
	}

	mgr.jobs["test-job-1"] = job
	mgr.list = append(mgr.list, job)

	j, ok := mgr.GetJob("test-job-1")
	if !ok || j.ID != "test-job-1" {
		t.Fatalf("GetJob failed")
	}

	ch, unsub := j.Subscribe()
	defer unsub()

	// Drain initial backlog
	select {
	case l := <-ch:
		if l != "line1" {
			t.Errorf("expected line1, got %s", l)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("timeout waiting for initial line1")
	}

	// Broadcast new line
	go j.appendAndBroadcast("line3")

	select {
	case l := <-ch:
		if l != "line2" && l != "line3" {
			t.Errorf("unexpected line %s", l)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("timeout waiting for broadcast")
	}
}
