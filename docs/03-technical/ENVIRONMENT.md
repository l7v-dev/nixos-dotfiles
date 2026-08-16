# Environment Variables & Runtime Parameters

> This document catalogs all global environment variables, systemd paths, hardware flags, and session parameters.

---

## 🌐 1. System & Session Environment Variables

### Wayland Desktop (`modules/experience/desktop/common/default.nix`)
```bash
NIXOS_OZONE_WL=1                     # Enables native Wayland in Chromium/Electron
MOZ_ENABLE_WAYLAND=1                 # Enables native Wayland in Firefox
QT_QPA_PLATFORM=wayland;xcb          # Prefer Wayland for Qt applications
GDK_BACKEND=wayland,x11              # Prefer Wayland for GTK applications
XDG_SESSION_TYPE=wayland             # Declares Wayland session type
AMD_VULKAN_ICD=RADV                  # Force RADV open-source Vulkan driver
```

### Google Antigravity & MCP SDK (`home/profiles/antigravity.nix`)
```bash
CHROME_PATH=/run/current-system/sw/bin/google-chrome-stable
PUPPETEER_EXECUTABLE_PATH=/run/current-system/sw/bin/google-chrome-stable
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
REGION=europe-west3
CLOUDSDK_COMPUTE_REGION=europe-west3
CLOUDSDK_COMPUTE_ZONE=europe-west3-a
```

### Panel Control Center (`panel/nix/module.nix`)
```bash
PANEL_CPU_WARN=70                    # CPU warning threshold percentage
PANEL_CPU_CRIT=90                    # CPU critical threshold percentage
PANEL_RAM_WARN=80                    # RAM warning threshold percentage
PANEL_RAM_CRIT=95                    # RAM critical threshold percentage
PANEL_DISK_WARN=80                   # Disk warning threshold percentage
PANEL_DISK_CRIT=90                   # Disk critical threshold percentage
PANEL_PROMETHEUS_WIDGET=1            # Enable Prometheus proxy endpoint
PANEL_WOL_HOSTS={"server":"..."}     # JSON map of Wake-on-LAN MAC addresses
AGENT_BASE_URL=http+unix://%2Frun%2Fpanel-agent%2Fpanel-agent.sock/
```

---

## 📁 2. Standardized Filesystem Paths

| Path | Owner | Mode | Purpose |
| :--- | :--- | :--- | :--- |
| `/etc/age/key` | `root:root` | `0600` | Host Age private encryption key |
| `/run/secrets/` | `root:root` | `0751` | Decrypted SOPS tmpfs runtime secret storage |
| `/run/panel-agent/panel-agent.sock` | `l7v:users` | `0660` | Panel agent Unix socket listener |
| `/srv/backup/restic` | `l7v:users` | `0750` | SFTP restic offsite repository directory |
| `/var/backup/vaultwarden` | `vaultwarden:vaultwarden` | `0700` | Vaultwarden SQLite database export target |
| `/var/lib/loki` | `loki:loki` | `0700` | Loki log chunks and TSDB indexes |
| `/var/lib/prometheus` | `prometheus:prometheus` | `0700` | Prometheus time-series metric chunks |
