#!/usr/bin/env bash
# age-check.sh — Validates /etc/age/key existence and .sops.yaml key alignment.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY_FILE="/etc/age/key"
SOPS_YAML="${REPO_ROOT}/secrets/sops/.sops.yaml"

echo "[INFO] Starting Age key and SOPS integrity verification..."
echo ""

# --- Key file verification ---
if [[ ! -f "$KEY_FILE" ]]; then
  echo "[ERROR] Key file /etc/age/key does not exist. Run bootstrap:"
  echo "        sudo ./scripts/bootstrap.sh L7V"
  exit 1
fi

PUBKEY="$(sudo grep "^# public key:" "$KEY_FILE" 2>/dev/null | sed 's/^# public key: //')"
if [[ -z "$PUBKEY" ]]; then
  echo "[ERROR] Public key not found inside /etc/age/key"
  exit 1
fi

echo "[SUCCESS] Key file /etc/age/key exists."
echo "          Public key: $PUBKEY"
echo ""

# --- .sops.yaml mapping check ---
if grep -qF "$PUBKEY" "$SOPS_YAML" 2>/dev/null; then
  echo "[SUCCESS] Public key is registered in .sops.yaml"
else
  echo "[ERROR] Public key NOT found in .sops.yaml"
  echo "        Existing keys in .sops.yaml:"
  grep "age1" "$SOPS_YAML" | sed 's/^/        /'
  echo ""
  echo "        Add the following line to .sops.yaml:"
  echo "          - &L7V ${PUBKEY}"
  echo "        Then execute:"
  echo "          sops updatekeys secrets/sops/secrets.yaml"
  exit 1
fi
echo ""

# --- Decryption verification ---
echo "[INFO] Testing decryption of secrets.yaml..."
if SOPS_AGE_KEY_FILE="$KEY_FILE" sops --decrypt \
    --extract '["cache/signing_key"]' \
    "${REPO_ROOT}/secrets/sops/secrets.yaml" \
    > /dev/null 2>&1; then
  echo "[SUCCESS] Decrypted secrets.yaml using root Age key."
elif sops --decrypt \
    --extract '["cache/signing_key"]' \
    "${REPO_ROOT}/secrets/sops/secrets.yaml" \
    > /dev/null 2>&1; then
  echo "[SUCCESS] Decrypted secrets.yaml using user key."
else
  echo "[ERROR] Failed to decrypt secrets.yaml"
  echo "        Key mismatch or secrets.yaml requires re-encryption."
  echo "        Remediation: sops updatekeys secrets/sops/secrets.yaml"
  exit 1
fi

echo ""
echo "[SUCCESS] All verification checks passed. SOPS environment is operational."

