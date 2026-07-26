# Disaster Recovery & Backup Guide

> [!CAUTION]
> Ensure backup destinations are verified before performing any destructive snapshot revert operation.

---

## 1. Btrfs Snapshot Rollbacks

### List Snapshots
```bash
snapper -c root list
```

### Undo Changes Between Snapshots
```bash
snapper -c root undochange SNAP1..SNAP2
```

---

## 2. Restic Offsite Backups

### Verify Backups & Snapshots
```bash
restic -r sftp:backup@l7v.dev:/srv/restic snapshots
restic -r sftp:backup@l7v.dev:/srv/restic check
```

### Restore Files from Latest Snapshot
```bash
restic -r sftp:backup@l7v.dev:/srv/restic restore latest --target /tmp/restore
```
