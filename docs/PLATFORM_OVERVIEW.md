# l7v NixOS Platform

Bu repository, **NixOS tabanlı workstation ve sunucu filosunu deklaratif olarak tanımlayan** capability-first bir platform yapılandırmasıdır. Ana flake; bir laptop workstation konfigürasyonu, `server`, `builder` ve `backup` sunucu konfigürasyonları, Home Manager profilleri, NixOS modülleri, SOPS/age secret entegrasyonu ve Colmena deployment topolojisi üretir. [1]

## Projenin Amacı ve Kapsamı

Projenin amacı, tek bir Git repository içinden tekrar üretilebilir NixOS sistemleri oluşturmak, ortak altyapı yeteneklerini host rollerine göre etkinleştirmek ve sunucu filosunu SSH üzerinden Colmena ile yönetmektir. Kapsam; işletim sistemi boot/network/security/storage ayarlarını, masaüstü deneyimini, PostgreSQL/PgBouncer, Prometheus, Loki/fluent-bit, nginx/ACME, restic, nix-serve, Forgejo, Vaultwarden ve Forgejo Actions runner modüllerini içerir. Ayrıca `templates/aft/` altında ayrı bir Next.js proje şablonu bulunmaktadır; bu şablon ana NixOS servis topolojisine bağlı çalışan bir uygulama değildir. [2] [3]

> **Handover uyarısı:** Teslim alınan çalışma ağacında `pkgs/qoder/default.nix` ve `pkgs/qoder-cli/default.nix` dosyaları fiziksel olarak eksik, fakat flake ve Home Manager profilleri bu yolları hâlâ referanslıyor. Bu nedenle mevcut checkout, Nix evaluation/build doğrulaması yapılmadan production deploy için hazır kabul edilmemelidir. [4]

## Ana Özellikler

| Alan | Mevcut uygulama |
|---|---|
| Host üretimi | Workstation için `mkWorkstation`, sunucular için `mkServer`; server rolleri capability listesine çevrilir. |
| Hostlar | `L7V` workstation; `server`, `builder`, `backup` NixOS/Colmena düğümleri. |
| Desktop | Niri, Noctalia, Wayland/AMD grafik, PipeWire ve laptop güç/kapak davranışları. |
| Infrastructure | systemd-boot, workstation Zen kernel, server Linux 6.6 kernel, NetworkManager veya systemd-networkd, firewall, SSH hardening, fail2ban, journald, smartd, fstrim ve isteğe bağlı LUKS. |
| Observability | Prometheus ve node/systemd exporter; role durumuna göre nginx ve PostgreSQL exporter; Loki + fluent-bit logging. |
| Data services | PostgreSQL 16, PgBouncer, local Redis, Forgejo PostgreSQL backend ve Vaultwarden SQLite. |
| Backup/recovery | Restic ile S3/SFTP off-site backup; Btrfs/Snapper timeline snapshot; haftalık repository reachability check. |
| Deployment | Colmena ile local build + SSH üzerinden root hedeflere closure push/switch. |
| Secrets | SOPS/age; host key `/etc/age/key`, secret kaynağı `secrets/sops/secrets.yaml`. |
| Developer tooling | Nix formatter/linter araçları, pre-commit, Colmena, `nh`, cloud/database CLI'ları ve çok sayıda AI coding CLI. |
| Template | `templates/aft/`: Next.js 16, React 19, TypeScript, Tailwind CSS 4 ve ESLint tabanlı başlangıç şablonu. |

## Teknoloji Stack'i

| Katman | Teknoloji / sürüm politikası |
|---|---|
| OS/build | NixOS; workstation `nixos-unstable`, sunucular `nixos-25.05`; `x86_64-linux`. |
| Configuration | Nix flakes, Home Manager, custom NixOS modules. |
| Server deployment | Colmena, root SSH, `buildOnTarget = false`. |
| Desktop | Niri flake, Noctalia, Wayland, PipeWire, AMD Mesa/VA-API. |
| Data | PostgreSQL 16, PgBouncer, Redis workstation-only, Grafana/Vaultwarden için SQLite modülleri. |
| Observability | Prometheus, node exporter, systemd exporter, nginx exporter, PostgreSQL exporter, Loki, fluent-bit. |
| Security/secrets | SOPS-nix, age, SSH key authentication, fail2ban, sysctl hardening, nginx ACME. |
| Frontend template | Next.js 16.2.4, React 19.2.4, TypeScript 5, Tailwind CSS 4, ESLint 9. |

