# Repository Map & Directory Layout

> **Root Path:** `/home/l7v/dev/projects/company/active/nixos`  
> **Repository Name:** `l7v-dev/nixos-dotfiles`

---

## 🗂️ Complete Directory Structure

```text
.
├── .agents/                      # Automation skill definitions for AI coding agents
│   └── skills/
│       ├── nixos-system-operations.md
│       └── project-initialization.md
├── .kiro/                        # Kiro IDE and KiroCrew orchestration configuration
├── .mcp.json                     # Model Context Protocol access definitions
├── .pre-commit-config.yaml       # Git pre-commit hooks (nixfmt, statix, deadnix)
├── .statix.toml                  # Statix linter configuration
├── .vscode/                      # VSCode workspace settings & recommended extensions
├── AGENTS.md                     # System architecture directives, agent workflows & governance
├── CODE_OF_CONDUCT.md            # Contributor covenant code of conduct
├── CONTRIBUTING.md               # Guidelines for contributing code
├── LICENSE                       # Apache 2.0 Open Source License
├── README.md                     # Technical hub index & repository overview
├── SECURITY.md                   # Security vulnerability reporting guidelines
├── colmena.nix                   # Colmena multi-host server deployment topology
├── flake.lock                    # Locked input derivations and package revisions
├── flake.nix                     # Flake root: inputs, server definitions, outputs & packages
│
├── docs/                         # Comprehensive 7-tier knowledge architecture
│   ├── 00-discovery/             # Discovery overview, status, log, unknowns
│   ├── 01-architecture/          # System design, repository map, data flows
│   ├── 02-features/              # Feature inventories and readiness states
│   ├── 03-technical/             # API catalogs, databases, dependencies, env vars
│   ├── 04-operations/            # Deployment guides, CI/CD, monitoring, backups
│   ├── 05-quality/               # Testing status, security audit, technical debt
│   ├── 06-roadmap/               # TODO list, prioritized issues, recommendations
│   └── runbooks/                 # Operational runbooks mounted into /etc/l7v/runbooks
│
├── home/                         # Home-Manager user configuration
│   ├── minimal/                  # Headless minimal profile for server users
│   │   └── default.nix
│   ├── workstation/              # Desktop workstation profile coordinator
│   │   └── default.nix
│   └── profiles/                 # Modular user-space application & shell profiles
│       ├── ai-tools.nix          # 100+ AI coding agents, Kiro IDE, and CLI utilities
│       ├── antigravity.nix       # Google Antigravity IDE & MCP runtime profile
│       ├── cursor.nix            # Cursor AI editor integration
│       ├── dev.nix               # Polyglot developer tools (Go, Rust, Node, Python, K8s)
│       ├── git.nix               # Git author details, aliases, and diff helpers
│       ├── hyprland.nix          # Hyprland compositor fallback configuration
│       ├── kiro-crew.nix         # KiroCrew AI Agent desktop app (AppImage wrapper)
│       ├── niri/                 # Niri scrollable-tiling Wayland WM (modular profiles)
│       │   ├── animations.nix
│       │   ├── binds.nix
│       │   ├── default.nix
│       │   ├── input.nix
│       │   ├── layout.nix
│       │   ├── packages.nix
│       │   ├── rules.nix
│       │   └── workspaces.nix
│       ├── noctalia.nix          # Noctalia desktop shell & notification center
│       ├── p10k.zsh              # Powerlevel10k prompt configuration
│       ├── shell.nix             # Zsh aliases, Kitty, Alacritty, FZF, Direnv
│       ├── ssh.nix               # User SSH client configuration
│       ├── theme.nix             # Catppuccin Mocha theme & GTK styling
│       ├── vscode.nix            # VSCode user settings and extensions
│       └── yazi.nix              # Yazi terminal file manager configuration
│
├── hosts/                        # Host definitions
│   ├── backup/                   # Backup target node (SFTP restic repo)
│   │   ├── default.nix
│   │   └── hardware.nix
│   ├── builder/                  # Builder & CI node (Forgejo runner, nix-serve)
│   │   ├── default.nix
│   │   └── hardware.nix
│   ├── laptop/                   # Workstation laptop (L7V) — Niri, AMD GPU, AI tools
│   │   ├── default.nix
│   │   └── hardware.nix
│   └── server/                   # Production server — Web, DB, Observability, Git
│       ├── default.nix
│       └── hardware.nix
│
├── lib/                          # Reusable Nix constructor functions
│   ├── mkServer.nix              # Server builder (nixos-25.05 + microvm host disabled)
│   ├── mkWorkstation.nix         # Workstation builder (nixos-unstable + Niri + AI profiles)
│   └── serverModules.nix         # Shared role-to-capability resolution module list
│
├── modules/                      # NixOS system modules
│   ├── capabilities/             # Cross-cutting infrastructure capabilities
│   │   ├── backup/               # Restic backup capability (S3/SFTP)
│   │   ├── cache/                # nix-serve signed binary cache
│   │   ├── database/             # PostgreSQL 16 + PgBouncer pooler
│   │   ├── default.nix
│   │   ├── logging/              # Loki TSDB v13 + Fluent-bit journal tailing
│   │   ├── mesh/                 # Declarative Tailscale mesh networking
│   │   ├── messaging/            # Postfix SMTP relay, Matrix Synapse, ntfy push
│   │   ├── metrics/              # Prometheus + node/systemd/nginx/postgres exporters
│   │   ├── reverse-proxy/        # Nginx reverse proxy + ACME Let's Encrypt TLS
│   │   ├── secrets/              # sops-nix + Age key infrastructure
│   │   └── virtualisation/       # libvirtd / KVM + microvm.nix host support
│   │
│   ├── experience/               # Workstation desktop experience modules
│   │   ├── capabilities/         # audio (PipeWire), bluetooth, clipboard, notifications, power, screencast
│   │   ├── default.nix
│   │   └── desktop/              # common, greeter (regreet), hyprland, niri, noctalia
│   │
│   ├── infrastructure/           # OS base layer
│   │   ├── boot/                 # systemd-boot (Zen kernel for workstation, 6.6 LTS for server)
│   │   ├── default.nix
│   │   ├── identity/             # user accounts (l7v), timezone (Istanbul), sudo rules
│   │   ├── network/              # NetworkManager (workstation) vs systemd-networkd (server)
│   │   ├── security/             # OpenSSH hardening, fail2ban, sysctl hardening, custom PKI
│   │   └── storage/              # btrfs optimizations, zram swap, smartd, fstrim, LUKS
│   │
│   ├── platform/                 # Developer platform & operational tooling
│   │   ├── ci/                   # Forgejo Actions runner instance with Docker
│   │   ├── default.nix
│   │   ├── deploy/               # Colmena deployment tools & client config
│   │   ├── documentation/        # /etc/l7v/runbooks documentation installer
│   │   ├── fhs.nix               # Steam-run / FHS compatibility layer
│   │   ├── inventory/            # Hardware & asset inventory generator
│   │   └── recovery/             # Snapper btrfs snapshots & restic verification
│   │
│   └── services/                 # User-facing application suites
│       ├── attic/                # Attic binary cache (Phase 4 stub)
│       ├── default.nix
│       ├── forgejo/              # Forgejo Git forge (git.l7v.dev)
│       ├── grafana/              # Grafana dashboards (grafana.l7v.dev)
│       ├── panel/                # Panel module proxy -> ../../panel/nix/module.nix
│       └── vaultwarden/          # Vaultwarden password vault (vault.l7v.dev)
│
├── panel/                        # NixOS Control Center (l7v-panel)
│   ├── apps/
│   │   ├── agent/                # Go 1.25 REST/SSE API daemon (systemd socket-activated)
│   │   └── web/                  # Next.js 15 web interface (React 19, TypeScript, xterm.js)
│   ├── nix/                      # Panel Nix derivations & NixOS module
│   │   ├── module.nix            # Systemd socket/service & Nginx vhost definitions
│   │   └── pkgs/
│   │       ├── panel-agent/      # Go derivation via gomod2nix
│   │       └── panel-frontend/   # Next.js build via fetchPnpmDeps
│   ├── packages/
│   │   └── ui/                   # Shared UI components package (.gitkeep)
│   ├── flake.nix                 # Panel isolated devShell (Go 1.25 + Node 22 + PNPM)
│   ├── package.json              # Monorepo PNPM workspace
│   ├── pnpm-workspace.yaml
│   └── turbo.json                # Turborepo build pipeline
│
├── pkgs/                         # Custom derivations
│   ├── qoder/                    # Qoder IDE (Electron GUI package)
│   └── qoder-cli/                # Pinned Qoder CLI binary
│
├── scripts/                      # System administration and automation CLI utilities
│   ├── adopt-repo.sh             # External repository adoption CLI
│   ├── aft-init.sh               # Next.js 16 full-stack project initializer
│   ├── age-check.sh              # SOPS and Age key verification tool
│   ├── agent-init.sh             # Agent-friendly project bootstrapper
│   ├── bootstrap.sh              # Host Age key generator & SOPS preparation tool
│   ├── bpt-init.sh               # Polyglot project initializer (Python, Node, Rust, Go, Java)
│   ├── claude-autonomous.sh      # Autonomous agent loop via worktree + tmux
│   ├── secrets-rotate.sh         # SOPS secret re-encryption script
│   ├── update.sh                 # Flake lock update and rebuild script
│   └── validate.sh               # 7-step formatting, linting, and build validator
│
├── secrets/                      # Encrypted secrets
│   └── sops/
│       ├── .sops.yaml            # Age key routing rules
│       ├── README.md             # Secret usage reference & IAM guide
│       └── secrets.yaml          # SOPS-encrypted key-value secret store
│
└── templates/                    # Starter project blueprints
    └── aft/                      # Agentic Framework Template (Next.js 16 + Tailwind + MCP)
```
