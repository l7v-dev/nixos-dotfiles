# Home profile: developer tooling.
#
# Philosophy — language runtimes (Node, Python, Rust, Go) are NOT installed
# globally. Each project carries its own isolated environment:
#
#   nix develop          flake.nix#devShell  (most reproducible)
#   nix shell            one-off ephemeral tool (nothing written to system)
#   devenv               project-scoped declarative env (.devenv/)
#   direnv + .envrc      auto-activates on directory entry (via nix-direnv)
#   uv venv              Python isolated virtualenv (.venv/)
#
# Rule: pip install, npm install -g, cargo install are FORBIDDEN.
# Use nix shell nixpkgs#<pkg> or a flake devShell instead.
#
# AI coding agents and CLI tools are in home/profiles/ai-tools.nix.
{ pkgs, ... }:
{
  home.packages = with pkgs; [
    # ── DevOps / Infrastructure ───────────────────────────────────────────
    colmena
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

    # ── Editors ───────────────────────────────────────────────────────────
    neovim
    micro
    gnome-boxes
    distrobox

    # ── Git tooling ───────────────────────────────────────────────────────
    lazygit
    gh

    # ── Nix tooling ───────────────────────────────────────────────────────
    nixfmt
    statix
    deadnix
    nix-tree
    nh
    nvd
    comma
    nix-index
    nix-output-monitor
    nixd

    # ── Isolated environment tooling ──────────────────────────────────────
    devenv

    # ── Python package manager ────────────────────────────────────────────
    uv

    # ── Rust tooling ──────────────────────────────────────────────────────
    cargo-info
    cargo-watch

    # ── Go tooling ────────────────────────────────────────────────────────
    gopls

    # ── Build tooling ─────────────────────────────────────────────────────
    gnumake
    pkg-config
    cmake

    # ── Java / JVM ────────────────────────────────────────────────────────
    temurin-bin-21
    maven
    gradle

    # ── Web / Frontend ────────────────────────────────────────────────────
    bun
    deno
    bruno

    # ── Quality / linting ─────────────────────────────────────────────────
    pre-commit
    shellcheck
    hadolint

    # ── Database CLI ──────────────────────────────────────────────────────
    sqlite
    pgcli
    redis

    # ── Test / debug / terminal ───────────────────────────────────────────
    playwright
    just
    httpie
    xh
    dive
    zellij
  ];
}