## Sistem Gereksinimleri

Bir workstation build'i için Nix with flakes, Git, en azından `x86_64-linux` uyumlu NixOS ve repository'nin Git çalışma ağacında bulunması gerekir. Operasyonel akış için `nix`, `nixfmt`, `statix`, `deadnix`, `shellcheck`, `jq`, `pre-commit`, `nh` ve Colmena araçları kullanılmaktadır; `scripts/validate.sh`, PATH'te bulunmayan bazı araçlar için `nix run nixpkgs#<tool>` fallback'i sağlar. [5]

Sunucu kurulumlarında hedef makinelerin NixOS çalıştırması, root SSH erişimi, doğru disk UUID'leri, Btrfs subvolume düzeni ve hedef host için geçerli age anahtarı olması gerekir. `server`, `builder` ve `backup` hardware dosyalarında gerçek disk UUID'leri yerine `TODO-*` değerleri bulunmaktadır; bu değerler provision edilmeden bare-metal kurulum tamamlanamaz. [6]

## Kurulum ve İlk Hazırlık

Repository'yi klonladıktan sonra önce çalışma ağacının temizliğini ve eksik package dosyalarını kontrol edin. Mevcut teslim checkout'unda uncommitted deletion bulunduğu için aşağıdaki doğrulama tamamlanmadan `switch` veya Colmena deployment çalıştırılmamalıdır.

```bash
git clone git@github.com:l7v-dev/nixos-dotfiles.git
cd nixos-dotfiles
git status --short --branch
find pkgs -maxdepth 2 -type f -print
```

Bir host üzerindeki SOPS/age başlangıç işlemi için hedef makinede aşağıdaki komut çalıştırılır. Script `/etc/age/key` oluşturur veya mevcut anahtarı korur, public key'i gösterir, flake doğrulaması çalıştırır ve mevcutsa pre-commit hook'u kurar.

```bash
./scripts/bootstrap.sh L7V
./scripts/bootstrap.sh server
./scripts/bootstrap.sh builder
./scripts/bootstrap.sh backup
```

Bootstrap çıktısındaki **public key** değeri `secrets/sops/.sops.yaml` içine operator tarafından eklenmelidir. `server`, `builder` ve `backup` için mevcut dosyada placeholder recipient'lar bulunduğu için key'ler gerçek değerlerle değiştirilmeden `sops updatekeys` başarılı olmayacaktır. Secret değerleri bu dokümana yazılmamalıdır. [7]

## Environment Variables

Ana NixOS flake'inde klasik `.env` dosyasından okunan bir uygulama API'si bulunmamaktadır. Secret değerleri SOPS tarafından runtime dosyalarına çıkarılır; isimler ve hedefler aşağıdaki gibidir.

| Değişken / logical secret | Kullanım |
|---|---|
| `SOPS_AGE_KEY_FILE` | Home Manager minimal profile tarafından `/etc/age/key` olarak dışa aktarılır; SOPS/age çözümlemesinde kullanılır. |
| `RESTIC_REPOSITORY` | Recovery-check systemd servisi tarafından çözülmüş restic repository değeridir. |
| `RESTIC_PASSWORD_FILE` | Recovery-check tarafından SOPS-nix'in oluşturduğu password file'a işaret eder. |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` | S3 backend seçildiğinde `/run/restic-s3-env` içine activation sırasında yazılır; ham değerler dokümante edilmez. |
| `SKIP_REBUILD` | `scripts/update.sh`; `1` ise rebuild atlanır. |
| `SKIP_COMMIT` | `scripts/update.sh`; `1` ise değişen `flake.lock` commit edilmez. |
| `MAX_JOBS`, `CORES` | `scripts/update.sh`; varsayılanlar sırasıyla `3` ve `3`'tür. |
| Template `.env.example` değişkenleri | `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `TRIGGER_PROJECT_REF`, `TRIGGER_SECRET_KEY`, `LIVEBLOCKS_SECRET_KEY`, `BLOB_READ_WRITE_TOKEN`; bunlar yalnızca `templates/aft` şablonunun örnek adlarıdır ve mevcut NixOS platformu tarafından tüketilmez. |

