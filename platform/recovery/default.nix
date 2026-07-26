# Platform Recovery: snapshot + restore prosedürü
# btrfs snapshot + restic restore araçları
{ lib, config, pkgs, ... }:
{
  options.l7v.platform.recovery = {
    enable = lib.mkEnableOption "recovery tooling";
  };

  config = lib.mkIf config.l7v.platform.recovery.enable {
    environment.systemPackages = with pkgs; [
      restic
      btrfs-progs
      snapper
      gptfdisk   # disk kurtarma
      testdisk   # partition kurtarma
      ddrescue   # disk kopyalama
    ];

    # Snapper: root subvolume snapshot
    services.snapper.configs.root = {
      SUBVOLUME               = "/";
      ALLOW_USERS             = [ config.l7v.identity.user ];
      TIMELINE_CREATE         = true;
      TIMELINE_DELETE_CLEANUP = true;
      TIMELINE_LIMIT_HOURLY   = 5;
      TIMELINE_LIMIT_DAILY    = 7;
      TIMELINE_LIMIT_WEEKLY   = 4;
      TIMELINE_LIMIT_MONTHLY  = 6;
      TIMELINE_LIMIT_YEARLY   = 2;
    };

    # systemd timer: haftalık restic snapshot health check
    systemd.services."recovery-check" = {
      description = "Restic backup health check";
      serviceConfig = {
        Type      = "oneshot";
        ExecStart = "${pkgs.restic}/bin/restic snapshots --no-cache 2>&1 | ${pkgs.util-linux}/bin/logger -t recovery-check";
      };
    };
    systemd.timers."recovery-check" = {
      wantedBy    = [ "timers.target" ];
      timerConfig = {
        OnCalendar = "weekly";
        Persistent = true;
      };
    };
  };
}
