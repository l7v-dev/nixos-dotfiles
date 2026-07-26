{ inputs, pkgs, ... }:

# Home Manager profile configuration for Noctalia Shell v5.
# Sadece davranışsal/işlevsel ayarlar. Görsel kimlik (renk, wallpaper, cursor)
# için bkz. home/profiles/theme.nix
{
  imports = [
    inputs.noctalia.homeModules.default
  ];

  programs.noctalia = {
    enable = true;
    systemd.enable = true;
    package = inputs.noctalia.packages.${pkgs.stdenv.hostPlatform.system}.default;

    settings = {
      # Global shell preferences, animations, and launcher behaviors.
      shell = {
        font_family = "Inter Variable";
        corner_radius_scale = 1.0;
        settings_show_advanced = false;

        # Keeps launched applications running if the shell service restarts.
        launch_apps_as_systemd_services = true;

        clipboard_enabled = true;
        clipboard_history_max_entries = 200;
        clipboard_auto_paste = "auto";

        telemetry_enabled = false;
        setup_wizard_enabled = false;
        niri_overview_type_to_launch_enabled = true;

        screenshot = {
          save_to_file = true;
          directory = "~/Pictures/Screenshots";
          filename_pattern = "screenshot_%Y%m%d_%H%M%S";
          copy_to_clipboard = true;
          freeze_screen = true;
        };

        animation = {
          enabled = true;
          speed = 1.2;
        };

        shadow = {
          direction = "down";
          alpha = 0.55;
        };

        panel = {
          transparency_mode = "soft";
          borders = true;
          shadow = true;
          launcher_placement = "floating";
          clipboard_placement = "floating";
          control_center_placement = "attached";
        };

        launcher = {
          categories = true;
          show_icons = true;
          compact = false;
          app_grid = true;
          sort_by_usage = true;
          session_search = true;

          # SSH connection dmenu entry for launcher search.
          dmenu.entry.ssh = {
            command = "awk '/^Host /{print $2}' ~/.ssh/config 2>/dev/null";
            exec = "kitty -e ssh {selection}";
            prefix = "/ssh";
            glyph = "server";
            global = false;
          };
        };

        mpris = {
          blacklist = [ ];
        };
      };

      # On-Screen Display (OSD) layout and positioning.
      osd = {
        position = "top_center";
        orientation = "horizontal";
        scale = 1.0;
        offset_x = 20;
        offset_y = 8;
      };

      # Screen locker preferences and authentication behavior.
      lockscreen = {
        enabled = true;
        fingerprint = true;
        allow_empty_password = false;
        blurred_desktop = true;
        blur_intensity = 0.5;
        tint_intensity = 0.3;
      };

      # Primary status bar configuration (v5 section-based schema).
      "bar.main" = {
        position = "top";
        enabled = true;
        reserve_space = true;
        auto_hide = false;
        layer = "top";

        thickness = 36;
        background_opacity = 0.97;
        radius = 0;

        padding = 10;
        widget_spacing = 6;
        scale = 1.0;
        font_weight = "regular";

        capsule = true;
        capsule_fill = "surface_variant";
        capsule_opacity = 0.9;

        shadow = true;

        start = [
          "launcher"
          "workspaces"
        ];
        center = [ "clock" ];
        end = [
          "media"
          "tray"
          "notifications"
          "clipboard"
          "network"
          "bluetooth"
          "volume"
          "brightness"
          "battery"
          "control-center"
          "session"
        ];
      };

      # Application dock settings.
      dock = {
        enabled = true;
        position = "bottom";
        background_opacity = 0.0;
        auto_hide = true;
        show_on_hover = true;
        icon_size = 48;
      };

      launcher = {
        enabled = true;
      };

      # Desktop notification daemon integration.
      notification = {
        enable_daemon = true;
        position = "top-right";
        max_visible = 5;
      };

      # Overview backdrop blur settings.
      backdrop = {
        enabled = true;
        blur_intensity = 0.5;
        tint_intensity = 0.3;
      };

      # Location coordinates for weather and night-light services.
      location = {
        latitude = 41.0;
        longitude = 29.0;
      };

      # System idle state timers for lock screen and suspend.
      idle = {
        enabled = true;
        lock_after_seconds = 600;
        suspend_after_seconds = 1800;
      };
    };
  };
}