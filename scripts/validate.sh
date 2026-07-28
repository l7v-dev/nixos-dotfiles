#!/usr/bin/env bash
# validate.sh — Formatting, linting, flake and dry-run build validation.
#
# Every step is fatal. Failures are reported with the offending output rather
# than being downgraded to a warning, so CI and pre-commit agree with the
# governance rules in AGENTS.md.
#
# Usage: ./scripts/validate.sh [HOST]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${1:-L7V}"
readonly REPO_ROOT HOST

cd "$REPO_ROOT"

# Runs a validation step, reporting the tool output on failure.
run_step() {
  local index="$1" total="$2" label="$3"
  shift 3

  echo "[INFO] [${index}/${total}] ${label}..."
  if ! "$@"; then
    echo "[ERROR] ${label} failed." >&2
    return 1
  fi
}

# Resolves a tool from PATH, falling back to nixpkgs.
nix_tool() {
  local tool="$1"
  shift

  if command -v "$tool" >/dev/null 2>&1; then
    "$tool" "$@"
  else
    nix run "nixpkgs#${tool}" -- "$@"
  fi
}

mapfile -t nix_files < <(git ls-files '*.nix' ':!:templates/**')
if [[ "${#nix_files[@]}" -eq 0 ]]; then
  echo "[ERROR] No tracked Nix files found." >&2
  exit 1
fi

run_step 1 6 "nixfmt formatting check" \
  nix_tool nixfmt --check "${nix_files[@]}"

run_step 2 6 "statix lint" \
  nix_tool statix check .

run_step 3 6 "deadnix unused code detection" \
  nix_tool deadnix --fail .

run_step 4 6 "shellcheck on scripts" \
  nix_tool shellcheck --severity=warning scripts/*.sh

run_step 5 6 ".mcp.json syntax check" \
  nix_tool jq -e . .mcp.json >/dev/null

run_step 6 6 "nix flake check" \
  nix flake check --no-build

echo "[INFO] Dry-run build for host: ${HOST}..."
nix build ".#nixosConfigurations.${HOST}.config.system.build.toplevel" --dry-run

echo ""
echo "[SUCCESS] Validation completed for host: ${HOST}"
