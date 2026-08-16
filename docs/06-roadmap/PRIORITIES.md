# Execution Priorities & Triage Matrix

> This document prioritizes all architectural, security, and operational improvements by impact and urgency.

---

## 🎯 Priority Quadrant

```text
       HIGH IMPACT
            ▲
            │   [P0] Fix SOPS Placeholders     [P1] Deploy Multi-Host Fleet
            │   [P0] Populate AWS/SFTP Secrets  [P1] Verify Tailscale Mesh
            │
            │
────────────┼─────────────────────────────────────────────────────────────► LOW EFFORT
HIGH EFFORT │
            │   [P2] Panel JWT RS256 Auth      [P2] Extract packages/ui
            │   [P3] Migrate to Attic Cache    [P3] Mock tests for Panel agent
            │
            ▼
       LOW IMPACT
```

---

## 📋 Action Priority Tiers

### Tier 0: Critical Blockers (Do First)
1. **Fix SOPS Placeholder Keys:** Remove or replace `age_TODO_*` in `.sops.yaml` to allow secret rotation and updates without errors.
2. **Configure Backup Credentials:** Add S3 credentials to `secrets.yaml` so Restic automated timers do not fail on first boot.

### Tier 1: Core Functionality (Next Sprint)
1. **Colmena Fleet Provisioning:** Test live SSH bootstrap on physical server hardware.
2. **Tailscale Peer Connect:** Confirm mesh connectivity and internal DNS resolution (`*.mesh` and `*.l7v.internal`).

### Tier 2: Refinements & Hardening (Medium Term)
1. **Panel JWT Auth:** Enable RS256 token verification between Next.js frontend and Go agent.
2. **Monorepo Package Cleansing:** Move components to `@l7v-panel/ui`.

### Tier 3: Future Optimizations (Backlog)
1. **Attic Binary Cache Upgrade:** Replace `nix-serve` when `atticd` achieves stable status in upstream NixOS.
