# Desktop common: shared Wayland environment layer for Niri and Hyprland.
#
# All compositor-agnostic configuration lives here to avoid duplicating env
# vars and option definitions across compositor modules. Compositor-specific
# portals are added via extraPortals in each compositor's own module.
{ pkgs, lib, ... }:
{
  environment = {
    systemPackages = with pkgs; [
      xdg-utils
      zenity # GTK file dialog and notification utility (Electron/IDE support)
      kdePackages.kdialog # KDE file dialog utility
      wl-clipboard # wl-copy / wl-paste
      grim # screenshot
      slurp # region selection (used with grim)
      brightnessctl # brightness control
      bibata-cursors # cursor theme
      xwayland-satellite # standalone XWayland for X11 apps
      playerctl # MPRIS media key control
      wev # keyboard / input event debug tool
    ];

    etc."X11/Xresources".text = ''
      Xcursor.theme: Bibata-Modern-Amber
      Xcursor.size: 24
    '';

    sessionVariables = {
      XDG_SESSION_TYPE = "wayland";

      # AMD GPU — use RADV open-source Vulkan driver
      AMD_VULKAN_ICD = "RADV";

      # Electron / Chromium Wayland native rendering
      NIXOS_OZONE_WL = "1";
      # Firefox Wayland native rendering
      MOZ_ENABLE_WAYLAND = "1";
      # Qt Wayland with xcb fallback
      QT_QPA_PLATFORM = "wayland;xcb";
      # GTK Wayland with X11 fallback
      GDK_BACKEND = "wayland,x11";

      # Cursor theme
      XCURSOR_THEME = "Bibata-Modern-Amber";
      XCURSOR_SIZE = "24";
      XCURSOR_PATH = lib.mkForce "${pkgs.bibata-cursors}/share/icons";
    };
  };

  xdg.mime.defaultApplications = {
    "inode/directory" = [
      "org.kde.dolphin.desktop"
      "org.gnome.Nautilus.desktop"
    ];
    "x-scheme-handler/file" = [
      "org.kde.dolphin.desktop"
      "org.gnome.Nautilus.desktop"
    ];
  };

  services.gvfs.enable = true;

  xdg.portal = {
    enable = true;
    extraPortals = with pkgs; [
      xdg-desktop-portal-gtk
      kdePackages.xdg-desktop-portal-kde
      xdg-desktop-portal-gnome
    ];
    config = {
      common = {
        default = [
          "gtk"
          "kde"
          "gnome"
        ];
        "org.freedesktop.impl.portal.FileChooser" = [
          "gtk"
          "kde"
        ];
      };
      niri = {
        default = [
          "gtk"
          "kde"
          "gnome"
        ];
        "org.freedesktop.impl.portal.FileChooser" = [
          "gtk"
          "kde"
        ];
      };
    };
  };

  fonts.packages = with pkgs; [
    nerd-fonts.jetbrains-mono
    nerd-fonts.fira-code
    noto-fonts
    noto-fonts-color-emoji
  ];
}
