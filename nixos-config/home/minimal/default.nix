# Home-manager minimal profile: headless server operations (no GUI).
{
  lib,
  config,
  pkgs,
  user,
  ...
}:
{
  options.l7v.home.minimal.enable = lib.mkOption {
    type = lib.types.bool;
    default = true;
    description = "Enable the minimal (server) home-manager profile.";
  };

  config = lib.mkIf config.l7v.home.minimal.enable {
    home = {
      username = user;
      homeDirectory = "/home/${user}";
      stateVersion = "25.05";
    };

    home.packages = with pkgs; [
      # Editors
      vim
      neovim

      # System monitoring
      htop
      btop
      ncdu
      duf

      # Network utilities
      curl
      wget
      rsync
      nmap
      nettools
      iproute2

      # Data processing
      jq
      yq-go
      ripgrep
      fd

      # Version control
      git
      lazygit

      # Terminal multiplexers
      tmux
      zellij

      # Secrets management
      age
      sops
    ];

    programs = {
      zsh = {
        enable = true;
        autosuggestion.enable = true;
        syntaxHighlighting.enable = true;
        shellAliases = {
          ll = "ls -la";
          vi = "nvim";
          vim = "nvim";
          ns = "sudo nixos-rebuild switch --flake /etc/nixos#";
        };
        initContent = ''
          export SOPS_AGE_KEY_FILE=/etc/age/key
          export EDITOR=nvim
        '';
      };

      git = {
        enable = true;
        extraConfig = {
          init.defaultBranch = "main";
          pull.rebase = true;
          core.editor = "nvim";
        };
      };

      tmux = {
        enable = true;
        shortcut = "a"; # Ctrl+a prefix (screen-style)
        terminal = "screen-256color";
        historyLimit = 10000;
        keyMode = "vi";
      };

      ssh = {
        enable = true;
        addKeysToAgent = "yes";
        serverAliveInterval = 60;
      };
    };
  };
}
