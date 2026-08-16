# Operational Runbook: Secrets Management

> **Target:** SOPS with Age Encryption (`/etc/age/key`)

---

## 1. Verify Decryption & Key Health
```bash
./scripts/age-check.sh
```

## 2. Edit Encrypted Secrets
```bash
sops secrets/sops/secrets.yaml
```

## 3. Register a New Host
1. Generate key on target machine:
   ```bash
   ./scripts/bootstrap.sh <hostname>
   ```
2. Add public key to `secrets/sops/.sops.yaml`.
3. Re-encrypt all secrets:
   ```bash
   sops updatekeys secrets/sops/secrets.yaml
   ```
