package apps

import (
	"os"
	"path/filepath"
	"testing"
)

func TestModularCatalogRegistry(t *testing.T) {
	apps := GetRegisteredCatalog()

	if len(apps) < 17 {
		t.Fatalf("Expected at least 17 background services, got %d", len(apps))
	}

	expectedServices := []string{
		"nginx",
		"tailscale",
		"forgejo",
		"vaultwarden",
		"conduit",
		"atticd",
		"panel-agent",
		"prometheus",
		"loki",
		"promtail",
		"fail2ban",
		"postgresql",
		"buildkite-agent",
		"restic-backup",
		"libvirtd",
		"microvm-coding-agent",
		"vibe-kanban",
	}

	foundMap := make(map[string]Application)
	for _, a := range apps {
		foundMap[a.ID] = a
	}

	for _, expectedID := range expectedServices {
		app, ok := foundMap[expectedID]
		if !ok {
			t.Errorf("Missing expected service in catalog: %s", expectedID)
			continue
		}
		if app.Name == "" {
			t.Errorf("Service %s has empty Name", expectedID)
		}
		if app.Category == "" {
			t.Errorf("Service %s has empty Category", expectedID)
		}
		if app.Provenance.DeclaredIn == "" {
			t.Errorf("Service %s has empty Provenance.DeclaredIn", expectedID)
		}
	}

	// Verify NO interactive CLI tools are present in background service catalog
	disallowedInteractiveTools := []string{
		"colmena", "claudebox", "cc-sdd", "gemini-cli", "codex", "aider", "claude-code", "opencode",
	}
	for _, tool := range disallowedInteractiveTools {
		if _, exists := foundMap[tool]; exists {
			t.Errorf("Disallowed interactive CLI tool '%s' found in background services catalog", tool)
		}
	}
}

func TestDynamicManifestLoader(t *testing.T) {
	tmpDir := t.TempDir()

	// 1. Non-existent dir returns nil, nil
	res, err := LoadManifestsFromDir(filepath.Join(tmpDir, "nonexistent"))
	if err != nil || len(res) != 0 {
		t.Fatalf("Expected empty result for non-existent dir, got err=%v, len=%d", err, len(res))
	}

	// 2. Create valid JSON manifest
	manifestJSON := `{
		"id": "custom-redis",
		"name": "Custom In-Memory Redis",
		"description": "Dynamic Redis service loaded from disk",
		"category": "database",
		"status": "stopped",
		"access_level": "internal_only",
		"systemd_unit": "redis.service"
	}`
	if err := os.WriteFile(filepath.Join(tmpDir, "redis.json"), []byte(manifestJSON), 0644); err != nil {
		t.Fatalf("Failed to write test manifest: %v", err)
	}

	loaded, err := LoadManifestsFromDir(tmpDir)
	if err != nil {
		t.Fatalf("LoadManifestsFromDir failed: %v", err)
	}
	if len(loaded) != 1 {
		t.Fatalf("Expected 1 manifest loaded, got %d", len(loaded))
	}
	if loaded[0].ID != "custom-redis" {
		t.Errorf("Expected ID custom-redis, got %s", loaded[0].ID)
	}
}
