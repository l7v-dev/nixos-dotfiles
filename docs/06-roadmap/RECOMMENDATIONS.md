# Strategic Recommendations & Governance Best Practices

> Long-term management and architectural recommendations for operating and evolving the NixOS platform.

---

## 🏛️ 1. Project Management & Workflow Governance

### A. Strict Git-Worktree Agent Development
- Use `./scripts/claude-autonomous.sh` for complex or speculative AI agent tasks.
- Keep agent changes isolated in feature worktrees (`agent/<feature>`) to prevent repository corruption.
- Never bypass the 7-step `./scripts/validate.sh L7V` check before merging.

### B. Pure Declarative State Integrity
- **Forbidden:** Global imperative installations (`npm install -g`, `pip install`, `cargo install`, `nix-env -i`).
- **Required:** Project-scoped isolated environments via `devenv`, `flake.nix`, or `uv venv`.
- Use `nix shell nixpkgs#<pkg>` for one-off CLI tools.

---

## 🔒 2. Secrets & Access Management

1. **Keep Secrets Decoupled From Flake Evaluation:** Never commit plain text keys or pass secrets via raw Nix strings.
2. **Rotate Age Keys Periodically:** Use `./scripts/secrets-rotate.sh` whenever team members or servers are decommissioned.
3. **Backup `/etc/age/key` Securely:** Store the workstation Age private key offline on encrypted cold storage.

---

## 📈 3. Observability & Fleet Scaling

1. **Standardize Node Exporter Scrapes:** When adding a new server in `flake.nix`, always tag it with the appropriate role (`web`, `db`, `ci`, `backup`) so metrics and logging are automatically configured without manual Prometheus target edits.
2. **Monitor Restic Snapshots via Panel:** Keep the `/cockpit` and `/storage` tabs active to receive visual warnings when disk usage exceeds 80% or when backup timers fail.
