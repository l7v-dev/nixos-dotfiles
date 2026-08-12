#!/usr/bin/env bash
# secrets-rotate.sh — Re-encrypts secrets.yaml when a new host Age key is registered.
# Usage: ./scripts/secrets-rotate.sh <host> <age-public-key>
set -euo pipefail

host_name="${1:?"Usage: $0 <hostname> <age-public-key>"}"
age_key="${2:?"Usage: $0 <hostname> <age-public-key>"}"
sops_file="secrets/sops/secrets.yaml"
sops_config="secrets/sops/.sops.yaml"

echo "[INFO] Registering Age key for host '$host_name': $age_key"

# --- Update .sops.yaml configuration ---
if grep -q "$age_key" "$sops_config"; then
  echo "[INFO] Age key already exists in configuration, skipping update."
else
  # Add key entry under keys section
  sed -i "/^keys:/a\\  - \&$host_name $age_key" "$sops_config"
  # Add key reference under creation_rules section
  sed -i "/^[[:space:]]*- age:/a\\          - \*$host_name" "$sops_config"
  echo "[INFO] Updated $sops_config with new host key."
fi

# --- Re-encrypt secrets.yaml ---
echo "[INFO] Re-encrypting secrets.yaml with updated key set..."
SOPS_AGE_KEY_FILE=/etc/age/key \
  sops updatekeys --yes "$sops_file"

echo "[SUCCESS] Secrets rotation completed. Host '$host_name' can now decrypt secrets.yaml."

