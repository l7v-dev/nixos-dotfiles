# Operational Task Backlog & Action Items

> Action items categorized across immediate fixes, short-term tasks, and long-term milestones.

---

## ⚡ Immediate / Pre-Flight Tasks (P0)

- [ ] **Provision Server Hardware Age Keys:**
  - Run `./scripts/bootstrap.sh server` on the server host.
  - Run `./scripts/bootstrap.sh builder` on the builder host.
  - Run `./scripts/bootstrap.sh backup` on the backup host.
  - Replace `age_TODO_*` keys in `secrets/sops/.sops.yaml`.
  - Re-encrypt secrets with `sops updatekeys secrets/sops/secrets.yaml`.
- [ ] **Populate AWS Restic Backup Credentials:**
  - Add `aws/access_key_id` and `aws/secret_access_key` into `secrets/sops/secrets.yaml` if using S3 backups.
- [ ] **Add Deploy SSH Public Keys:**
  - Add operator/deploy Ed25519 public keys to `hosts/server/default.nix`, `hosts/builder/default.nix`, and `hosts/backup/default.nix`.

---

## 📅 Short-Term Milestones (P1)

- [ ] **Execute Initial Multi-Node Colmena Deploy:**
  - Deploy base configurations to `server.l7v.dev`, `builder.l7v.dev`, `backup.l7v.dev`.
  - Verify PostgreSQL socket connection for Forgejo and Matrix.
  - Test ACME Let's Encrypt certificates across subdomains.
- [ ] **Tailscale Overlay Verification:**
  - Verify node ping between laptop (`100.64.0.1`) and server (`100.64.0.2`).
- [ ] **Verify Live Rebuild Engine via Panel Web UI:**
  - Trigger a test NixOS rebuild via `https://panel.l7v.dev` and confirm SSE stream output.

---

## 🔮 Medium & Long-Term Milestones (P2 / P3)

- [ ] **Panel Phase 2: JWT RS256 Authentication:**
  - Implement asymmetric JWT token authentication for Panel API and Nginx upstream.
- [ ] **Attic Binary Cache Migration (Phase 4):**
  - Implement full `atticd` configuration once upstream stabilizes on NixOS.
- [ ] **Component Extraction:**
  - Migrate shared Web UI components into `panel/packages/ui`.
