# Known Issues

Bu liste yalnızca mevcut checkout, Nix modülleri, script'ler, secret key adları ve Git durumu üzerinden doğrulanabilen bulguları içerir. Runtime'da kanıtlanmamış noktalar açıkça **doğrulanmadı** olarak işaretlenmiştir.

## Kritik ve High Seviyeli Problemler

| ID | Seviye | Kategori | Bulgı | Etki | Önerilen düzeltme |
| --- | --- | --- | --- | --- | --- |
| K-001 | Critical | Build integrity | `pkgs/qoder/default.nix` ve `pkgs/qoder-cli/default.nix` çalışma ağacında eksik; `modules/platform/default.nix` ve `home/profiles/ai-tools.nix` bu yolları import ediyor. Git status bu iki dosyayı uncommitted deletion olarak gösteriyor. | Workstation flake evaluation/build'i missing path nedeniyle kırılabilir. | Silinmeler intentional ise tüm referansları ve package surface'ini aynı commit'te kaldırın; değilse dosyaları geri yükleyin. Sonra `./scripts/validate.sh L7V` ve `colmena build` çalıştırın. |
| K-002 | Critical | Production provisioning | `hosts/server/hardware.nix`, `hosts/builder/hardware.nix` ve `hosts/backup/hardware.nix` gerçek disk UUID yerine `TODO-*` değerleri içeriyor. | Bare-metal mount/boot kurulumu bu bilgiler olmadan tamamlanamaz. | Her hedefte `blkid`/disk inventory alın, doğru UUID'leri review ile ekleyin ve installer/recovery test edin. |
| K-003 | Critical | Secrets | `.sops.yaml` içinde `server`, `builder`, `backup` için placeholder age recipient'lar var; yalnızca laptop recipient'ları creation rule'da aktif. | Server secret distribution ve `sops updatekeys` hazır değil; remote deployment başarısız olabilir. | Her hostta `bootstrap.sh` çalıştırın, gerçek public key'leri ekleyin, TODO recipient'ları kaldırın ve `sops updatekeys` sonucu kontrollü biçimde doğrulayın. |
| K-004 | Critical | Backup | Backup capability varsayılan olarak S3 backend kullanıyor ve `aws/access_key_id` ile `aws/secret_access_key` bekliyor; encrypted secret key listesinde bu iki AWS key'i yok. | Restic S3 activation/backup işlemi credentials olmadan çalışmayabilir. | S3 kullanılacaksa key'leri güvenli biçimde SOPS'a ekleyin ve `restic init/backup/check/restore` testi yapın; SFTP kullanılacaksa backend, target, authorized key ve repository path'ini birlikte doğrulayın. |
| K-005 | High | Database | Database module `database/pgbouncer_userlist` bekliyor; `secrets/sops/secrets.yaml` ve mevcut operator notları `database/postgres_password` adını içeriyor. | PgBouncer service auth file bulunamayabilir veya beklenen kullanıcı/hash yüklenemez. | Tek bir secret contract seçin; module, encrypted key ve runbook'u aynı ada ve formata getirin. Secret değerlerini log/dokümana yazmayın. |
| K-006 | High | Access control | Primary user için `NOPASSWD` ile `ALL` sudo rule'ı tanımlı; kullanıcı ayrıca `docker`, `kvm` ve diğer ayrıcalıklı gruplara ekleniyor. | Workstation veya server compromise durumunda ayrıcalık yükseltme yüzeyi geniştir. | Production threat model'e göre sudo rule'ını daraltın, server/workstation ayrımını uygulayın, erişimi audit edin. Bu değişiklik operasyonel risk analizi gerektirir. |
| K-007 | High | Deployment access | Server hostlarında `identity.sshKeys = [ ]` veya yalnızca TODO yorumları var. Colmena root SSH bekliyor. | Remote deployment ve recovery erişimi hazır olmayabilir. | Yönetim ve CI public key'lerini güvenli review ile host dosyalarına ekleyin; her target için `ssh -o BatchMode=yes` testi yapın. |

