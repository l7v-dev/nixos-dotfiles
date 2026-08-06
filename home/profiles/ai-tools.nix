# Home profile: AI coding agents and CLI tools.
#
# All AI tools are sourced declaratively — no curl | bash, no npm install -g.
# Sources:
#   - nixpkgs (unstable):      claude-code, aider-chat
#   - llm-agents.nix (input):  gemini-cli, codex, opencode, copilot-cli,
#                               qoder-cli, and any tool added in the future
#   - platform/pkgs/kiro-cli:  Kiro CLI (custom derivation — tarball + autoPatchelf)
#
# Updating AI tools:
#   nix flake update llm-agents          # bump llm-agents.nix to latest
#   nix flake update                     # bump everything
#
# Temporarily trying a tool without installing it:
#   nix run github:numtide/llm-agents.nix#<tool> -- --help
#
# The llm-agents.nix flake intentionally does NOT follow our nixpkgs so its
# binary cache (cache.numtide.com) always hits. This costs a second nixpkgs
# evaluation at build time — an acceptable tradeoff for reproducible pre-builds.
{ pkgs, inputs, ... }:
let
  system = pkgs.stdenv.hostPlatform.system;

  # Convenience accessor — falls back gracefully if a package doesn't exist for
  # this architecture so the build never fails on an unsupported platform.
  llm =
    name:
    inputs.llm-agents.packages.${system}.${name}
      or (builtins.trace "llm-agents.nix: package '${name}' not found for ${system}" null);

  # Filter out any null entries (unsupported arch fallbacks)
  llmPkgs = builtins.filter (p: p != null);

  # Kiro CLI from our own derivation in platform/pkgs/kiro-cli
  kiro-cli = pkgs.callPackage ../../platform/pkgs/kiro-cli { };
in
{
  home.packages =
    (with pkgs; [
      # ── Core agents (nixpkgs) ─────────────────────────────────────────────
      claude-code # Anthropic Claude Code — terminal coding agent
      aider-chat # Aider — AI pair programmer (multi-model)

      # ── Usage analytics ──────────────────────────────────────────────────
      # ccusage  # token/cost tracker — available via: nix run llm-agents#ccusage
    ])
    ++ llmPkgs [
      # ── AI coding agents (llm-agents.nix) ────────────────────────────────
      (llm "gemini-cli") # Google Gemini CLI — Apache 2.0
      (llm "codex") # OpenAI Codex CLI — Apache 2.0
      (llm "opencode") # OpenCode — multi-model terminal agent (MIT)
      (llm "copilot-cli") # GitHub Copilot CLI
      (llm "qoder-cli") # Qoder AI CLI — terminal assistant
      (llm "opencode2") # OpenCode 2 preview
      (llm "goose-cli") # Block/Square Goose — extensible local agent (Apache 2.0)

      # ── Workflow / orchestration ──────────────────────────────────────────
      (llm "cc-sdd") # spec-driven development harness (MIT)
      (llm "vibe-kanban") # Kanban board for multi-agent orchestration (Apache 2.0)
      (llm "workmux") # git worktrees + tmux for parallel dev (MIT)

      # ── Code review ───────────────────────────────────────────────────────
      (llm "hunk") # terminal diff viewer for agentic changesets (MIT)

      # ── Sandboxing ────────────────────────────────────────────────────────
      (llm "claudebox") # sandboxed environment for Claude Code

      # ── Skills / plugins ─────────────────────────────────────────────────
      (llm "openskills") # universal skills loader across agents (Apache 2.0)
    ]
    ++ [
      # ── Kiro CLI (custom derivation) ──────────────────────────────────────
      # curl -fsSL https://cli.kiro.dev/install | bash  ← replaced by this
      kiro-cli
    ];
}
