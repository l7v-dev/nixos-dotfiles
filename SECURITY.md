# Security Policy

## Reporting Vulnerabilities

If you discover a potential security vulnerability within this repository, please report it immediately to the project maintainers. Do NOT report security vulnerabilities through public GitHub issues.

---

## Secrets Management & Encryption Policy

- All sensitive infrastructure parameters, certificates, and credentials within this repository are encrypted using **SOPS** with **Age** keys (`/etc/age/key`).
- Unencrypted secrets must **never** be committed to Git.
- To verify Age key alignment and secret decryption integrity, run:

```bash
./scripts/age-check.sh
```

To rotate or re-encrypt secrets across managed target hosts:

```bash
./scripts/secrets-rotate.sh
```
