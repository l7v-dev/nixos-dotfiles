# Desktop: niri (Wayland compositor)
# Login ekranı  → experience/desktop/greeter (greetd + regreet)
# Ortak ayarlar → experience/desktop/common (env var, portal, font, imleç)
# Ekran kilidi  → Noctalia IPC (swaylock kaldırıldı)
#
# NOT: XDG_CURRENT_DESKTOP / XDG_SESSION_DESKTOP burada BİLEREK set edilmiyor —
# niri-session bunu kendisi export ediyor. Global sessionVariables'a yazılırsa
# Hyprland de aynı makinede olduğu için session'lar arası çakışır.
{ pkgs, ... }:
{
  programs.niri = {
    enable = true;
    package = pkgs.niri;
  };
}
