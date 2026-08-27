# Deployment Guide & Fleet Operations

> **Scope:** Workstation builds (`nh os switch`), multi-node remote deployments (`colmena`), health checks, logging/monitoring, and rollback procedures.

---

## 💻 1. Local Workstation Deployment (`hosts/laptop`)

Workstations use the modern `nh` helper CLI wrapping `nixos-rebuild`:

```bash
# 1. Enter the repository
cd ~/dev/projects/company/active/nixos

# 2. Stage new files in git (Nix Flakes only read git-tracked files!)
git add -A

# 3. Build and switch to the new configuration
nh os switch

# 4. Or test changes in temporary mode (does not update bootloader)
nh os test

# 5. Clean up old generations (keep last 7 days)
nh clean all --keep 7
```

### Immediate Rollback Procedure
If a switch introduces an issue:
```bash
nh os switch --rollback
```

Post-rollback verification:
```bash
nixos-rebuild list-generations
systemctl --failed
./scripts/validate.sh L7V
```

---

## 🌐 2. Multi-Host Server Deployment via Colmena (`colmena.nix`)

Colmena orchestrates deployments across remote nodes (`server`, `builder`, `backup`) concurrently over SSH:

```bash
# Verify dry-run evaluation across all nodes
colmena build

# Deploy to all production tagged nodes
colmena apply --on @production

# Deploy to a specific node
colmena apply --on server
colmena apply --on builder
colmena apply --on backup

# Upload closures without switching immediately
colmena upload --on server
```

### Pre-requisites for Colmena Deployment:
1. SSH access with root privilege or sudo credentials.
2. Target Age key generated on host via `./scripts/bootstrap.sh <hostname>` and registered in `secrets/sops/.sops.yaml`.
3. Secrets re-encrypted via `sops updatekeys secrets/sops/secrets.yaml`.

---

## 🏥 3. Production Health Checks & Verification

After deploying changes to server nodes, run the following verification checks:

```bash
# 1. Failed systemd services check
systemctl --failed
systemctl status nginx forgejo vaultwarden postgresql pgbouncer

# 2. Public reverse proxy & TLS checks
curl -I https://git.l7v.dev/
curl -I https://vault.l7v.dev/

# 3. Local nginx status
curl http://127.0.0.1/nginx_status

# 4. Open listening ports
ss -ltnp | grep -E ':80|:443|:3000|:8222|:5432|:6432|:9090|:3100|:5000'

# 5. Backup & Recovery timers
systemctl status restic-backups-l7v.timer recovery-check.timer
systemctl start recovery-check.service
```

---

## 📊 4. Logging & Observability

- **Journald:** Configured with `SystemMaxUse=2G` and `MaxRetentionSec=2week`.
- **Loki & Fluent-bit:** Loki listens on `127.0.0.1:3100` on server/builder nodes with systemd journal inputs.
- **Prometheus:** Metrics collector on port `9090` (15s scrape interval, 30d retention). Exporters include `node_exporter` (9100), `systemd_exporter` (9558), `nginx_exporter` (9113), and `postgres_exporter` (9187).

---

## 🛑 5. Operational Deployment Gaps & Triage Matrix

| Gap / Area | Technical Risk | Mitigation / Action Required |
|---|---|---|
| Staging Environment | No staging channel before production promotion | Test locally using `nh os test` / microvm before pushing |
| Hardware Disk UUIDs | Server/builder/backup configs contain `TODO-*` UUID placeholders | Update hardware configurations before bare-metal deployment |
| SOPS Server Recipients | Server Age recipient keys contain placeholders | Run `./scripts/bootstrap.sh <host>` and update `.sops.yaml` |
| Database Migration | Upstream services manage migrations upon startup | Run logical database dump before upgrading service versions |
| Restore Validation | DR recovery procedures require physical validation | Periodically run `recovery-check.service` and verify backups |
