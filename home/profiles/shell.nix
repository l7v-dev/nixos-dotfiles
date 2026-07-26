# Home profile: shell (zsh + starship + fzf + zoxide + cli araçları)
{ pkgs, ... }:
{
  programs.zsh = {
    enable = true;
    autosuggestion.enable = true;
    syntaxHighlighting.enable = true;

    oh-my-zsh = {
      enable = true;
      theme = "robbyrussell";
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

      # Nix / Flake (nh power user)
      ns = "nh os switch";
      nb = "nh os build";
      nt = "nh os test";
      nc = "nh clean all";
      nfu = "nix flake update";
      nfc = "nix flake check";
      nsh = "nix-shell --run zsh";
      nd = "nix develop";
      nom = "nix-output-monitor";

      # İzole ortam
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

      # Git quick
      gst = "git status";
      gco = "git checkout";
      gaa = "git add -A";
      gc = "git commit -m";
      gp = "git push";
      gl = "git log --oneline --graph --decorate";

      # Dev & Workspace
      pj = "cd ~/dev && ls";
      cdproj = "cd ~/dev/projects";
      dev = "cd ~/dev/projects/personal";
      lg = "lazygit";
      btop = "btop";
      dust = "duf -only local";

      # NixOS Repo & Governance
      cdnix = "cd /etc/nixos";
      cdnix-real = "cd /home/l7v/dev/projects/company/active/nixos";
      nval = "/home/l7v/dev/projects/company/active/nixos/scripts/validate.sh L7V";
      nup = "/home/l7v/dev/projects/company/active/nixos/scripts/update.sh";
      nrb = "sudo nixos-rebuild switch --flake /etc/nixos#L7V";

      # SOPS / Age Gizli Yönetim
      sage = "/home/l7v/dev/projects/company/active/nixos/scripts/age-check.sh";
      srotate = "/home/l7v/dev/projects/company/active/nixos/scripts/secrets-rotate.sh";

      # Proje Başlatıcılar (CLI Utilities)
      aft-init = "/home/l7v/dev/projects/company/active/nixos/scripts/aft-init.sh";
      bpt-init = "/home/l7v/dev/projects/company/active/nixos/scripts/bpt-init.sh";
      adopt = "/home/l7v/dev/projects/company/active/nixos/scripts/adopt-repo.sh";

      # Secrets / SOPS
      sops-edit = "sops /etc/nixos/secrets/sops/secrets.yaml";
      sops-view = "sops --decrypt /etc/nixos/secrets/sops/secrets.yaml";
      age-pubkey = "sudo grep 'public key' /etc/age/key";
    };

    initContent = ''
      export SOPS_AGE_KEY_FILE=/etc/age/key

      # Creates a new Bash script with safe execution flags (set -euo pipefail).
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
        echo "  cdnix       : Navigates to official system config (/etc/nixos)"
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
        echo "  mkscript    : Generates POSIX/Google style compliant shell script"
        echo ""
        echo "[NIX & FLAKE UTILITIES]"
        echo "  ns / nb / nt: Executed nh os switch / build / test"
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

  programs.starship = {
    enable = true;
    settings = {
      add_newline = true;
      palette = "catppuccin_mocha";

      format = ''
        $username$hostname$directory$nix_shell$git_branch$git_status$cmd_duration$status
        $character
      '';

      character = {
        success_symbol = "[➜](bold green) ";
        error_symbol = "[✗](bold red) ";
        vimcmd_symbol = "[V](bold yellow) ";
      };

      directory = {
        truncation_length = 3;
        truncate_to_repo = true;
        style = "bold cyan";
        format = "[$path]($style)[$read_only]($read_only_style) ";
      };

      git_branch = {
        symbol = " ";
        style = "bold purple";
        format = "[$symbol$branch(:$remote_branch)]($style) ";
      };

      git_status = {
        style = "bold red";
        format = "([$all_status$ahead_behind]($style) )";
      };

      cmd_duration = {
        min_time = 2000;
        style = "bold yellow";
        format = "took [$duration]($style) ";
      };

      status = {
        disabled = false;
        style = "bold red";
        format = "[$symbol$status]($style) ";
      };

      nix_shell = {
        disabled = false;
        symbol = "❄️ ";
        format = "[$symbol$state( ($name))]($style) ";
      };

      username = {
        show_always = false;
        style_user = "bold yellow";
        format = "[$user]($style) ";
      };

      hostname = {
        ssh_only = true;
        style = "bold dimmed green";
        format = "at [$hostname]($style) ";
      };

      palettes.catppuccin_mocha = {
        rosewater = "#f5e0dc";
        flamingo = "#f2cdcd";
        pink = "#f5c2e7";
        mauve = "#cba6f7";
        red = "#f38ba8";
        maroon = "#eba0ac";
        peach = "#fab387";
        yellow = "#f9e2af";
        green = "#a6e3a1";
        teal = "#94e2d5";
        sky = "#89dceb";
        sapphire = "#74c7ec";
        blue = "#89b4fa";
        lavender = "#b4befe";
        text = "#cdd6f4";
        subtext1 = "#bac2de";
        subtext0 = "#a6adc8";
        overlay2 = "#9399b2";
        overlay1 = "#7f849c";
        overlay0 = "#6c7086";
        surface2 = "#585b70";
        surface1 = "#45475a";
        surface0 = "#313244";
        base = "#1e1e2e";
        mantle = "#181825";
        crust = "#11111b";
      };
    };
  };

  programs.kitty = {
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

  programs.fzf = {
    enable = true;
    enableZshIntegration = true;
    defaultOptions = [ "--height 40%" "--border" "--layout=reverse" ];
  };

  programs.zoxide = {
    enable = true;
    enableZshIntegration = true;
  };

  programs.direnv = {
    enable = true;
    enableZshIntegration = true;
    nix-direnv.enable = true;
  };

  services.gpg-agent = {
    enable = true;
    defaultCacheTtl = 3600;
    maxCacheTtl = 7200;
    pinentry.package = pkgs.pinentry-curses;
    enableSshSupport = true;
  };

  programs.gpg.enable = true;

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