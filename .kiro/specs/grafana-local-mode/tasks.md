# Implementation Plan: Grafana Local Mode

## Overview

`modules/services/grafana/default.nix` dosyasına `localMode` ve `adminPassword` seçenekleri eklenerek Grafana modülü workstation host'larında da çalışabilir hale getirilecektir. Değişiklik tek bir Nix dosyasıyla sınırlıdır; mevcut server-mode davranışı korunacak, yeni local-mode yapılandırması `lib.mkMerge` + `lib.mkIf` ile ayrıştırılacaktır.

## Tasks

- [x] 1. Modül seçeneklerini genişlet
  - [x] 1.1 `localMode` ve `adminPassword` seçeneklerini options bloğuna ekle
    - `options.l7v.services.grafana` altına `localMode` (`lib.types.bool`, default `false`) ve `adminPassword` (`lib.types.str`, default `"admin"`) seçeneklerini `lib.mkOption` ile ekle
    - Her iki seçeneğe açıklayıcı `description` alanı yaz (İngilizce)
    - _Requirements: 1.1, 3.2_

- [x] 2. Config bloğunu server-mode ve local-mode olarak yeniden yapılandır
  - [x] 2.1 Ortak (commonConfig) yapılandırmayı ayıkla
    - Mevcut `config = lib.mkIf cfg.enable { ... }` bloğunu `lib.mkMerge [commonConfig (lib.mkIf (!cfg.localMode) serverConfig) (lib.mkIf cfg.localMode localConfig)]` şeklinde yeniden düzenle
    - `commonConfig`: her iki modda geçerli olan `services.grafana.enable = true`, `database.type = "sqlite3"`, `users.allow_sign_up = false`, `analytics.*` ayarlarını içerir
    - _Requirements: 1.2, 7.1_

  - [x] 2.2 Server-mode bloğunu (`serverConfig`) tanımla
    - Mevcut assertions (metrics, reverseProxy, secrets), `sops.secrets."grafana/admin_password"`, server `settings` (domain, root_url, https, cookie_secure) ve nginx virtualHost yapılandırmasını `serverConfig` olarak grupla
    - Bu blok `localMode = false` olduğunda — yani varsayılan durumda — tam olarak önceki davranışı üretmeli
    - _Requirements: 1.2, 7.1, 7.2, 7.3, 7.4_

  - [x] 2.3 Local-mode bloğunu (`localConfig`) tanımla
    - `isServer` uyarı assertion'ını ekle: `!config.l7v.infrastructure.isServer`
    - `services.grafana.settings.server`: `http_addr = "127.0.0.1"`, `http_port = 3001`, `root_url = "http://127.0.0.1:3001"`, `protocol = "http"` ayarla
    - `services.grafana.settings.security`: `admin_user = "admin"`, `admin_password = cfg.adminPassword`, `cookie_secure = false`, `cookie_samesite = "disabled"`, `allow_embedding = true`, `disable_gravatar = true` ayarla
    - `services.grafana.provision.datasources.settings.datasources`: `lib.optional config.l7v.metrics.enable { ... Prometheus ... }` ile koşullu datasource listesi oluştur
    - Nginx virtualHost yapılandırması ekleme
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.4, 4.1, 4.2, 4.3, 5.1, 5.2, 6.1, 6.2, 6.3_

- [x] 3. Laptop host yapılandırmasını güncelle
  - [x] 3.1 `hosts/laptop/default.nix` içine `l7v.services.grafana` bloğunu ekle
    - `l7v.services.grafana = { enable = true; localMode = true; };` bloğunu `l7v` atribute set'i içine ekle
    - `adminPassword` varsayılan değer kullanılacağından override gerekmez; isteğe bağlı olduğu bir yorum satırıyla belirt
    - _Requirements: 6.1, 6.2_

- [x] 4. Checkpoint — Nix değerlendirmesini doğrula
  - `nix eval .#nixosConfigurations.L7V.config.services.grafana.settings` komutuyla local mode yapılandırmasının hatasız değerlendirildiğini doğrula
  - `./scripts/validate.sh L7V` ile nixfmt + statix + deadnix + flake check'i çalıştır
  - Tüm testler geçmeli; hata varsa düzelt, kullanıcıya sor.

- [x] 5. Örnek test senaryolarını doğrula (snapshot/example-based)
  - [x] 5.1 Server-mode davranışının korunduğunu doğrulayan nix eval testi yaz
    - `nix eval .#nixosConfigurations.server.config.services.grafana.settings` ile server host'ta nginx vhost ve SOPS secret referansının hâlâ mevcut olduğunu kontrol et
    - Çıktıyı design doc'taki "Server Mode Yapılandırma Çıktısı" ile karşılaştır
    - _Requirements: 7.1, 7.2, 7.3, 7.4 — Property 1_

  - [ ]* 5.2 Local-mode yapılandırma snapshot testi yaz
    - `nix eval .#nixosConfigurations.L7V.config.services.grafana.settings` çıktısını kaydet
    - Çıktıda `nginx` ve `sops.secrets` referansı olmadığını, `protocol = "http"` ve `allow_embedding = true` bulunduğunu doğrula
    - _Requirements: 2.1–2.6, 3.4, 5.1, 5.2 — Property 1_

  - [ ]* 5.3 Assertion tamlığı için nix eval testi yaz
    - `localMode = true` + `isServer = false` + `metrics.enable = false` kombinasyonunun hatasız değerlendirildiğini doğrula
    - `localMode = false` + `metrics.enable = false` kombinasyonunun assertion hatası ürettiğini doğrula
    - _Requirements: 1.3, 1.4, 1.5, 6.1, 6.3 — Property 2_

  - [ ]* 5.4 Koşullu datasource testi yaz
    - `metrics.enable = true` iken datasource listesinin tam olarak 1 Prometheus girişi içerdiğini `nix eval` ile doğrula
    - `metrics.enable = false` iken datasource listesinin boş olduğunu doğrula
    - _Requirements: 4.1, 4.2, 4.3 — Property 3_

- [x] 6. Final checkpoint — Tüm doğrulamalar geçmeli
  - `./scripts/validate.sh L7V` son kez çalıştır
  - Tüm testler geçmeli; beklenmedik durum varsa kullanıcıya sor.

## Notes

- Alt görevler `*` ile işaretlenenler isteğe bağlıdır; temel MVP için atlanabilir
- Design doc'ta PBT uygunsuz olduğu gerekçelendirilmiştir (8 sonlu kombinasyon) — snapshot/example-based testler kullanılır
- `nix eval` komutları flake-tracked dosyalar gerektirir; yeni dosyalar için `git add` çalıştırılmalı
- `adminPassword` seçeneği `localMode = false` iken `lib.mkIf cfg.localMode` koruması sayesinde yok sayılır
- Tüm `.nix` dosya yorumları İngilizce olmalı (nixos-architecture.md kuralı)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3", "5.4"] }
  ]
}
```
