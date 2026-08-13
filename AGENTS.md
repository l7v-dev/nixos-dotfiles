# System Architecture & Governance (NixOS Repository)

> **Context:** This repository (`/home/l7v/dev/projects/company/active/nixos`) manages core NixOS infrastructure, declarative host configurations, system modules, and operational runbooks.

---

## 🛡️ Governance Directives

1. **Declarative State Integrity:**
   - Packages must not be installed imperatively via `nix-env -i` or global system commands.
   - Declare all additions in `devenv.nix`, `flake.nix`, or platform/service modules.

2. **Secrets Security:**
   - Plain-text secrets, API credentials, and private keys must never be committed.
   - Encrypt all secrets using SOPS with Age keys (`/etc/age/key`).

3. **Documentation & Script Standards:**
   - Technical documentation must use clear markdown structure with GitHub alerts (`> [!NOTE]`, `> [!IMPORTANT]`).
   - Bash scripts must use `set -euo pipefail` and POSIX standard log indicators (`[INFO]`, `[WARN]`, `[ERROR]`, `[SUCCESS]`).
   - File names must use lowercase `kebab-case`.

---

## 📂 Repository Layout

```text
/home/l7v/dev/projects/company/active/nixos/   (nixos-dotfiles)
├── AGENTS.md                     # Governance directives and system context
├── .mcp.json                     # Model Context Protocol access config
├── .pre-commit-config.yaml       # Linting and formatting hooks
├── .agents/skills/               # Automation skill definitions
├── docs/                         # Technical documentation tree
│   ├── README.md                 # Master index
│   ├── wiki/                     # Repository Technical Wiki pages
│   ├── runbooks/                 # Operational guides
│   │   └── agent-operations.md  # Agent sandbox, autonomous loop, rollback
│   ├── skills/                   # Developer and automation directives
│   └── architecture/             # Infrastructure architecture
├── templates/
│   └── aft/                      # Next.js 16 Agentic Framework Template
├── scripts/                      # System administration and initializer tools
│   ├── aft-init.sh               # Next.js 16 full-stack project initializer
│   ├── bpt-init.sh               # Polyglot project initializer
│   ├── agent-init.sh             # Agent-friendly project bootstrapper
│   ├── claude-autonomous.sh      # Autonomous agent loop via worktree + tmux
│   ├── adopt-repo.sh             # External repository adoption CLI
│   ├── validate.sh               # System formatting, linting, and build validator
│   ├── update.sh                 # Flake update and rebuild script
│   ├── age-check.sh              # SOPS and Age key verification tool
│   ├── bootstrap.sh              # Host key bootstrapper
│   └── secrets-rotate.sh         # SOPS secret re-encryption script
├── hosts/                        # Host configurations (laptop, server, builder, backup)
├── home/                         # Home-Manager user profiles
│   ├── minimal/                  # Headless server home profile
│   ├── workstation/              # Desktop workstation home coordinator
│   └── profiles/                 # Modular application & shell profiles
│       ├── ai-tools.nix          # All AI agents (claudebox, cc-sdd, vibe-kanban…)
│       ├── niri/                 # Modular Niri compositor config
│       └── yazi.nix              # Independent Yazi file manager profile
├── modules/                      # All NixOS modules — consolidated
│   ├── capabilities/             # Infrastructure building blocks
│   │   ├── backup/               # Restic + rclone backup
│   │   ├── cache/                # Nix binary cache (nix-serve)
│   │   ├── database/             # PostgreSQL
│   │   ├── logging/              # Loki + Promtail
│   │   ├── messaging/            # Matrix (Conduit)
│   │   ├── metrics/              # Prometheus + Grafana
│   │   ├── reverse-proxy/        # nginx + ACME
│   │   ├── secrets/              # SOPS + Age
│   │   └── virtualisation/       # libvirt + microvm host support
│   ├── experience/               # Desktop environment (workstation only)
│   │   ├── desktop/              # (niri, hyprland, noctalia, greeter, common)
│   │   └── capabilities/         # (audio, bluetooth, clipboard, power, screencast)
│   ├── infrastructure/           # Server base infrastructure
│   │   ├── identity/             # User accounts, sudo
│   │   ├── network/              # Networking, firewall
│   │   ├── security/             # SSH hardening, fail2ban
│   │   └── storage/              # Filesystem, ZFS, mounts
│   ├── platform/                 # Developer platform
│   │   ├── ci/                   # Buildkite agent
│   │   ├── deploy/               # Colmena deployment tools
│   │   ├── documentation/        # mkdocs site
│   │   ├── inventory/            # Asset inventory
│   │   ├── recovery/             # Disaster recovery
│   │   └── fhs.nix               # FHS compatibility layer
│   └── services/                 # User-facing application services
│       ├── attic/                # Nix cache (phase 4 stub)
│       ├── forgejo/              # Git hosting
│       ├── grafana/              # Observability dashboards
│       ├── panel/                # → ../../panel/nix/module.nix (control panel)
│       └── vaultwarden/          # Password manager
├── pkgs/                         # Custom Nix derivations
│   ├── qoder/                    # Qoder IDE
│   └── qoder-cli/                # Qoder CLI (pinned, fast-release)
├── panel/                        # NixOS control panel (was: l7v-panel)
│   ├── apps/
│   │   ├── agent/                # Go backend — REST/SSE API (systemd socket-activated)
│   │   └── web/                  # Next.js 16 frontend
│   ├── packages/ui/              # Shared UI component library
│   ├── nix/                      # Panel-specific NixOS configuration
│   │   ├── pkgs/
│   │   │   ├── panel-agent/      # Go binary derivation
│   │   │   └── panel-frontend/   # Next.js derivation
│   │   └── module.nix            # NixOS service module (agent + nginx)
│   └── flake.nix                 # Panel dev shell (Go 1.25 + Node 22 + pnpm)
├── lib/                          # Nix utility functions
│   ├── mkWorkstation.nix
│   ├── mkServer.nix
│   └── serverModules.nix
└── secrets/                      # SOPS-encrypted secrets
    └── sops/
```

