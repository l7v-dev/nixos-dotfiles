# Clipboard: wl-clipboard + cliphist (Wayland/niri)
{
  lib,
  config,
  pkgs,
  ...
}:
{
  options.l7v.experience.clipboard = lib.mkEnableOption "clipboard manager";

  config = lib.mkIf config.l7v.experience.clipboard {
    environment.systemPackages = with pkgs; [
      wl-clipboard # wl-copy / wl-paste
      cliphist # clipboard history daemon
      xsel # X11 compat
    ];

    # cliphist: wayland clipboard history
    # home-manager tarafında başlatılır:
    # services.cliphist.enable = true;
  };
}
