# Home-manager minimal profili: sunucu operasyonları (GUI yok)
{ lib, config, pkgs, user, ... }:
{
  options.l7v.home.minimal.enable = lib.mkOption {
    type    = lib.types.bool;
    default = true;
  };

  config = lib.mkIf config.l7v.home.minimal.enable {
    home = {
      username      = user;
      homeDirectory = "/home/${user}";
      stateVersion  = "25.05";
    };

    home.packages = with pkgs; [
      # Editörler
      vim
      neovim

      # Sistem izleme
      htop
      btop
      ncdu
      duf

      # Ağ araçları
      curl
      wget
      rsync
      nmap
      nettools
      iproute2

      # Veri işleme
      jq
      yq-go
      ripgrep
      fd

      # Sürüm kontrolü
      git
      lazygit

      # Terminal çoklayıcı
      tmux
      zellij

      # Sops / secrets
      age
      sops
    ];

    programs.zsh = {
      enable                    = true;
      autosuggestion.enable     = true;
      syntaxHighlighting.enable = true;
      shellAliases = {
        ll  = "ls -la";
        vi  = "nvim";
        vim = "nvim";
        ns  = "sudo nixos-rebuild switch --flake /etc/nixos#";
      };
      initContent = ''
        export SOPS_AGE_KEY_FILE=/etc/age/key
        export EDITOR=nvim
      '';
    };

    programs.git = {
      enable      = true;
      extraConfig = {
        init.defaultBranch = "main";
        pull.rebase        = true;
        core.editor        = "nvim";
      };
    };

    programs.tmux = {
      enable       = true;
      shortcut     = "a";           # Ctrl+a prefix (screen-style)
      terminal     = "screen-256color";
      historyLimit = 10000;
      keyMode      = "vi";
    };

    programs.ssh = {
      enable              = true;
      addKeysToAgent      = "yes";
      serverAliveInterval = 60;
    };
  };
}
