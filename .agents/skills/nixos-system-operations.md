# Skill: NixOS System Operations & Validation

> **For AI Agents:** Use these instructions when executing system validation, flake updates, or rebuild operations.

---

## 1. System Codebase Validation Protocol

Before making or committing changes to `.nix` files or scripts, run:

```bash
./scripts/validate.sh L7V
```

### Steps Performed:
1. `nixfmt` check
2. `statix` lint check
3. `deadnix` unused code check
4. `nix flake check --no-build`
5. `nix build --dry-run`

---

## 2. Flake Lock Update & Rebuild Protocol

```bash
./scripts/update.sh L7V
```

---

## 3. SOPS / Age Key Integrity Verification

```bash
./scripts/age-check.sh
```
