# Operational Runbook: Disaster Recovery

> **Target:** System Recovery, Btrfs Rollback & Bare-Metal Restore

---

## 1. Local Btrfs Snapshot Rollback
```bash
# List snapshots
snapper -c root list

# Revert specific configuration
snapper -c root undochange <prev>..<curr> /path/to/file
```

---

## 2. Remote Restic Backup Restoration
```bash
# List snapshots in repository
restic snapshots

# Restore entire snapshot
restic restore <snapshot-id> --target /mnt/restore
```
