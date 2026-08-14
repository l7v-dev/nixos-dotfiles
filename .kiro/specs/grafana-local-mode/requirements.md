# Requirements Document

## Introduction

`l7v.services.grafana` modülü şu anda sunucuya özgü üç zorunlu bağımlılığa sahiptir: `l7v.metrics.enable` (Prometheus), `l7v.reverseProxy.enable` (nginx) ve `l7v.secrets.enable` (SOPS). Bu bağımlılıklar modülü yalnızca server host'larda kullanılabilir hale getirmekte; laptop gibi workstation ortamlarında etkinleştirilmesini engellemektedir.

Bu özellik, `l7v.services.grafana.localMode = true` seçeneğini ekleyerek Grafana'yı workstation'larda da çalıştırılabilir kılmayı hedefler. Local mode'da Grafana şu koşulları karşılar:

- SOPS secret gerektirmez (admin şifresi plain-text ya da boş olabilir)
- nginx reverse proxy gerektirmez (doğrudan HTTP üzerinden erişilir)
- Prometheus opsiyoneldir (varsa datasource otomatik eklenir, yoksa hatasız çalışır)
- Panel monitoring sayfasının (`/monitoring`) iFrame embed için kullanabileceği bir local endpoint sunar

## Glossary

- **Grafana_Module**: `modules/services/grafana/default.nix` içindeki `l7v.services.grafana` NixOS modülü.
- **Local_Mode**: `l7v.services.grafana.localMode = true` ile etkinleştirilen workstation-uyumlu çalışma modu.
- **Server_Mode**: Mevcut davranış — SOPS, nginx ve Prometheus zorunlu, `localMode = false` (varsayılan).
- **Panel_Frontend**: Next.js tabanlı panel web arayüzü; `/monitoring` sayfasında Grafana iFrame embed kullanır.
- **Panel_Agent**: Laptop'ta çalışan Go backend servisi (`l7v.services.panel.agent`).
- **Prometheus**: `l7v.metrics.enable = true` ile etkinleştirilen metrik toplama servisi.
- **SOPS**: `l7v.secrets.enable = true` ile yönetilen şifrelenmiş secret sistemi.
- **Workstation**: Laptop gibi masaüstü/taşınabilir NixOS host'u; `l7v.infrastructure.isServer = false`.

---

## Requirements

### Requirement 1: Local Mode Seçeneği

**User Story:** Bir NixOS yapılandırma yazarı olarak, Grafana'yı laptop gibi workstation host'larında etkinleştirmek istiyorum; böylece SOPS, nginx veya Prometheus kurulumu yapmadan lokal monitoring dashboard'larına erişebileyim.

#### Acceptance Criteria

1. THE Grafana_Module SHALL expose a `localMode` boolean option (`lib.mkOption`, type `lib.types.bool`, default `false`) under `l7v.services.grafana.localMode`.
2. WHEN `localMode = false`, THE Grafana_Module SHALL preserve all existing behavior, assertions, and configuration without modification.
3. WHEN `localMode = true`, THE Grafana_Module SHALL NOT enforce the `l7v.metrics.enable` assertion.
4. WHEN `localMode = true`, THE Grafana_Module SHALL NOT enforce the `l7v.reverseProxy.enable` assertion.
5. WHEN `localMode = true`, THE Grafana_Module SHALL NOT enforce the `l7v.secrets.enable` assertion.

---

### Requirement 2: HTTP-Only Erişim (Local Mode)

**User Story:** Bir workstation kullanıcısı olarak, Grafana'ya localhost üzerinden düz HTTP ile erişmek istiyorum; böylece TLS sertifikası veya nginx yapılandırması olmadan dashboard'ları görüntüleyebileyim.

#### Acceptance Criteria

1. WHEN `localMode = true`, THE Grafana_Module SHALL configure `services.grafana.settings.server.http_addr` to `"127.0.0.1"`.
2. WHEN `localMode = true`, THE Grafana_Module SHALL configure `services.grafana.settings.server.http_port` to `3001`.
3. WHEN `localMode = true`, THE Grafana_Module SHALL configure `services.grafana.settings.server.root_url` to `"http://127.0.0.1:3001"`.
4. WHEN `localMode = true`, THE Grafana_Module SHALL configure `services.grafana.settings.server.protocol` to `"http"`.
5. WHEN `localMode = true`, THE Grafana_Module SHALL configure `services.grafana.settings.security.cookie_secure` to `false`.
6. WHEN `localMode = true`, THE Grafana_Module SHALL NOT create any nginx virtual host configuration.

---

### Requirement 3: SOPS-free Admin Kimlik Bilgileri (Local Mode)

