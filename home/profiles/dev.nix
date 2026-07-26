# Home profile: dev araçları
#
# Felsefe:
# Sistemi kirletmemek için dil runtime'ları (node, python, rust, go)
# GLOBAL olarak kurulmaz. Her proje kendi izole ortamını taşır:
#
# 1. nix develop      -> flake.nix#devShell (en sağlam, tam reproducible)
# 2. nix shell        -> tek seferlik geçici araç (sisteme yazmaz)
# 3. devenv           -> proje bazlı declarative ortam (.devenv/)
# 4. direnv + .envrc  -> klasöre girince otomatik aktif (nix-direnv ile)
# 5. uv venv          -> Python için pip alternatifi (izole .venv/)
#
# Ortak kural: `pip install`, `npm install -g`, `cargo install` YASAK!
# Bunların yerine: `nix shell nixpkgs#paket` veya flake devShell.

{ pkgs, ... }:
{
  home.packages = with pkgs; [
    # DevOps ve Infra
    colmena
    claude-code
    kubectl
    kubectx
    k9s
    helm
    kind
    terraform
    age
    sops
    awscli2
    google-cloud-sdk
    oci-cli

    # Editörler
    neovim
    micro
    gnome-boxes
    distrobox

    # Git Araçları
    lazygit
    gh

    # Nix Araçları (Sistem geneli gerekli)
    nixfmt-rfc-style
    statix
    deadnix
    nix-tree
    nh
    nvd
    comma
    nix-index
    nix-output-monitor
    nixd

    # İzole Ortam Araçları
    devenv

    # Python Paket Yöneticisi
    uv

    # Rust Araçları
    cargo-info
    cargo-watch

    # Go Araçları
    gopls

    # Build Araçları
    gnumake
    pkg-config
    cmake

    # Java / JVM
    temurin-bin-21
    maven
    gradle

    # Web ve Frontend Araçları
    bun
    deno
    bruno

    # AI Agent Araçları
    aider-chat
    pre-commit

    # Veritabanı CLI Araçları
    sqlite
    pgcli
    redis

    # Test, Debug ve Terminal Araçları
    playwright
    just
    httpie
    xh
    dive
    shellcheck
    hadolint
    zellij
  ];
}