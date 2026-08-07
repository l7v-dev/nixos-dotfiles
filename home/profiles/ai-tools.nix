# Home profile: AI coding agents and CLI tools.
#
# All AI tools are sourced declaratively — no curl | bash, no npm install -g.
#
# Sources:
#   nixpkgs (unstable)   → claude-code, aider-chat, kiro, kiro-cli
#   llm-agents.nix input → gemini-cli, codex, opencode, goose-cli, claudebox…
#
# RAM note:
#   llm-agents.nix carries its own nixpkgs instance (intentionally not following
#   ours — required for Numtide binary cache hits). To keep evaluation memory
#   usage low we import only the packages we actually use, not the entire set.
#   Packages commented out below are available on demand:
#     nix run github:numtide/llm-agents.nix#<name>
#
# Updating:
#   nix flake update llm-agents   # bump AI tools lock only
#   ./scripts/update.sh           # full system update (RAM-aware)
{ pkgs, inputs, ... }:
let
  system = pkgs.stdenv.hostPlatform.system;

  # Pull exactly the packages we want from llm-agents — nothing more.
  # Accessing .packages.${system}.${name} evaluates only that derivation,
  # not the entire llm-agents package set.
  llmPkgs = inputs.llm-agents.packages.${system};
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
    ];

  # ── Available on demand (nix run github:numtide/llm-agents.nix#<name>) ───
  # Uncomment to install permanently; comment out to save RAM during evaluation:
  #   llmPkgs.copilot-cli      # GitHub Copilot CLI
  #   llmPkgs.qoder-cli        # Qoder AI CLI
  #   llmPkgs.opencode2        # OpenCode 2 preview
  #   llmPkgs.workmux          # git worktrees + tmux for parallel dev
  #   llmPkgs.hunk             # terminal diff viewer for agentic changesets
}
