#!/usr/bin/env bash
# ==============================================================================
# AFT (Agentic Framework Template) - System Initializer CLI
# ==============================================================================
# Konum: /home/l7v/dev/projects/company/active/nixos/scripts/aft-init.sh
# Kullanım:
#   aft-init.sh <proje-adi> [hedef-dizin]
# ==============================================================================

set -euo pipefail

AFT_TEMPLATE_DIR="/home/l7v/dev/projects/company/active/nixos/templates/aft"
DEFAULT_TARGET_BASE="/home/l7v/dev/projects/company/active"

if [[ $# -eq 0 ]]; then
  echo "❌ Hata: Lütfen bir proje adı belirtin."
  echo "Kullanım: $0 <proje-adi> [hedef-dizin]"
  exit 1
fi

PROJECT_NAME="$1"
TARGET_BASE="${2:-$DEFAULT_TARGET_BASE}"
TARGET_DIR="${TARGET_BASE}/${PROJECT_NAME}"

if [[ -d "$TARGET_DIR" ]]; then
  echo "❌ Hata: '$TARGET_DIR' klasörü zaten mevcut!"
  exit 1
fi

echo "🚀 Agentic Framework Template (AFT) kullanılarak '$PROJECT_NAME' projesi oluşturuluyor..."

# 1. Kopyalama
mkdir -p "$TARGET_DIR"
cp -r "$AFT_TEMPLATE_DIR"/* "$TARGET_DIR"/
cp -r "$AFT_TEMPLATE_DIR"/.envrc "$TARGET_DIR"/ 2>/dev/null || true
cp -r "$AFT_TEMPLATE_DIR"/.gitignore "$TARGET_DIR"/ 2>/dev/null || true
cp -r "$AFT_TEMPLATE_DIR"/.mcp.json "$TARGET_DIR"/ 2>/dev/null || true
cp -r "$AFT_TEMPLATE_DIR"/.agents "$TARGET_DIR"/ 2>/dev/null || true

cd "$TARGET_DIR"

# 2. İsim Değişikliklerini Güncelleme
sed -i "s/\"name\": \"aft\"/\"name\": \"${PROJECT_NAME}\"/g" package.json 2>/dev/null || true
sed -i "s/PROJECT_NAME = \"aft\"/PROJECT_NAME = \"${PROJECT_NAME}\"/g" devenv.nix 2>/dev/null || true
sed -i "s/name: \"AFT\"/name: \"${PROJECT_NAME^^}\"/g" src/config/site.ts 2>/dev/null || true

# 3. Git Sıfırlama
rm -rf .git
git init -b main

# 4. Direnv İzni
if command -v direnv &>/dev/null; then
  direnv allow "$TARGET_DIR" 2>/dev/null || true
fi

echo ""
echo "✨ =================================================================="
echo "🎉 '$PROJECT_NAME' projesi AFT (Agentic Framework Template) ile kuruldu!"
echo "📂 Konum: $TARGET_DIR"
echo "🚀 Sonraki Adım: cd $TARGET_DIR && npm install && npm run dev"
echo "✨ =================================================================="
