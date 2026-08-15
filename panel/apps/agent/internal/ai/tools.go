package ai

import (
	"context"
	"os/exec"
	"strings"
	"sync"
	"time"
)

var defaultCatalog = []AIToolInfo{
	// ── Core Coding Agents ───────────────────────────────────────────────────
	{
		Name:        "Claude Code",
		BinaryName:  "claude",
		Description: "Anthropic official agentic coding assistant for terminal",
		Category:    CategoryCodingAgent,
		SandboxTier: SandboxTierClaudebox,
		Source:      "nixpkgs",
	},
	{
		Name:        "Claudebox",
		BinaryName:  "claudebox",
		Description: "Sandboxed Claude Code runner with bubblewrap isolation",
		Category:    CategorySandboxing,
		SandboxTier: SandboxTierClaudebox,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "Aider",
		BinaryName:  "aider",
		Description: "AI pair programmer supporting multi-model terminal editing",
		Category:    CategoryCodingAgent,
		SandboxTier: SandboxTierNone,
		Source:      "nixpkgs",
	},
	{
		Name:        "OpenAI Codex CLI",
		BinaryName:  "codex",
		Description: "OpenAI Codex terminal coding assistant with automated iteration",
		Category:    CategoryCodingAgent,
		SandboxTier: SandboxTierWorktree,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "Google Gemini CLI",
		BinaryName:  "gemini",
		Description: "Google Gemini 2.5/3.0 Pro & Flash terminal agent",
		Category:    CategoryCodingAgent,
		SandboxTier: SandboxTierNone,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "OpenCode",
		BinaryName:  "opencode",
		Description: "Multi-model terminal coding agent with interactive TUI",
		Category:    CategoryCodingAgent,
		SandboxTier: SandboxTierNone,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "Goose CLI",
		BinaryName:  "goose",
		Description: "Block/Square open-source extensible coding agent (MCP)",
		Category:    CategoryCodingAgent,
		SandboxTier: SandboxTierNone,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "Qoder CLI",
		BinaryName:  "qodercli",
		Description: "Fast-release pinned AI terminal assistant",
		Category:    CategoryCodingAgent,
		SandboxTier: SandboxTierNone,
		Source:      "pkgs/qoder-cli",
	},
	{
		Name:        "Kiro CLI",
		BinaryName:  "kiro-cli",
		Description: "Kiro AI developer IDE companion CLI",
		Category:    CategoryCodingAgent,
		SandboxTier: SandboxTierNone,
		Source:      "nixpkgs",
	},
	{
		Name:        "GitHub Copilot CLI",
		BinaryName:  "copilot",
		Description: "Official GitHub Copilot CLI for terminal commands and explanations",
		Category:    CategoryCodingAgent,
		SandboxTier: SandboxTierNone,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "Claw Code",
		BinaryName:  "claw-code",
		Description: "Fast Rust-native agentic coding assistant engine",
		Category:    CategoryCodingAgent,
		SandboxTier: SandboxTierNone,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "Crush",
		BinaryName:  "crush",
		Description: "Glamorous terminal coding agent with rich TUI",
		Category:    CategoryCodingAgent,
		SandboxTier: SandboxTierNone,
		Source:      "llm-agents.nix",
	},

	// ── Workflow & Orchestration ─────────────────────────────────────────────
	{
		Name:        "Vibe Kanban",
		BinaryName:  "vibe-kanban",
		Description: "Kanban board for orchestrating Claude Code, Codex, and Gemini tasks",
		Category:    CategoryWorkflow,
		SandboxTier: SandboxTierNone,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "CC-SDD",
		BinaryName:  "cc-sdd",
		Description: "Spec-driven development harness for structured agent tasks",
		Category:    CategoryWorkflow,
		SandboxTier: SandboxTierWorktree,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "Workmux",
		BinaryName:  "workmux",
		Description: "Git worktrees + tmux manager for zero-friction parallel agent coding",
		Category:    CategoryWorkflow,
		SandboxTier: SandboxTierWorktree,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "OpenSkills",
		BinaryName:  "openskills",
		Description: "Universal skills loader for AI coding agents",
		Category:    CategoryWorkflow,
		SandboxTier: SandboxTierNone,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "Bernstein",
		BinaryName:  "bernstein",
		Description: "Multi-agent orchestrator — spawn & coordinate parallel agents",
		Category:    CategoryWorkflow,
		SandboxTier: SandboxTierNone,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "Ralph TUI",
		BinaryName:  "ralph-tui",
		Description: "Interactive TUI loop orchestrator for autonomous agents",
		Category:    CategoryWorkflow,
		SandboxTier: SandboxTierWorktree,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "CCUsage",
		BinaryName:  "ccusage",
		Description: "Analyze Claude Code token usage and cost metrics",
		Category:    CategoryWorkflow,
		SandboxTier: SandboxTierNone,
		Source:      "llm-agents.nix",
	},

	// ── Code Review & Validation ─────────────────────────────────────────────
	{
		Name:        "CodeRabbit CLI",
		BinaryName:  "coderabbit",
		Description: "AI-powered automated code reviewer with heuristic insights",
		Category:    CategoryCodeReview,
		SandboxTier: SandboxTierNone,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "Cubic",
		BinaryName:  "cubic",
		Description: "Pre-flight AI code review CLI before git push",
		Category:    CategoryCodeReview,
		SandboxTier: SandboxTierNone,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "Hunk",
		BinaryName:  "hunk",
		Description: "Terminal diff viewer and analyzer for agentic changesets",
		Category:    CategoryCodeReview,
		SandboxTier: SandboxTierNone,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "TUICR",
		BinaryName:  "tuicr",
		Description: "Review AI-generated diffs like a GitHub PR directly in terminal",
		Category:    CategoryCodeReview,
		SandboxTier: SandboxTierNone,
		Source:      "llm-agents.nix",
	},

	// ── Memory & Code Intelligence ───────────────────────────────────────────
	{
		Name:        "Codegraph",
		BinaryName:  "codegraph",
		Description: "Semantic code intelligence graph for AI agents",
		Category:    CategoryMemoryIntel,
		SandboxTier: SandboxTierNone,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "GitNexus",
		BinaryName:  "gitnexus",
		Description: "Graph-powered code intelligence across repositories",
		Category:    CategoryMemoryIntel,
		SandboxTier: SandboxTierNone,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "GNO",
		BinaryName:  "gno",
		Description: "Local-first knowledge engine with hybrid search, RAG, and MCP",
		Category:    CategoryMemoryIntel,
		SandboxTier: SandboxTierNone,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "Semble",
		BinaryName:  "semble",
		Description: "Fast, accurate local code search engine (CLI + MCP)",
		Category:    CategoryMemoryIntel,
		SandboxTier: SandboxTierNone,
		Source:      "llm-agents.nix",
	},

	// ── Sandboxing & Security ────────────────────────────────────────────────
	{
		Name:        "Nono Sandbox",
		BinaryName:  "nono",
		Description: "Kernel-enforced agent sandbox — zero-trust with audit chain",
		Category:    CategorySandboxing,
		SandboxTier: SandboxTierClaudebox,
		Source:      "llm-agents.nix",
	},
	{
		Name:        "MicroVM Host",
		BinaryName:  "microvm",
		Description: "Tier 2 hardware-isolated ephemeral Linux VM runner",
		Category:    CategorySandboxing,
		SandboxTier: SandboxTierMicroVM,
		Source:      "microvm.nix",
	},
}

