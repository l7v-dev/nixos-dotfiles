{ pkgs, ... }:

# Görsel kimlik: renk paleti, wallpaper, cursor teması, gtk/qt tema.
# Noctalia'nın davranışsal ayarları için bkz. home/profiles/noctalia.nix
{
  programs.noctalia.settings = {
    # Built-in color scheme selection.
    theme = {
      mode = "dark";
      source = "builtin";
      builtin = "Catppuccin";
    };

    # Display color temperature adjustment service.
    "night-light" = {
      enabled = true;
      temperature_day = 6500;
      temperature_night = 4000;
      use_location = true;
    };

    # Desktop wallpaper management and transition parameters.
    wallpaper = {
      enabled = true;
      fill_mode = "crop";
      transition = [
        "fade"
        "wipe"
      ];
      transition_duration = 1200;

      directory = "~/Pictures/Wallpapers";

      "default" = {
        path = "catppuccin-mocha.svg";
      };

      automation = {
        enabled = false;
        interval_seconds = 3600;
        order = "random";
      };
    };
  };

  # Default Catppuccin Mocha SVG wallpaper generation.
  home.file."Pictures/Wallpapers/catppuccin-mocha.svg".text = ''
    <svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1600" viewBox="0 0 2560 1600">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#11111b"/>
          <stop offset="0.55" stop-color="#1e1e2e"/>
          <stop offset="1" stop-color="#313244"/>
        </linearGradient>
        <radialGradient id="glow" cx="78%" cy="22%" r="65%">
          <stop offset="0" stop-color="#cba6f7" stop-opacity="0.32"/>
          <stop offset="0.42" stop-color="#89b4fa" stop-opacity="0.12"/>
          <stop offset="1" stop-color="#1e1e2e" stop-opacity="0"/>
        </radialGradient>
        <filter id="blur"><feGaussianBlur stdDeviation="70"/></filter>
      </defs>
      <rect width="2560" height="1600" fill="url(#bg)"/>
      <rect width="2560" height="1600" fill="url(#glow)"/>
      <circle cx="2080" cy="260" r="260" fill="#f5c2e7" fill-opacity="0.12" filter="url(#blur)"/>
      <circle cx="420" cy="1420" r="330" fill="#89b4fa" fill-opacity="0.10" filter="url(#blur)"/>
      <path d="M-120 1320 C 500 980, 820 1580, 1420 1160 S 2240 640, 2700 880" fill="none" stroke="#cba6f7" stroke-opacity="0.13" stroke-width="3"/>
      <path d="M-80 1400 C 520 1060, 880 1640, 1480 1220 S 2280 700, 2700 940" fill="none" stroke="#89b4fa" stroke-opacity="0.10" stroke-width="2"/>
    </svg>
  '';

  # Noctalia kendi cursor'ını üretmiyor, var olan bir temayı referans alır.
  home.pointerCursor = {
    enable = true;
    name = "Bibata-Modern-Amber";
    package = pkgs.bibata-cursors;
    size = 24;
    gtk.enable = true;
    x11.enable = true;
  };

  gtk = {
    enable = true;
    iconTheme = {
      name = "Adwaita";
      package = pkgs.adwaita-icon-theme;
    };
    cursorTheme = {
      name = "Bibata-Modern-Amber";
      package = pkgs.bibata-cursors;
      size = 24;
    };
  };

  qt = {
    enable = true;
    platformTheme.name = "gtk3";
    style.name = "adwaita";
  };
}
