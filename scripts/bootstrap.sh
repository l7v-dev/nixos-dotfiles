#!/usr/bin/env bash
# ------------------------------------------------------------------------------
# bootstrap.sh — Host Key Bootstrapper and SOPS Preparation CLI
# ------------------------------------------------------------------------------
# Usage:
#   ./scripts/bootstrap.sh [HOSTNAME]
# ------------------------------------------------------------------------------

set -euo pipefail

HOST="${1:-L7V}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY_DIR="/etc/age"
KEY_FILE="${KEY_DIR}/key"

echo "[INFO] Starting host bootstrap for: $HOST"
echo "[INFO] Repository root: $REPO_ROOT"

# --- Age key directory ---
if [[ ! -d "$KEY_DIR" ]]; then
  echo "[INFO] Creating directory $KEY_DIR..."
  sudo mkdir -p "$KEY_DIR"
  sudo chmod 700 "$KEY_DIR"
fi

# --- Age key generation ---
if [[ ! -f "$KEY_FILE" ]]; then
  echo "[INFO] Generating Age key at $KEY_FILE..."
  age-keygen -o /tmp/l7v_age_key_tmp
  sudo mv /tmp/l7v_age_key_tmp "$KEY_FILE"
  sudo chmod 600 "$KEY_FILE"
  sudo chown root:root "$KEY_FILE"
  echo "[SUCCESS] Key generated at $KEY_FILE"
else
  echo "[INFO] Age key already exists at $KEY_FILE"
fi

PUBKEY=$(sudo grep "^# public key:" "$KEY_FILE" | sed 's/^# public key: //')

echo ""
echo "------------------------------------------------------------------------"
echo " Public key for '${HOST}':"
echo "   $PUBKEY"
echo "------------------------------------------------------------------------"
echo ""
echo " Next steps:"
echo " 1. Register public key in secrets/sops/.sops.yaml:"
echo "      - &${HOST} ${PUBKEY}"
echo ""
echo " 2. Add reference to key_groups:"
echo "      - age:"
echo "          - *${HOST}"
echo ""
echo " 3. Re-encrypt secrets with updated key list:"
echo "      cd $REPO_ROOT"
echo "      sops updatekeys secrets/sops/secrets.yaml"
echo ""

cd "$REPO_ROOT"
echo "[INFO] Executing nix flake check --no-build..."
nix flake check --no-build

echo "[INFO] Setting up pre-commit hook..."
if command -v pre-commit >/dev/null 2>&1; then
  if [[ -n "${SUDO_USER:-}" ]]; then
    sudo -u "$SUDO_USER" pre-commit install
  else
    pre-commit install
  fi
else
  echo "[INFO] pre-commit tool not found; skipping hook installation."
fi

echo "[SUCCESS] Bootstrap process completed successfully."
