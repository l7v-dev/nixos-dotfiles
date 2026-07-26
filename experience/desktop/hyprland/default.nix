# Desktop: Hyprland (Wayland compositor) — niri'nin yanında ikinci seçenek.
# Login ekranından (regreet) seçilebilir, ortak ayarlar → experience/desktop/common.
#
# Not: nixpkgs unstable'daki resmi `programs.hyprland` modülü kullanılıyor
# (niri gibi ayrı bir flake input gerekmiyor — hyprland zaten nixpkgs'te güncel).
{ pkgs, ... }:
{
  programs.hyprland = {
    enable         = true;
    package        = pkgs.hyprland;
    xwayland.enable = true;
  };

  # Hyprland'e özgü ekran paylaşımı/screenshot portalı — common modülündeki
  # gnome portal'a EK olarak eklenir, "hyprland" oturumu için önceliklendirilir.
  xdg.portal = {
    extraPortals = [ pkgs.xdg-desktop-portal-hyprland ];
    config."hyprland".default = [ "hyprland" "gtk" ];
  };
}
