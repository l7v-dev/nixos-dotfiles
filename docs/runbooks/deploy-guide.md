# Operational Runbook: Deployment Guide

> **Target:** Workstation (`L7V`) & Server Fleet (`server`, `builder`, `backup`)

---

## 1. Local Workstation Deployment
```bash
# 1. Navigate to workspace
cd ~/dev/projects/company/active/nixos

# 2. Stage all modifications
git add -A

# 3. Apply changes via nh helper
nh os switch

# 4. Immediate rollback if needed
nh os switch --rollback
```

---

## 2. Server Fleet Deployment via Colmena
```bash
# Dry-run build
colmena build

# Deploy to production cluster
colmena apply --on @production

# Deploy to specific host
colmena apply --on server
```
