# Backup, Restore & Disaster Recovery Runbook

> **Scope:** Snapper btrfs local snapshots, Restic offsite encrypted backups, database dumps, and disaster recovery procedures.

---

## 💾 1. Local Btrfs Snapshots (Snapper)

Local snapshots protect against configuration errors and file deletions:

```bash
# List local snapper snapshots
snapper -c root list

# Create a manual pre-change snapshot
snapper -c root create -d "Before system kernel update"

# Compare changes between two snapshots
snapper -c root status 12..13
snapper -c root diff 12..13

# Revert a modified file to previous snapshot
snapper -c root undochange 12..13 /etc/nixos/flake.nix
```

---

## ☁️ 2. Offsite Backups via Restic (`capabilities/backup`)

Restic takes daily encrypted backups of `/var/lib`, `/var/backup`, `/etc`, and `/home`.

### Restic CLI Commands:
```bash
# Source restic environment password and AWS credentials
export RESTIC_PASSWORD_FILE=$(sops --decrypt --extract '["backup"]["restic_password"]' /etc/nixos/secrets/sops/secrets.yaml)
export RESTIC_REPOSITORY="s3:s3.amazonaws.com/l7v-backups/restic"

# List snapshots in repository
restic snapshots

# Check repository health
restic check

# Mount repository as read-only virtual filesystem
restic mount /mnt/restic

# Restore a specific snapshot to target directory
restic restore <snapshot-id> --target /tmp/restore
```

---

## 🚨 3. Full Disaster Recovery (Bare-Metal Rebuild)

### Step 1: Boot Minimal NixOS Installer
Boot target machine using NixOS Minimal Live ISO on USB.

### Step 2: Format & Mount Btrfs Subvolumes
```bash
mkfs.fat -F 32 -n boot /dev/nvme0n1p1
mkfs.btrfs -L nixos /dev/nvme0n1p2

mount /dev/nvme0n1p2 /mnt
btrfs subvolume create /mnt/root
btrfs subvolume create /mnt/nix
btrfs subvolume create /mnt/home
btrfs subvolume create /mnt/srv
umount /mnt

mount -o compress=zstd,subvol=root /dev/nvme0n1p2 /mnt
mkdir -p /mnt/{boot,nix,home,srv}
mount /dev/nvme0n1p1 /mnt/boot
mount -o compress=zstd,noatime,subvol=nix /dev/nvme0n1p2 /mnt/nix
mount -o compress=zstd,subvol=home /dev/nvme0n1p2 /mnt/home
mount -o compress=zstd,subvol=srv /dev/nvme0n1p2 /mnt/srv
```

### Step 3: Restore Age Private Key
```bash
mkdir -p /mnt/etc/age
# Copy /etc/age/key from secure offline USB key backup
chmod 600 /mnt/etc/age/key
```

### Step 4: Install System from Git
```bash
nixos-install --flake "github:l7v-dev/nixos-dotfiles#L7V"
```
