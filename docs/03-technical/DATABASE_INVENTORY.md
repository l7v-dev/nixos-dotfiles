# Database Inventory & Persistence Architecture

> This document catalogs all relational, key-value, embedded, and time-series database configurations in the system.

---

## 🗄️ Database Deployments Overview

| Engine | Version | Deployment Scope | Role / Use Case | Auth / Connection |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL** | 16.x | Production Server | Primary backend for Forgejo, Matrix Synapse | Unix Socket (`/run/postgresql`) |
| **PgBouncer** | 1.22+ | Production Server | Session connection pooler (Port 6432) | MD5 userlist (`database/pgbouncer_userlist`) |
| **PostgreSQL (Local)** | 16.x | Workstation (`L7V`) | Local development scratchwork | Peer auth over Unix socket |
| **Redis** | 7.x | Workstation (`L7V`) | In-memory key-value cache for local dev | Default Unix socket / port 6379 |
| **SQLite3** | Embedded | Production Server | Grafana internal state & Vaultwarden vault | File `/var/lib/vaultwarden/db.sqlite3` |
| **Loki TSDB** | v13 | Production Server | Log index & chunk storage | Directory `/var/lib/loki` |
| **Prometheus TSDB** | 2.x | Production Server | Time-series metric store (30d retention) | Directory `/var/lib/prometheus` |

---

## ⚙️ Configuration Specifications

### 1. PostgreSQL 16 Server (`modules/capabilities/database/default.nix`)
- **Listen Address:** `127.0.0.1` (loopback only).
- **Max Connections:** 200.
- **Shared Buffers:** 256MB.
- **PgBouncer Port:** 6432.
- **Pool Mode:** `session`.
- **Userlist Secret:** `database/pgbouncer_userlist` managed via SOPS.

### 2. Embedded Service Databases
- **Forgejo:** PostgreSQL database `forgejo`, owned by user `forgejo`. Connects over Unix socket `/run/postgresql` (no cleartext passwords).
- **Matrix Synapse:** PostgreSQL database `matrix-synapse`, owned by user `matrix-synapse`.
- **Vaultwarden:** Embedded SQLite. Automatically backed up to `/var/backup/vaultwarden` before restic takes daily offsite snapshots.
