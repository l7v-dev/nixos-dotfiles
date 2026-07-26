# System Deployment & Rebuild Guide

> [!NOTE]
> This runbook covers local NixOS system rebuilds and multi-server deployments via Colmena.

---

## 1. Local Workstation Rebuild

To apply NixOS configuration changes on the local workstation:

```bash
sudo nixos-rebuild switch --flake .#L7V
```

### Options & Flags
- Test configuration without switching boot default:
  ```bash
  sudo nixos-rebuild test --flake .#L7V
  ```
- Dry run (simulate build):
  ```bash
  sudo nixos-rebuild dry-build --flake .#L7V
  ```

---

## 2. Multi-Server Deployment (Colmena)

For remote server management and deployment:

### Deploy All Production Hosts
```bash
colmena apply --on @production
```

### Deploy Specific Hosts
```bash
colmena apply --on server
colmena apply --on builder
colmena apply --on backup
```