## Medium Seviyeli Problemler

| ID | Seviye | Kategori | Bulgı | Etki | Önerilen düzeltme |
| --- | --- | --- | --- | --- | --- |
| K-008 | Medium | Service drift | Grafana service module mevcut ve eski docs aktif dashboard anlatıyor; ancak `hosts/server/default.nix` Grafana'yı enable etmiyor. | Prometheus metrics olsa da beklenen Grafana UI/dashboard production'da yoktur. | Grafana isteniyorsa explicit `l7v.services.grafana.enable = true` ve admin secret ile birlikte deploy/test edin; istenmiyorsa eski docs/inventory iddialarını kaldırın. |
| K-009 | Medium | Service topology | `messaging` ve `mesh` capability'leri mevcut fakat aktif hostlarda enable flag'i bulunmuyor. | Matrix/ntfy/Tailscale ağının mevcut olduğu varsayımı yanlış olur. | Kullanım kararı verin; enable edilecekse DNS, secret, firewall ve integration test ekleyin. |
| K-010 | Medium | Backup topology | Backup host restic capability ile `/srv/backup` directory'leri oluşturuyor; varsayılan backend S3. SFTP fallback path'i `/srv/restic` ve backup host üzerinde ayrı bir SFTP repository server provisioning'i açıkça tanımlı değil. | SFTP backend seçilirse target path, authorized key ve service ownership mismatch olabilir. | S3/SFTP'ten birini resmi backend olarak seçin; SFTP için host üzerinde explicit storage/sshd/authorized-key/runbook tasarlayın. |
| K-011 | Medium | Data protection | Restic `/var/lib`, `/var/backup`, `/etc`, `/home` yollarını günlük alıyor; repository'de PostgreSQL `pg_dump` timer'ı veya consistent logical dump yok. | Physical file backup'tan bağımsız application-consistent PostgreSQL restore garanti değildir. | Düzenli `pg_dump`/restore workflow'u, retention, encryption ve restore test'i ekleyin. |
| K-012 | Medium | CI/CD | Tracked `.github`, `.forgejo`, GitLab veya başka workflow dosyası yok. Builder'da runner modülü provision edilse de gerçek pipeline/registration kanıtı yok. | Otomatik validation, approval ve deploy zinciri yoktur. | Forgejo workflow dosyaları, secret injection, artifact policy ve deploy approval süreci ekleyin. |
| K-013 | Medium | Environment | `platform/inventory` server/builder/backup CPU ve disk alanlarında `TODO` metadata tutuyor. | `l7v-inventory` çıktısı operasyonel olarak güvenilmez. | Gerçek hardware inventory ile doldurun; drift detection ekleyin. |
| K-014 | Medium | Network security | Deploy SSH config `StrictHostKeyChecking accept-new` kullanıyor. | İlk bağlantıda TOFU kabul edilir; host key pinning veya merkezi known_hosts yoktur. | Yönetilen host fingerprint'lerini güvenli biçimde pinleyin ve rotation prosedürü tanımlayın. |
| K-015 | Medium | Backup/DR | DR runbook sabit `/dev/nvme0n1p*` cihazlarını ve S3 secret extraction yöntemini anlatıyor; source module ise host UUID'leri ve SOPS-managed runtime file'ları bekliyor. | Runbook yanlış diske yazma veya mevcut secret akışını bypass etme riski taşır. | DR prosedürünü host inventory ve module davranışıyla yeniden yazın; gerçek restore rehearsal yapın. |

## Low Seviyeli Teknik Borç

