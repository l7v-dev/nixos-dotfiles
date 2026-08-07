#!/usr/bin/env bash
# ------------------------------------------------------------------------------
# AFT (Agentic Framework Template) - System Initializer CLI
# ------------------------------------------------------------------------------
# Location: scripts/aft-init.sh
# Usage:
#   aft-init.sh <project-name> [target-dir]
# ------------------------------------------------------------------------------

set -euo pipefail

AFT_TEMPLATE_DIR="/home/l7v/dev/projects/company/active/nixos/templates/aft"
DEFAULT_TARGET_BASE="/home/l7v/dev/projects/company/active"

if [[ $# -eq 0 ]]; then
  echo "[ERROR] Lütfen bir proje adı belirtin."
  echo "Usage: $0 <project-name> [target-dir]"
  exit 1
fi

PROJECT_NAME="$1"
TARGET_BASE="${2:-$DEFAULT_TARGET_BASE}"
TARGET_DIR="${TARGET_BASE}/${PROJECT_NAME}"

if [[ -d "$TARGET_DIR" ]]; then
  echo "[ERROR] Target directory '$TARGET_DIR' already exists."
  exit 1
fi

echo "[INFO] Initializing project '$PROJECT_NAME' with Agentic Framework Template (AFT)..."

# 1. Copy Template Files
mkdir -p "$TARGET_DIR"
cp -r "$AFT_TEMPLATE_DIR"/* "$TARGET_DIR"/
cp -r "$AFT_TEMPLATE_DIR"/.envrc "$TARGET_DIR"/ 2>/dev/null || true
cp -r "$AFT_TEMPLATE_DIR"/.gitignore "$TARGET_DIR"/ 2>/dev/null || true
cp -r "$AFT_TEMPLATE_DIR"/.mcp.json "$TARGET_DIR"/ 2>/dev/null || true
cp -r "$AFT_TEMPLATE_DIR"/.agents "$TARGET_DIR"/ 2>/dev/null || true

cd "$TARGET_DIR"

# 2. Update Configuration Names
sed -i "s/\"name\": \"aft\"/\"name\": \"${PROJECT_NAME}\"/g" package.json 2>/dev/null || true
sed -i "s/PROJECT_NAME = \"aft\"/PROJECT_NAME = \"${PROJECT_NAME}\"/g" devenv.nix 2>/dev/null || true
sed -i "s/name: \"AFT\"/name: \"${PROJECT_NAME^^}\"/g" src/config/site.ts 2>/dev/null || true

# 3. Re-initialize Git Repository
rm -rf .git
git init -b main

# 4. Write AI agent context files
cat > CLAUDE.md << EOF
# AI Agent Rules — ${PROJECT_NAME}

## Environment

- NixOS flake project (Next.js 16 AFT). **NEVER** use \`npm install -g\` or global installs.
- Enter the dev shell: \`direnv allow\` (auto) or \`nix develop\` (manual).
- Stack: **Next.js 16 / TypeScript / Tailwind / tRPC**

## Workflow

\`\`\`bash
# Before editing
direnv allow

# Development
pnpm install
pnpm dev

# After editing — validate before committing
pnpm lint && pnpm type-check
nix flake check
git add <files> && git commit -m "feat: description"
\`\`\`

## Agent Sandbox

| Risk Level | Tool |
|---|---|
| Daily / trusted code | \`claudebox\` (sandboxed runner) |
| Untrusted / risky repo | \`microvm -r coding-agent\` (ephemeral VM) |

## Project Conventions

- All API routes use tRPC procedures, not raw fetch handlers.
- Authentication: next-auth — never roll custom auth.
- DB access only via Prisma ORM — no raw SQL strings with user input.
- Environment variables declared in \`src/env.mjs\` with Zod validation.
- Secrets go in \`.env.local\` (gitignored) — never commit plaintext secrets.
EOF

# 5. Allow Direnv if available
if command -v direnv &>/dev/null; then
  direnv allow "$TARGET_DIR" 2>/dev/null || true
fi

echo ""
echo "[SUCCESS] Project '$PROJECT_NAME' created using AFT template."
echo "          Location: $TARGET_DIR"
echo "          Next Step: cd $TARGET_DIR && pnpm install && pnpm dev"
echo "          Agent    : claudebox  (sandboxed runner)"
