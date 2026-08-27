# Technical Documentation Hub (`docs/`)

> **Repository:** `l7v-dev/nixos-dotfiles`  
> **Architecture:** Capability-First Declarative NixOS Platform & Unified Control Center

---

## 📚 Documentation Tree & Master Index

```text
docs/
├── PLATFORM_OVERVIEW.md         # Platform Architecture, Core Capabilities & Scope
├── CHANGELOG.md                 # System Commit History & Evolution Log
│
├── 00-discovery/                 # Project Discovery & Audit Framework
│   ├── HANDOVER_REPORT.md       # Final Developer Handover & Initial Audit Triage
│   ├── PROJECT_DISCOVERY.md     # Discovery overview & CONFIRMED / UNKNOWN / MISSING triage
│   ├── PROJECT_STATUS.md        # Real-time subsystem health & phase completions
│   ├── DISCOVERY_LOG.md         # Chronological audit log & codebase inspection findings
│   └── UNKNOWNS.md              # Ambiguities, unverified host keys, missing secrets
│
├── 01-architecture/              # Infrastructure & Systems Architecture
│   ├── ARCHITECTURE.md          # Multi-host topology, capability model & NixOS layer design
│   ├── REPOSITORY_MAP.md        # Full repository layout, directory roles & file explanations
│   └── DATA_FLOW.md             # IPC, D-Bus, Unix socket, SSE, WebSocket & metric pipelines
│
├── 02-features/                  # Feature Inventories & Readiness
│   ├── FEATURE_INVENTORY.md     # Complete feature matrix (Desktop, Services, AI Tools, Panel)
│   └── FEATURE_STATUS.md        # Feature completion states (Done, Partial, Stubbed, Planned)
│
├── 03-technical/                 # Deep Technical Specifications
│   ├── API_INVENTORY.md         # Panel-agent REST, SSE, and WebSocket endpoint specifications
│   ├── API_OPERATIONS.md        # Operational interfaces and HTTP listener specifications
│   ├── DATABASE_INVENTORY.md    # PostgreSQL 16, PgBouncer, SQLite, Redis configurations
│   ├── DATABASE_DETAILS.md      # Detailed database schema boundaries, state & backup design
│   ├── DEPENDENCIES.md          # Flake inputs, channels, Go modules, Node/PNPM dependencies
│   └── ENVIRONMENT.md           # Env variables, systemd paths, hardware drivers, Wayland session vars
│
├── 04-operations/                # Deployment & Operations Runbooks
│   ├── DEPLOYMENT.md            # Colmena multi-node deployment, nh os switch, local build workflows
│   ├── CI_CD.md                 # Forgejo Actions runner, validate.sh pipeline, pre-commit hooks
│   ├── MONITORING.md            # Prometheus exporters, scrape configs, Loki/Fluent-bit, Grafana
│   └── BACKUP_RECOVERY.md       # Restic S3/SFTP backups, Snapper btrfs snapshots, rollback strategies
│
├── 05-quality/                   # Quality Assurance, Security & Risk
│   ├── KNOWN_ISSUES.md          # Critical/High/Medium issues and technical debt inventory
│   ├── TESTING_STATUS.md        # Go unit/property tests, Vitest web tests, Statix/Deadnix/Nixfmt checks
│   ├── SECURITY_REVIEW.md       # SOPS/Age key management, Polkit permissions, SSH hardening, fail2ban
│   └── TECHNICAL_DEBT.md        # Known stubs (Attic), hardcoded paths, TODO keys, memory footprint
│
├── 06-roadmap/                   # Roadmap, Priorities & Governance
│   ├── TODO.md                  # Immediate operational tasks & backlog items
│   ├── PRIORITIES.md            # P0 (Critical/Blocker), P1 (High), P2 (Medium), P3 (Future) classification
│   └── RECOMMENDATIONS.md       # Architectural, governance, and CI/CD strategic recommendations
│
└── runbooks/                     # Standard Runbooks (Installed to /etc/l7v/runbooks)
    ├── deploy-guide.md          # Fast deployment cheatsheet
    ├── secrets-management.md    # SOPS/Age encryption and rotation
    ├── disaster-recovery.md     # Bare-metal installation and restore
    ├── service-operations.md    # Managing systemd services and databases
    ├── developer-workflows.md   # Daily dev shell, flake, and devenv workflows
    └── agent-operations.md      # AI agent sandboxes, worktrees, and loop runners
```
