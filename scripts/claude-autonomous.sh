#!/usr/bin/env bash
# ------------------------------------------------------------------------------
# claude-autonomous.sh — Autonomous agent loop via git worktree + tmux.
#
# Creates an isolated git worktree on a feature branch, launches an agent
# (claude-code by default) in a detached tmux session, and iterates up to
# MAX_ITER times. Each iteration commits progress; the loop breaks early when
# validation passes.
#
# Usage:
#   ./scripts/claude-autonomous.sh <task-slug> "<prompt>" [max-iterations] [agent]
#
# Examples:
#   ./scripts/claude-autonomous.sh add-oauth "Add OAuth2 login to the API" 5
#   ./scripts/claude-autonomous.sh fix-perf "Optimise DB queries" 3 codex
#
# Requirements:
#   - tmux, git, nix (all available in the NixOS dev env)
#   - claude-code or codex in PATH (from home/profiles/ai-tools.nix)
#   - Must be run from inside a git repository
#
# Safety:
#   - Works in an isolated worktree — main branch is never touched
#   - Worktrees are cleaned up automatically when the session exits
#   - Dangerously-skip-permissions is intentional inside the isolated tree
# ------------------------------------------------------------------------------

set -euo pipefail

TASK="${1:?[ERROR] Usage: $0 <task-slug> \"<prompt>\" [max-iterations] [agent]}"
PROMPT="${2:?[ERROR] A prompt string is required as the second argument.}"
MAX_ITER="${3:-5}"
AGENT="${4:-claude}"

readonly TASK PROMPT MAX_ITER AGENT

# ── Validation ────────────────────────────────────────────────────────────────
if ! git rev-parse --git-dir &>/dev/null; then
  echo "[ERROR] Not inside a git repository." >&2
  exit 1
fi

if ! command -v tmux &>/dev/null; then
  echo "[ERROR] tmux is not in PATH. Install via nixpkgs." >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
BRANCH="agent/${TASK}"
WORKTREE="/tmp/agent-worktree-${TASK}-$$"
SESSION="agent-${TASK}"

readonly REPO_ROOT BRANCH WORKTREE SESSION

# ── Resolve agent command ─────────────────────────────────────────────────────
case "$AGENT" in
  claude|claude-code)
    AGENT_CMD="claude --dangerously-skip-permissions --print"
    ;;
  codex)
    AGENT_CMD="codex --yes"
    ;;
  gemini)
    AGENT_CMD="gemini"
    ;;
  *)
    AGENT_CMD="$AGENT"
    ;;
esac

readonly AGENT_CMD

# ── Setup worktree ────────────────────────────────────────────────────────────
echo "[INFO] Creating git worktree: $WORKTREE (branch: $BRANCH)"

if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
  echo "[WARN] Branch '${BRANCH}' already exists — reusing it." >&2
  git worktree add "$WORKTREE" "$BRANCH"
else
  git worktree add "$WORKTREE" -b "$BRANCH"
fi

# ── Cleanup trap ──────────────────────────────────────────────────────────────
cleanup() {
  echo "[INFO] Cleaning up worktree..."
  tmux kill-session -t "$SESSION" 2>/dev/null || true
  git worktree remove --force "$WORKTREE" 2>/dev/null || true
  git branch -d "$BRANCH" 2>/dev/null || true
  echo "[INFO] Cleanup done."
}
# Note: trap only fires on explicit EXIT of this script.
# The tmux session continues after this script exits — cleanup is manual.

# ── Build the loop script ─────────────────────────────────────────────────────
LOOP_SCRIPT="$(mktemp /tmp/agent-loop-XXXXXX.sh)"
cat > "$LOOP_SCRIPT" << LOOP
#!/usr/bin/env bash
set -euo pipefail

cd "$WORKTREE"

echo "[INFO] Agent loop started. Task: ${TASK}, Max iterations: ${MAX_ITER}"
echo "[INFO] Prompt: ${PROMPT}"

VALIDATE_CMD="./scripts/validate.sh L7V"
if [[ ! -x "./scripts/validate.sh" ]]; then
  VALIDATE_CMD="nix flake check --no-build"
fi

for i in \$(seq 1 ${MAX_ITER}); do
  echo ""
  echo "[INFO] ═══ Iteration \$i / ${MAX_ITER} ═══"

  # Run the agent
  if ! ${AGENT_CMD} "${PROMPT}" ; then
    echo "[WARN] Agent exited with non-zero status on iteration \$i."
  fi

  # Commit any changes
  if git diff --quiet && git diff --cached --quiet; then
    echo "[INFO] No changes in iteration \$i — nothing to commit."
  else
    git add -A
    git commit -m "agent(${TASK}): iter \$i" || true
  fi

  # Validate — break early on success
  echo "[INFO] Validating..."
  if \$VALIDATE_CMD 2>&1; then
    echo ""
    echo "[SUCCESS] Validation passed at iteration \$i. Loop complete."
    break
  else
    echo "[WARN] Validation failed at iteration \$i. Continuing..."
    if [[ \$i -eq ${MAX_ITER} ]]; then
      echo "[WARN] Max iterations reached. Manual review required."
    fi
  fi
done

echo ""
echo "[INFO] Branch  : ${BRANCH}"
echo "[INFO] Worktree: ${WORKTREE}"
echo "[INFO] To merge: git -C $REPO_ROOT merge ${BRANCH}"
echo "[INFO] To abort: git worktree remove --force $WORKTREE && git branch -d ${BRANCH}"
LOOP

chmod +x "$LOOP_SCRIPT"

# ── Launch tmux session ───────────────────────────────────────────────────────
echo "[INFO] Launching tmux session: $SESSION"
tmux new-session -d -s "$SESSION" "bash $LOOP_SCRIPT; echo '[INFO] Session complete. Press enter to close.'; read -r _"

echo ""
echo "[SUCCESS] Autonomous agent loop launched."
echo "          Session  : $SESSION"
echo "          Branch   : $BRANCH"
echo "          Worktree : $WORKTREE"
echo ""
echo "          Attach   : tmux attach -t $SESSION"
echo "          Watch    : tmux attach -t $SESSION -r  (read-only)"
echo "          Kill     : tmux kill-session -t $SESSION"
echo ""
echo "          After merge, clean up:"
echo "          git worktree remove --force $WORKTREE"
echo "          git branch -d $BRANCH"
