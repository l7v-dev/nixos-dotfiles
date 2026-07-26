#!/usr/bin/env bash
# ==============================================================================
# BPT (Base Polyglot Template) - Project Initializer CLI
# ==============================================================================
# Konum: /home/l7v/dev/projects/company/active/nixos/scripts/bpt-init.sh
# Kullanım:
#   ./scripts/bpt-init.sh <proje-ismi> [python|node|rust|go|java|minimal]
# ==============================================================================

set -euo pipefail

NAME="${1:?Kullanım: $0 <proje-ismi> [tip]}"
TYPE="${2:-minimal}"
BASE="/home/l7v/dev/projects/company/active"
DEST="${BASE}/${NAME}"

if [[ -d "$DEST" ]]; then
  echo "Hata: $DEST zaten var"
  exit 1
fi

mkdir -p "$DEST"
cd "$DEST"
git init -q -b main

echo "==> BPT Projesi oluşturuluyor: $DEST (tip: $TYPE)"

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
    echo 'eval "$(devenv print-dev-env)"' > .envrc
    ;;
  node|devenv-node)
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
  description = "Python dev ortamı";
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
          echo "🐍 Python $(python --version)"
        '';
      };
    };
}
FLAKE
    ;;

  node)
    cat > flake.nix << 'FLAKE'
{
  description = "Node.js dev ortamı";
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
          typescript-language-server
        ];
        shellHook = ''
          echo "⬡ Node $(node --version) | pnpm $(pnpm --version)"
        '';
      };
    };
}
FLAKE
    ;;

  rust)
    cat > flake.nix << 'FLAKE'
{
  description = "Rust dev ortamı";
  inputs = {
    nixpkgs.url      = "github:NixOS/nixpkgs/nixos-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
    rust-overlay.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { nixpkgs, rust-overlay, ... }:
    let
      system = "x86_64-linux";
      pkgs   = import nixpkgs {
        inherit system;
        overlays = [ rust-overlay.overlays.default ];
      };
    in {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          (rust-bin.stable.latest.default.override {
            extensions = [ "rust-src" "rust-analyzer" ];
          })
          cargo-watch
          cargo-expand
        ];
        shellHook = ''
          echo "🦀 $(rustc --version)"
        '';
      };
    };
}
FLAKE
    ;;

  go)
    cat > flake.nix << 'FLAKE'
{
  description = "Go dev ortamı";
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
          delve
        ];
        shellHook = ''
          echo "🐹 Go $(go version)"
        '';
      };
    };
}
FLAKE
    ;;

  devenv-python)
    cat > devenv.nix << 'DEVENV'
{ pkgs, ... }:
{
  languages.python = {
    enable  = true;
    version = "3.12";
    uv.enable = true;
  };

  packages = with pkgs; [ ruff pyright ];

  enterShell = ''
    echo "🐍 Python $(python --version) | uv aktif"
  '';
}
DEVENV
    cat > devenv.yaml << 'EOF'
inputs:
  nixpkgs:
    url: github:NixOS/nixpkgs/nixpkgs-unstable
EOF
    cat > flake.nix << 'FLAKE'
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    devenv.url  = "github:cachix/devenv";
  };
  outputs = inputs@{ nixpkgs, devenv, ... }:
    let system = "x86_64-linux";
    in {
      devShells.${system}.default =
        devenv.lib.mkShell { inherit inputs; pkgs = nixpkgs.legacyPackages.${system};
          modules = [ ./devenv.nix ]; };
    };
}
FLAKE
    ;;

  devenv-node)
    cat > devenv.nix << 'DEVENV'
{ pkgs, ... }:
{
  languages.javascript = {
    enable  = true;
    package = pkgs.nodejs_22;
    pnpm.enable = true;
  };

  packages = with pkgs; [ typescript-language-server ];

  enterShell = ''
    echo "⬡ Node $(node --version) | pnpm $(pnpm --version)"
  '';
}
DEVENV
    cat > devenv.yaml << 'EOF'
inputs:
  nixpkgs:
    url: github:NixOS/nixpkgs/nixpkgs-unstable
EOF
    cat > flake.nix << 'FLAKE'
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    devenv.url  = "github:cachix/devenv";
  };
  outputs = inputs@{ nixpkgs, devenv, ... }:
    let system = "x86_64-linux";
    in {
      devShells.${system}.default =
        devenv.lib.mkShell { inherit inputs; pkgs = nixpkgs.legacyPackages.${system};
          modules = [ ./devenv.nix ]; };
    };
}
FLAKE
    ;;

  java)
    cat > devenv.nix << 'DEVENV'
{ pkgs, ... }:
{
  languages.java = {
    enable = true;
    jdk.package = pkgs.temurin-bin-21;
    maven.enable = true;
    gradle.enable = true;
  };

  enterShell = ''
    echo "☕ $(java --version | head -1)"
  '';
}
DEVENV
    cat > devenv.yaml << 'EOF'
inputs:
  nixpkgs:
    url: github:NixOS/nixpkgs/nixpkgs-unstable
EOF
    cat > flake.nix << 'FLAKE'
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    devenv.url  = "github:cachix/devenv";
  };
  outputs = inputs@{ nixpkgs, devenv, ... }:
    let system = "x86_64-linux";
    in {
      devShells.${system}.default =
        devenv.lib.mkShell { inherit inputs; pkgs = nixpkgs.legacyPackages.${system};
          modules = [ ./devenv.nix ]; };
    };
}
FLAKE
    ;;

  minimal|*)
    cat > flake.nix << 'FLAKE'
{
  description = "Minimal dev ortamı";
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
          echo "🔧 Minimal dev ortamı hazır: $(basename $PWD)"
        '';
      };
    };
}
FLAKE
    ;;
esac

cat > AGENTS.md << EOF
# Proje Bağlamı (${NAME})

Bu proje BPT (Base Polyglot Template) ile oluşturulmuştur.

## Kurallar
1. Sistem seviyesine doğrudan paket yüklemeyin. İhtiyaç duyulan bağımlılıkları \`flake.nix\` veya \`devenv.nix\` içerisine ekleyin.
2. Gizli anahtarları \`.env.local\` içerisinde tanımlayın.
EOF

cat > README.md << EOF
# ${NAME}

## Geliştirme ortamı

\`\`\`bash
# Ortama gir
direnv allow
\`\`\`

## Notlar
Oluşturuldu: $(date +%Y-%m-%d)
Tip: ${TYPE}
EOF

if command -v direnv &>/dev/null; then
  direnv allow "$DEST" 2>/dev/null || true
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " 🎉 BPT Projesi Hazır: $DEST (Tip: $TYPE)"
echo " 🚀 Sonraki Adım: cd $DEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
