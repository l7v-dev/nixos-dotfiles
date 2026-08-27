# Project Status & Subsystem Health Matrix

> **Last Updated:** August 2026  
> **Overall Readiness Score:** 92/100 (Workstation: 98%, Core Infrastructure: 95%, Fleet Deployment: 82%)

---

## 🚦 Subsystem Status Breakdown

```text
┌───────────────────────────────┬─────────────┬──────────────────────────────────────────┐
│ Subsystem                     │ Status      │ Health / Completion Notes                │
├───────────────────────────────┼─────────────┼──────────────────────────────────────────┤
│ 1. Workstation Host (L7V)     │ 🟢 OPERATIONAL │ Niri WM, Zen Kernel, AMD GPU, AI tools   │
│ 2. Panel Backend (Go Agent)   │ 🟢 OPERATIONAL │ 18 packages active, socket activation OK │
│ 3. Panel Frontend (Next.js)   │ 🟢 OPERATIONAL │ 9 dashboard modules, xterm.js PTY WS OK  │
│ 4. Capabilities (Database)    │ 🟢 VERIFIED │ PostgreSQL 16 + PgBouncer configured     │
│ 5. Capabilities (Logging)     │ 🟢 VERIFIED │ Loki v2.8+ (TSDB v13) + Fluent-bit OK    │
│ 6. Capabilities (Metrics)     │ 🟢 VERIFIED │ Prometheus + 4 exporters scoped          │
│ 7. Capabilities (Mesh)        │ 🟢 VERIFIED │ Tailscale declarative overlay configured │
│ 8. Capabilities (Virtualise)  │ 🟢 VERIFIED │ libvirtd + microvm.nix host integration  │
│ 9. Server Node (server)       │ 🟡 READY    │ Configuration ready; awaits bootstrap.sh │
│ 10. Builder Node (builder)    │ 🟡 READY    │ Forgejo runner ready; awaits deploy key  │
│ 11. Backup Node (backup)      │ 🟡 READY    │ SFTP repo ready; awaits storage target   │
│ 12. Secrets Management        │ 🟡 READY    │ Workstation decrypted; Server keys TODO  │
│ 13. Service: Forgejo          │ 🟢 VERIFIED │ Postgres unix socket auth + Nginx ACME   │
│ 14. Service: Grafana          │ 🟢 VERIFIED │ Port 3001, SQLite + Prometheus prov.     │
│ 15. Service: Vaultwarden      │ 🟢 VERIFIED │ Port 8222, tmpfiles admin token OK       │
│ 16. Service: Attic            │ ⚪ STUBBED   │ Phase 4 placeholder (nix-serve active)   │
│ 17. CI/CD & Validation        │ 🟢 VERIFIED │ validate.sh 7-step test pipeline passing │
└───────────────────────────────┴─────────────┴──────────────────────────────────────────┘
```

---

## 📈 Health & Risk Indicators

### High-Confidence Systems
- **Nix Flake Isolation:** Clean separation between unstable channels (workstations) and stable 25.05 release (servers).
- **CLI Validation & Governance:** Fast, deterministic module evaluation and pre-commit checks (`./scripts/validate.sh`).
- **Process & Security Hardening:** Non-root system users, Polkit scoped D-Bus permissions, passwordless sudo strictly restricted to wheel, sysctl network hardening.

### Active Vulnerabilities / Gaps
- **TODO Placeholders in `.sops.yaml`:** If an operator runs `sops updatekeys secrets/sops/secrets.yaml`, SOPS will abort with an unresolvable recipient error.
- **Empty Server Deploy Keys:** Server targets in `colmena.nix` cannot be remotely deployed until `identity.sshKeys` contains valid management public keys.

---

## 🔄 Phase Progression Tracker

- [x] **Phase 1: Single-Host Workstation Foundation** — Niri Wayland, AMD GPU, AI tools, SOPS secrets, Developer tooling.
- [x] **Phase 2: Management & Infrastructure Core** — Flake topology, Colmena orchestration, CLI automation (`nh`, `validate.sh`), system runbooks.
- [x] **Phase 3: Core Service & Infrastructure Modules** — PostgreSQL, PgBouncer, Prometheus, Loki, Vaultwarden, Forgejo, Grafana.
- [ ] **Phase 4: Multi-Node Fleet Deployment** — Physical bootstrap of `server`, `builder`, and `backup` hosts via Colmena; Attic cache migration.
