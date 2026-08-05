# Experience katmanı: SADECE workstation'lara import edilir.
# Sunucularda GUI/audio/power olmaz.
{ ... }:
{
  imports = [
    ./desktop/common
    ./desktop/greeter
    ./desktop/niri
    # ./desktop/hyprland (devre dışı)
    ./desktop/noctalia
    ./capabilities/audio
    ./capabilities/power
    ./capabilities/bluetooth
    ./capabilities/notifications
    ./capabilities/clipboard
    ./capabilities/screencast
  ];
}
