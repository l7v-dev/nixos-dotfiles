# Unknowns, Assumptions & Unverified Dependencies

> This document tracks all open technical questions, environment-specific unknowns, and external dependencies that cannot be verified solely through static codebase analysis.

---

## ❓ Technical Unknowns

### 1. Fleet Target Reachability & DNS Routing
- **Status:** Unverified
- **Affected Files:** `colmena.nix`, `flake.nix`
- **Context:** `server.l7v.dev`, `builder.l7v.dev`, and `backup.l7v.dev` are declared as target hosts in `colmena.nix`.
- **Unknown:** Are these FQDNs actively registered in public/private DNS, or will deployments initially rely on Tailscale IP mappings (`100.64.0.2`, `100.64.0.3`, `100.64.0.4`)?

### 2. Offsite Backup Backend Strategy
- **Status:** Ambiguous
- **Affected Files:** `modules/capabilities/backup/default.nix`, `secrets/sops/README.md`
- **Context:** The backup module supports both `"s3"` and `"sftp"` backends.
- **Unknown:** Should the production fleet push restic snapshots to an AWS S3 bucket (`l7v-backups` in `eu-central-1`) or to the dedicated SFTP node `backup.l7v.dev:/srv/backup/restic`?

### 3. Tailscale Authentication Method
- **Status:** Optional / Unset
- **Affected Files:** `modules/capabilities/mesh/default.nix`
- **Context:** `l7v.mesh.tailscale.authKeyFile` is set to `null` by default.
- **Unknown:** Is manual browser authentication intended for nodes, or should a reusable pre-authenticated Tailscale auth key secret be introduced to SOPS for zero-touch provisioning?

---

## 🔍 Explicit Assumptions Made in Design

1. **Workstation User Identity:** The primary user is assumed to be `l7v` across both workstation and server nodes.
2. **Local Workstation Services:** Local Redis and PostgreSQL instances on `L7V` laptop are purely for development scratchwork and do not require secret management or replication.
3. **Control Center Security Model:** Phase 1 uses IP CIDR restrictions and Unix socket isolation for the web control panel; Phase 2 will introduce JWT RS256 token verification.
