#!/usr/bin/env bash
# update.sh — Updates flake lock, rebuilds NixOS configuration, and commits flake.lock.
#
# Usage:
#   ./scripts/update.sh          # update all inputs, rebuild L7V, commit lock
#   ./scripts/update.sh L7V      # explicit host
#   SKIP_REBUILD=1 ./scripts/update.sh   # update lock & commit without rebuild
#   SKIP_COMMIT=1 ./scripts/update.sh    # update & rebuild without git commit
#
# RAM-saving flags:
#   --max-jobs 3   derivation parallel builds (default: 3)
#   --cores 3      CPU cores per derivation (default: 3)
#   Override with: MAX_JOBS=4 CORES=8 ./scripts/update.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${1:-L7V}"
MAX_JOBS="${MAX_JOBS:-3}"
CORES="${CORES:-3}"

cd "$REPO_ROOT"

echo "[INFO] Updating flake inputs..."
# Update inputs one at a time to avoid evaluating everything simultaneously.
nix flake update nixpkgs
nix flake update nixpkgs-stable
nix flake update home-manager
nix flake update home-manager-stable
nix flake update sops-nix
nix flake update niri-flake
nix flake update noctalia
nix flake update microvm
nix flake update gomod2nix
echo "[INFO] Updating llm-agents.nix (separate nixpkgs, may take a moment)..."
nix flake update llm-agents
echo "[SUCCESS] All flake inputs updated."

# Check if flake.lock actually changed
LOCK_CHANGED=0
if ! git diff --quiet flake.lock; then
  LOCK_CHANGED=1
  echo "[INFO] flake.lock has been updated with new package versions."
else
  echo "[INFO] No changes in flake.lock (all inputs are already up to date)."
fi

if [[ "${SKIP_REBUILD:-0}" == "1" ]]; then
  echo "[INFO] SKIP_REBUILD=1 detected. Skipping rebuild."
else
  echo "[INFO] Rebuilding ${HOST} (max-jobs=${MAX_JOBS}, cores=${CORES})..."
  nh os switch . -- --max-jobs "${MAX_JOBS}" --cores "${CORES}"
  echo "[SUCCESS] System updated and switched to new generation."
fi

# Git add and commit if lock file changed and SKIP_COMMIT is not set
if [[ "${LOCK_CHANGED}" == "1" ]] && [[ "${SKIP_COMMIT:-0}" != "1" ]]; then
  echo "[INFO] Committing flake.lock update..."
  git add flake.lock
  git commit -m "chore(flake): update dependencies"
  echo "[SUCCESS] Committed updated flake.lock."
elif [[ "${LOCK_CHANGED}" == "1" ]]; then
  echo "[INFO] SKIP_COMMIT=1 detected. Skipping git commit for flake.lock."
fi
