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
/home/l7v/dev/projects/company/active/nixos/
├── AGENTS.md                     # Governance directives and system context
├── .mcp.json                     # Model Context Protocol access config
├── .pre-commit-config.yaml       # Linting and formatting hooks
├── .agents/skills/               # Automation skill definitions
├── docs/                         # Technical documentation tree
│   ├── README.md                 # Master index
│   ├── wiki/                     # Repository Technical Wiki pages
│   ├── runbooks/                 # Operational guides
│   ├── skills/                   # Developer and automation directives
│   └── architecture/             # Infrastructure architecture
├── templates/
│   └── aft/                      # Next.js 16 Agentic Framework Template
├── scripts/                      # System administration and initializer tools
│   ├── aft-init.sh               # Next.js 16 full-stack project initializer
│   ├── bpt-init.sh               # Polyglot project initializer
│   ├── adopt-repo.sh             # External repository adoption CLI
│   ├── validate.sh               # System formatting, linting, and build validator
│   ├── update.sh                 # Flake update and rebuild script
│   ├── age-check.sh              # SOPS and Age key verification tool
│   ├── bootstrap.sh              # Host key bootstrapper
│   └── secrets-rotate.sh         # SOPS secret re-encryption script
├── hosts/                        # Host configurations (L7V, server, builder)
├── home/                         # Home-Manager user profiles
│   ├── minimal/                  # Headless server home profile
│   ├── workstation/              # Desktop workstation home coordinator
│   └── profiles/                 # Modular application & shell profiles
│       ├── niri/                 # Modular Niri compositor config (input, layout, binds...)
│       └── yazi.nix              # Independent Yazi file manager profile
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

### 3. Adopt Repository (ADOPT)
```bash
./scripts/adopt-repo.sh <github-url-or-slug>
```

### 4. Validate Codebase (VALIDATE)
```bash
./scripts/validate.sh L7V
```

---

## 💡 Code & Script Guidelines
- **Shell Scripts:** Use `#!/usr/bin/env bash` with `set -euo pipefail`. Use standard log prefixes `[INFO]`, `[WARN]`, `[ERROR]`, `[SUCCESS]`.
- **Nix Expressions:** Format using `nixfmt-rfc-style` and pass `statix check`.
- **Markdown:** Use concise headers, technical tables, and standard GitHub alert blocks.
