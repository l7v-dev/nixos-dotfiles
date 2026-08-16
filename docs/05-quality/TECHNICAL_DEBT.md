# Technical Debt & Identified Architectural Stubs

> This document tracks all known code trade-offs, temporary stubs, pending refactors, and performance considerations.

---

## 📌 Identified Technical Debt Items

### 1. `modules/services/attic/default.nix` (Phase 4 Stub)
- **Debt Level:** Low
- **Details:** `services.atticd` is not yet completely stable in standard NixOS 25.05. The module currently issues a runtime warning advising the operator to use `nix-serve` (`l7v.cache`).
- **Remediation Plan:** Transition from `nix-serve` to Attic when upstream stabilizes.

### 2. Placeholder Age Keys in `secrets/sops/.sops.yaml`
- **Debt Level:** Medium (Operational Hazard)
- **Details:** Keys for `server`, `builder`, and `backup` contain `age_TODO_*` placeholder strings. Running `sops updatekeys` will throw an error.
- **Remediation Plan:** Generate keys during `bootstrap.sh` on physical hardware and replace placeholders before re-encrypting.

### 3. Monorepo Shared UI Package (`panel/packages/ui`)
- **Debt Level:** Low
- **Details:** `panel/packages/ui` only contains `.gitkeep`; all UI components currently live directly inside `panel/apps/web/components`.
- **Remediation Plan:** Extract reusable Radix / Tailwind components into `@l7v-panel/ui` for cleaner monorepo separation.

### 4. RAM Overhead During Full Evaluation
- **Debt Level:** Medium
- **Details:** Running `nix flake check` evaluates all 4 system configurations concurrently, which can consume >6GB of RAM on developer laptops.
- **Remediation Plan:** Maintained by `validate.sh` (which only evaluates the workstation host `L7V` locally, leaving remote nodes to Colmena on builder hardware).