type ToolsCatalog struct {
	mu          sync.RWMutex
	cachedTools []AIToolInfo
	lastCheck   time.Time
}

func NewToolsCatalog() *ToolsCatalog {
	return &ToolsCatalog{}
}

// ListTools returns the catalog of AI tools with live path and version checks.
func (tc *ToolsCatalog) ListTools(ctx context.Context) ([]AIToolInfo, error) {
	tc.mu.Lock()
	defer tc.mu.Unlock()

	// Cache for 30 seconds to prevent heavy exec lookups
	if len(tc.cachedTools) > 0 && time.Since(tc.lastCheck) < 30*time.Second {
		res := make([]AIToolInfo, len(tc.cachedTools))
		copy(res, tc.cachedTools)
		return res, nil
	}

	result := make([]AIToolInfo, len(defaultCatalog))
	copy(result, defaultCatalog)

	for i := range result {
		tool := &result[i]
		path, err := exec.LookPath(tool.BinaryName)
		if err == nil {
			tool.Installed = true
			tool.Path = path
			// Try lightweight version flag with 500ms timeout
			cmdCtx, cancel := context.WithTimeout(ctx, 500*time.Millisecond)
			out, vErr := exec.CommandContext(cmdCtx, tool.BinaryName, "--version").Output()
			cancel()
			if vErr == nil {
				vStr := strings.TrimSpace(string(out))
				lines := strings.Split(vStr, "\n")
				if len(lines) > 0 {
					tool.Version = strings.TrimSpace(lines[0])
				}
			}
		} else {
			tool.Installed = false
		}
	}

	tc.cachedTools = result
	tc.lastCheck = time.Now()

	res := make([]AIToolInfo, len(result))
	copy(res, result)
	return res, nil
}
