# Recovery tooling: local btrfs snapshots and restic repository verification.
#
# This module owns services.snapper exclusively. The backup capability covers
# offsite restic operations; this module only verifies repository reachability.
#
# The recovery-check systemd service and timer are only created when the backup
# capability is active. All attribute accesses on the restic backup config are
# guarded by config.l7v.backup.enable so evaluation never touches absent attrs.
{
  lib,
  config,
  pkgs,
  ...
}:
let
  cfg = config.l7v.platform.recovery;

  # Read backup config only when the capability is active. Using a let binding
  # evaluated inside mkIf keeps the outer scope free of conditional attr access.
  backupEnabled = config.l7v.backup.enable;
  resticBackup = config.services.restic.backups.l7v or { };
in
{
  options.l7v.platform.recovery = {
    enable = lib.mkEnableOption "recovery tooling";

    snapper = {
      enable = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Enable timeline snapshots of the configured subvolume.";
      };

      subvolume = lib.mkOption {
        type = lib.types.str;
        default = "/";
        description = ''
          Mount point to snapshot. Must be a btrfs subvolume — snapper cannot
          create the required .snapshots directory under the btrfs top-level
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

    # Repository reachability check. Only created when the backup capability is
    # active; all resticBackup attribute accesses are guarded by backupEnabled.
    systemd.services.recovery-check = lib.mkIf backupEnabled {
      description = "Restic repository health check";
      serviceConfig =
        let
          hasEnvFile = (resticBackup ? environmentFile) && (resticBackup.environmentFile != null);
        in
        {
          Type = "oneshot";
          Environment = [
            "RESTIC_REPOSITORY=${resticBackup.repository}"
            "RESTIC_PASSWORD_FILE=${resticBackup.passwordFile}"
          ];
          EnvironmentFile = lib.optional hasEnvFile resticBackup.environmentFile;
          ExecStart = "${pkgs.restic}/bin/restic snapshots --latest 1 --no-cache";
        };
    };

    systemd.timers.recovery-check = lib.mkIf backupEnabled {
      wantedBy = [ "timers.target" ];
      timerConfig = {
        OnCalendar = "weekly";
        Persistent = true;
      };
    };
  };
}
