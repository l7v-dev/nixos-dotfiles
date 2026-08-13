# Desktop: Niri scrollable-tiling Wayland compositor.
#
# Login screen  → experience/desktop/greeter (greetd + regreet)
# Shared env    → experience/desktop/common (session vars, portals, fonts, cursor)
# Screen lock   → Noctalia IPC
#
# XDG_CURRENT_DESKTOP / XDG_SESSION_DESKTOP are intentionally not set here —
# niri-session exports them automatically. Setting them in sessionVariables
# would conflict with a parallel Hyprland session on the same machine.
{ pkgs, ... }:
{
  programs.niri = {
    enable = true;
    package = pkgs.niri;
  };
}
