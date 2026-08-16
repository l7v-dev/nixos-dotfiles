# CI/CD Pipelines & Automated Validation

> **Scope:** Pre-commit hooks, local validation scripts, Forgejo Actions runners, and autonomous agent loops.

---

## 🛡️ 1. 7-Step Local Validation Pipeline (`scripts/validate.sh`)

Every step in `validate.sh` is fatal and fails fast:

```text
[1/7] nixfmt formatting check     ──> nixfmt --check across all tracked *.nix files
[2/7] statix lint                 ──> statix check --config .statix.toml .
[3/7] deadnix unused code         ──> deadnix --fail .
[4/7] shellcheck on scripts       ──> shellcheck --severity=warning scripts/*.sh
[5/7] .mcp.json syntax check      ──> jq -e . .mcp.json
[6/7] NixOS module eval           ──> Checks stateVersion, hostName, nixos.label
[7/7] dry-run build for host      ──> nix build ".#nixosConfigurations.L7V...toplevel" --dry-run
```

Execute validation anytime before committing:
```bash
./scripts/validate.sh L7V
```

---

## 🤖 2. Autonomous Agent Loop (`scripts/claude-autonomous.sh`)

Launches unattended AI coding agent loops inside an isolated git worktree:

```bash
./scripts/claude-autonomous.sh <task-slug> "<prompt>" [max-iterations] [agent]
```

### Key Safety Guarantees:
- **Worktree Isolation:** Changes occur in an isolated `/tmp/agent-worktree-*` directory on branch `agent/<task-slug>`.
- **Detached Tmux Session:** Runs in background tmux session `agent-<task-slug>`.
- **Automated Validation:** After each iteration, `validate.sh` executes. If validation succeeds, the loop terminates early.
- **Monitoring & Attach:**
  ```bash
  tmux attach -t agent-<task-slug>        # Interactive attach
  tmux attach -t agent-<task-slug> -r     # Read-only spectator
  tmux kill-session -t agent-<task-slug>  # Abort session
  ```
- **Merge or Cleanup:**
  ```bash
  git merge agent/<task-slug>             # Accept agent changes
  git worktree remove --force /tmp/...    # Clean up worktree
  ```

---

## 🏗️ 3. Forgejo Actions Runner (`modules/platform/ci/default.nix`)

Enabled on the `builder` host:
- **Runner Engine:** Docker container daemon spawning ephemeral workflow containers.
- **Token Secret:** Decrypted from `ci/runner_token` via SOPS.
- **Local Testing:** Supports `act` CLI for running GitHub / Forgejo Actions workflows locally.
