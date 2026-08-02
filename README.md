# NixOS Infrastructure & Systems Architecture

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![NixOS Flake](https://img.shields.io/badge/NixOS-Flake-blue?logo=nixos)](flake.nix)

Declarative NixOS host infrastructure, system module templates, and operational automation runbooks.

---

## 📚 Technical Documentation Hub

System documentation, operational runbooks, and skill directives are organized in [`docs/`](docs/README.md):

- **[Repository Technical Wiki](docs/wiki/Home.md)** — Master wiki index, Flake architecture, Niri WM, services, security & troubleshooting.
- **[Operational Runbooks](docs/runbooks/)**: [`deploy-guide`](docs/runbooks/deploy-guide.md), [`secrets-management`](docs/runbooks/secrets-management.md), [`disaster-recovery`](docs/runbooks/disaster-recovery.md), [`service-operations`](docs/runbooks/service-operations.md), [`developer-workflows`](docs/runbooks/developer-workflows.md)
- **[Developer Skills](docs/skills/)**: [`project-init`](docs/skills/project-init.md), [`playground-adoption`](docs/skills/playground-adoption.md), [`aft-template`](docs/skills/aft-template.md)
- **[Architecture](docs/architecture/)**: [`system-overview`](docs/architecture/system-overview.md)

---

## 🛠️ CLI Utilities (`scripts/`)

| Script | Purpose | Usage Example |
| :--- | :--- | :--- |
| `aft-init.sh` | Full-Stack Next.js 16 AFT Project Initializer | `./scripts/aft-init.sh my-app` |
| `bpt-init.sh` | Base Polyglot Project Initializer (Python, Node, Rust, Go) | `./scripts/bpt-init.sh my-api python` |
| `adopt-repo.sh` | GitHub Repository Adoption CLI | `./scripts/adopt-repo.sh vercel/next.js` |
| `validate.sh` | Workspace Linting, Formatting & Dry-Run Build | `./scripts/validate.sh L7V` |
| `update.sh` | Flake Lock Update & System Rebuild | `./scripts/update.sh L7V` |

---

## 📜 Governance & Security

Refer to [`AGENTS.md`](AGENTS.md) for workspace directives, architecture map, and scripting rules.

- [Contributing Guidelines](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [Apache 2.0 License](LICENSE)
