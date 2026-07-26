# AI Agent Governance & System Context (NixOS Repository)

> **Context:** This repository (`/home/l7v/dev/projects/company/active/nixos`) manages the core NixOS infrastructure, declarative host configurations, system templates, and operational runbooks.

---

## 🛡️ Core Governance Rules for AI Agents

1. **Declarative State Integrity:**
   - Never install packages imperatively via `nix-env -i` or global system commands.
   - All package additions must be declared in `devenv.nix`, `flake.nix`, or appropriate NixOS modules under `platform/` or `services/`.
2. **Secrets Protection & Security:**
   - Never write plain secrets, API keys, or private certificates into `.nix` or `.md` files.
   - All secrets must be encrypted via SOPS using Age keys (`/etc/age/key`).
3. **Documentation & Code Style Standards (Google Developer Guidelines):**
   - **Technical Writing:** All technical documentation must follow the **Google Developer Documentation Style Guide** under `docs/`.
   - **Shell Scripting:** All bash scripts must strictly follow the **Google Shell Style Guide** (`set -euo pipefail`, POSIX standard log indicators `[INFO]`, `[WARN]`, `[ERROR]`, `[SUCCESS]`, no raw emojis in CLI logs).
   - **Naming Conventions:** File names must be lowercase `kebab-case` (`deploy-guide.md`, `secrets-management.md`, `developer-workflows.md`).

---

## 📂 Repository Navigation Map

```text
/home/l7v/dev/projects/company/active/nixos/
├── AGENTS.md                     # AI Agent Governance Guide (This File)
├── .mcp.json                     # Model Context Protocol File Access Config
├── .pre-commit-config.yaml       # ShellCheck & Nix Pre-Commit Hooks
├── .agents/skills/               # AI Agent System Skill Directives
├── docs/                         # Central Technical Documentation Hub
│   ├── README.md                 # Documentation Master Index
│   ├── runbooks/                 # Operational System Runbooks
│   ├── skills/                   # Developer & AI Agent Skill Guides
│   └── architecture/             # System Infrastructure Architecture
├── templates/
│   └── aft/                      # Next.js 16 Agentic Framework Template
├── scripts/                      # System Administration & Project Initializer Scripts
│   ├── aft-init.sh               # Next.js 16 Full-Stack AI Project Initializer
│   ├── bpt-init.sh               # Base Polyglot Project Initializer
│   ├── adopt-repo.sh             # GitHub Repo Adoption & Playground Converter
│   ├── validate.sh               # System Formatting, Linting & Build Validator
│   ├── update.sh                 # Flake Lock Update & Rebuild Script
│   ├── age-check.sh              # SOPS/Age Key Verification
│   ├── bootstrap.sh              # New Host Key Bootstrap
│   └── secrets-rotate.sh         # SOPS Key Re-encryption Script
├── hosts/                        # Host Configurations (L7V, server, builder)
├── home/                         # Home-Manager & User Profiles (shell.nix, etc.)
├── platform/                     # System Platform Modules (documentation, security)
└── services/                     # Managed NixOS Services (Forgejo, Grafana, Vaultwarden)
```

---

## ⚙️ Key CLI Utilities

### 1. Initialize Next.js 16 Full-Stack AI Project (AFT)
```bash
./scripts/aft-init.sh <project-name> [target-dir]
```

### 2. Initialize Base Polyglot Project (BPT)
```bash
./scripts/bpt-init.sh <project-name> [python|node|rust|go|java|minimal]
```

### 3. Adopt External GitHub Repository (ADOPT)
```bash
./scripts/adopt-repo.sh <github-url-or-slug>
```

### 4. Validate Codebase & Build (VALIDATE)
```bash
./scripts/validate.sh L7V
```

---

## 💡 AI Agent Coding & Style Guidelines
- **Shell Scripts:** Use `#!/usr/bin/env bash` with `set -euo pipefail`. Pass `shellcheck` and `shfmt`. Use `[SUCCESS]`, `[ERROR]`, `[INFO]` log prefixes.
- **Nix Expressions:** Format with `nixfmt-rfc-style` and pass `statix check`.
- **Markdown & Technical Writing:** Follow Google Developer Documentation Style Guide. Use GitHub alerts (`> [!NOTE]`, `> [!IMPORTANT]`) and concise tables.
