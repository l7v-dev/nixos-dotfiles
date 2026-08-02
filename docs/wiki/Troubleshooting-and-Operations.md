# 🛠️ Troubleshooting & Operational Guide

[Back to Wiki Home](Home.md)

This page provides diagnostic runbooks, error resolution procedures, and recovery steps for common NixOS system scenarios.

---

## 🔁 System Rebuilds & Rollbacks

### 1. Rebuild & Switch
```bash
# Using nh helper (recommended):
ns

# Or using native nixos-rebuild:
sudo nixos-rebuild switch --flake /etc/nixos#L7V
```

### 2. Test Configuration Without Switching Boot Profile
```bash
nh os test
# Or:
sudo nixos-rebuild test --flake /etc/nixos#L7V
```

### 3. Rollback to Previous System Generation
If a newly built system configuration has issues, roll back immediately:
```bash
sudo nixos-rebuild switch --rollback
```

Or select an earlier generation from the `systemd-boot` menu during host boot.

---

## 🧹 Garbage Collection & Store Cleanup

### Clean Nix Store via `nh`
```bash
nc
# Or directly:
nh clean all
```

### Optimize Nix Store Hardlinks
```bash
nix-store --optimise
```

---

## 🚨 Common Scenarios & Diagnostics

### 1. `nixfmt` / `statix` Validation Failure
- **Symptom:** `./scripts/validate.sh L7V` fails at step 1 or 2.
- **Solution:** Run automatic formatters before validating:
```bash
nixfmt $(git ls-files '*.nix' ':!:templates/**')
statix fix .
```

### 2. `direnv: error .envrc is blocked`
- **Symptom:** `direnv` warning when entering a project directory.
- **Solution:** Execute:
```bash
direnv allow
```

### 3. Missing Age Key (`/etc/age/key`)
- **Symptom:** SOPS error `Failed to decrypt secret` or `SOPS_AGE_KEY_FILE not found`.
- **Solution:** Run the age key health check script:
```bash
./scripts/age-check.sh
# Check permissions:
sudo chmod 600 /etc/age/key
```

### 4. Btrfs Subvolume Snapshot Rollback
If root filesystem corruption occurs, boot into a live environment or rollback subvolume snapshots:
```bash
# Mount root btrfs filesystem:
mount /dev/disk/by-uuid/<ROOT-UUID> /mnt -o subvolid=5

# Rename corrupted root subvolume and restore snapshot:
mv /mnt/root /mnt/root-corrupted
btrfs subvolume snapshot /mnt/snapshots/root-good /mnt/root
```
