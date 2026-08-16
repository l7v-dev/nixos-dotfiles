# Security Audit & Risk Review

> **Scope:** Secrets cryptography, network surface, D-Bus Polkit permissions, sudo rules, and threat mitigation.

---

## 🔒 1. Cryptography & Secrets Architecture

- **Engine:** `sops-nix` with Age asymmetric key encryption (`X25519`).
- **Key Location:** `/etc/age/key` (Permissions `0600 root:root`).
- **Runtime Materialization:** Decrypted at boot directly into a tmpfs RAM filesystem (`/run/secrets/`). Never written unencrypted to disk.

### Age Key Routing Policy (`secrets/sops/.sops.yaml`):
```yaml
keys:
  - &L7V age12q2vq6qnhct3hezcpspjzsaapf4k9u0zklugea3m2ktt69gwyg5qncl0lx
  - &life7vision_laptop age100fgm3zj79kwsw962f9ehw8s43llfk7z2tpsh2juy3platc99qcs7lj0yw

creation_rules:
  - path_regex: secrets/sops/.*\.(yaml|json|env|ini)$
    key_groups:
      - age:
          - *L7V
          - *life7vision_laptop
```

---

## 🛡️ 2. Polkit & D-Bus Least-Privilege Rules

The `panel-agent` service account and primary user are granted scoped Polkit permissions (`security.polkit.extraConfig`) explicitly restricted to:
- `org.freedesktop.systemd1.manage-units`
- `org.freedesktop.login1.power-off` / `reboot` / `suspend` / `hibernate`
- `org.freedesktop.login1.set-wall-message` (Scheduled shutdowns)

Arbitrary root actions through Polkit outside this whitelist return `polkit.Result.NO`.

---

## 🌐 3. Network Hardening & Attack Surface

1. **OpenSSH Server:**
   - Disabled on workstations (`hosts/laptop`).
   - Enabled on servers only (`modules/infrastructure/security/default.nix`).
   - `PasswordAuthentication = false` (Key authentication mandatory).
   - `PermitRootLogin = "prohibit-password"`.
2. **Brute-Force Protection:** `fail2ban` automatically bans offending IPs on servers.
3. **Kernel Hardening (sysctl):**
   - Reverse path filtering (`rp_filter = 1`) to prevent IP spoofing.
   - ICMP broadcast ignore (`icmp_echo_ignore_broadcasts = 1`).
   - Source routing and ICMP redirects disabled.
