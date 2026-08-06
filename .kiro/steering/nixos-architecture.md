---
inclusion: always
---

# L7V NixOS Platform — Architecture Steering

This repository manages a capability-first NixOS infrastructure for the l7v platform. Always read this context before proposing or implementing any changes.

## Channel Strategy

| Target | Channel | Rationale |
|--------|---------|-----------|
| Workstation (L7V laptop) | `nixos-unstable` | Latest kernels, Wayland compositors, dev toolchains |
| Servers (server, builder, backup) | `nixos-25.05` (stable) | Deterministic upgrades, long-term stability |

## 5-Layer Architecture

```
infrastructure/   Core OS: boot, network, security, identity, storage
capabilities/     Reusable infra services: database, backup, logging, metrics, secrets, cache, messaging, virtualisation
services/         User-facing apps: forgejo, grafana, vaultwarden, attic
experience/       Workstation GUI: Niri, Noctalia, audio, bluetooth, clipboard, screencast  [NEVER on servers]
platform/         Developer tooling: CI runner, deploy tooling, FHS env, inventory, docs, recovery
```

## Key Invariants

- **Secrets**: All secrets are encrypted with SOPS + age. Key file: `/etc/age/key`. Never commit plaintext secrets.
- **Capabilities are opt-in**: Every capability uses `l7v.<cap>.enable = true`. No config is emitted when disabled.
- **Role-to-capability mapping**: Defined in `lib/serverModules.nix`. This is the single source of truth — edit there, not in individual host files.
- **Servers never import `experience/`**: The experience layer contains GUI modules that are incompatible with headless servers.
- **Qoder IDE is workstation-only**: Gated by `!config.l7v.infrastructure.isServer` in `platform/default.nix`.
- **Pentesting tools are opt-in**: `l7v.home.workstation.enableSecurityTools = true` in the relevant host config.

## Service Port Map

| Service | Port |
|---------|------|
| Forgejo | 3000 |
| Grafana | 3001 |
| Vaultwarden | 8222 |
| Prometheus | 9090 |
| Node exporter | 9100 |
| Nginx exporter | 9113 |
| Postgres exporter | 9187 |
| Systemd exporter | 9558 |
| Loki | 3100 |
| nix-serve cache | 5000 |
| Matrix/Synapse | 8008 |
| ntfy | 2586 |
| PgBouncer | 6432 |

## Deployment

```bash
colmena apply --on @production   # all production hosts
colmena apply --on server        # single host
colmena build                    # build without deploying
```

Local workstation rebuild:
```bash
nh os switch        # alias: ns
sudo nixos-rebuild switch --flake /etc/nixos#L7V
```

## Secrets Management

```bash
# Bootstrap a new host
./scripts/bootstrap.sh <HOSTNAME>

# Add key to .sops.yaml, then re-encrypt
sops updatekeys secrets/sops/secrets.yaml

# Edit secrets interactively
sops secrets/sops/secrets.yaml

# Verify age key and SOPS alignment
./scripts/age-check.sh
```

## Validation

```bash
./scripts/validate.sh L7V   # nixfmt + statix + deadnix + shellcheck + flake check
nix flake check --no-build
```

## Module Authoring Rules

1. Every module must use `lib.mkEnableOption` or an explicit `lib.mkOption` gate.
2. Hard dependencies between modules must be expressed as NixOS `assertions`.
3. All sops secrets must declare `owner` and `mode`.
4. Activation scripts that read sops secrets must declare `deps = [ "setupSecrets" ]`.
5. All comments in `.nix` files must be in English.
6. Shell scripts must use `#!/usr/bin/env bash` with `set -euo pipefail`.

## AI Coding Tools

All AI tools are managed declaratively — no `curl | bash`, no `npm install -g`.

### Profile: `home/profiles/ai-tools.nix`

| Tool | Source | Notes |
|------|--------|-------|
| `kiro` (CLI) | `platform/pkgs/kiro-cli` | Custom tarball derivation — replaces the install script |
| `kiro-ide` | `home/profiles/kiro-ide.nix` | GUI IDE (.deb derivation) |
| `kiro-crew` | `home/profiles/kiro-crew.nix` | AppImage wrapper |
| `claude-code` | nixpkgs | Anthropic terminal agent |
| `aider-chat` | nixpkgs | Multi-model pair programmer |
| `gemini-cli` | `llm-agents.nix` | Google Gemini CLI |
| `codex` | `llm-agents.nix` | OpenAI Codex CLI |
| `opencode` | `llm-agents.nix` | Multi-model terminal agent |
| `copilot-cli` | `llm-agents.nix` | GitHub Copilot terminal |
| `qoder-cli` | `llm-agents.nix` | Qoder AI CLI |
| `goose-cli` | `llm-agents.nix` | Block/Square Goose agent |
| `cc-sdd` | `llm-agents.nix` | Spec-driven development harness |
| `vibe-kanban` | `llm-agents.nix` | Multi-agent Kanban board |
| `claudebox` | `llm-agents.nix` | Sandboxed Claude Code runner |
| `openskills` | `llm-agents.nix` | Universal skills loader |

### llm-agents.nix flake input

- **Repo**: `github:numtide/llm-agents.nix` — auto-updated daily
- **Binary cache**: `cache.numtide.com` (key: `niks3.numtide.com-1:DTx8wZduET09hRmMtKdQDxNNthLQETkc/yaX7M4qK0g=`)
- **Does NOT follow our nixpkgs** — intentional, ensures cache hits
- **Try without installing**: `nix run github:numtide/llm-agents.nix#<tool>`

### Updating AI tools

```bash
# Bump llm-agents.nix only (fast — just the AI tools lock)
nix flake update llm-agents

# Bump everything
nix flake update

# Then rebuild
nh os switch
```

### Kiro CLI derivation maintenance

When a new Kiro CLI version ships:
1. Find the tarball URL at `https://kiro.dev/docs/getting-started/installation/`
2. Compute hash: `nix-prefetch-url --unpack <url>`
3. Update `version`, `url`, `sha256` in `platform/pkgs/kiro-cli/default.nix`
4. Validate: `./scripts/validate.sh L7V`

## MCP Servers Available

- **filesystem**: workspace file access
- **mcp-nixos**: real-time NixOS package/option lookup (prevents hallucination)
- **chrome-devtools**: browser automation
