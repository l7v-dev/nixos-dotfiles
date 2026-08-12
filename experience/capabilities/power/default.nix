# Power capability (experience): upower + power management.
#
# Enabled on all workstations by default (consistent with other experience
# capabilities). power-profiles-daemon is disabled to avoid conflicts with
# auto-cpufreq; override per-host if a different CPU frequency manager is used.
{
  lib,
  config,
  ...
}:
{
  options.l7v.experience.power = lib.mkEnableOption "upower and power management" // {
    default = true;
  };

  config = lib.mkIf config.l7v.experience.power {
    services.upower.enable = true;
    # Disabled to avoid conflict with auto-cpufreq. Enable explicitly per-host
    # if GNOME Power Profiles or another daemon is preferred.
    services.power-profiles-daemon.enable = lib.mkDefault false;
  };
}
