# NixOS Infrastructure & Technical Documentation Index

Centralized documentation index for L7V NixOS declarative infrastructure and developer automation workflows.

---

## 📂 Documentation Structure

### 📘 1. Operational Runbooks (`docs/runbooks/`)
- [Deployment Guide](runbooks/deploy-guide.md) — Workstation switch and multi-host deployment.
- [Secrets Management](runbooks/secrets-management.md) — SOPS encryption, Age keys, and secret rotation.
- [Disaster Recovery](runbooks/disaster-recovery.md) — Snapshot rollbacks and backup restoration.
- [Service Operations](runbooks/service-operations.md) — Managed services (Forgejo, Grafana, Vaultwarden).
- [Developer Workflows](runbooks/developer-workflows.md) — Project initializers (AFT, BPT) and repository adoption.

### 💡 2. Developer Skills (`docs/skills/`)
- [Project Initialization Protocol](skills/project-init.md) — Standardized project creation rules.
- [Playground & Adoption Protocol](skills/playground-adoption.md) — Repository sandbox adoption protocol.
- [Agentic Framework Template Protocol](skills/aft-template.md) — Next.js 16 AFT boilerplate guide.
- [MCP Management Guide](skills/mcp-management-guide.md) — MCP configuration and diagnostics.

### 🏛️ 3. Infrastructure Architecture (`docs/architecture/`)
- [System Architecture Overview](architecture/system-overview.md) — Flake architecture and module layout.
