# Operational Runbook: Agent Operations & Autonomous Loops

> **Target:** AI Agent Sandboxing, Worktree Loops, and Multi-Agent Orchestration

---

## 1. Autonomous Loop via Worktree & Tmux
```bash
./scripts/claude-autonomous.sh <task-slug> "<prompt>" [max-iterations] [agent]
```

### Session Control:
```bash
# Attach interactively
tmux attach -t agent-<task-slug>

# Watch read-only
tmux attach -t agent-<task-slug> -r

# Terminate session
tmux kill-session -t agent-<task-slug>
```

---

## 2. Agent Sandboxing Tiers

| Tier | Tool / Method | Persistence | Isolation Level |
| :--- | :--- | :--- | :--- |
| **Tier 1** | `claudebox` | Host filesystem | Standard process sandbox |
| **Tier 2** | `microvm -r coding-agent` | Ephemeral VM | Complete hardware/kernel boundary |
| **Tier 3** | `claude-autonomous.sh` | Isolated worktree | Detached git worktree branch |
