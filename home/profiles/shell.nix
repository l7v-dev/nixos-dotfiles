# Shell environment configuration profile
{ pkgs, lib, ... }:
{
  home.file.".p10k.zsh".source = ./p10k.zsh;

  programs = {
    zsh = {
      enable = true;
      autosuggestion.enable = true;
      syntaxHighlighting.enable = true;

      plugins = [
        {
          name = "powerlevel10k";
          src = pkgs.zsh-powerlevel10k;
          file = "share/zsh-powerlevel10k/powerlevel10k.zsh-theme";
        }
      ];

      oh-my-zsh = {
        enable = true;
        theme = "";
        plugins = [
          "git"
          "sudo"
          "docker"
          "kubectl"
        ];
      };

      shellAliases = {
        # Core UX
        ls = "eza --icons";
        ll = "eza -la --icons";
        lt = "eza --tree --icons";
        cat = "bat";
        cd = "z";

        # Nix / Flake
        ns = "nh os switch";
        nb = "nh os build";
        nt = "nh os test";
        nc = "nh clean all";
        nfu = "nix flake update";
        nfc = "nix flake check";
        nsh = "nix-shell --run zsh";
        nd = "nix develop";
        nom = "nix-output-monitor";

        # Environment shells
        ns-py = "nix shell nixpkgs#python312 nixpkgs#uv";
        ns-node = "nix shell nixpkgs#nodejs_22 nixpkgs#pnpm";
        ns-rust = "nix shell nixpkgs#rustc nixpkgs#cargo nixpkgs#rust-analyzer";
        ns-go = "nix shell nixpkgs#go nixpkgs#gopls";

        # Devenv
        de-init = "devenv init";
        de-shell = "devenv shell";
        de-up = "devenv up";

        # Python / uv
        venv = "uv venv .venv && source .venv/bin/activate";
        pipi = "uv pip install";

        # Direnv & Project
        da = "direnv allow";
        dr = "direnv reload";
        de = "direnv edit";

        # File & Search
        y = "yazi";
        ff = "fd --type f";
        rg = "rg --smart-case";

        # Git shortcuts
        gst = "git status";
        gco = "git checkout";
        gaa = "git add -A";
        gc = "git commit -m";
        gp = "git push";
        gl = "git log --oneline --graph --decorate";

        # Navigation & Status
        pj = "cd ~/dev && ls";
        cdproj = "cd ~/dev/projects";
        dev = "cd ~/dev/projects/personal";
        lg = "lazygit";
        btop = "btop";
        dust = "duf -only local";

        # NixOS Repository & Governance
        cdnix = "cd /etc/nixos";
        cdnix-real = "cd /home/l7v/dev/projects/company/active/nixos";
        nval = "/home/l7v/dev/projects/company/active/nixos/scripts/validate.sh L7V";
        nup = "/home/l7v/dev/projects/company/active/nixos/scripts/update.sh";
        nrb = "sudo nixos-rebuild switch --flake /etc/nixos#L7V";

        # SOPS / Age Key Management
        sage = "/home/l7v/dev/projects/company/active/nixos/scripts/age-check.sh";
        srotate = "/home/l7v/dev/projects/company/active/nixos/scripts/secrets-rotate.sh";

        # Project Initializers
        aft-init = "/home/l7v/dev/projects/company/active/nixos/scripts/aft-init.sh";
        bpt-init = "/home/l7v/dev/projects/company/active/nixos/scripts/bpt-init.sh";
        adopt = "/home/l7v/dev/projects/company/active/nixos/scripts/adopt-repo.sh";

        # Secrets / SOPS
        sops-edit = "sops /etc/nixos/secrets/sops/secrets.yaml";
        sops-view = "sops --decrypt /etc/nixos/secrets/sops/secrets.yaml";
        age-pubkey = "sudo grep 'public key' /etc/age/key";
      };

      initContent = lib.mkBefore ''
        if [[ -r "''${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-''${(%):-%n}.zsh" ]]; then
          source "''${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-''${(%):-%n}.zsh"
        fi
        [[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh
        export SOPS_AGE_KEY_FILE=/etc/age/key

        # Generates a new Bash script with standard execution flags (set -euo pipefail).
        mkscript() {
          local script_name="$1"
          if [[ -z "$script_name" ]]; then
            echo "[ERROR] Usage: mkscript script-name.sh"
            return 1
          fi
          cat << 'EOF' > "$script_name"
        #!/usr/bin/env bash
        set -euo pipefail

        # Script logic starts here
        EOF
          chmod +x "$script_name"
          echo "[SUCCESS] Created executable script: $script_name"
        }

        # Displays available shell shortcuts and CLI utilities.
        help-alias() {
          echo "=========================================================="
          echo " L7V NixOS Development & Governance Shell Reference"
          echo "=========================================================="
          echo ""
          echo "[REPOSITORY & SYSTEM MANAGEMENT]"
          echo "  cdnix       : Navigates to system config (/etc/nixos)"
          echo "  cdnix-real  : Navigates to active development workspace"
          echo "  cdproj      : Navigates to projects directory (/home/l7v/dev/projects)"
          echo "  nval        : Runs code validation and dry-run build (validate.sh)"
          echo "  nup         : Updates flake inputs and rebuilds system (update.sh)"
          echo "  nrb         : Triggers NixOS rebuild switch"
          echo "  sage        : Verifies SOPS/Age encryption keys"
          echo "  srotate     : Rotates SOPS secret keys"
          echo ""
          echo "[PROJECT & CODE INITIALIZERS]"
          echo "  aft-init    : Initializes Next.js 16 AI project"
          echo "  bpt-init    : Initializes polyglot project (Python/Node/Rust/Go/Java)"
          echo "  adopt       : Adapts external GitHub repository to system workspace"
          echo "  mkscript    : Generates shell script with error handling flags"
          echo ""
          echo "[NIX & FLAKE UTILITIES]"
          echo "  ns / nb / nt: Executes nh os switch / build / test"
          echo "  nfu / nfc   : Updates or checks flake lockfile"
          echo "  ns-py/node  : Opens isolated Python/Node/Rust/Go shell environment"
          echo ""
          echo "[CORE UX & GIT SHORTCUTS]"
          echo "  cat -> bat  | cd -> z | ls -> eza | y -> yazi"
          echo "  gst / gaa / gc / gp: Quick Git operations"
          echo "=========================================================="
        }
        alias nix-help="help-alias"
      '';
    };

    kitty = {
      enable = true;
      font = {
        name = "FiraCode Nerd Font";
        size = 12;
      };
      settings = {
        background_opacity = "0.92";
        window_padding_width = 12;
        tab_bar_style = "powerline";
        tab_powerline_style = "slanted";
        cursor_blink_interval = "0.5";
        cursor_shape = "block";
        enable_audio_bell = false;
        visual_bell_duration = "0.0";
      };
      themeFile = "Catppuccin-Mocha";
    };

    alacritty = {
      enable = true;
      settings = {
        window = {
          opacity = 0.92;
          padding = {
            x = 12;
            y = 12;
          };
        };
        font = {
          normal = {
            family = "FiraCode Nerd Font";
            style = "Regular";
          };
          size = 12;
        };
      };
    };

    fzf = {
      enable = true;
      enableZshIntegration = true;
      defaultOptions = [
        "--height 40%"
        "--border"
        "--layout=reverse"
      ];
    };

    zoxide = {
      enable = true;
      enableZshIntegration = true;
    };

    direnv = {
      enable = true;
      enableZshIntegration = true;
      nix-direnv.enable = true;
    };

    gpg.enable = true;
  };

  services.gpg-agent = {
    enable = true;
    defaultCacheTtl = 3600;
    maxCacheTtl = 7200;
    pinentry.package = pkgs.pinentry-curses;
    enableSshSupport = true;
  };

  home.packages = with pkgs; [
    ripgrep
    fd
    bat
    eza
    tree
    fastfetch
    jq
    yq
    htop
    btop
    ncdu
    duf
    wget
    curl
    unzip
    zip
  ];
}
