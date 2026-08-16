# Operational Runbook: Developer Workflows

> **Target:** Development shells, Flake devShells, Direnv, and project initializers

---

## 1. Project Initializers (`scripts/`)
```bash
# Initialize Next.js 16 AI project (AFT)
./scripts/aft-init.sh my-app

# Initialize polyglot project (BPT)
./scripts/bpt-init.sh my-api python

# Adopt external repository
./scripts/adopt-repo.sh user/repo
```

---

## 2. Isolated Development Environments
```bash
# Allow direnv on directory enter
direnv allow

# One-off ephemeral shell
nix shell nixpkgs#htop

# Project declarative dev shell
nix develop
```
