# Comprehensive Feature Inventory

> This inventory catalogs all capabilities, user-facing services, desktop features, AI tools, and operational systems implemented in the repository.

---

## 🖥️ 1. Workstation & Desktop Features (`hosts/laptop`)

| Feature Area | Technology / Tool | Purpose | Configuration Location |
| :--- | :--- | :--- | :--- |
| **Compositor** | Niri (Wayland) | Infinite horizontal scrollable tiling window manager | `home/profiles/niri/` |
| **Desktop Shell** | Noctalia | Custom Wayland status bar, widget layer & lock screen | `home/profiles/noctalia.nix` |
| **Display Server** | Wayland + XWayland | Pure Wayland environment with X11 fallback compatibility | `modules/experience/desktop/common/` |
| **Audio Engine** | PipeWire + WirePlumber | Low-latency pro-audio subsystem with ALSA/Pulse/JACK emulation | `modules/experience/capabilities/audio/` |
| **Graphics & Video** | Mesa + AMD VA-API | Hardware-accelerated 3D rendering and video decode (Radeon) | `hosts/laptop/default.nix` |
| **CPU Tuning** | `auto-cpufreq` | Adaptive governor switching (powersave on battery, performance on AC) | `hosts/laptop/default.nix` |
| **App Compatibility**| `nix-ld` + `envfs` | Dynamic linker shim allowing prebuilt non-Nix binaries to run | `hosts/laptop/default.nix` |
| **Terminal UX** | Kitty, Alacritty, WezTerm | GPU-accelerated terminals themed in Catppuccin Mocha | `home/profiles/shell.nix` |
| **Shell & Prompt** | Zsh + Powerlevel10k | Rich developer shell with autosuggestions, syntax highlighting, FZF | `home/profiles/shell.nix` |

---

## 🤖 2. AI Coding Agents & Multi-Agent Ecosystem (`home/profiles/ai-tools.nix`)

| Category | Agent / Utility | Description | Source |
| :--- | :--- | :--- | :--- |
| **Core Pair Programmers** | `claude-code`, `aider-chat` | Anthropic Claude terminal agent and multi-model CLI pair programmer | `nixpkgs` |
| **Dedicated IDEs** | `kiro`, `kiro-cli`, `kiro-crew` | Kiro Agent IDE, CLI, and multi-agent desktop orchestrator | `nixpkgs` / `pkgs/` |
| **Enterprise Assistants**| `antigravity-cli`, `qoder-cli` | Google Antigravity developer SDK and pinned Qoder assistant | `llm-agents.nix` / `pkgs/` |
| **Autonomous CLI Agents**| `codex`, `gemini-cli`, `opencode`, `goose-cli`, `crush`, `droid` | Fast multi-model terminal coding agents | `llm-agents.nix` |
| **Agent Sandboxing** | `claudebox`, `nono`, `fence`, `microvm` | Kernel-enforced and microVM isolated execution environments | `llm-agents.nix` / `microvm` |
| **Spec-Driven Dev** | `cc-sdd`, `openspec`, `spec-kit` | Spec-driven development harnesses for autonomous agent workflows | `llm-agents.nix` |
| **Workflow / Kanban** | `vibe-kanban`, `beads`, `workmux` | AI-supervised issue trackers, Kanban boards, and worktree managers | `llm-agents.nix` |
| **Code Review & Diff** | `coderabbit-cli`, `crit`, `tuicr`, `hunk` | Pre-flight AI code reviews and terminal PR diff viewers | `llm-agents.nix` |

---

## 🎛️ 3. Control Center (`panel/`)

| Module | Endpoint Domain | Capabilities |
| :--- | :--- | :--- |
| **Cockpit / Dashboard** | `/api/v1/health`, `/metrics` | Real-time CPU, RAM, Disk, Load, Network graphs with threshold alerts |
| **Services Manager** | `/api/v1/services` | View systemd units, start, stop, restart, enable, disable services |
| **Containers Manager**| `/api/v1/containers` | Podman/Docker containers, images (pull/prune), volumes, networks, exec |
| **Applications Hub** | `/api/v1/apps` | System application lifecycle, dependencies audit, and service logs |
| **System Terminal** | `/api/v1/terminal` | Multi-tab PTY terminal session manager via xterm.js over WebSockets |
| **NixOS Maintenance** | `/api/v1/nixos` | Generations list, diff inspection, rollback, GC, live `nh os switch` |
| **Package Explorer** | `/api/v1/packages` | Interactive search across nixpkgs packages and NixOS system options |
| **File Manager** | `/api/v1/fs` | Full web file explorer: upload, download, edit, chmod, zip/tar archive |
| **Fleet Orchestration**| `/api/v1/fleet` | Multi-node status inspection and remote Colmena deployment trigger |
| **Security Center** | `/api/v1/security` | SOPS key verification, fail2ban unban actions, VPN toggles, audit |

---

## 🌐 4. Managed Server Services (`modules/services/`)

| Service | Public FQDN | Backend Port | Core Dependencies |
| :--- | :--- | :--- | :--- |
| **Forgejo** | `git.l7v.dev` | 3000 | PostgreSQL 16 (Unix socket), Nginx ACME |
| **Grafana** | `grafana.l7v.dev` | 3001 | SQLite, Prometheus datasource, Nginx ACME |
| **Vaultwarden** | `vault.l7v.dev` | 8222 | SQLite, Restic backup exporter, Nginx ACME |
| **Control Panel** | `panel.l7v.dev` | 3002 | Next.js server, Go `panel-agent` socket, Nginx ACME |
| **Binary Cache** | `cache.l7v.dev` | 5000 | `nix-serve` signed binary cache (SOPS signing key) |
