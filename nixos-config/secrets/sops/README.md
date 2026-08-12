# Secrets Yönetimi

## Mevcut secret'lar

| Key | Kullanan | Açıklama |
|-----|----------|----------|
| `cache/signing_key` | capabilities/cache | Nix binary cache imzalama key'i |
| `database/postgres_password` | capabilities/database | pgbouncer auth dosyası |
| `backup/restic_password` | capabilities/backup | Restic repo şifresi |
| `forgejo/admin_password` | services/forgejo | Forgejo admin şifresi |
| `grafana/admin_password` | services/grafana | Grafana admin şifresi |
| `vaultwarden/admin_token` | services/vaultwarden | Vaultwarden admin token |
| `ci/runner_token` | platform/ci | Forgejo Actions runner token |
| `matrix/registration_secret` | capabilities/messaging | Matrix Synapse kayıt secret'ı |
| `ntfy/auth_file` | capabilities/messaging | Ntfy auth dosyası |

## Eklenmesi gereken secret'lar (AWS)

Aşağıdaki key'ler henüz `secrets.yaml`'da yok — AWS credentials alındıktan sonra eklenecek:

```bash
# secrets.yaml'ı düzenlemek için:
sops secrets/sops/secrets.yaml
```

Eklenecek key'ler:
```yaml
aws/access_key_id:     "<IAM_ACCESS_KEY_ID>"
aws/secret_access_key: "<IAM_SECRET_ACCESS_KEY>"
```

**IAM policy (minimum gereksinim — sadece backup bucket'ı için):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::l7v-backups",
        "arn:aws:s3:::l7v-backups/*"
      ]
    }
  ]
}
```

## Yeni host için age key ekleme

```bash
# 1. Host'ta age key üret
./scripts/bootstrap.sh server

# 2. Çıktıdaki public key'i .sops.yaml'a ekle
#    (server satırındaki TODO'yu değiştir)

# 3. Tüm secret'ları yeni key ile yeniden şifrele
sops updatekeys secrets/sops/secrets.yaml
```
