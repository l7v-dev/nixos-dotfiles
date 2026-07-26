# Power capability (experience): upower + power management
{ pkgs, ... }:
{
  config = {
    services.upower.enable = true;
    services.power-profiles-daemon.enable = true;
  };
}
