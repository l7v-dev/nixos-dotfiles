{ ... }:

# User environment configuration for Hyprland compositor.
{
  xdg.configFile."hypr/hyprland.conf" = {
    text = ''
      # Catppuccin Mocha color palette variables.
      $mauve = rgb(cba6f7)
      $lavender = rgb(b4befe)
      $sapphire = rgb(74c7ec)
      $surface0 = rgb(313244)
      $surface1 = rgb(45475a)

      # Key modifier and default application definitions.
      $mod = SUPER
      $terminal = kitty
      $fileManager = nautilus

      # Monitor configuration.
      monitor = , preferred, auto, 1

      # Autostart essential background services & shell
      exec-once = dbus-update-activation-environment --systemd WAYLAND_DISPLAY XDG_CURRENT_DESKTOP
      exec-once = systemctl --user import-environment WAYLAND_DISPLAY XDG_CURRENT_DESKTOP
      exec-once = noctalia

      # Hardware input devices, touchpad, and mouse settings.
      input {
        kb_layout = tr
        repeat_delay = 300
        repeat_rate = 50
        numlock_by_default = true
        follow_mouse = 1
        sensitivity = 0

        touchpad {
          natural_scroll = true
          tap-to-click = true
          drag_lock = false
          disable_while_typing = true
          scroll_factor = 0.8
        }
      }

      # General compositor layout and border aesthetics.
      general {
        gaps_in = 4
        gaps_out = 10
        border_size = 2
        col.active_border = $mauve $sapphire 45deg
        col.inactive_border = $surface0
        layout = dwindle
        resize_on_border = true
      }

      # Window decoration, rounding, opacity, blur, and drop shadows.
      decoration {
        rounding = 10
        active_opacity = 1.0
        inactive_opacity = 0.95

        blur {
          enabled = true
          size = 6
          passes = 3
          new_optimizations = true
          xray = false
          ignore_opacity = true
        }

        shadow {
          enabled = true
          range = 15
          render_power = 3
          color = rgba(1a1a1aee)
        }
      }

      # Bezier curves and spring physics animations for high refresh rate displays.
      animations {
        enabled = true

        bezier = easeOutQuint, 0.23, 1, 0.32, 1
        bezier = easeInOutCubic, 0.65, 0, 0.35, 1
        bezier = almostLinear, 0.5, 0.5, 0.75, 1
        bezier = quick, 0.15, 0, 0.1, 1

        animation = global, 1, 10, default
        animation = border, 1, 5.39, easeOutQuint
        animation = windows, 1, 3, easeOutQuint
        animation = windowsIn, 1, 3, easeOutQuint, popin 87%
        animation = windowsOut, 1, 2.5, easeOutQuint, popin 87%
        animation = fadeIn, 1, 1.73, almostLinear
        animation = fadeOut, 1, 1.46, almostLinear
        animation = fade, 1, 3, quick
        animation = layers, 1, 3.81, easeOutQuint
        animation = workspaces, 1, 3, easeOutQuint, slide
      }

      # Dwindle tiling layout rules.
      dwindle {
        pseudotile = true
        preserve_split = true
        smart_resizing = true
      }

      # General compositor behavior options.
      misc {
        force_default_wallpaper = 0
        disable_hyprland_logo = true
        vfr = true
        vrr = 1
        focus_on_activate = true
      }

      # Touchpad gesture configuration.
      gestures {
        workspace_swipe = true
        workspace_swipe_fingers = 3
      }

      # Environment variables for system cursors and Wayland backends.
      env = XCURSOR_THEME,Bibata-Modern-Amber
      env = XCURSOR_SIZE,24
      env = QT_QPA_PLATFORM,wayland
      env = GDK_BACKEND,wayland,x11

      # Window rules for floating dialogs, workspaces, and specific application behaviors.
      windowrulev2 = float, class:^(pavucontrol|nm-connection-editor|blueman-manager)$
      windowrulev2 = float, class:^(firefox)$, title:^(Picture-in-Picture)$
      windowrulev2 = pin, class:^(firefox)$, title:^(Picture-in-Picture)$
      windowrulev2 = float, class:^(dev.noctalia.Noctalia.Settings)$
      windowrulev2 = center, class:^(dev.noctalia.Noctalia.Settings)$
      windowrulev2 = size 1080 920, class:^(dev.noctalia.Noctalia.Settings)$

      windowrulev2 = workspace 2, class:^(zen)$
      windowrulev2 = workspace 3, class:^(code-cursor|cursor|kiro|code|zed)$
      windowrulev2 = workspace 6, class:^(obsidian)$
      windowrulev2 = workspace 5, title:(?i)(aider|claude|gemini)

      # Layer rules for Noctalia shell blur and transparency effects.
      layerrule = blur, noctalia-.*
      layerrule = ignorezero, noctalia-.*

      # Application launch shortcuts.
      bind = $mod, Return, exec, $terminal
      bind = $mod SHIFT, Return, exec, $terminal -e zellij
      bind = $mod, E, exec, $terminal -e yazi
      bind = $mod SHIFT, E, exec, $fileManager
      bind = $mod, Z, exec, zen
      bind = $mod, N, exec, $terminal -e nvim
      bind = $mod, G, exec, $terminal -e lazygit
      bind = $mod SHIFT, B, exec, $terminal -e btop

      # Noctalia shell IPC integration keybindings.
      bind = $mod, Space, exec, noctalia msg panel-toggle launcher
      bind = $mod, D, exec, noctalia msg panel-toggle launcher
      bind = $mod, S, exec, noctalia msg panel-toggle control-center
      bind = $mod, Comma, exec, noctalia msg settings-toggle
      bind = $mod, Period, exec, noctalia msg panel-toggle clipboard
      bind = $mod SHIFT, W, exec, noctalia msg panel-toggle wallpaper
      bind = $mod ALT, S, exec, noctalia msg window-switcher
      bind = $mod SHIFT, L, exec, noctalia msg session lock

      # Developer tools and AI launcher bindings.
      bind = $mod SHIFT, C, exec, code-cursor
      bind = $mod SHIFT, K, exec, kiro
      bind = $mod SHIFT, Z, exec, zed
      bind = $mod SHIFT, A, exec, $terminal -e aider
      bind = $mod CTRL, A, exec, $terminal -e aider --model claude-3-5-sonnet-20241022
      bind = $mod SHIFT, O, exec, obsidian

      # Window layout management bindings.
      bind = $mod, Q, killactive
      bind = $mod SHIFT, Q, exit
      bind = $mod, F, fullscreen, 0
      bind = $mod SHIFT, F, fullscreen, 1
      bind = $mod, V, togglefloating
      bind = $mod, P, pseudo
      bind = $mod, J, togglesplit
      bind = $mod, O, exec, noctalia msg panel-toggle overview

      # Window focus navigation using Vim motion keys.
      bind = $mod, H, movefocus, l
      bind = $mod, L, movefocus, r
      bind = $mod, K, movefocus, u
      bind = $mod, J, movefocus, d

      # Window position movement using Vim motion keys.
      bind = $mod CTRL, H, movewindow, l
      bind = $mod CTRL, L, movewindow, r
      bind = $mod CTRL, K, movewindow, u
      bind = $mod CTRL, J, movewindow, d

      # Window resizing using Vim motion keys.
      binde = $mod ALT, H, resizeactive, -30 0
      binde = $mod ALT, L, resizeactive, 30 0
      binde = $mod ALT, K, resizeactive, 0 -30
      binde = $mod ALT, J, resizeactive, 0 30

      # Workspace switching and window migration.
      bind = $mod, 1, workspace, 1
      bind = $mod, 2, workspace, 2
      bind = $mod, 3, workspace, 3
      bind = $mod, 4, workspace, 4
      bind = $mod, 5, workspace, 5
      bind = $mod, 6, workspace, 6

      bind = $mod CTRL, 1, movetoworkspace, 1
      bind = $mod CTRL, 2, movetoworkspace, 2
      bind = $mod CTRL, 3, movetoworkspace, 3
      bind = $mod CTRL, 4, movetoworkspace, 4
      bind = $mod CTRL, 5, movetoworkspace, 5
      bind = $mod CTRL, 6, movetoworkspace, 6

      # Mouse bindings for window drag and resize.
      bindm = $mod, mouse:272, movewindow
      bindm = $mod, mouse:273, resizewindow

      # Screenshot utilities via Noctalia IPC.
      bind = , Print, exec, noctalia msg screenshot-region
      bind = SHIFT, Print, exec, noctalia msg screenshot-fullscreen

      # Hardware media and volume control keys.
      bindel = , XF86AudioRaiseVolume, exec, noctalia msg volume-up
      bindel = , XF86AudioLowerVolume, exec, noctalia msg volume-down
      bindel = , XF86AudioMute, exec, noctalia msg volume-mute
      bindel = , XF86AudioMicMute, exec, wpctl set-mute @DEFAULT_AUDIO_SOURCE@ toggle
      bindel = , XF86MonBrightnessUp, exec, noctalia msg brightness-up
      bindel = , XF86MonBrightnessDown, exec, noctalia msg brightness-down
      bindl = , XF86AudioPlay, exec, playerctl play-pause
      bindl = , XF86AudioPause, exec, playerctl play-pause
      bindl = , XF86AudioNext, exec, playerctl next
      bindl = , XF86AudioPrev, exec, playerctl previous
    '';
  };
}