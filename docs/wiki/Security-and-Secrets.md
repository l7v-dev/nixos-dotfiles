# 🔒 Security & Secrets Management

[Back to Wiki Home](Home.md)

This page outlines the declarative security principles, SOPS secret encryption model, Age key management, and SSH hardening practices.

---

## 🔑 Secrets Management Architecture (`sops-nix`)

Plaintext secrets, private API keys, database passwords, and SSH keys are **never committed to Git**. Secret material is encrypted using **SOPS with Age keys**.

```mermaid
graph LR
    Key[/etc/age/key] --> Decrypt[sops --decrypt]
    File[secrets/sops/secrets.yaml] --> Decrypt
    Decrypt --> Materialized[/run/secrets/*]
    Materialized --> Service[NixOS Service]
```

### Key Locations & Rules
- **Age Master Key Path:** `/etc/age/key`
- **Encrypted Secret File:** `secrets/sops/secrets.yaml`
- **SOPS Configuration:** `secrets/sops/.sops.yaml`
- **Environment Variable:** `SOPS_AGE_KEY_FILE=/etc/age/key`

---

## 🛠️ Operational CLI Workflows

### 1. View Public Age Key
```bash
age-pubkey
# Or manually:
sudo grep "public key" /etc/age/key
```

### 2. Verify Key Status
Check whether the Age key file exists and has correct permissions (`0600`):
```bash
./scripts/age-check.sh
# Or alias:
sage
```

### 3. Edit Encrypted Secrets
```bash
sops /etc/nixos/secrets/sops/secrets.yaml
# Or alias:
sops-edit
```

### 4. Rotate Secret Encryption Keys
Re-encrypt `secrets.yaml` using active host keys:
```bash
./scripts/secrets-rotate.sh
# Or alias:
srotate
```

---

## 🛡️ Security Hardening Directives

### 1. OpenSSH Hardening (`infrastructure/security/default.nix`)
- SSH service is **disabled on workstations by default** and **enabled on servers**.
- `PasswordAuthentication` = `false` (Public key authentication ONLY).
- `KbdInteractiveAuthentication` = `false`.
- `PermitRootLogin` = `"prohibit-password"`.
- `X11Forwarding` = `false`.

### 2. Kernel & Sysctl Hardening
- Reverse path filtering enabled (`net.ipv4.conf.all.rp_filter = 1`).
- ICMP echo broadcasts ignored (`net.ipv4.icmp_echo_ignore_broadcasts = 1`).
- IPv4 / IPv6 ICMP redirects rejected (`accept_redirects = 0`).
- Source routing disabled (`accept_source_route = 0`).

### 3. Sudo Privileges & Governance
- `wheelNeedsPassword = true` for general administration.
- Specific passwordless sudo rules are scoped strictly to Nix rebuild commands (`nixos-rebuild switch`) to allow seamless editor and terminal system upgrades:
```nix
security.sudo.extraRules = [{
  users = [ config.l7v.identity.user ];
  commands = [
    { command = "/run/current-system/sw/bin/nixos-rebuild"; options = [ "NOPASSWD" ]; }
    { command = "/nix/var/nix/profiles/default/bin/nixos-rebuild"; options = [ "NOPASSWD" ]; }
  ];
}];
```
