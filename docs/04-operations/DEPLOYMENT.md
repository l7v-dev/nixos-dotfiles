# Deployment Guide & Fleet Operations

> **Scope:** Workstation builds (`nh os switch`), multi-node remote deployments (`colmena`), and rollback procedures.

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
