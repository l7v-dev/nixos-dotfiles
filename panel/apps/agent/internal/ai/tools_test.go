package ai

import (
	"context"
	"testing"
)

func TestToolsCatalog(t *testing.T) {
	tc := NewToolsCatalog()
	ctx := context.Background()

	tools, err := tc.ListTools(ctx)
	if err != nil {
		t.Fatalf("failed to list tools: %v", err)
	}

	if len(tools) == 0 {
		t.Fatal("expected non-empty AI tools catalog")
	}

	// Verify key tools are listed in catalog
	foundClaude := false
	foundCodex := false
	foundAider := false

	for _, tool := range tools {
		if tool.BinaryName == "claude" {
			foundClaude = true
		}
		if tool.BinaryName == "codex" {
			foundCodex = true
		}
		if tool.BinaryName == "aider" {
			foundAider = true
		}
	}

	if !foundClaude {
		t.Error("expected Claude Code in catalog")
	}
	if !foundCodex {
		t.Error("expected Codex in catalog")
	}
	if !foundAider {
		t.Error("expected Aider in catalog")
	}
}