SOPS logical secret anahtarları mevcut şifreli dosyada `cache/signing_key`, `database/postgres_password`, `backup/restic_password`, `forgejo/admin_password`, `grafana/admin_password`, `vaultwarden/admin_token`, `ci/runner_token`, `matrix/registration_secret` ve `ntfy/auth_file` olarak görünmektedir. Database capability ise runtime authentication için `database/pgbouncer_userlist` beklemektedir; bu ad ile şifreli dosyada görünen `database/postgres_password` arasında tutarsızlık vardır. [8] [9]

## Local Development

NixOS host configuration değişiklikleri için önce format/lint/evaluation doğrulaması yapılmalıdır:

```bash
./scripts/validate.sh L7V
```

Script; tracked Nix dosyalarında `nixfmt --check`, `statix`, `deadnix`, shell script'lerde ShellCheck, `.mcp.json` için `jq`, hedef host için Nix module evaluation ve dry-run toplevel build uygular. Kaynak script, RAM kullanımını sınırlamak için varsayılan olarak yalnızca verilen hostu evaluate eder; remote host doğrulaması deployment aşamasındaki Colmena build'e bırakılır. [5]

Workstation üzerinde konfigürasyonu geçici olarak test etmek veya aktif generation'a geçirmek için:

```bash
nh os test
nh os switch
nh os switch --rollback
```

Klasik Nix komutlarıyla evaluation ve dry-run build:

```bash
nix eval .#nixosConfigurations.L7V.config.system.stateVersion
nix eval .#nixosConfigurations.L7V.config.networking.hostName
nix build .#nixosConfigurations.L7V.config.system.build.toplevel --dry-run
```

`flake.nix` Git tabanlı kaynak görünürlüğüne dayandığından yeni dosyaları validation/evaluation öncesinde Git'e eklemek gerekir. Bununla birlikte bu teslimdeki iki uncommitted Qoder silinmesi önce çözülmelidir.

## Build

Workstation toplevel build:

```bash
nix build .#nixosConfigurations.L7V.config.system.build.toplevel
```

Sunucu konfigürasyonlarının Colmena tarafından oluşturulabilirliğini kontrol etmek:

```bash
colmena build
```

Colmena, `server`, `builder` ve `backup` düğümleri için stable nixpkgs kullanır; target üzerinde derleme yapmaz ve closure'ları deployment makinesinden gönderir. [1] [10]

## Test ve Quality Gates

Repository'de mevcut checkout içinde tracked unit/integration test dosyası veya CI workflow dosyası bulunmamaktadır. Geçerli otomatik kalite kapısı `scripts/validate.sh` ile tanımlanan statik kontroller ve hedef host evaluation'ıdır. Şu statik kontroller ayrıca çalıştırılabilir:

```bash
bash -n scripts/*.sh
jq -e . .mcp.json
git diff --check
```

Nix toolchain'i olmayan analiz ortamında shell syntax ve JSON kontrolleri geçti; Nix tabanlı validation çalıştırılamadı. Bu durum, platformun genel build'inin başarılı olduğu anlamına gelmez. Ayrıntılı durum `DEVELOPER-HANDOVER-REPORT.md` içinde verilmiştir.

## Production Çalıştırma ve Deployment

Production olarak etiketlenen tek Colmena düğümü `server`'dır. `builder` `ci` ve `cache`, `backup` ise `backup` rolü ile tanımlıdır. Production deployment öncesi aşağıdaki akış izlenir:

```bash
colmena build
colmena apply --on server
colmena apply --on @production
```

`colmena apply` için `server.l7v.dev`, `builder.l7v.dev` ve `backup.l7v.dev` DNS/SSH erişimi, root public key'leri, geçerli age recipient'ları ve gerçek disk UUID'leri hazır olmalıdır. Bu ön koşulların repository içinde doğrulandığına dair kanıt yoktur. [10] [11]

## Proje Klasör Yapısı

