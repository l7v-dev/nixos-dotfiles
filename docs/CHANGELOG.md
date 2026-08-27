# Changelog

Bu changelog, teslim edilen repository'nin Git history'sindeki commit mesajları ve mevcut çalışma ağacı üzerinden hazırlanmıştır. Repository'de semantic version tag'i bulunmadığı için sürüm başlıkları **kanıtlanabilir tarih aralıkları** ve `Unreleased` çalışma ağacı durumu üzerinden gruplanmıştır. Aşağıdaki maddeler commit mesajlarının doğrulanabildiği kapsamla sınırlıdır; commit içeriğinde doğrulanmayan runtime sonuçları başarı olarak yazılmamıştır.

## [Unreleased] — 2026-08-26 çalışma ağacı

### Changed

- Developer handover için README, architecture, API, database, deployment, known issues ve final delivery belgeleri güncellenmiştir.

### Removed / Pending Review

- Çalışma ağacında `pkgs/qoder/default.nix` ve `pkgs/qoder-cli/default.nix` dosyaları Git tarafından silinmiş görünmektedir. Bu silinmeler henüz commit edilmemiştir ve `modules/platform/default.nix` ile `home/profiles/ai-tools.nix` içindeki referanslarla çelişmektedir.

### Breaking Changes

- Yukarıdaki uncommitted silinmeler onaylanırsa workstation flake evaluation'ı Qoder package import'ları nedeniyle kırılabilir. Bunun bir intentional removal mı yoksa teslim artefact'ı mı olduğu Git history'den doğrulanamamıştır.

## 2026-08-25 — `d07dbe8`

### Removed

- Commit mesajına göre panel referansları ve standalone panel klasörü kaldırılmıştır.

### Breaking Changes

- Eski `panel-agent` ve panel web UI'sına ait `/api/v1` sözleşmesinin artık mevcut repository tarafından sağlandığı doğrulanamaz. Önceki API dokümantasyonları güncel sistemin API'si olarak kullanılmamalıdır.

## 2026-08-20 — Flake, güvenlik ve bakım iyileştirmeleri

### Added

- `gomod2nix` flake input/overlay güncellemesi ve `flake.lock` güncellemesi sonrası otomatik commit akışı eklenmiştir.
- Security audit kapsamının genişletildiği commit edilmiştir.

### Changed

- Nix store garbage collection parsing ve dosya upload security davranışlarının iyileştirildiği commit mesajlarında belirtilmiştir.

### Fixed

- API response body'nin `Uint8Array` biçimine çevrilmesine yönelik düzeltme commit edilmiştir.

> Bu panel odaklı düzeltmelerin güncel checkout'ta çalışan bir panel kodu üzerinde hâlâ mevcut olduğu iddia edilmemektedir; panel ağacının sonraki commit'te kaldırıldığı görülmektedir.

## 2026-08-14–2026-08-18 — Panel ve platform özellikleri

### Added

Git history bu dönemde aşağıdaki özelliklerin eklendiğini bildirir:

- Power, network ve Wake-on-LAN özellikleri.
- Native monitoring dashboard ve Prometheus integration.
- Server-side terminal session management ve web terminal dashboard.
- Journal logging, filtered queries ve visualization components.
- Modular backend services ve frontend components.
- Application monitoring, service health probes ve log streaming.
- Container management ve application catalog support.
- NixOS fleet management, generation diffing ve Colmena orchestration.
- Storage snapshots ve restic backup management.
- AI agent hub, task orchestration, MicroVM management ve tool integration.
- Nix package/option explorer, file management ve command palette gibi panel özellikleri.

### Changed

- Wi-Fi cockpit UI localization ve NetworkManager connection deletion davranışı güncellenmiştir.
- Bluetooth API pairing/adapter info parsing iyileştirmeleri yapılmıştır.
- Terminal UI, system vitals HUD ve Wi-Fi workflow'ları yenilenmiştir.

### Breaking Changes

- Bu bölümdeki panel özellikleri, 2026-08-25 tarihli panel removal commit'i nedeniyle mevcut production surface'i olarak kabul edilmemelidir.

## 2026-08-07–2026-08-13 — Declarative tooling ve repository consolidation

### Added

- AI coding agent tooling profile genişletilmiştir.
- Autonomous agent framework ve sandbox tier'ları eklenmiştir.
- Kiro/AI tooling, Qoder CLI ve çeşitli developer runtime/tool paketleri eklenmiştir.
- NixOS dotfiles yapısı altında repository consolidation gerçekleştirilmiştir.
- `l7v-panel` ilk fazı ve property-based test değişiklikleri tarihsel olarak eklenmiştir.

### Changed

- NixOS flake input'ları güncellenmiş, server/workstation ayrımı ve modern module düzeni geliştirilmiştir.
- Niri desktop configuration modüler hâle getirilmiştir.
- PostgreSQL/PgBouncer configuration ve storage/service declarations refactor edilmiştir.

## 2026-07-26–2026-08-05 — Temel repository ve desktop/tooling kurulumu

### Added

- İlk repository commit'i ve Google Open Source uyumlu repository dosyaları.
- Niri/NixOS desktop düzeni, Powerlevel10k, Chrome DevTools MCP, Google Chrome ve Bruno tooling.
- AFT template ve BPT/repository adoption initializer script'leri.
- Qodana configuration ve IDE project files.

### Changed

- Shell prompt, Nix formatting ve workstation configuration düzenlemeleri yapılmıştır.
- Kiro package/profile ve runtime dependency düzenlemeleri yapılmıştır.

## Versioning Durumu

| Alan | Durum |
|---|---|
| Git tags | Repository snapshot'ında semantic version tag'i bulunmamaktadır. |
| Current branch | `main`; local branch, snapshot alındığı anda `origin/main` karşısında ahead görünmektedir. |
| Latest committed HEAD | `d07dbe8` — `chore: remove panel references and standalone panel folder`. |
| Commit date range | Git history'de 2026-07-26 ile 2026-08-25 arası commit'ler görünmektedir. |
| Release notes | Resmî release/tag veya automated changelog generation bulunmamaktadır. |

## Kaynaklar

[1]: ./flake.nix "Current flake outputs and package references"
[2]: ./modules/platform/default.nix "Current Qoder package reference"
[3]: ./home/profiles/ai-tools.nix "Current Qoder CLI package reference"
[4]: ./docs/03-technical/API_INVENTORY.md "Historical panel API inventory"

> Commit hash, tarih ve subject bilgileri repository'nin `.git` history'sinden alınmıştır. Git tag'i veya release metadata'sı olmadığı için sürüm numarası uydurulmamıştır.

