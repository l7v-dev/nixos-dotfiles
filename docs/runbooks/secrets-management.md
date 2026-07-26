# Secrets & Encryption Management Guide

> [!IMPORTANT]
> All sensitive secrets (API keys, private tokens, passwords) are encrypted using SOPS and Age keys. Never commit raw unencrypted secrets to Git.

---

## 1. Edit or Add Secrets

To modify the SOPS secrets YAML file:

```bash
sops secrets/sops/secrets.yaml
```

> [!TIP]
> Make sure your text editor (`$EDITOR`) is set in your environment.

---

## 2. Rotate Host Secrets

When a new host is added or keys change, re-encrypt `secrets.yaml`:

```bash
./scripts/secrets-rotate.sh <hostname> <age-public-key>
```

---

## 3. Bootstrap Host Encryption Key

To generate a new `/etc/age/key` for a host:

```bash
sudo ./scripts/bootstrap.sh HOSTNAME
```

1. Copy the public key printed in the output.
2. Add it to `secrets/sops/.sops.yaml`.
3. Run `sops updatekeys secrets/sops/secrets.yaml`.
