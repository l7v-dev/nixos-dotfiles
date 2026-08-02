# Deneyim: niri + Hyprland arasında PAYLAŞILAN wayland ortam katmanı.
# Compositor'a özgü olmayan her şey burada — tekrar (duplicate env var,
# çakışan option tanımı) yaşamamak için tek yerden yönetiliyor.
{ pkgs, lib, ... }:
{
  environment = {
    systemPackages = with pkgs; [
      xdg-utils
      wl-clipboard # wl-copy / wl-paste
      grim # ekran görüntüsü
      slurp # alan seçimi (grim ile birlikte)
      brightnessctl # parlaklık kontrolü
      bibata-cursors # imleç teması
      xwayland-satellite # X11 app'leri için standalone XWayland
      playerctl # MPRIS medya tuşları
      wev # tuş adı / input debug
    ];

    etc."X11/Xresources".text = ''
      Xcursor.theme: Bibata-Modern-Amber
      Xcursor.size: 24
    '';

    sessionVariables = {
      XDG_SESSION_TYPE = "wayland";

      # AMD GPU
      AMD_VULKAN_ICD = "RADV";

      # Electron / Chromium Wayland
      NIXOS_OZONE_WL = "1";
      # Firefox Wayland
      MOZ_ENABLE_WAYLAND = "1";
      # Qt Wayland (xcb fallback)
      QT_QPA_PLATFORM = "wayland;xcb";
      # GTK Wayland
      GDK_BACKEND = "wayland,x11";

      # İmleç
      XCURSOR_THEME = "Bibata-Modern-Amber";
      XCURSOR_SIZE = "24";
      XCURSOR_PATH = lib.mkForce "${pkgs.bibata-cursors}/share/icons";
    };
  };

  xdg.mime.defaultApplications = {
    "inode/directory" = "org.gnome.Nautilus.desktop";
    "x-scheme-handler/file" = "org.gnome.Nautilus.desktop";
  };

  services.gvfs.enable = true;

  # Compositor'a özgü portal'lar kendi modüllerinde extraPortals'a eklenir
  # (ör. experience/desktop/hyprland → xdg-desktop-portal-hyprland).
  xdg.portal = {
    enable = true;
    extraPortals = [ pkgs.xdg-desktop-portal-gnome ];
    config.common.default = "*";
  };

  fonts.packages = with pkgs; [
    nerd-fonts.jetbrains-mono
    nerd-fonts.fira-code
    noto-fonts
    noto-fonts-color-emoji
  ];
}
