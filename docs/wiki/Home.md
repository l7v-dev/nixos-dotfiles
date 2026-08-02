# 📚 L7V NixOS System Architecture & Technical Wiki

Welcome to the official technical wiki for the **L7V NixOS Systems Architecture & Infrastructure Repository**. This wiki contains comprehensive documentation, architecture blueprints, operational runbooks, desktop layout specifications, security practices, and CLI tooling guides.

---

## 🗺️ Wiki Navigation Index

| Topic | Description | Link |
| :--- | :--- | :--- |
| **System Architecture** | Multi-host Flake layout, layer hierarchy (`infrastructure`, `capabilities`, `services`, `experience`, `platform`), and node helpers (`mkWorkstation`, `mkServer`). | [System Architecture](System-Architecture.md) |
| **Niri Desktop Environment** | Modular Niri scrollable tiling window manager configuration (`niri/` 8 sub-modules), Noctalia shell integration, spring physics animations, CRT close shader, and Yazi profile. | [Niri Desktop Environment](Niri-Desktop-Environment.md) |
| **Services & Capabilities** | Managed NixOS application services (Forgejo, Vaultwarden, Grafana, Attic) and cross-cutting infrastructure capabilities (PostgreSQL, Restic+S3 backup, Loki/Fluent-bit logging, Matrix/Synapse, Ntfy). | [Services & Capabilities](Services-and-Capabilities.md) |
| **Security & Secrets** | Declarative security model, SOPS + Age key management (`/etc/age/key`), SSH hardening, PKI root certificates, and secret rotation workflows. | [Security & Secrets](Security-and-Secrets.md) |
| **Developer Workflows & CLI** | CLI automation utilities (`aft-init.sh`, `bpt-init.sh`, `adopt-repo.sh`), validation pipeline (`validate.sh`), and system rebuild workflows (`update.sh`). | [Developer Workflows & CLI](Developer-Workflows-and-CLI.md) |
| **Troubleshooting & Operations** | Operational runbooks, system rebuilds & rollbacks, Btrfs subvolume recovery, and common error resolution protocols. | [Troubleshooting & Operations](Troubleshooting-and-Operations.md) |

---

## ⚡ Quick Start Reference

### 1. Validate Codebase
Run the 6-step automated validation suite (`nixfmt`, `statix`, `deadnix`, `shellcheck`, `.mcp.json`, `nix flake check`):
```bash
./scripts/validate.sh L7V
```

### 2. System Rebuild & Switch
Update flake lock and rebuild the system:
```bash
./scripts/update.sh L7V
# Or directly via nh helper alias:
ns
```

### 3. Project Initializers
```bash
# Next.js 16 AFT Agentic Web Application
./scripts/aft-init.sh my-app

# Polyglot Environment (Python / Node / Rust / Go / Java)
./scripts/bpt-init.sh my-api python

# Adopt External GitHub Repository
./scripts/adopt-repo.sh vercel/next.js
```

---

## 🛡️ Key System Governance Directives

1. **Declarative State Integrity:** No imperative package management (`nix-env -i` is forbidden). All packages and services must be declared in `devenv.nix`, `flake.nix`, or system modules.
2. **Zero Plaintext Secrets:** Plain-text API keys or private keys must never be committed. All secrets are SOPS-encrypted with Age keys (`/etc/age/key`).
3. **Kebab-Case Naming:** All files, directories, and custom Nix attributes follow strict `kebab-case` conventions.
