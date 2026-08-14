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

run_step 1 7 "nixfmt formatting check" \
  nix_tool nixfmt --check "${nix_files[@]}"

run_step 2 7 "statix lint" \
  nix_tool statix check --config .statix.toml .

run_step 3 7 "deadnix unused code detection" \
  nix_tool deadnix --fail .

run_step 4 7 "shellcheck on scripts" \
  nix_tool shellcheck --severity=warning scripts/*.sh

run_step 5 7 ".mcp.json syntax check" \
  nix_tool jq -e . .mcp.json >/dev/null

# Step 6: Nix module system check — eval only the target HOST.
#
# Full `nix flake check --no-build` evaluates every nixosConfiguration in
# parallel and exhausts RAM on workstations. Evaluating all hosts sequentially
# still costs ~1.5 GB per host because each `nix eval` process re-parses the
# entire nixpkgs tree from scratch.
#
# Strategy: eval only HOST (the workstation being validated). Remote server
# configs are verified at deploy time by colmena build, which runs on the
# builder host with sufficient RAM.
#
# We check three lightweight attributes that force the full module closure
# without opening the derivation build graph:
#   system.stateVersion  — triggers assertions and option type checking
#   networking.hostName  — confirms identity module resolved correctly
#   system.nixos.label   — verifies NixOS version pinning is intact
echo "[INFO] [6/7] NixOS module eval for host: ${HOST}..."
for attr in \
    "config.system.stateVersion" \
    "config.networking.hostName" \
    "config.system.nixos.label"; do
  result=$(nix eval --no-warn-dirty --raw \
    ".#nixosConfigurations.${HOST}.${attr}" 2>/dev/null) || {
    echo "[ERROR] Failed to eval nixosConfigurations.${HOST}.${attr}" >&2
    exit 1
  }
  echo "[INFO]   ${attr} = ${result}"
done
echo "[INFO] [6/7] Module eval passed for host: ${HOST}."

run_step 7 7 "dry-run build for host ${HOST}" \
  nix build --no-warn-dirty ".#nixosConfigurations.${HOST}.config.system.build.toplevel" --dry-run

echo ""
echo "[SUCCESS] Validation completed for host: ${HOST}"
