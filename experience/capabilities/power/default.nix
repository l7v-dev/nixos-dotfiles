# Power capability (experience): upower + power management
_: {
  config = {
    services.upower.enable = true;
    services.power-profiles-daemon.enable = true;
  };
}
