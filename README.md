# NixOS Infrastructure & Systems Architecture

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![NixOS Flake](https://img.shields.io/badge/NixOS-Flake-blue?logo=nixos)](flake.nix)
[![Google Style Guide](https://img.shields.io/badge/Style-Google-green)](AGENTS.md)

L7V Enterprise declarative NixOS host infrastructure, system module templates, and operational automation runbooks.

---

## 📚 Technical Documentation Hub

All system documentation, operational runbooks, and developer skill directives are located in [`docs/`](docs/README.md) following the Google Developer Documentation Style Guide:

- **[Operational Runbooks](docs/runbooks/)**: [`deploy-guide`](docs/runbooks/deploy-guide.md), [`secrets-management`](docs/runbooks/secrets-management.md), [`disaster-recovery`](docs/runbooks/disaster-recovery.md), [`service-operations`](docs/runbooks/service-operations.md), [`developer-workflows`](docs/runbooks/developer-workflows.md)
- **[Developer & AI Agent Skills](docs/skills/)**: [`project-init`](docs/skills/project-init.md), [`playground-adoption`](docs/skills/playground-adoption.md), [`aft-template`](docs/skills/aft-template.md)
- **[Infrastructure Architecture](docs/architecture/)**: [`system-overview`](docs/architecture/system-overview.md)

---

## 🛠️ CLI Utilities & Scripts (`scripts/`)

| Script | Purpose | Usage Example |
| :--- | :--- | :--- |
| `aft-init.sh` | Full-Stack Next.js 16 AFT Project Initializer | `./scripts/aft-init.sh my-app` |
| `bpt-init.sh` | Base Polyglot Project Initializer (Python, Node, Rust, Go) | `./scripts/bpt-init.sh my-api python` |
| `adopt-repo.sh` | GitHub Repository Adoption & Playground Converter | `./scripts/adopt-repo.sh vercel/next.js` |
| `validate.sh` | Workspace Linting, Formatting & Dry-Run Build | `./scripts/validate.sh L7V` |
| `update.sh` | Flake Lock Update & System Rebuild | `./scripts/update.sh L7V` |

---

## 📜 Governance & Governance Guidelines

See [`AGENTS.md`](AGENTS.md) for core repository governance rules, system architecture map, and coding standards.

For open-source contribution rules, security policies, and licensing information:
- [Contributing Guidelines](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [Apache 2.0 License](LICENSE)
