#!/usr/bin/env bash
# ------------------------------------------------------------------------------
# BPT (Base Polyglot Template) - Project Initializer CLI
# ------------------------------------------------------------------------------
# Usage:
#   ./scripts/bpt-init.sh <project-name> [python|node|rust|go|java|minimal]
# ------------------------------------------------------------------------------

set -euo pipefail

NAME="${1:?[ERROR] Usage: $0 <project-name> [type]}"
TYPE="${2:-minimal}"
BASE="/home/l7v/dev/projects/company/active"
DEST="${BASE}/${NAME}"

if [[ -d "$DEST" ]]; then
  echo "[ERROR] Target directory already exists: $DEST"
  exit 1
fi

mkdir -p "$DEST"
cd "$DEST"
git init -q -b main

echo "[INFO] Initializing BPT project: $DEST (type: $TYPE)"

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

case "$TYPE" in
  python|devenv-python)
    # shellcheck disable=SC2016  # .envrc literal olarak yazilmali; direnv calisma aninda genisletir
    echo 'eval "$(devenv print-dev-env)"' > .envrc
    ;;
  node|devenv-node)
    # shellcheck disable=SC2016  # .envrc literal olarak yazilmali; direnv calisma aninda genisletir
    echo 'eval "$(devenv print-dev-env)"' > .envrc
    ;;
  rust|go|java|minimal)
    echo "use flake" > .envrc
    ;;
esac

case "$TYPE" in

  python)
    cat > flake.nix << 'FLAKE'
{
  description = "Python development environment";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs   = nixpkgs.legacyPackages.${system};
    in {
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

  outputs = { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs   = nixpkgs.legacyPackages.${system};
    in {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          nodejs_22
          pnpm
          typescript
          typescript-language-server
        ];
        shellHook = ''
          echo "[INFO] Node.js $(node --version) environment active."
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
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs   = nixpkgs.legacyPackages.${system};
    in {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          rustc
          cargo
          rustfmt
          clippy
          rust-analyzer
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

  outputs = { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs   = nixpkgs.legacyPackages.${system};
    in {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          go
          gopls
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

  java)
    cat > flake.nix << 'FLAKE'
{
  description = "Java development environment";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs   = nixpkgs.legacyPackages.${system};
    in {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          jdk21
          maven
          gradle
        ];
        shellHook = ''
          echo "[INFO] Java JDK $(java -version 2>&1 | head -n 1) environment active."
        '';
      };
    };
}
FLAKE
    ;;

  minimal|*)
    cat > flake.nix << 'FLAKE'
{
  description = "Minimal polyglot development environment";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs   = nixpkgs.legacyPackages.${system};
    in {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          git
          jq
          curl
        ];
        shellHook = ''
          echo "[INFO] Minimal polyglot development environment active."
        '';
      };
    };
}
FLAKE
    ;;
esac

cat > AGENTS.md << EOF
# Project Context (${NAME})

This project was initialized using the Base Polyglot Template (BPT).

## Governance Rules
1. Declare all workspace packages within \`flake.nix\` or \`devenv.nix\`.
2. Store secret keys and API credentials in \`.env.local\`.
3. See canonical platform rules: /home/l7v/dev/projects/company/active/nixos/AGENTS.md
EOF

cat > CLAUDE.md << EOF
# AI Agent Rules — ${NAME}

## Environment

- NixOS flake project. **NEVER** use \`apt\`, \`pip install --user\`, or \`npm install -g\`.
- Enter the dev shell: \`direnv allow\` (auto) or \`nix develop\` (manual).
- Stack: **${TYPE}**

## Workflow

\`\`\`bash
# Before editing
direnv allow

# After editing — validate before committing
nix flake check
git add <files> && git commit -m "feat: description"
\`\`\`

## Agent Sandbox

| Risk Level | Tool |
|---|---|
| Daily / trusted code | \`claudebox\` (sandboxed runner) |
| Untrusted / risky repo | \`microvm -r coding-agent\` (ephemeral VM) |

## Nix Rules

- \`git add <new-file>.nix\` before \`nh os switch\` — flakes only track git-staged files.
- Never commit \`.env\` or plaintext secrets.
- systemd services need explicit \`WorkingDirectory\` and \`PATH\` env vars.
EOF

cat > devenv.nix << DEVENV
{ pkgs, lib, config, ... }:
{
  # Add project packages here
  packages = with pkgs; [
    git
    jq
  ];

  # Uncomment services as needed:
  # services.postgres = {
  #   enable = true;
  #   initialDatabases = [{ name = "${NAME}"; }];
  # };
  # services.redis.enable = true;

  scripts.validate.exec = ''
    set -euo pipefail
    echo "[INFO] Validating ${NAME}..."
    nix flake check
    echo "[SUCCESS] Validation passed."
  '';

  enterShell = ''
    echo "[INFO] ${NAME} dev shell ready (${TYPE}). Run 'devenv tasks run validate' to validate."
  '';
}
DEVENV

cat > README.md << EOF
# ${NAME}

## Development Environment

\`\`\`bash
direnv allow
\`\`\`

## Metadata
Initial Project Type: ${TYPE}
EOF

if command -v direnv &>/dev/null; then
  direnv allow "$DEST" 2>/dev/null || true
fi

echo ""
echo "[SUCCESS] BPT Project initialized at: $DEST (Type: $TYPE)"
echo "          Next Step: cd $DEST && direnv allow"
echo "          Validate : devenv tasks run validate"
echo "          Agent    : claudebox  (sandboxed runner)"
