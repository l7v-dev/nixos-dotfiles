# NixOS Infrastructure & Systems Architecture

> L7V Enterprise NixOS Flake & Developer Environment Infrastructure

---

## 📚 Technical Documentation Hub
All operational guides, developer skill protocols, and architecture documentation are structured under [`docs/`](docs/README.md) adhering to Google Technical Writing standards:

- 📘 **[Operational Runbooks](docs/runbooks/)** (`deploy-guide`, `secrets-management`, `disaster-recovery`, `service-operations`, `developer-workflows`)
- 💡 **[Developer & AI Agent Skills](docs/skills/)** (`project-init`, `playground-adoption`, `aft-template`)
- 🏛️ **[Infrastructure Architecture](docs/architecture/)** (`system-overview`)

---

## 🛠️ CLI Utilities & Initializers (`scripts/`)

| Script | Purpose | Command Example |
| :--- | :--- | :--- |
| `aft-init.sh` | Full-Stack Next.js 16 AFT Project Initializer | `./scripts/aft-init.sh my-app` |
| `bpt-init.sh` | Base Polyglot Project Initializer (Python, Node, Rust, Go) | `./scripts/bpt-init.sh my-api python` |
| `adopt-repo.sh` | GitHub Repository Adoption & Playground Converter | `./scripts/adopt-repo.sh vercel/next.js` |
| `validate.sh` | System Flake Linting, Formatting, & Build Verification | `./scripts/validate.sh L7V` |
| `update.sh` | Flake Lock Update & System Rebuild | `./scripts/update.sh L7V` |
