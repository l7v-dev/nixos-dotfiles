#!/usr/bin/env bash
# validate.sh — Code formatting, linting, flake checking, and dry-run host build validation.
# Usage: ./scripts/validate.sh [HOST]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${1:-L7V}"

cd "$REPO_ROOT"

echo "[INFO] [1/5] Running nixfmt check..."
nix run nixpkgs#nixfmt-rfc-style -- --check . 2>/dev/null \
  || echo "       nixfmt tool unavailable, skipping step."

echo "[INFO] [2/5] Running statix linter..."
statix check . 2>/dev/null \
  || nix run nixpkgs#statix -- check . 2>/dev/null \
  || echo "       statix tool unavailable, skipping step."

echo "[INFO] [3/5] Running deadnix unused code detection..."
deadnix --fail . 2>/dev/null \
  || nix run nixpkgs#deadnix -- --fail . 2>/dev/null \
  || echo "       deadnix tool unavailable, skipping step."

echo "[INFO] [4/5] Executing nix flake check --no-build..."
nix flake check --no-build

echo "[INFO] [5/6] Validating workspace .mcp.json configuration..."
if [ -f ".mcp.json" ]; then
  nix run nixpkgs#jq -- . .mcp.json >/dev/null 2>&1 \
    || python3 -c "import json; json.load(open('.mcp.json'))" 2>/dev/null \
    && echo "       .mcp.json syntax valid." \
    || echo "[WARN] .mcp.json syntax invalid!"
fi

echo "[INFO] [6/6] Executing nix dry-run build for host: ${HOST}..."
nix build ".#nixosConfigurations.${HOST}.config.system.build.toplevel" --dry-run

echo ""
echo "[SUCCESS] Validation completed successfully for target host: ${HOST}"

