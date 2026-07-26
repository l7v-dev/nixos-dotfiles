# Contributing Guidelines

Thank you for your interest in contributing to the NixOS Infrastructure repository.

---

## 📜 Governance & System Principles

All contributions must adhere to the core governance directives documented in [`AGENTS.md`](AGENTS.md):

1. **Declarative State Integrity:**
   - Never install packages imperatively via `nix-env` or global system commands.
   - All packages must be declared in `flake.nix`, `devenv.nix`, or appropriate NixOS platform modules.

2. **Secrets Security:**
   - Never commit plain-text API keys, passwords, or certificates.
   - All secrets must be encrypted via SOPS using Age keys (`/etc/age/key`).

3. **Style & Technical Guidelines:**
   - **Documentation:** Technical writing must follow the **Google Developer Documentation Style Guide**.
   - **Shell Scripting:** All bash scripts must strictly follow the **Google Shell Style Guide** (`set -euo pipefail`, POSIX log tags `[INFO]`, `[WARN]`, `[ERROR]`, `[SUCCESS]`, no raw emojis in CLI logs).
   - **Naming Conventions:** All directory and file names must be lowercase `kebab-case`.

---

## 🛠️ Developer Workflow & Validation

Before submitting a Pull Request, run the workspace validation tool to verify code syntax, Nix expression formatting, and dry-run host compilation:

```bash
./scripts/validate.sh L7V
```

### Commit Messages

Use standard Conventional Commit formatting:
- `feat(platform): add new logging capability`
- `fix(services): correct PGBouncer configuration syntax`
- `docs(runbooks): update deployment guide`
- `chore(repo): align formatting with style guide`
