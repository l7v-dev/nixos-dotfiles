# Recovery tooling: local btrfs snapshots and restic repository verification.
#
# Sole owner of services.snapper; the backup capability covers offsite restic
# only. Repository coordinates are read back from services.restic so this module
# stays agnostic of the configured backend.
{
  lib,
  config,
  pkgs,
  ...
}:
let
  cfg = config.l7v.platform.recovery;
  resticBackup = config.services.restic.backups.l7v or null;
in
{
  options.l7v.platform.recovery = {
    enable = lib.mkEnableOption "recovery tooling";

    snapper = {
      enable = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Timeline snapshots of the configured subvolume.";
      };

      subvolume = lib.mkOption {
        type = lib.types.str;
        default = "/";
        description = ''
          Mount point to snapshot. Must be a btrfs subvolume: snapper cannot
          create the required .snapshots subvolume under the btrfs top level
          (subvolid=5).
        '';
      };
    };
  };

  config = lib.mkIf cfg.enable {
    assertions = [
      {
        assertion =
          !cfg.snapper.enable
          || (
            config.fileSystems ? ${cfg.snapper.subvolume}
            && config.fileSystems.${cfg.snapper.subvolume}.fsType == "btrfs"
          );
        message = "l7v.platform.recovery.snapper.subvolume must be a btrfs mount point";
      }
    ];

    environment.systemPackages =
      (with pkgs; [
        restic
        btrfs-progs
        gptfdisk
        testdisk
        ddrescue
      ])
      ++ lib.optional cfg.snapper.enable pkgs.snapper;

    services.snapper = lib.mkIf cfg.snapper.enable {
      configs.root = {
        SUBVOLUME = cfg.snapper.subvolume;
        ALLOW_USERS = [ config.l7v.identity.user ];
        TIMELINE_CREATE = true;
        TIMELINE_CLEANUP = true;
        TIMELINE_DELETE_CLEANUP = true;
        TIMELINE_LIMIT_HOURLY = 5;
        TIMELINE_LIMIT_DAILY = 7;
        TIMELINE_LIMIT_WEEKLY = 4;
        TIMELINE_LIMIT_MONTHLY = 6;
        TIMELINE_LIMIT_YEARLY = 2;
      };
    };

    # Repository reachability check. Requires a configured repository, so it
    # follows the backup capability rather than recovery tooling alone.
    # stdout is journalled by systemd; no shell redirection is possible here.
    systemd.services.recovery-check = lib.mkIf config.l7v.backup.enable {
      description = "Restic repository health check";
      serviceConfig = {
        Type = "oneshot";
        Environment = [
          "RESTIC_REPOSITORY=${resticBackup.repository}"
          "RESTIC_PASSWORD_FILE=${resticBackup.passwordFile}"
        ];
        EnvironmentFile = lib.optional (resticBackup.environmentFile != null) resticBackup.environmentFile;
        ExecStart = "${pkgs.restic}/bin/restic snapshots --latest 1 --no-cache";
      };
    };

    systemd.timers.recovery-check = lib.mkIf config.l7v.backup.enable {
      wantedBy = [ "timers.target" ];
      timerConfig = {
        OnCalendar = "weekly";
        Persistent = true;
      };
    };
  };
}