| ID | Seviye | Kategori | Bulgu | Etki |
| --- | --- | --- | --- | --- |
| K-016 | Low | Service implementation | `modules/services/attic/default.nix` Phase 4 stub'dır; enable edilirse yalnızca warning üretir. Aktif cache yolu `nix-serve`'dür. | Beklenen Attic özellikleri mevcut değildir; bakım yüzeyi iki cache yaklaşımına ayrılır. |
| K-017 | Low | Documentation drift | Root README ve AGENTS bazı nonexistent `docs/wiki`, `docs/skills`, `docs/architecture` ve eski `panel/` yollarına link verir. | Yeni developer yanlış dosyaya yönlenebilir. |
| K-018 | Low | Documentation drift | Eski API, testing ve feature envanterleri silinmiş `panel` Go/Next.js testlerini ve endpoint'lerini mevcutmuş gibi anlatıyor. | Handover ve audit sonuçları yanlış olur. |
| K-019 | Resolved | Code comments | `flake.nix`, `colmena.nix` ve `lib/mkServer.nix` içindeki eski `panel/nix/pkgs/panel-agent` yorumları temizlendi. | Tamamlandı. |
| K-020 | Low | Release process | Semantic version tag, release pipeline ve automated changelog generation yoktur. | Deployment provenance ve rollback iletişimi commit hash'e bağımlıdır. |
| K-021 | Low | Test coverage | Current checkout'ta tracked unit/integration test dosyası yoktur. `scripts/validate.sh` statik/evaluation kontrolleri yapar, runtime service testleri yapmaz. | Service health, backup restore ve remote deployment regressions otomatik yakalanmaz. |

## Doğrulanması Gereken Unknown'lar

Aşağıdaki noktalar kaynak koddan kesinleştirilemez ve production öncesi operator tarafından ölçülmelidir:

- `server.l7v.dev`, `builder.l7v.dev` ve `backup.l7v.dev` DNS kayıtlarının gerçek hedefleri.

- Target hostların çevrimiçi olması, root SSH key'lerinin çalışması ve host key fingerprint'leri.

- SOPS secret file'ın mevcut key'lerle gerçekten decrypt edilebilmesi.

- Nginx ACME HTTP-01 için TCP 80/443 public reachability.

- Forgejo, Vaultwarden, PostgreSQL, PgBouncer, Prometheus, Loki, restic ve runner systemd servislerinin gerçek hedef üzerinde başarılı başlaması.

- Restic repository'nin initialize edilmiş olması ve restore edilebilirlik.

- `server` üzerinde Grafana'nın bilinçli olarak kapalı tutulup tutulmadığı.

- Uncommitted Qoder deletions'ın intentional cleanup mı yoksa eksik teslim artefact'ı mı olduğu.

## Security Açısından Dikkat Edilecekler

SOPS ile şifreli dosyanın değerleri dokümana veya log'a alınmamalıdır. Age private key, admin password, runner token, AWS key ve restic password yalnızca secret store/secure offline backup içinde tutulmalıdır. Çıkarılan checkout'ta `secrets/sops/secrets.yaml` dosya modu `664` görünmektedir; değerler encrypted olsa dahi ortak sistemlerde repository dosya izinleri ve Git erişim policy'si ayrıca gözden geçirilmelidir.

## Kaynaklar

[1]: ./flake.nix "Package and host output references"

[2]: ./home/profiles/ai-tools.nix "Qoder CLI package reference"

[3]: ./modules/platform/default.nix "Qoder IDE package reference"

[4]: ./hosts/server/hardware.nix "Server disk placeholders"

[5]: ./hosts/builder/hardware.nix "Builder disk placeholders"

[6]: ./hosts/backup/hardware.nix "Backup disk placeholders"

[7]: ./secrets/sops/.sops.yaml "Age recipient placeholders"

[8]: ./secrets/sops/secrets.yaml "Encrypted secret key names only"

[9]: ./modules/capabilities/backup/default.nix "Restic backend and AWS secret declarations"

[10]: ./modules/capabilities/database/default.nix "PgBouncer secret contract"

[11]: ./hosts/server/default.nix "Active server services and SSH key state"

[12]: ./modules/infrastructure/identity/default.nix "Sudo and user group policy"

[13]: ./modules/services/grafana/default.nix "Conditional Grafana service"

[14]: ./modules/services/attic/default.nix "Attic stub"

[15]: ./scripts/validate.sh "Static/evaluation validation scope"

[16]: ./docs/04-operations/BACKUP_RECOVERY.md "Existing DR runbook with drift"

