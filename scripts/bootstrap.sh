#!/usr/bin/env bash
# bootstrap.sh [HOSTNAME]
# - /etc/age/key üretir (yoksa)
# - Public key'i stdout'a yazar (.sops.yaml'a eklemen için)
# - Flake check çalıştırır
set -euo pipefail

HOST="${1:-L7V}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY_DIR="/etc/age"
KEY_FILE="${KEY_DIR}/key"

echo "==> l7v/nixos bootstrap — host: $HOST"
echo "==> Repo: $REPO_ROOT"

# --- age key dizini ---
if [[ ! -d "$KEY_DIR" ]]; then
  echo "==> Creating $KEY_DIR"
  sudo mkdir -p "$KEY_DIR"
  sudo chmod 700 "$KEY_DIR"
fi

# --- age key üret ---
if [[ ! -f "$KEY_FILE" ]]; then
  echo "==> Generating age key at $KEY_FILE"
  # age-keygen nixpkgs'de 'age' paketiyle gelir
  age-keygen -o /tmp/l7v_age_key_tmp
  sudo mv /tmp/l7v_age_key_tmp "$KEY_FILE"
  sudo chmod 600 "$KEY_FILE"
  sudo chown root:root "$KEY_FILE"
  echo "==> Key generated."
else
  echo "==> age key already exists at $KEY_FILE"
fi

PUBKEY=$(sudo grep "^# public key:" "$KEY_FILE" | sed 's/^# public key: //')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Public key for '${HOST}':"
echo "   $PUBKEY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo " Sonraki adımlar:"
echo " 1. secrets/sops/.sops.yaml'da şunu ekle/güncelle:"
echo "      - &${HOST} ${PUBKEY}"
echo ""
echo " 2. Bu key'i creation_rules key_groups'a ekle:"
echo "      - age:"
echo "          - *${HOST}"
echo ""
echo " 3. Mevcut secretları yeni key ile re-encrypt et:"
echo "      cd $REPO_ROOT"
echo "      sops updatekeys secrets/sops/secrets.yaml"
echo ""

cd "$REPO_ROOT"
echo "==> Running nix flake check --no-build"
nix flake check --no-build

echo "==> pre-commit hook kuruluyor"
if command -v pre-commit >/dev/null 2>&1; then
  if [[ -n "${SUDO_USER:-}" ]]; then
    sudo -u "$SUDO_USER" pre-commit install
  else
    pre-commit install
  fi
else
  echo "    ↳ pre-commit bulunamadı (home.packages'te dev.nix üzerinden gelir), atlanıyor"
fi

echo "==> Bootstrap tamamlandı."
