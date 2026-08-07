# Home profile: AI coding agents and CLI tools.
#
# All AI tools are sourced declaratively — no curl | bash, no npm install -g.
#
# Sources:
#   nixpkgs (unstable)   → claude-code, aider-chat, kiro, kiro-cli
#   llm-agents.nix input → gemini-cli, codex, opencode, goose-cli, claudebox…
#   platform/pkgs/       → qoder-cli (pinned — updated faster than llm-agents.nix)
#
# RAM note:
#   llm-agents.nix carries its own nixpkgs instance (intentionally not following
#   ours — required for Numtide binary cache hits). To keep evaluation memory
#   usage low we import only the packages we actually use, not the entire set.
#   Packages commented out below are available on demand:
#     nix run github:numtide/llm-agents.nix#<name>
#
# Updating Qoder CLI:
#   1. Check https://qoder-ide.oss-accelerate.aliyuncs.com/qodercli/channels/manifest.json
#   2. nix-prefetch-url --unpack <linux-x64-url>
#   3. Update version + sha256 in platform/pkgs/qoder-cli/default.nix
#
# Updating other AI tools:
#   nix flake update llm-agents   # bump AI tools lock only
#   ./scripts/update.sh           # full system update (RAM-aware)
{ pkgs, inputs, ... }:
let
  system = pkgs.stdenv.hostPlatform.system;

  # Pull exactly the packages we want from llm-agents — nothing more.
  # Accessing .packages.${system}.${name} evaluates only that derivation,
  # not the entire llm-agents package set.
  llmPkgs = inputs.llm-agents.packages.${system};

  # Qoder CLI is pinned locally so we can track upstream releases without
  # waiting for llm-agents.nix to update.
  qoderCli = pkgs.callPackage ../../platform/pkgs/qoder-cli { };
in
{
  home.packages =
    (with pkgs; [
      # ── Core agents (nixpkgs — zero extra RAM cost) ───────────────────────
      claude-code # Anthropic Claude Code
      aider-chat # multi-model pair programmer

      # ── Kiro (nixpkgs) ────────────────────────────────────────────────────
      kiro # Kiro IDE (GUI) — owns the `kiro` binary
      kiro-cli # Kiro CLI — `kiro-cli` binary
    ])
    ++ [
      # ── AI agents (llm-agents.nix — evaluated selectively) ────────────────
      llmPkgs.gemini-cli # Google Gemini CLI (Apache 2.0)
      llmPkgs.codex # OpenAI Codex CLI (Apache 2.0)
      llmPkgs.opencode # multi-model terminal agent (MIT)
      llmPkgs.goose-cli # Block/Square Goose (Apache 2.0)
      llmPkgs.claudebox # sandboxed Claude Code runner
      llmPkgs.cc-sdd # spec-driven development harness
      llmPkgs.vibe-kanban # multi-agent Kanban board
      llmPkgs.openskills # universal skills loader
      llmPkgs.copilot-cli # GitHub Copilot terminal agent (v1.0)
      llmPkgs.grok # xAI Grok agentic coding tool
      llmPkgs.jules # Google async coding agent (terminal)
      llmPkgs.crush # Cursor terminal agent (glamorous TUI)
      llmPkgs.amp # Sourcegraph Amp — agentic coding research preview
      llmPkgs.mistral-vibe # Mistral Devstral — open-source coding agent
      llmPkgs.workmux # git worktrees + tmux for parallel dev
      llmPkgs.hunk # terminal diff viewer for agentic changesets
      llmPkgs.opencode2 # OpenCode 2 preview
      # cursor-agent: conflicts with playwright-core (index.js collision) — use via: nix run github:numtide/llm-agents.nix#cursor-agent
      llmPkgs.junie # JetBrains Junie CLI
      llmPkgs.kimi-code # Moonshot Kimi Code
      llmPkgs.qwen-code # Alibaba Qwen3-Coder CLI
      llmPkgs.letta-code # memory-first coding agent (MemGPT)
      llmPkgs.forgecode # AI-enhanced terminal dev environment
      llmPkgs.kilocode-cli # open-source Roo Code terminal agent
      llmPkgs.coderabbit-cli # AI-powered code review CLI

      # ── Qoder CLI (platform/pkgs — pinned to latest upstream release) ─────
      qoderCli # Qoder AI terminal coding assistant (v1.1.17)
    ];

  # ── Available on demand (nix run github:numtide/llm-agents.nix#<name>) ───
  # Uncomment to install permanently; comment out to save RAM during evaluation:
  #   llmPkgs.cc-switch-cli    # all-in-one assistant switcher (Claude/Codex/Gemini)
  #   llmPkgs.agent-deck       # AI agent command center TUI
  #   llmPkgs.openspec         # spec-driven dev for AI assistants
  #   llmPkgs.open-code-review # AI-powered code review CLI
}