**User Story:** Bir workstation kullanıcısı olarak, admin şifresini SOPS secret olmadan yapılandırmak istiyorum; böylece Grafana'yı secrets altyapısı kurulmadan çalıştırabieyim.

#### Acceptance Criteria

1. WHEN `localMode = true`, THE Grafana_Module SHALL configure the admin password using the plain-text `adminPassword` option value instead of a SOPS secret file reference.
2. THE Grafana_Module SHALL expose an `adminPassword` string option (`lib.mkOption`, type `lib.types.str`, default `"admin"`) under `l7v.services.grafana.adminPassword`.
3. WHEN `localMode = false`, THE Grafana_Module SHALL ignore the `adminPassword` option and continue using the SOPS secret file reference for the admin password.
4. WHEN `localMode = true`, THE Grafana_Module SHALL NOT reference `config.sops.secrets."grafana/admin_password".path`.

---

### Requirement 4: Prometheus Datasource (Local Mode, Opsiyonel)

**User Story:** Bir workstation kullanıcısı olarak, Prometheus çalışıyorsa Grafana'nın bunu otomatik olarak datasource olarak kullanmasını istiyorum; çalışmıyorsa Grafana'nın hatasız başlamasını istiyorum.

#### Acceptance Criteria

1. WHEN `localMode = true` AND `config.l7v.metrics.enable = true`, THE Grafana_Module SHALL add a Prometheus datasource pointing to `"http://127.0.0.1:9090"` as the default datasource.
2. WHEN `localMode = true` AND `config.l7v.metrics.enable = false`, THE Grafana_Module SHALL configure `services.grafana.provision.datasources.settings.datasources` as an empty list.
3. WHEN `localMode = true` AND `config.l7v.metrics.enable = false`, THE Grafana_Module SHALL NOT emit a NixOS evaluation error or assertion failure related to missing Prometheus.

---

### Requirement 5: Panel Monitoring Sayfası ile Uyumluluk

**User Story:** Bir workstation kullanıcısı olarak, panel'in `/monitoring` sayfasının Grafana iFrame'ini doğrudan localhost'taki Grafana endpoint'ine yönlendirmesini istiyorum; böylece server'daki nginx proxy olmadan da dashboard'ları görebileyim.

#### Acceptance Criteria

1. WHEN `localMode = true`, THE Grafana_Module SHALL configure `services.grafana.settings.security.allow_embedding` to `true`.
2. WHEN `localMode = true`, THE Grafana_Module SHALL configure `services.grafana.settings.security.cookie_samesite` to `"disabled"`.
3. WHEN `localMode = true` AND `config.l7v.services.panel.agent.enable = true`, THE Grafana_Module SHALL NOT conflict with panel-agent's port assignments or socket paths.

---

### Requirement 6: Workstation Host Entegrasyonu

**User Story:** Bir NixOS yapılandırma yazarı olarak, laptop host yapılandırmasında tek satır ekleyerek local mode Grafana'yı etkinleştirebilmek istiyorum; modülün bağımlılık çakışması yaşatmamasını bekliyorum.

#### Acceptance Criteria

1. WHEN `l7v.services.grafana = { enable = true; localMode = true; }` is set in a workstation host config, THE Grafana_Module SHALL successfully evaluate without NixOS assertion failures.
2. WHEN `localMode = true` AND `l7v.infrastructure.isServer = false`, THE Grafana_Module SHALL be valid for use alongside other workstation services such as `l7v.services.panel.agent`.
3. IF `localMode = true` AND `l7v.infrastructure.isServer = true`, THEN THE Grafana_Module SHALL emit a NixOS assertion warning recommending `localMode = false` for server hosts.

---

### Requirement 7: Mevcut Server Davranışının Korunması

**User Story:** Bir sunucu operatörü olarak, `localMode` özelliği eklendikten sonra server host'ların Grafana yapılandırmasının hiçbir değişiklik gerektirmemesini istiyorum; mevcut server deployment'larının bozulmamasını bekliyorum.

#### Acceptance Criteria

1. WHEN `l7v.services.grafana.enable = true` AND `localMode` is not set (default `false`), THE Grafana_Module SHALL behave identically to its pre-feature behavior.
2. WHEN `localMode = false`, THE Grafana_Module SHALL still enforce all three assertions (`l7v.metrics.enable`, `l7v.reverseProxy.enable`, `l7v.secrets.enable`).
3. WHEN `localMode = false`, THE Grafana_Module SHALL still use `$__file{...}` SOPS secret reference for admin password.
4. WHEN `localMode = false`, THE Grafana_Module SHALL still configure nginx virtual host with SSL and ACME.
