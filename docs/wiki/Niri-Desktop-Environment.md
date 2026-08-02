# 🪟 Niri Desktop Environment & Modular Architecture

[Back to Wiki Home](Home.md)

This page describes the **Niri Scrollable Tiling Window Manager** configuration, modular Nix profile layout, keybindings, and Noctalia Shell integration.

---

## 📂 Modular Profile Layout (`home/profiles/niri/`)

The Niri window manager configuration has been refactored from a monolithic 514-line file into **8 single-responsibility Nix modules**:

```text
home/profiles/
├── niri/
│   ├── default.nix          # Master coordinator: imports packages & concatenates KDL fragments
│   ├── input.nix            # Keyboard layout ("tr"), repeat rates, touchpad gestures, mouse focus
│   ├── layout.nix           # Gaps (12px), border gradients, focus ring, display scale, blur
│   ├── animations.nix       # High-refresh rate spring physics & CRT window close shader (108 lines)
│   ├── workspaces.nix       # Named workspace declarations (terminal, browser, code, media, ai, notes)
│   ├── rules.nix            # Window floating, sizing, blur, and Noctalia layer-rules
│   ├── binds.nix            # Complete keybindings map (134 lines)
│   └── packages.nix         # Wayland utility packages & cliphist systemd user service
└── yazi.nix                 # Independent Yazi terminal file manager profile
```

---

## ⚙️ KDL Concatenation Strategy

The coordinator module (`home/profiles/niri/default.nix`) imports `packages.nix` (which needs access to `pkgs`) and dynamically joins the KDL fragments returned by the sub-modules using `builtins.concatStringsSep`:

```nix
{ ... }:
{
  imports = [ ./packages.nix ];

  xdg.configFile."niri/config.kdl" = {
    force = true;
    text = builtins.concatStringsSep "\n" [
      (import ./input.nix)
      (import ./layout.nix)
      (import ./animations.nix)
      (import ./workspaces.nix)
      (import ./rules.nix)
      (import ./binds.nix)
    ];
  };
}
```

---

## ⌨️ Keybindings Map (`binds.nix`)

Modifier Key: `Mod` = `SUPER` (Windows key)

### Application Shortcuts
| Shortcut | Action |
| :--- | :--- |
| `Mod + Return` | Launch Kitty Terminal |
| `Mod + Shift + Return` | Launch Kitty + Zellij Multiplexer |
| `Mod + E` | Launch Yazi File Manager |
| `Mod + Shift + E` | Launch Nautilus File Manager |
| `Mod + Z` | Launch Zen Browser |
| `Mod + Shift + C` | Launch Cursor IDE |
| `Mod + Shift + Z` | Launch Zed Editor |
| `Mod + N` | Launch Neovim |
| `Mod + G` | Launch Lazygit |
| `Mod + Shift + A` | Launch Aider AI Assistant |
| `Mod + Shift + O` | Launch Obsidian Notes |

### Noctalia Shell IPC Controls
| Shortcut | Action |
| :--- | :--- |
| `Mod + Space` / `Mod + D` | Toggle Launcher |
| `Mod + S` | Toggle Control Center |
| `Mod + Comma` | Toggle Noctalia Settings |
| `Mod + Period` | Toggle Clipboard Panel |
| `Mod + Shift + W` | Toggle Wallpaper Selector |
| `Mod + Alt + S` | Toggle Window Switcher |
| `Super + Shift + L` | Lock Screen |
| `Print` / `Shift + Print` | Region / Fullscreen Screenshot |

### Navigation & Window Controls (Vim Motion Keys)
| Shortcut | Action |
| :--- | :--- |
| `Mod + H / L` | Focus Column Left / Right |
| `Mod + J / K` | Focus Window Down / Up |
| `Mod + Ctrl + H / L` | Move Column Left / Right |
| `Mod + Ctrl + J / K` | Move Window Down / Up |
| `Mod + Q` | Close Window |
| `Mod + F` / `Mod + Shift + F` | Maximize Column / Fullscreen Window |
| `Mod + V` | Toggle Window Floating |
| `Mod + 1..6` | Focus Workspace (`terminal`, `browser`, `code`, `media`, `ai`, `notes`) |
| `Mod + Ctrl + 1..6` | Move Window to Workspace |

---

## 🎨 CRT Window Close Shader (`animations.nix`)

Niri uses custom GLSL shaders for window transitions. The `animations.nix` module embeds a **retro CRT TV collapse shader** when closing windows:

- Horizontal collapses slightly after vertical for a classic CRT monitor effect.
- Features barrel distortion, edge softening, and opacity fade curves.

---

## 📂 Yazi File Manager (`home/profiles/yazi.nix`)

Yazi configuration was extracted from `niri.nix` into a dedicated profile so it can be reused across any window manager or headless terminal environment:

- Generates `.config/yazi/yazi.toml` (ratio `[1, 3, 4]`, natural sorting, preview limits).
- Generates `.config/yazi/keymap.toml` (quick navigation `g p` -> `~/dev`, `g l` -> `~/dev/projects/personal`).