│   └── virtualisation/           # libvirt + microvm host support
├── platform/                     # System platform modules
└── services/                     # Managed NixOS services
```

---

## ⚙️ CLI Utilities

### 1. Initialize Next.js 16 Project (AFT)
```bash
./scripts/aft-init.sh <project-name> [target-dir]
```

### 2. Initialize Polyglot Project (BPT)
```bash
./scripts/bpt-init.sh <project-name> [python|node|rust|go|java|minimal]
```

### 3. Initialize Agent-Friendly Project
```bash
./scripts/agent-init.sh <project-name> [python|node|rust|go|minimal]
```
Creates: `flake.nix`, `devenv.nix`, `.envrc`, `CLAUDE.md`, `AGENTS.md`

### 4. Run Autonomous Agent Loop
```bash
./scripts/claude-autonomous.sh <task-slug> "<prompt>" [max-iterations] [agent]
# agent: claude (default) | codex | gemini
```

### 5. Adopt Repository (ADOPT)
```bash
./scripts/adopt-repo.sh <github-url-or-slug>
```

### 6. Validate Codebase
```bash
./scripts/validate.sh L7V
```

---

## 🤖 Agent Workflow

> [!IMPORTANT]
> Always work inside a dev shell. Never install packages globally.

### Standard Workflow

```bash
# 1. Enter the project
cd ~/dev/projects/company/active/<project>
direnv allow        # activates nix develop or devenv automatically

# 2. Run the agent (choose a tier — see sandbox section)
claudebox           # Tier 1: sandboxed daily use

# 3. Validate before committing
./scripts/validate.sh L7V     # for this repo
devenv tasks run validate      # for sub-projects

# 4. Rollback if needed
nh os switch --rollback
```

### Nix-Specific Rules for Agents

- `git add <new-file>.nix` **before** `nh os switch` — flakes only see git-tracked files.
- Use `nh os switch` instead of `sudo nixos-rebuild switch`.
- systemd services require explicit `WorkingDirectory` and `Environment = ["PATH=..."]`.
- `nixos-rebuild switch` does **not** restart running services — use `systemctl restart <svc>`.

---

## 🔒 Agent Sandbox Tiers

| Tier | Tool | Risk Level | Persistence |
|------|------|-----------|-------------|
| **1** | `claudebox` | Low — trusted code | Host filesystem |
| **2** | `microvm -r coding-agent` | High — untrusted/unknown | Ephemeral (VM) |
| **3** | `claude-autonomous.sh` | Unattended | Isolated git worktree |

Full details: `docs/runbooks/agent-operations.md`

### Enable Tier 2 (microvm) on Workstation

```nix
# hosts/laptop/default.nix
l7v.virtualisation = {
  enable = true;
  microvm.enable = true;   # adds microvm.host + boot kernel modules
};
```

---

## 🧰 AI Tools Installed

Managed via `home/profiles/ai-tools.nix` — all sourced declaratively from nixpkgs or llm-agents.nix.

| Tool | Source | Purpose |
|------|--------|---------|
| `claude-code` | nixpkgs | Anthropic Claude Code |
| `aider-chat` | nixpkgs | Multi-model pair programmer |
| `gemini-cli` | llm-agents.nix | Google Gemini CLI |
| `codex` | llm-agents.nix | OpenAI Codex CLI |
| `opencode` | llm-agents.nix | Multi-model terminal agent |
| `goose-cli` | llm-agents.nix | Block/Square Goose agent |
| `claudebox` | llm-agents.nix | Sandboxed Claude Code runner |
| `cc-sdd` | llm-agents.nix | Spec-driven development harness |
| `vibe-kanban` | llm-agents.nix | Multi-agent Kanban board |
| `openskills` | llm-agents.nix | Universal skills loader |
| `kiro-cli` | platform/pkgs/kiro-cli | Kiro IDE CLI |

**Try without installing:**
```bash
nix run github:numtide/llm-agents.nix#<tool-name>
```

**Update AI tools only:**
```bash
nix flake update llm-agents && nh os switch
```

---

## 💡 Code & Script Guidelines

- **Shell Scripts:** Use `#!/usr/bin/env bash` with `set -euo pipefail`. Use standard log prefixes `[INFO]`, `[WARN]`, `[ERROR]`, `[SUCCESS]`.
- **Nix Expressions:** Format using `nixfmt-rfc-style` and pass `statix check`.
- **Markdown:** Use concise headers, technical tables, and standard GitHub alert blocks.
- **New Nix modules:** Must use `lib.mkEnableOption` or explicit `lib.mkOption` gate.
- **SOPS secrets:** Must declare `owner` and `mode`.
