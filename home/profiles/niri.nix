{ pkgs, ... }:

# User environment configuration for Niri window manager and system tools.
{
  xdg.configFile."niri/config.kdl" = {
    force = true;
    text = ''
      // Keyboard and pointer input configuration.
      input {
        keyboard {
          xkb {
            layout "tr"
          }
          repeat-delay 300
          repeat-rate 50
          numlock
        }

        touchpad {
          tap
          tap-button-map "left-right-middle"
          drag true
          natural-scroll
          scroll-method "two-finger"
          accel-speed 0.2
          accel-profile "adaptive"
          dwt
          disabled-on-external-mouse
        }

        mouse {
          accel-profile "flat"
        }

        warp-mouse-to-focus
        focus-follows-mouse max-scroll-amount="0%"
      }

      output "eDP-1" {
        scale 1.0
      }

      // Desktop layout, column defaults, gaps, and window borders.
      layout {
        gaps 12
        center-focused-column "never"
        background-color "transparent"

        preset-column-widths {
          proportion 0.25
          proportion 0.33333
          proportion 0.5
          proportion 0.66667
          proportion 0.8
        }

        default-column-width { proportion 0.5; }

        focus-ring {
          width 3
          active-gradient from="#f38ba8" to="#fab387" angle=45
          inactive-gradient from="#313244" to="#45475a" angle=45 relative-to="workspace-view"
        }

        border {
          off
          width 2
          active-color "#cba6f7"
          inactive-color "#313244"
        }

        shadow {
          on
          softness 30
          spread 5
          offset x=0 y=5
          color "#0007"
        }
      }

      prefer-no-csd
      screenshot-path "~/Pictures/Screenshots/Screenshot from %Y-%m-%d %H-%M-%S.png"

      // Modern spring physics animations for high refresh rate and tactile feedback.
      animations {
        workspace-switch {
          spring damping-ratio=0.8 stiffness=700 epsilon=0.0001
        }

        window-open {
          duration-ms 200
          curve "ease-out-expo"
        }

        window-close {
          duration-ms 150
          curve "ease-out-quad"
        }

        horizontal-view-movement {
          spring damping-ratio=0.85 stiffness=800 epsilon=0.0001
        }

        window-movement {
          spring damping-ratio=0.8 stiffness=750 epsilon=0.0001
        }

        window-resize {
          spring damping-ratio=0.9 stiffness=800 epsilon=0.0001
        }
      }

      // Named workspace declarations.
      workspace "terminal" {}
      workspace "browser" {}
      workspace "code" {}
      workspace "media" {}
      workspace "ai" {}
      workspace "notes" {}

      xwayland-satellite {}

      hotkey-overlay {
        skip-at-startup
      }

      // Enable window activation compatibility required by Noctalia IPC.
      debug {
        honor-xdg-activation-with-invalid-serial
      }

      // Layer rules for Noctalia shell components.
      layer-rule {
        match namespace=r#"^noctalia-backdrop"#
        place-within-backdrop true
      }

      layer-rule {
        match namespace=r#"^noctalia-(bar|notification|dock|panel|attached-panel|osd)"#
        background-effect {
          xray false
        }
      }

      // Window behaviors and workspace assignment rules.
      window-rule {
        match app-id=r#"^dev\.noctalia\.Noctalia\.Settings$"#
        open-floating true
        default-column-width { fixed 1080; }
        default-window-height { fixed 920; }
      }

      window-rule {
        geometry-corner-radius 12
        clip-to-geometry true
        background-effect {
          blur true
          xray false
        }
      }

      blur {
        passes 2
        offset 3.0
        noise 0.03
        saturation 1.0
      }

      window-rule {
        match app-id=r#"zen$"#
        open-on-workspace "browser"
        open-maximized true
      }

      window-rule {
        match app-id=r#"^(code-cursor|cursor|code|zed)$"#
        open-on-workspace "code"
        open-maximized true
      }

      window-rule {
        match app-id=r#"^obsidian$"#
        open-on-workspace "notes"
        open-maximized true
      }

      window-rule {
        match title=r#"(?i)(aider|claude|gemini)"#
        open-on-workspace "ai"
      }

      window-rule {
        match app-id=r#"^yazi$"#
        default-column-width { proportion 0.6; }
      }

      window-rule {
        match app-id=r#"firefox$"# title=r#"^Picture-in-Picture$"#
        open-floating true
      }

      window-rule {
        match app-id=r#"^(pavucontrol|nm-connection-editor|blueman-manager)$"#
        open-floating true
      }

      // Keybindings for shell actions, applications, and layout controls.
      binds {
        Mod+Shift+Slash hotkey-overlay-title="Kısayol Listesi" { show-hotkey-overlay; }

        // Noctalia shell IPC triggers.
        Mod+Space hotkey-overlay-title="Launcher" { spawn "noctalia" "msg" "panel-toggle" "launcher"; }
        Mod+D hotkey-overlay-title="Launcher" { spawn "noctalia" "msg" "panel-toggle" "launcher"; }
        Mod+S hotkey-overlay-title="Control Center" { spawn "noctalia" "msg" "panel-toggle" "control-center"; }
        Mod+Comma hotkey-overlay-title="Noctalia Settings" { spawn-sh "noctalia msg settings-toggle"; }
        Mod+Period hotkey-overlay-title="Clipboard" { spawn "noctalia" "msg" "panel-toggle" "clipboard"; }
        Mod+Shift+W hotkey-overlay-title="Wallpaper" { spawn "noctalia" "msg" "panel-toggle" "wallpaper"; }
        Mod+Alt+S hotkey-overlay-title="Window Switcher" { spawn-sh "noctalia msg window-switcher"; }
        Super+Shift+L hotkey-overlay-title="Kilitle" { spawn "noctalia" "msg" "session" "lock"; }

        // Hardware control keys.
        XF86AudioRaiseVolume allow-when-locked=true { spawn "noctalia" "msg" "volume-up"; }
        XF86AudioLowerVolume allow-when-locked=true { spawn "noctalia" "msg" "volume-down"; }
        XF86AudioMute allow-when-locked=true { spawn "noctalia" "msg" "volume-mute"; }
        XF86AudioMicMute allow-when-locked=true { spawn-sh "wpctl set-mute @DEFAULT_AUDIO_SOURCE@ toggle"; }
        XF86MonBrightnessUp allow-when-locked=true { spawn "noctalia" "msg" "brightness-up"; }
        XF86MonBrightnessDown allow-when-locked=true { spawn "noctalia" "msg" "brightness-down"; }
        XF86AudioPlay allow-when-locked=true { spawn-sh "playerctl play-pause"; }
        XF86AudioPause allow-when-locked=true { spawn-sh "playerctl play-pause"; }
        XF86AudioNext allow-when-locked=true { spawn-sh "playerctl next"; }
        XF86AudioPrev allow-when-locked=true { spawn-sh "playerctl previous"; }

        // Application shortcuts.
        Mod+Return hotkey-overlay-title="Terminal" { spawn "kitty"; }
        Mod+Shift+Return hotkey-overlay-title="Terminal + Zellij" { spawn "kitty" "-e" "zellij"; }
        Mod+E hotkey-overlay-title="Yazi" { spawn "kitty" "-e" "yazi"; }
        Mod+Shift+E hotkey-overlay-title="Nautilus" { spawn "nautilus"; }
        Mod+Z hotkey-overlay-title="Zen Browser" { spawn "zen"; }

        // Developer tooling shortcuts.
        Mod+Shift+C hotkey-overlay-title="Cursor" { spawn "code-cursor"; }
        Mod+Shift+Z hotkey-overlay-title="Zed" { spawn "zed"; }
        Mod+N hotkey-overlay-title="Nvim" { spawn "kitty" "-e" "nvim"; }
        Mod+Y hotkey-overlay-title="Yazi (~/dev)" { spawn "kitty" "-e" "yazi" "~/dev"; }
        Mod+G hotkey-overlay-title="Lazygit" { spawn "kitty" "-e" "lazygit"; }
        Mod+Shift+B hotkey-overlay-title="btop" { spawn "kitty" "-e" "btop"; }

        // AI assistant tool shortcuts.
        Mod+Shift+A hotkey-overlay-title="Aider" { spawn "kitty" "-e" "aider"; }
        Mod+Ctrl+A hotkey-overlay-title="Aider Claude" { spawn "kitty" "-e" "aider" "--model" "claude-3-5-sonnet-20241022"; }

        // Productivity tools.
        Mod+Shift+O hotkey-overlay-title="Obsidian" { spawn "obsidian"; }
        Mod+Alt+V hotkey-overlay-title="Pavucontrol" { spawn "pavucontrol"; }

        // System management and Nix commands.
        Mod+Ctrl+Shift+S hotkey-overlay-title="NixOS Rebuild" { spawn "kitty" "-e" "sudo" "nixos-rebuild" "switch" "--flake" "/etc/nixos#L7V"; }
        Mod+Ctrl+Shift+F hotkey-overlay-title="Flake Check" { spawn "kitty" "-e" "nix" "flake" "check"; }
        Mod+Ctrl+Shift+U hotkey-overlay-title="Flake Update" { spawn "kitty" "-e" "nix" "flake" "update"; }
        Mod+Ctrl+Shift+C hotkey-overlay-title="NH Clean" { spawn "kitty" "-e" "nh" "clean" "all"; }

        // Window management controls.
        Mod+Q repeat=false hotkey-overlay-title="Kapat" { close-window; }
        Mod+O repeat=false hotkey-overlay-title="Overview" { toggle-overview; }

        Mod+V hotkey-overlay-title="Floating" { toggle-window-floating; }
        Mod+Shift+V hotkey-overlay-title="Focus Float/Tile" { switch-focus-between-floating-and-tiling; }

        Mod+F hotkey-overlay-title="Maximize Col" { maximize-column; }
        Mod+Shift+F hotkey-overlay-title="Fullscreen" { fullscreen-window; }
        Mod+M hotkey-overlay-title="Maximize Edges" { maximize-window-to-edges; }
        Mod+C hotkey-overlay-title="Center Col" { center-column; }
        Mod+Ctrl+C hotkey-overlay-title="Center All" { center-visible-columns; }
        Mod+Ctrl+F hotkey-overlay-title="Expand Col" { expand-column-to-available-width; }

        Mod+R hotkey-overlay-title="Preset Width +" { switch-preset-column-width; }
        Mod+Shift+R hotkey-overlay-title="Preset Width -" { switch-preset-column-width-back; }
        Mod+Minus { set-column-width "-10%"; }
        Mod+Equal { set-column-width "+10%"; }

        Mod+W hotkey-overlay-title="Tabbed Toggle" { toggle-column-tabbed-display; }
        Mod+BracketLeft hotkey-overlay-title="Sola Kat" { consume-or-expel-window-left; }
        Mod+BracketRight hotkey-overlay-title="Sağa Kat" { consume-or-expel-window-right; }

        // Window focus navigation.
        Mod+H { focus-column-left; }
        Mod+L { focus-column-right; }
        Mod+J { focus-window-down; }
        Mod+K { focus-window-up; }
        Mod+Left { focus-column-left; }
        Mod+Right { focus-column-right; }
        Mod+Down { focus-window-down; }
        Mod+Up { focus-window-up; }

        Mod+Ctrl+H { move-column-left; }
        Mod+Ctrl+L { move-column-right; }
        Mod+Ctrl+J { move-window-down; }
        Mod+Ctrl+K { move-window-up; }

        // Multi-monitor navigation.
        Mod+Alt+H { focus-monitor-left; }
        Mod+Alt+L { focus-monitor-right; }
        Mod+Alt+Ctrl+H { move-column-to-monitor-left; }
        Mod+Alt+Ctrl+L { move-column-to-monitor-right; }

        // Workspace navigation and assignment.
        Mod+1 { focus-workspace "terminal"; }
        Mod+2 { focus-workspace "browser"; }
        Mod+3 { focus-workspace "code"; }
        Mod+4 { focus-workspace "media"; }
        Mod+5 { focus-workspace "ai"; }
        Mod+6 { focus-workspace "notes"; }

        Mod+Ctrl+1 { move-column-to-workspace "terminal"; }
        Mod+Ctrl+2 { move-column-to-workspace "browser"; }
        Mod+Ctrl+3 { move-column-to-workspace "code"; }
        Mod+Ctrl+4 { move-column-to-workspace "media"; }
        Mod+Ctrl+5 { move-column-to-workspace "ai"; }
        Mod+Ctrl+6 { move-column-to-workspace "notes"; }

        Mod+Tab { focus-workspace-previous; }
        Mod+U { focus-workspace-down; }
        Mod+I { focus-workspace-up; }

        Mod+WheelScrollDown cooldown-ms=150 { focus-workspace-down; }
        Mod+WheelScrollUp cooldown-ms=150 { focus-workspace-up; }

        // Screenshot shortcuts.
        Print hotkey-overlay-title="SS Bölge" { spawn "noctalia" "msg" "screenshot-region"; }
        Shift+Print hotkey-overlay-title="SS Tam" { spawn "noctalia" "msg" "screenshot-fullscreen"; }
        Ctrl+Print hotkey-overlay-title="SS Pencere" { screenshot-window; }
        Alt+Print hotkey-overlay-title="SS Ekran" { screenshot-screen; }

        // Session controls.
        Mod+Shift+Q hotkey-overlay-title="Çıkış" { quit; }
        Mod+Shift+P hotkey-overlay-title="Ekran Kapalı" { power-off-monitors; }
        Mod+Escape allow-inhibiting=false { toggle-keyboard-shortcuts-inhibit; }
        Ctrl+Alt+Delete { quit; }
      }

      cursor {
        hide-when-typing
        hide-after-inactive-ms 10000
      }

      overview {
        workspace-shadow {
          off
        }
      }

      gestures {
        hot-corners {
          off
        }
      }
    '';
  };

  # User environment package dependencies.
  home.packages = with pkgs; [
    brightnessctl
    fuzzel
    grim
    kitty
    pavucontrol
    playerctl
    slurp
    wev
    wl-clipboard
    xwayland-satellite
  ];

  # Cursor teması home/profiles/theme.nix'te tanımlı (tek otorite).

  # Yazi file manager options and keymaps.
  home.file.".config/yazi/yazi.toml".text = ''
    [manager]
    ratio = [1, 3, 4]
    sort_by = "natural"
    sort_sensitive = false
    sort_reverse = false
    sort_dir_first = true
    linemode = "size"
    show_hidden = false

    [preview]
    tab_size = 2
    max_width = 600
    max_height = 900

    [opener]
    edit = [{ run = 'nvim "$@"', block = true }]
    open = [{ run = 'xdg-open "$@"', desc = "Open" }]

    [plugin]
    preload = ["image", "pdf", "archive", "video"]
  '';

  home.file.".config/yazi/keymap.toml".text = ''
    [[manager.prepend_keymap]]
    on = ["g", "p"]
    run = "cd ~/dev"
    desc = "Go to Dev"

    [[manager.prepend_keymap]]
    on = ["g", "l"]
    run = "cd ~/dev/projects/personal"
    desc = "Go to Personal Projects"

    [[manager.prepend_keymap]]
    on = ["g", "h"]
    run = "cd ~"
    desc = "Go to Home"
  '';

  # Clipboard history service setup.
  services.cliphist.enable = true;

  systemd.user.services.wl-paste-to-cliphist = {
    Unit = {
      Description = "Pipe wl-paste output to cliphist";
      After = [ "graphical-session.target" ];
      PartOf = [ "graphical-session.target" ];
    };
    Install.WantedBy = [ "graphical-session.target" ];
    Service = {
      Type = "simple";
      ExecStart = "${pkgs.wl-clipboard}/bin/wl-paste --watch ${pkgs.cliphist}/bin/cliphist store";
      Restart = "on-failure";
    };
  };
}