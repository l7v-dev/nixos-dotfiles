# Agent Operations Runbook

> Operational guide for running AI coding agents safely on the l7v NixOS platform.

---

## Overview

This runbook covers three topics:

1. **Sandbox selection** — which tier to use and why
2. **Autonomous loop** — launching unattended agent sessions
3. **Rollback** — recovering from bad agent changes

---

## 1. Sandbox Selection

The platform offers three isolation tiers. Choose the appropriate one based on risk.

| Tier | Tool | When to Use |
|------|------|-------------|
| **1 — Direct** | `claudebox` / agent CLI directly | Your own code, trusted repo, quick iteration |
| **2 — Ephemeral VM** | `microvm -r coding-agent` | Untrusted repo, unknown dependencies, network-sensitive tasks |
| **3 — Isolated worktree** | `claude-autonomous.sh` | Unattended multi-iteration tasks on a separate branch |

### Tier 1 — Direct (claudebox)

`claudebox` runs Claude Code inside a bubblewrap sandbox — filesystem access is scoped to the current project directory and the Nix store (read-only).

```bash
# Enter your project
cd ~/dev/projects/company/active/my-app
direnv allow

# Run agent inside sandbox
claudebox

# Or run a specific agent without installing it
nix run github:numtide/llm-agents.nix#claudebox
```

> [!NOTE]
> `claudebox` is already installed via `home/profiles/ai-tools.nix`. No setup needed.

### Tier 2 — Ephemeral VM (microvm)

For risky work: runs a throwaway NixOS VM. Nothing survives a VM restart except the mounted workspace share.

**Prerequisites** — enable microvm host on the workstation:

```nix
# hosts/laptop/default.nix
l7v.virtualisation = {
  enable = true;
  microvm.enable = true;
};
```

Then rebuild:

```bash
nh os switch
```

**Define a coding VM** (example at `hosts/laptop/microvms/coding-agent.nix`):

```nix
{ inputs, config, pkgs, ... }:
{
  microvm.vms.coding-agent = {
    autostart = false;
    config = {
      imports = [ inputs.microvm.nixosModules.microvm ];

      microvm = {
        vcpu = 4;
        mem = 4096;
        shares = [
          {
            proto = "virtiofs";
            tag = "ro-store";
            source = "/nix/store";
            mountPoint = "/nix/.ro-store";
          }
          {
            # Mount only the project you are working on — not the entire home.
            proto = "virtiofs";
            tag = "workspace";
            source = "/home/l7v/dev/projects/company/active";
            mountPoint = "/workspace";
          }
        ];
      };

      environment.systemPackages = with pkgs; [
        claude-code
        git
        direnv
      ];

      networking.hostName = "coding-agent";
      services.openssh.enable = true;
    };
  };
}
```

**Start and connect:**

```bash
microvm -r coding-agent
ssh coding-agent
cd /workspace/my-app && claude
```

**Tear down:**

```bash
microvm -s coding-agent   # stop
# VM state is ephemeral — nothing persists
```

> [!IMPORTANT]
> Only mount the minimum required workspace path. Do not mount `/home/l7v` wholesale.

### Tier 3 — Isolated Worktree (`claude-autonomous.sh`)

For unattended iteration. See [Section 2](#2-autonomous-loop) below.

---

## 2. Autonomous Loop

`scripts/claude-autonomous.sh` creates a git worktree on a feature branch and runs an agent in a tmux session, committing after each iteration and breaking early when validation passes.

### Basic Usage

```bash
# From the repo root
./scripts/claude-autonomous.sh <task-slug> "<prompt>" [max-iterations] [agent]
```

### Examples

```bash
# 5 iterations with Claude (default)
./scripts/claude-autonomous.sh add-oauth \
  "Add OAuth2 login using next-auth with GitHub provider" \
  5

# 3 iterations with Codex
./scripts/claude-autonomous.sh fix-n1-queries \
  "Fix N+1 database queries in the user listing endpoint" \
  3 codex

# Use Gemini
./scripts/claude-autonomous.sh refactor-auth \
  "Refactor authentication middleware to use JWT" \
  4 gemini
```

### Monitoring the Session

```bash
# Attach (interactive)
tmux attach -t agent-<task-slug>

# Read-only watch
tmux attach -t agent-<task-slug> -r

# Kill the session
tmux kill-session -t agent-<task-slug>
```

### After the Loop Completes

```bash
# Review the branch
git log --oneline agent/<task-slug>
git diff main..agent/<task-slug>

# Merge if satisfied
git merge agent/<task-slug>

# Clean up the worktree and branch
git worktree remove --force /tmp/agent-worktree-<task-slug>-*
git branch -d agent/<task-slug>
```

> [!NOTE]
> The validation step inside the loop runs `./scripts/validate.sh L7V` when
> present in the worktree, or `nix flake check --no-build` as a fallback.

---

## 3. Rollback

### NixOS System Rollback

If `nh os switch` produces a broken system:

```bash
# Roll back to the previous generation
nh os switch --rollback

# Or select a specific generation
sudo nixos-rebuild switch --rollback

# List all generations
nix-env --list-generations --profile /nix/var/nix/profiles/system
```

### Git Worktree Rollback

If the autonomous loop produced unusable commits:

```bash
# Hard reset the worktree branch (not main — safe)
git -C /tmp/agent-worktree-<task>-* reset --hard HEAD~<n>

# Or simply delete the branch and start over
git worktree remove --force /tmp/agent-worktree-<task>-*
git branch -D agent/<task>
```

### Home-Manager Rollback

```bash
# List home-manager generations
home-manager generations

# Activate a previous generation
/nix/var/nix/profiles/per-user/l7v/profile-<n>-link/activate
```

---

## 4. Agent Project Initialisation

Use `agent-init.sh` to bootstrap a new project with all agent-friendly scaffolding:

```bash
# python | node | rust | go | minimal
./scripts/agent-init.sh my-service python
cd ~/dev/projects/company/active/my-service
direnv allow
```

This creates: `flake.nix`, `devenv.nix`, `.envrc`, `CLAUDE.md`, `AGENTS.md`, `.gitignore`.

For a full Next.js 16 project:

```bash
./scripts/aft-init.sh my-webapp
```

For a polyglot project:

```bash
./scripts/bpt-init.sh my-service go
```

All three initializers now emit a `CLAUDE.md` with stack-specific agent rules.

---

## 5. Quick Reference

```bash
# Tier 1 — sandbox runner
claudebox

# Tier 2 — ephemeral VM
microvm -r coding-agent && ssh coding-agent

# Tier 3 — autonomous loop
./scripts/claude-autonomous.sh <slug> "<prompt>" <iters>

# New project bootstrap
./scripts/agent-init.sh <name> <stack>

# Validate everything
./scripts/validate.sh L7V

# System rollback
nh os switch --rollback

# Update AI tools only
nix flake update llm-agents && nh os switch
```

---

## Related Runbooks

- [Secrets Management](./secrets-management.md)
- [Deploy Guide](./deploy-guide.md)
- [Disaster Recovery](./disaster-recovery.md)
