# Identity: user, zsh, locale, timezone, multi-user
{
  lib,
  config,
  pkgs,
  ...
}:
{
  options.l7v.identity = {
    user = lib.mkOption {
      type = lib.types.str;
      default = "l7v";
    };

    extraUsers = lib.mkOption {
      type = lib.types.attrsOf (
        lib.types.submodule {
          options = {
            groups = lib.mkOption {
              type = lib.types.listOf lib.types.str;
              default = [ "wheel" ];
            };
            shell = lib.mkOption {
              type = lib.types.package;
              default = pkgs.zsh;
            };
            isAdmin = lib.mkOption {
              type = lib.types.bool;
              default = false;
            };
            sshKeys = lib.mkOption {
              type = lib.types.listOf lib.types.str;
              default = [ ];
            };
          };
        }
      );
      default = { };
    };

    sshKeys = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [ ];
    };
  };

  config = {
    time.timeZone = "Europe/Istanbul";
    i18n = {
      defaultLocale = "en_US.UTF-8";
      extraLocaleSettings = {
        LC_TIME = "tr_TR.UTF-8";
        LC_MONETARY = "tr_TR.UTF-8";
      };
    };

    users.users = lib.mkMerge [
      {
        ${config.l7v.identity.user} = {
          isNormalUser = true;
          shell = pkgs.zsh;
          openssh.authorizedKeys.keys = config.l7v.identity.sshKeys;
          extraGroups = [
            "wheel"
            "networkmanager"
            "docker"
            "audio"
            "video"
            "input"
            "storage"
            "render"
            "kvm"
          ];
        };
      }
      (lib.mapAttrs (_name: cfg: {
        isNormalUser = true;
        inherit (cfg) shell;
        openssh.authorizedKeys.keys = cfg.sshKeys;
        extraGroups =
          cfg.groups
          ++ lib.optionals cfg.isAdmin [
            "wheel"
            "docker"
          ];
      }) config.l7v.identity.extraUsers)
    ];

    programs.zsh.enable = true;
    security.sudo = {
      enable = true;
      wheelNeedsPassword = lib.mkDefault true;
      # nixos-rebuild için şifre sorma — editör ve terminal'den rebuild kolaylığı
      extraRules = [
        {
          users = [ config.l7v.identity.user ];
          commands = [
            {
              command = "/run/current-system/sw/bin/nixos-rebuild";
              options = [ "NOPASSWD" ];
            }
            {
              command = "/nix/var/nix/profiles/default/bin/nixos-rebuild";
              options = [ "NOPASSWD" ];
            }
          ];
        }
      ];
    };
  };
}
