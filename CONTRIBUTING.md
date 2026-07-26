# Contributing Guidelines

Thank you for contributing to the NixOS Infrastructure repository.

---

## 📜 System & Code Standards

All contributions must follow the core governance rules documented in [`AGENTS.md`](AGENTS.md):

1. **Declarative State Integrity:**
   - Packages must be declared in `flake.nix`, `devenv.nix`, or platform modules. Do not install packages imperatively via `nix-env`.

2. **Secrets Protection:**
   - Plain-text credentials or keys must not be committed. Encrypt all secrets using SOPS and Age keys (`/etc/age/key`).

3. **Code & Script Formatting:**
   - **Documentation:** Use clear headers, technical terminology, and GitHub alert syntax (`> [!NOTE]`, `> [!IMPORTANT]`).
   - **Shell Scripting:** Use `set -euo pipefail` and POSIX standard log indicators (`[INFO]`, `[WARN]`, `[ERROR]`, `[SUCCESS]`).
   - **Naming Conventions:** Lowercase `kebab-case` for file and directory names.

---

## 🛠️ Verification Workflow

Run workspace validation prior to committing changes:

```bash
./scripts/validate.sh L7V
```

### Commit Format

Follow standard Conventional Commit formatting:
- `feat(platform): add new logging module`
- `fix(services): correct PGBouncer configuration`
- `docs(runbooks): update deployment guide`
- `chore(repo): update flake inputs`
