# Skill: GitHub Repository Adoption & Playground Protocol

> [!NOTE]
> This skill defines the protocol for pulling external GitHub repositories safely into NixOS environment without polluting system global state.

---

## 1. Playground Location Standard
All external testing and sandbox repositories must reside in:
`/home/l7v/dev/sandboxes/playgrounds/<repository-name>`

---

## 2. Automated Adoption Workflow (`adopt-repo.sh`)
```bash
./scripts/adopt-repo.sh <github-url-or-slug-or-directory>
```

### Steps Performed Automatically:
1. Clones repository into playground workspace.
2. Scans for hardcoded secrets, private keys, and API tokens.
3. Detects language stack (Node.js, Python, Rust, Go, Java).
4. Generates declarative `devenv.nix`, `flake.nix`, `.envrc`, and `AGENTS.md`.
5. Authorizes environment via `direnv allow`.
