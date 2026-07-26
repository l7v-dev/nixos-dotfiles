# Service Operations & Infrastructure Guide

> [!NOTE]
> System services are managed declaratively through NixOS modules with automatic Prometheus monitoring.

---

## 1. Managed Services Overview

| Service | Access URL | Administration & Operation |
| :--- | :--- | :--- |
| **Forgejo** | `https://git.l7v.dev` | CLI user list: `forgejo admin user list` |
| **Grafana** | `https://grafana.l7v.dev` | Provisioned with Prometheus (`http://127.0.0.1:9090`) |
| **Vaultwarden** | `https://vault.l7v.dev` | Admin panel: `/admin` (token protected) |

---

## 2. Common Service Operations

### Inspect Service Status
```bash
systemctl status <service-name>
```

### Stream Live Service Logs
```bash
journalctl -u <service-name> -f
```

### Apply Service Configuration Changes
```bash
sudo nixos-rebuild switch --flake .#server
```
