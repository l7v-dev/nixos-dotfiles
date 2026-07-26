#!/usr/bin/env bash
# update.sh — Updates flake lockfile inputs and rebuilds NixOS configuration.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${1:-L7V}"

cd "$REPO_ROOT"

echo "[INFO] Updating Nix flake inputs..."
nix flake update

if [[ "${SKIP_REBUILD:-0}" == "1" ]]; then
  echo "[INFO] SKIP_REBUILD=1 flag detected. Skipping system rebuild operation."
  exit 0
fi

echo "[INFO] Rebuilding system configuration for target host: ${HOST}..."
sudo nixos-rebuild switch --flake ".#${HOST}"