```text
.
├── flake.nix                 # Input'lar, host topology, NixOS outputs
├── flake.lock                # Kilitlenmiş flake input sürümleri
├── colmena.nix               # Multi-host deployment hive
├── lib/
│   ├── mkWorkstation.nix     # Laptop/workstation system üreticisi
│   ├── mkServer.nix          # Server system üreticisi
│   └── serverModules.nix     # Rol → capability çözümlemesi
├── hosts/                    # Host ve hardware-specific ayarlar
├── home/                     # Home Manager minimal/workstation profilleri
├── modules/
│   ├── infrastructure/       # boot, network, security, identity, storage
│   ├── capabilities/         # secrets, db, metrics, backup, cache vb.
│   ├── experience/            # desktop ve kullanıcı deneyimi
│   ├── services/              # Forgejo, Grafana, Vaultwarden, Attic stub
│   └── platform/              # CI, deployment, recovery, inventory, docs
├── secrets/sops/              # SOPS config, encrypted secret file, instructions
├── scripts/                   # bootstrap, update, validate ve initializer scriptleri
├── templates/aft/             # bağımsız Next.js başlangıç şablonu
├── docs/                      # mevcut discovery/runbook/quality belgeleri
├── pkgs/                      # repository-local derivations; mevcut checkout'ta Qoder dosyaları eksik
└── .pre-commit-config.yaml    # nix/shell formatting ve lint hook'ları
```

## Temel Kullanım

| İşlem | Komut |
|---|---|
| Workstation validation | `./scripts/validate.sh L7V` |
| Host status evaluation | `nix eval .#nixosConfigurations.L7V.config.networking.hostName` |
| Workstation switch | `nh os switch` |
| Workstation rollback | `nh os switch --rollback` |
| Input güncelleme | `./scripts/update.sh L7V` |
| Host key bootstrap | `./scripts/bootstrap.sh <HOST>` |
| Age/SOPS health check | `./scripts/age-check.sh` |
| Fleet build | `colmena build` |
| Tek node deployment | `colmena apply --on server` |
| Production-tag deployment | `colmena apply --on @production` |
| Inventory görüntüleme | `l7v-inventory` (inventory capability etkin hostta) |
| Sistem/runbook işlemleri | `systemctl`, `journalctl`, `snapper -c root`, `restic` |

## Önemli Notlar

Kod source of truth'tur. Özellikle mevcut `docs/` altında panel, wiki ve service durumlarına ilişkin bazı belgeler artık olmayan `panel/` ağacını veya etkinleştirilmemiş servisleri anlatmaktadır; bu nedenle eski belgeler yeni handover dosyalarının yerine geçmez. [12]

`modules/services/grafana` mevcut olsa da aktif host konfigürasyonlarında `l7v.services.grafana.enable = true` bulunmamaktadır. `modules/services/attic` açıkça stub'dır ve etkinleştirilirse yalnızca warning üretir; aktif binary cache yolu `l7v.cache` üzerinden `nix-serve`'dir. `messaging` ve `mesh` capability'leri de mevcut hostlarda etkinleştirilmiş değildir. [2] [13]

Secret, password, token, private key veya herhangi bir credential değeri repository dokümantasyonuna yazılmamalıdır. Production'a geçmeden önce hardware UUID, SSH authorized keys, SOPS recipients, backup backend ve DNS/ACME erişimi operatör tarafından doğrulanmalıdır.

## Kaynaklar

[1]: ./flake.nix "Flake outputs and host topology"
[2]: ./modules/services/default.nix "User-facing service module imports"
[3]: ./templates/aft/package.json "AFT template package manifest"
[4]: ./home/profiles/ai-tools.nix "Missing Qoder CLI package reference" 
[5]: ./scripts/validate.sh "Authoritative validation workflow"
[6]: ./hosts/server/hardware.nix "Server hardware placeholders"
[7]: ./secrets/sops/.sops.yaml "SOPS recipients and placeholder keys"
[8]: ./secrets/sops/secrets.yaml "Encrypted secret key names"
[9]: ./modules/capabilities/database/default.nix "Database secret name expected by PgBouncer"
[10]: ./colmena.nix "Colmena deployment topology"
[11]: ./modules/platform/deploy/default.nix "SSH client configuration for managed nodes"
[12]: ./docs/03-technical/API_INVENTORY.md "Stale panel API inventory"
[13]: ./modules/services/attic/default.nix "Attic placeholder service"

