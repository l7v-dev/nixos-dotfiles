# Home profile: AI coding agents and CLI tools.
#
# All AI tools are sourced declaratively — no curl | bash, no npm install -g.
#
# Sources:
#   nixpkgs (unstable)   → claude-code, aider-chat, kiro, kiro-cli
#   llm-agents.nix input → all tools from github:numtide/llm-agents.nix
#   pkgs/                → qoder-cli (pinned — updated faster than llm-agents.nix)
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
#   2. nix-prefetch-url <linux-x64-url>
#   3. Update version + sha256 in pkgs/qoder-cli/default.nix
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
  qoderCli = pkgs.callPackage ../../pkgs/qoder-cli { };
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

      # ══════════════════════════════════════════════════════════════════════
      # AI CODING AGENTS
      # ══════════════════════════════════════════════════════════════════════
      llmPkgs.amp # Sourcegraph Amp — agentic coding research preview
      llmPkgs.antigravity-cli # Google Antigravity agentic dev platform
      llmPkgs.claw-code # Claude Code rewrite in Rust (claw-code)
      llmPkgs.cline # autonomous coding agent CLI
      # code: conflicts with VSCode bin/code — nix run github:numtide/llm-agents.nix#code
      llmPkgs.codex # OpenAI Codex CLI
      llmPkgs.copilot-cli # GitHub Copilot terminal agent (v1.0 GA)
      llmPkgs.crush # Cursor terminal agent (glamorous TUI)
      llmPkgs.droid # Factory AI Droid — AI dev agent for terminal
      llmPkgs.eca # Editor Code Assistant — editor-agnostic AI pair programming
      llmPkgs.forgecode # AI-enhanced terminal dev environment
      llmPkgs.gemini-cli # Google Gemini CLI
      llmPkgs.gitclaw # universal git-native multimodal AI agent (gitagent)
      llmPkgs.goose-cli # Block/Square Goose (Apache 2.0)
      llmPkgs.grok # xAI Grok agentic coding tool
      # iflow-cli: removed from llm-agents.nix upstream
      llmPkgs.jules # Google async coding agent (terminal)
      llmPkgs.junie # JetBrains Junie CLI
      llmPkgs.kilocode-cli # open-source Roo Code terminal agent
      llmPkgs.kimi-code # Moonshot Kimi Code
      llmPkgs.letta-code # memory-first coding agent (MemGPT)
      llmPkgs.mimo-code # open-source coding agent with cross-session memory
      llmPkgs.mistral-vibe # Mistral Devstral — open-source coding agent
      llmPkgs.nanocoder # beautiful local-first coding agent
      llmPkgs.oh-my-codex # multi-agent orchestration for Codex CLI
      llmPkgs.oh-my-opencode # multi-model orchestration for OpenCode
      llmPkgs.omp # terminal coding agent with multi-model support
      llmPkgs.opencode # AI coding agent built for the terminal
      llmPkgs.opencode2 # OpenCode 2 preview
      llmPkgs.openfang # open-source Agent OS in Rust (OpenFang)
      llmPkgs.pi # terminal coding agent with multi-model support
      # prime-agent: not yet available on x86_64-linux upstream
      llmPkgs.qwen-code # Alibaba Qwen3-Coder CLI
      llmPkgs.vix # sleek, fast, token-efficient AI coding agent
      llmPkgs.zaly # hackable terminal coding agent

      # ══════════════════════════════════════════════════════════════════════
      # AI ASSISTANTS
      # ══════════════════════════════════════════════════════════════════════
      llmPkgs.aionui # desktop/WebUI cowork app — AI agents as local assistant
      llmPkgs.hermes-agent # self-improving AI agent by Nous Research
      llmPkgs.ironclaw # secure personal AI assistant (data protection)
      llmPkgs.localgpt # local AI assistant with persistent markdown memory
      llmPkgs.openclaw # personal AI assistant — any OS, any platform
      llmPkgs.picoclaw # tiny, fast, deployable-anywhere AI assistant
      llmPkgs.vessel-browser # agent-oriented browser with MCP control
      llmPkgs.zeroclaw # fast, small, fully autonomous AI assistant infrastructure

      # ══════════════════════════════════════════════════════════════════════
      # DESKTOP & GUI APPS
      # ══════════════════════════════════════════════════════════════════════
      llmPkgs.claude-desktop # Claude.ai official desktop app (MCP, projects, artifacts)
      llmPkgs.gitbutler # Git client for simultaneous multi-branch workflow
      llmPkgs.hermes-desktop # desktop companion for Hermes Agent
      llmPkgs.openspecui # visual UI for spec-driven development
      llmPkgs.paseo-desktop # voice-controlled desktop for AI coding agents
      # cursor-agent: conflicts with playwright-core (index.js) — nix run github:numtide/llm-agents.nix#cursor-agent
      # t3code-desktop: broken on x86_64-linux upstream

      # ══════════════════════════════════════════════════════════════════════
      # CLAUDE CODE ECOSYSTEM
      # ══════════════════════════════════════════════════════════════════════
      llmPkgs.aperant # autonomous multi-agent coding framework (Claude AI)
      llmPkgs.cc-sdd # spec-driven development harness
      llmPkgs.cc-switch-cli # all-in-one assistant switcher (Claude/Codex/Gemini)
      llmPkgs.ccstatusline # customizable status line formatter for Claude Code
      llmPkgs.claude-code-router # route Claude Code to any LLM provider
      llmPkgs.claudebox # sandboxed Claude Code runner
      llmPkgs.oh-my-claudecode # multi-agent orchestration for Claude Code

      # ══════════════════════════════════════════════════════════════════════
      # ACP ECOSYSTEM
      # ══════════════════════════════════════════════════════════════════════
      llmPkgs.claude-agent-acp # ACP-compatible Claude Code SDK agent
      llmPkgs.codex-acp # ACP-compatible Codex App Server agent

      # ══════════════════════════════════════════════════════════════════════
      # USAGE ANALYTICS
      # ══════════════════════════════════════════════════════════════════════
      llmPkgs.agentsview # local-first viewer and analytics for agent sessions
      llmPkgs.ccusage # analyze Claude Code token usage and costs
      llmPkgs.entire # capture AI agent sessions linked to code changes
      llmPkgs.mindwalk # 3D visualization replay of coding-agent sessions

      # ══════════════════════════════════════════════════════════════════════
      # WORKFLOW & PROJECT MANAGEMENT
      # ══════════════════════════════════════════════════════════════════════
      llmPkgs.agent-deck # AI agent command center
      llmPkgs.aven # local-first task manager for power users and agents
      llmPkgs.backlog-md # project collaboration tool for humans + AI in git
      llmPkgs.beads # distributed issue tracker for AI-supervised coding
      llmPkgs.beads-rust # fast Rust port of beads (local-first issue tracker)
      llmPkgs.beads-viewer # graph-aware TUI for Beads issue tracker
      llmPkgs.bernstein # multi-agent orchestrator — spawn & coordinate parallel agents
      llmPkgs.but # GitButler CLI — virtual branches + AI-assisted git workflow
      llmPkgs.chainlink # lean issue tracker CLI for AI-assisted development
      # gascity: conflicts with graphviz bin/gc — nix run github:numtide/llm-agents.nix#gascity
      llmPkgs.gastown # multi-agent workspace manager (Gas Town)
      llmPkgs.gnhf # orchestrator that keeps coding agents running while you sleep
      llmPkgs.herdr # terminal workspace manager for AI coding agents
      llmPkgs.mardi-gras # TUI for Beads issue tracking (parade-inspired)
      llmPkgs.openspec # spec-driven development for AI coding assistants
      llmPkgs.ralph-tui # AI agent loop orchestrator TUI
      llmPkgs.sidecar # terminal-based development companion for coding agents
      llmPkgs.spec-kit # GitHub Spec Kit CLI — bootstrap projects for SDD
      llmPkgs.swamp # deterministic automation for AI agents
      llmPkgs.td # minimalist CLI for tracking tasks across AI coding sessions
      llmPkgs.vibe-kanban # Kanban board for Claude Code / Codex / Gemini CLI agents
      llmPkgs.workmux # git worktrees + tmux for zero-friction parallel dev

      # ══════════════════════════════════════════════════════════════════════
      # CODE REVIEW
      # ══════════════════════════════════════════════════════════════════════
      llmPkgs.annot # human-in-the-loop annotation tool for AI workflows
      llmPkgs.code-review-graph # local knowledge graph for token-efficient code review
      llmPkgs.coderabbit-cli # AI-powered code review CLI
      llmPkgs.crit # local-first review tool for agent plans, diffs, and web pages
      llmPkgs.cubic # AI code review CLI — fast pre-flight review before push
      llmPkgs.hunk # terminal diff viewer for agentic changesets
      llmPkgs.jscpd # copy/paste detector for programming source code
      llmPkgs.open-code-review # AI-powered code review CLI
      llmPkgs.plannotator # interactive plan and code review tool
      llmPkgs.tuicr # review AI-generated diffs like a GitHub PR in terminal

      # ══════════════════════════════════════════════════════════════════════
      # VOICE & TRANSCRIPTION
      # ══════════════════════════════════════════════════════════════════════
      llmPkgs.handy # fast local transcription using AI models
      llmPkgs.hermes-hud # TUI consciousness monitor for Hermes Agent
      llmPkgs.voxterm # local real-time voice transcription TUI with diarization
      llmPkgs.voxtype # push-to-talk voice-to-text for Wayland

      # ══════════════════════════════════════════════════════════════════════
      # MEMORY & CODE INTELLIGENCE
      # ══════════════════════════════════════════════════════════════════════
      llmPkgs.ck # local-first semantic + hybrid BM25 search for AI and humans
      llmPkgs.codegraph # semantic code intelligence for AI coding agents
      llmPkgs.context-hub # search and retrieve LLM-optimized docs and skills
      llmPkgs.gitnexus # graph-powered code intelligence for AI agents
      llmPkgs.gno # local-first knowledge engine with hybrid search, RAG, MCP
      llmPkgs.icm # persistent memory with hybrid search + temporal decay
      llmPkgs.lean-ctx # context OS — compression, memory, routing for LLMs
      llmPkgs.memvid-cli # AI memory CLI — crash-safe semantic search
      llmPkgs.qmd # mini local search engine for docs and knowledge bases
      llmPkgs.semble # fast, accurate local code search (CLI + MCP)
      llmPkgs.trellis # out-of-the-box engineering framework for AI coding
      llmPkgs.zat # code outline viewer — exported symbols with line numbers

      # ══════════════════════════════════════════════════════════════════════
      # SANDBOXING & ISOLATION
      # ══════════════════════════════════════════════════════════════════════
      llmPkgs.fence # lightweight container-free sandbox for commands
      llmPkgs.nono # kernel-enforced agent sandbox — zero-trust with audit chain

      # ══════════════════════════════════════════════════════════════════════
      # SKILLS & PLUGINS
      # ══════════════════════════════════════════════════════════════════════
      llmPkgs.claude-plugins # CLI tool for managing Claude Code plugins
      llmPkgs.openskills # universal skills loader for AI coding agents
      llmPkgs.skills # open agent skills tool — install + manage across agents
      llmPkgs.skills-installer # install agent skills across multiple AI coding clients

      # ══════════════════════════════════════════════════════════════════════
      # UTILITIES
      # ══════════════════════════════════════════════════════════════════════
      llmPkgs.agent-browser # headless browser automation CLI for AI agents
      llmPkgs.apm # agent package manager — dependency manager for AI agents
      llmPkgs.ax # AI-era curl: fetch, discover, extract
      llmPkgs.cli-proxy-api # unified proxy for OpenAI/Gemini/Claude/Codex APIs
      llmPkgs.codex-auth # CLI tool for switching Codex accounts
      llmPkgs.copilot-language-server # GitHub Copilot Language Server (LSP)
      llmPkgs.ctx # search coding agent history on your machine
      llmPkgs.git-surgeon # git primitives for autonomous coding agents
      llmPkgs.happy-coder # mobile/web client for Codex + Claude Code (voice)
      llmPkgs.mcporter # TypeScript runtime and CLI for MCP
      llmPkgs.officecli # CLI for creating and editing Office Open XML docs
      llmPkgs.parallel-cli # AI-powered web search, extraction, research CLI
      llmPkgs.rtk # CLI proxy reducing LLM token consumption by 60-90%
      llmPkgs.showboat # create executable demo documents for agent work
      llmPkgs.terminal-use # headless virtual terminal for AI agents
      llmPkgs.toon # TOON — Token-Oriented Object Notation for LLM prompts

      # ── Qoder CLI (pkgs/ — pinned to latest upstream release) ─────────────
      qoderCli # Qoder AI terminal coding assistant (v1.1.17)
    ];
}
