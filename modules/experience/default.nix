# Experience layer: imported exclusively on workstations.
# Servers are headless — no GUI, audio, or power management here.
{ ... }:
{
  imports = [
    ./desktop/common
    ./desktop/greeter
    ./desktop/niri
    # ./desktop/hyprland  # disabled — kept for future parallel compositor support
    ./desktop/noctalia
    ./capabilities/audio
    ./capabilities/power
    ./capabilities/bluetooth
    ./capabilities/notifications
    ./capabilities/clipboard
    ./capabilities/screencast
  ];
}
