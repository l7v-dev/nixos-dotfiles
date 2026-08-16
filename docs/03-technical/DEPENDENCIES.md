# Dependencies, Flake Inputs & Ecosystem Catalogs

> This document lists all Flake inputs, channels, binary caches, package overlays, Go dependencies, and Node.js packages.

---

## 📦 1. Flake Inputs (`flake.nix`)

| Input | Source URL | Purpose | Pinning / Channel Strategy |
| :--- | :--- | :--- | :--- |
| `nixpkgs` | `github:NixOS/nixpkgs/nixos-unstable` | Primary package set for Workstation | Tracks unstable branch |
| `nixpkgs-stable` | `github:NixOS/nixpkgs/nixos-25.05` | Production server package set | Pinned 25.05 release channel |
| `home-manager` | `github:nix-community/home-manager` | Workstation user environment manager | Follows `nixpkgs` |
| `home-manager-stable`| `github:nix-community/home-manager/release-25.05` | Server user environment manager | Follows `nixpkgs-stable` |
| `sops-nix` | `github:Mic92/sops-nix` | Declarative secret management via Age | Follows `nixpkgs` |
| `niri-flake` | `github:sodiboo/niri-flake` | Niri scrollable-tiling Wayland WM | Follows `nixpkgs` |
| `noctalia` | `github:noctalia-dev/noctalia` | Noctalia Wayland shell & lockscreen | Follows `nixpkgs` |
| `microvm` | `github:microvm-nix/microvm.nix` | Lightweight ephemeral agent VM sandboxes | Intentionally does not follow nixpkgs |
| `llm-agents` | `github:numtide/llm-agents.nix` | 100+ AI coding tools and CLI agents | Numtide binary cache hits guaranteed |
| `gomod2nix` | `github:nix-community/gomod2nix` | Reproducible Go builds (`buildGoApplication`) | Follows `nixpkgs` |

---

## 🚀 2. Binary Caches & Substituters

```text
https://cache.nixos.org            (Official NixOS cache)
https://nix-community.cachix.org   (Nix Community packages)
https://niri.cachix.org            (Pre-built Niri compositor binaries)
https://noctalia.cachix.org        (Noctalia desktop shell binaries)
https://cache.numtide.com          (Pre-built LLM coding agents from llm-agents.nix)
https://microvm.cachix.org         (Pre-built microVM kernels and hypervisors)
```

---

## 🐹 3. Go Module Dependencies (`panel/apps/agent/go.mod`)

- `github.com/coreos/go-systemd/v22`: Native D-Bus bindings for systemd and socket activation (`sd_listen_fds`).
- `github.com/godbus/dbus/v5`: Pure Go D-Bus client library for `logind`, `NetworkManager`, and `bluez`.
- `github.com/gorilla/websocket`: Fast WebSocket upgrade handler for xterm.js terminal sessions.
- `github.com/creack/pty`: Low-level POSIX pseudo-terminal allocation for interactive bash/zsh sessions.

---

## ⚛️ 4. Node / Frontend Dependencies (`panel/apps/web/package.json`)

- **Framework:** Next.js 15.1 (App Router), React 19.
- **UI Components:** Radix UI primitives (`dialog`, `dropdown-menu`, `select`, `switch`, `toast`), Lucide React icons.
- **Terminal Emulator:** `@xterm/xterm` 6.0, `@xterm/addon-fit`, `@xterm/addon-web-links`, `@xterm/addon-search`.
- **State & Data Fetching:** `@tanstack/react-query` 5.62, `zustand` 5.0, `recharts` 2.14.
- **Styling:** `tailwindcss` 3.4, `tailwind-merge`, `clsx`, `class-variance-authority`.
- **Testing:** `vitest` 2.1, `jsdom`, `@testing-library/react`, `fast-check` (property-based testing).
