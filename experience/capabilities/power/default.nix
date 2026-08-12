# Power capability (experience): upower + power management
#
# power-profiles-daemon is disabled by default to avoid conflicts with
# auto-cpufreq (or other CPU frequency managers). Enable explicitly per-host
# when needed (e.g. GNOME Power Profiles integration without auto-cpufreq).
{ lib, ... }: {
  config = {
    services.upower.enable = true;
    services.power-profiles-daemon.enable = lib.mkDefault false;
  };
}
