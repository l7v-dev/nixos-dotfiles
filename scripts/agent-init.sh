#!/usr/bin/env bash
# ------------------------------------------------------------------------------
# agent-init.sh — Agent-friendly project environment bootstrapper.
#
# Creates a project directory with:
#   flake.nix     stack-specific dev shell
#   devenv.nix    devenv services (postgres, redis…) + validate task
#   .envrc        direnv hook (use flake or devenv)
#   CLAUDE.md     AI agent rules for this project
#   AGENTS.md     canonical governance pointer
#
# Usage:
#   ./scripts/agent-init.sh <project-name> [python|node|rust|go|minimal]
# ------------------------------------------------------------------------------

set -euo pipefail

NAME="${1:?[ERROR] Usage: $0 <project-name> [python|node|rust|go|minimal]}"
STACK="${2:-minimal}"
BASE="/home/l7v/dev/projects/company/active"
DEST="${BASE}/${NAME}"

readonly NAME STACK BASE DEST

if [[ -d "$DEST" ]]; then
  echo "[ERROR] Target directory already exists: $DEST" >&2
  exit 1
fi

echo "[INFO] Bootstrapping agent project: $NAME (stack: $STACK)"
mkdir -p "$DEST"
cd "$DEST"
git init -q -b main

# ── .gitignore ────────────────────────────────────────────────────────────────
cat > .gitignore << 'EOF'
.direnv/
.devenv/
.venv/
result
result-*
node_modules/
__pycache__/
*.egg-info/
target/
dist/
build/
.env
.env.local
EOF

# ── .envrc ────────────────────────────────────────────────────────────────────
case "$STACK" in
  python|node)
    # shellcheck disable=SC2016
    echo 'eval "$(devenv print-dev-env)"' > .envrc
    ;;
  *)
    echo "use flake" > .envrc
    ;;
esac

# ── flake.nix (stack-specific) ────────────────────────────────────────────────
case "$STACK" in

  python)
    cat > flake.nix << 'FLAKE'
{
  description = "Python development environment";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          python312
          uv
          ruff
          pyright
        ];
        shellHook = ''
          [ ! -d .venv ] && uv venv .venv
          source .venv/bin/activate
          echo "[INFO] Python $(python --version) environment active."
        '';
      };
    };
}
FLAKE
    ;;

  node)
    cat > flake.nix << 'FLAKE'
{
  description = "Node.js development environment";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          nodejs_22
          pnpm
          typescript
          nodePackages.typescript-language-server
        ];
        shellHook = ''
          echo "[INFO] Node $(node --version) / pnpm $(pnpm --version) environment active."
        '';
      };
    };
}
FLAKE
    ;;

  rust)
    cat > flake.nix << 'FLAKE'
{
  description = "Rust development environment";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
  };

  outputs =
    { nixpkgs, rust-overlay, ... }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs {
        inherit system;
        overlays = [ rust-overlay.overlays.default ];
      };
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          (rust-bin.stable.latest.default.override { extensions = [ "rust-src" "rust-analyzer" ]; })
          pkg-config
          openssl
        ];
        shellHook = ''
          echo "[INFO] Rust $(rustc --version) environment active."
        '';
      };
    };
}
FLAKE
    ;;

  go)
    cat > flake.nix << 'FLAKE'
{
  description = "Go development environment";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          go
          gopls
          golangci-lint
          gotools
        ];
        shellHook = ''
          echo "[INFO] Go $(go version) environment active."
        '';
      };
    };
}
FLAKE
    ;;

  minimal|*)
    cat > flake.nix << 'FLAKE'
{
  description = "Minimal development environment";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          git
          jq
          curl
        ];
        shellHook = ''
          echo "[INFO] Minimal environment active."
        '';
      };
    };
}
FLAKE
    ;;

esac

# ── devenv.nix ────────────────────────────────────────────────────────────────
cat > devenv.nix << DEVENV
{ pkgs, lib, config, ... }:
{
  # Stack packages — extend as needed
  packages = with pkgs; [
    git
    jq
  ];

  # Uncomment the services your project needs:
  # services.postgres = {
  #   enable = true;
  #   initialDatabases = [{ name = "${NAME}"; }];
  # };
  # services.redis.enable = true;

  # Validation task — mirrors ./scripts/validate.sh for CI
  scripts.validate.exec = ''
    set -euo pipefail
    echo "[INFO] Running project validation..."
    nix flake check
    echo "[SUCCESS] Validation passed."
  '';

  enterShell = ''
    echo "[INFO] devenv shell ready. Run 'devenv tasks run validate' to validate."
  '';
}
DEVENV

# ── CLAUDE.md ─────────────────────────────────────────────────────────────────
cat > CLAUDE.md << CLAUDEMD
# AI Agent Rules — ${NAME}

## Environment

- NixOS flake project. **NEVER** use \`apt\`, \`pip install --user\`, or \`npm install -g\`.
- Enter the dev shell: \`direnv allow\` (auto) or \`nix develop\` (manual).
- Start services: \`devenv up\` (postgres, redis…), stop: \`devenv down\`.

## Stack: ${STACK}

## Workflow

\`\`\`bash
# Before editing
direnv allow          # or: nix develop

# After editing — ALWAYS validate before committing
./scripts/validate.sh   # or: devenv tasks run validate
nix flake check

# Commit only tracked files
git add <files>
git commit -m "feat: description"
\`\`\`

## Agent Sandbox

| Risk Level | Tool |
|---|---|
| Daily / trusted code | \`claudebox\` or direct agent CLI |
| Untrusted / risky repo | \`microvm -r coding-agent\` (ephemeral VM) |

## Secrets

- Never commit \`.env\` files.
- Production secrets: sops-nix (see nixos repo \`docs/runbooks/secrets-management.md\`).

## Critical Nix Rules

- \`git add <new-file>.nix\` **before** \`nixos-rebuild\` — flakes only see tracked files.
- \`nh os switch\` instead of \`sudo nixos-rebuild switch\`.
- systemd services need explicit \`WorkingDirectory\` and \`PATH\` env vars.
CLAUDEMD

# ── AGENTS.md pointer ─────────────────────────────────────────────────────────
cat > AGENTS.md << 'EOF'
# Workspace Agent Directives

This project follows the l7v NixOS platform conventions.
See canonical governance: `/home/l7v/dev/projects/company/active/nixos/AGENTS.md`

## Quick Rules
- No global package installs — use `nix develop` or `direnv allow`
- Validate before commit: `devenv tasks run validate`
- Never commit `.env` or plaintext secrets
EOF

# ── Activate direnv ───────────────────────────────────────────────────────────
if command -v direnv &>/dev/null; then
  direnv allow "$DEST" 2>/dev/null || true
fi

echo ""
echo "[SUCCESS] Agent project '${NAME}' created."
echo "          Location : $DEST"
echo "          Stack    : $STACK"
echo "          Next     : cd $DEST && direnv allow"
echo "          Validate : devenv tasks run validate"
echo "          Agent    : claudebox  (or: nix run github:numtide/llm-agents.nix#claudebox)"
