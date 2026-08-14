#!/usr/bin/env bash
# update.sh — Updates flake lock and rebuilds NixOS configuration.
#
# Usage:
#   ./scripts/update.sh          # update all inputs + rebuild L7V
#   ./scripts/update.sh L7V      # explicit host
#   SKIP_REBUILD=1 ./scripts/update.sh   # update lock only
#
# RAM-saving flags:
#   --max-jobs 1   one derivation at a time (no parallel builds)
#   --cores 2      each derivation uses at most 2 CPU cores
#   These defaults are conservative for a 7-8 GB workstation.
#   Override with: MAX_JOBS=4 CORES=8 ./scripts/update.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${1:-L7V}"
MAX_JOBS="${MAX_JOBS:-3}"
CORES="${CORES:-3}"

cd "$REPO_ROOT"

echo "[INFO] Updating flake inputs..."
# Update inputs one at a time to avoid evaluating everything simultaneously.
# llm-agents.nix is updated separately last because it carries its own nixpkgs.
nix flake update nixpkgs
nix flake update nixpkgs-stable
nix flake update home-manager
nix flake update home-manager-stable
nix flake update sops-nix
nix flake update niri-flake
nix flake update noctalia
nix flake update microvm
echo "[INFO] Updating llm-agents.nix (separate nixpkgs, may take a moment)..."
nix flake update llm-agents
echo "[SUCCESS] All flake inputs updated."

if [[ "${SKIP_REBUILD:-0}" == "1" ]]; then
  echo "[INFO] SKIP_REBUILD=1 detected. Skipping rebuild."
  exit 0
fi

echo "[INFO] Rebuilding ${HOST} (max-jobs=${MAX_JOBS}, cores=${CORES})..."
nh os switch . -- --max-jobs "${MAX_JOBS}" --cores "${CORES}"

echo "[SUCCESS] System updated and switched to new generation."
