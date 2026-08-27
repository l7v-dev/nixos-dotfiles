# API ve Operasyon Arayüzleri

## Kapsam Sonucu

Güncel repository'de uygulamaya ait Go/Node backend, REST endpoint route'u, GraphQL schema'sı, OpenAPI/Swagger dosyası veya `/api/v1` implementation'ı bulunmamaktadır. Eski `docs/03-technical/API_INVENTORY.md` belgesindeki `panel-agent`, SSE/WebSocket ve `/api/v1/*` listesi, son Git commit'lerinde kaldırılmış `panel/` ağacına ait stale içeriktir; mevcut API olarak dokümante edilmemelidir. [1] [2]

Bu nedenle aşağıdaki doküman, kodun gerçekten ürettiği **HTTP listener/virtual host'ları**, **internal service listener'larını** ve **CLI/operasyon arayüzlerini** kapsar. Forgejo, Vaultwarden, Prometheus, Loki, nginx-status ve nix-serve'in ürün seviyesindeki endpoint sözleşmeleri bu repository'de implement edilmediği için response schema'sı, tüm HTTP status code'ları ve uygulama error body'leri burada doğrulanamaz.

## API Envanteri

| Durum | Arayüz | Kaynak | Not |
|---|---|---|---|
| Aktif | Forgejo HTTPS virtual host | `server` hostu, `git.l7v.dev` | nginx `127.0.0.1:3000` upstream'ine proxy eder. Forgejo REST/UI sözleşmesi repository'de tanımlı değildir. |
| Aktif | Vaultwarden HTTPS virtual host | `server` hostu, `vault.l7v.dev` | nginx `127.0.0.1:8222` upstream'ine proxy eder. Bitwarden-compatible API sözleşmesi repository'de tanımlı değildir. |
| Aktif | nginx stub status | Loopback `127.0.0.1:80/nginx_status` | `stub_status`; public olarak açıldığına dair configuration yoktur. |
| Aktif | Prometheus listener | Metrics etkin hostlarda `:9090` | Prometheus native HTTP API'ı ürün tarafından sağlanır; repository yalnızca port ve scrape configuration tanımlar. |
| Aktif | Loki listener | Logging etkin hostlarda `127.0.0.1:3100` | Loki native HTTP API'ı ürün tarafından sağlanır; reverse proxy public route'u yoktur. |
| Aktif | Nix binary cache | `builder`, port `5000` | `nix-serve` native HTTP cache arayüzü; repository route/body schema tanımlamaz. |
| Koşullu | Grafana HTTPS virtual host | Sadece `l7v.services.grafana.enable = true` olursa | Modül mevcut ancak aktif host dosyalarında enable flag'i yoktur; upstream `127.0.0.1:3001`. |
| Koşullu | Matrix HTTPS virtual host | Sadece `l7v.messaging.enable = true` ve `matrix.enable = true` olursa | Upstream `127.0.0.1:8008`; mevcut hostlarda messaging etkin değildir. |
| Koşullu | ntfy HTTPS virtual host | Sadece `l7v.messaging.enable = true` ve `ntfy.enable = true` olursa | Upstream `127.0.0.1:2586`; mevcut hostlarda messaging etkin değildir. |

## Ortak HTTP Davranışı

Nginx reverse proxy capability'si etkin olduğunda TCP `80` ve `443` firewall'da açılır. Public service virtual host'ları `forceSSL = true` ve `enableACME = true` kullanır. Upstream servisler loopback'e bind edilir; uygulamalar doğrudan public interface'e açılmaz. [3]

Nginx seviyesinde ortak proxy header'ları `Host`, `X-Real-IP`, `X-Forwarded-For` veya `X-Forwarded-Proto` olarak service modülüne göre iletilir. Request body limitleri Forgejo için `512m`, Vaultwarden için `128m`, Matrix için `100m` olarak kodlanmıştır. Bu değerler service-specific modüllerden gelir. [4] [5]

## Endpoint Detayları

### Forgejo Virtual Host

| Alan | Değer |
|---|---|
| Method | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` dahil upstream tarafından desteklenen HTTP method'ları; repository bunları kısıtlamaz. |
| Endpoint | `https://git.l7v.dev/<path>` |
| Authentication | Forgejo'nun kendi UI/API authentication mekanizması; repository yalnızca admin password secret teslimini ve registration ayarını tanımlar. |
| Request parameters/body | Forgejo uygulama sözleşmesine bağlı; bu repository'de schema yoktur. |
| Headers | `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`. |
| Upstream | `http://127.0.0.1:3000` |
| Response/status | Forgejo tarafından belirlenir; repository'de response model veya error body yoktur. |

Örnek erişim kontrolü:

```bash
curl -I https://git.l7v.dev/
```

Beklenen HTTP durum kodu ve response header'ları hedefteki nginx/Forgejo runtime'ına, DNS'e ve ACME sertifikasına bağlıdır; kaynak koddan sabit bir response örneği çıkarılamaz.

### Vaultwarden Virtual Host

| Alan | Değer |
|---|---|
| Method | Upstream Vaultwarden'ın desteklediği HTTP method'ları; nginx method filtering uygulamaz. |
| Endpoint | `https://vault.l7v.dev/<path>` |
| Authentication | Vaultwarden hesabı/admin token akışı; admin token SOPS ile runtime EnvironmentFile'a alınır. |
| Request parameters/body | Vaultwarden/Bitwarden API sözleşmesine bağlı; repository'de schema yoktur. |
| Headers | `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`. |
| Upstream | `http://127.0.0.1:8222` |
| WebSocket | `proxyWebsockets = true`. |
| Response/status | Vaultwarden tarafından belirlenir; repository'de response model veya error body yoktur. |

Örnek erişim kontrolü:

```bash
curl -I https://vault.l7v.dev/
```

Admin token, password veya token değerleri komut örneklerine yazılmamalıdır.

### nginx Stub Status

| Alan | Değer |
|---|---|
| Method | `GET` |
| Endpoint | `http://127.0.0.1/nginx_status` |
| Authentication | Ayrı bir auth kuralı tanımlanmamış; yalnızca loopback listener'ı ile sınırlandırılmıştır. |
| Request parameters/body | Yok. |
| Response | nginx `stub_status` text formatı; aktif connection/request sayaçlarını içerir. |
| Error responses | Nginx runtime'ına bağlı; loopback dışından erişim beklenmez. |

Örnek:

```bash
curl http://127.0.0.1/nginx_status
```

### Prometheus ve Exporter Listener'ları

| Servis | Host/port | Scrape/API durumu |
|---|---:|---|
| Prometheus | `:9090` | Prometheus native UI/API ürüne aittir; repository yalnızca `scrape_interval = 15s` ve local targets tanımlar. |
| Node exporter | `:9100` | Exporter metrics endpoint'i servis tarafından sağlanır. |
| Systemd exporter | `:9558` | Exporter metrics endpoint'i servis tarafından sağlanır. |
| Nginx exporter | `:9113` | Yalnızca reverse proxy capability etkinse exporter ve target eklenir. |
| PostgreSQL exporter | `:9187` | Yalnızca database capability etkinse exporter ve target eklenir. |

Repository'de bu endpoint'lere ilişkin auth header, request body, response JSON schema'sı veya error schema'sı tanımlanmamıştır. Prometheus'un configured scrape targets'ı `localhost:9090`, `localhost:9100`, `localhost:9558` ve koşullu olarak `localhost:9113`/`localhost:9187` değerleridir. [6]

### Loki Listener

Logging capability etkin olduğunda Loki `127.0.0.1:3100` portunda filesystem storage ve TSDB schema ile çalışır. fluent-bit systemd journal girdilerini `127.0.0.1:3100` adresine gönderir. Loki query/ingest API'ı bu repository'de tekrar implement edilmemiştir; public reverse proxy route'u yoktur. [7]

### nix-serve Binary Cache

Builder'da cache capability etkin olduğunda `nix-serve` `5000` portunda çalışır ve signing key'i SOPS secret'ından alır. Nix client erişimi native binary-cache protocol'üne bağlıdır. Cache public DNS/reverse proxy tanımı repository'de yoktur; yalnızca port firewall'da açılır. [8]

## Koşullu Endpoint'ler

### Grafana

`modules/services/grafana/default.nix` etkinleştirilirse:

```text
https://grafana.l7v.dev/*  ->  http://127.0.0.1:3001/*
```

Modül SQLite state, Prometheus datasource ve SOPS'tan admin password provisioning tanımlar. Ancak güncel `hosts/server/default.nix` dosyasında Grafana enable edilmediği için bu endpoint mevcut aktif deployment'ın endpoint'i değildir. [9]

### Matrix ve ntfy

`messaging` capability mevcut olmakla birlikte herhangi bir hostta `l7v.messaging.enable = true` tanımı yoktur. Bu nedenle `matrix.l7v.dev` ve `ntfy.l7v.dev` virtual host'ları mevcut aktif configuration'da oluşmaz. Koşullu wiring şöyledir:

```text
https://matrix.l7v.dev/* -> http://127.0.0.1:8008/*
https://ntfy.l7v.dev/*   -> http://127.0.0.1:2586/*
```

## Operational CLI Interfaces

HTTP API yerine repository'nin gerçek operasyon arayüzü aşağıdaki CLI'lerdir.

| İşlem | Komut | Authentication/ön koşul |
|---|---|---|
| Local validation | `./scripts/validate.sh [HOST]` | Git checkout, Nix toolchain; Nix evaluation için erişilebilir flake input'ları. |
| Workstation switch | `nh os switch` | NixOS local privilege; user configuration'daki sudo kuralı. |
| Workstation rollback | `nh os switch --rollback` | Local NixOS generation ve root privilege. |
| Fleet build | `colmena build` | Flake evaluation ve yeterli build kaynakları. |
| Remote deployment | `colmena apply --on <node>` | Root SSH, DNS/host erişimi, target disk ve SOPS hazırlığı. |
| SOPS update | `sops updatekeys secrets/sops/secrets.yaml` | Geçerli age recipient'ları ve ilgili private key. |
| Backup | `restic` / systemd `restic-backups-l7v` | Repository credential'ları SOPS üzerinden provision edilmiş olmalı. |
| Recovery check | `systemctl start recovery-check.service` | Backup capability ve repository erişimi. |

## OpenAPI / Swagger Durumu

OpenAPI, Swagger UI, Postman collection veya API contract test dosyası yoktur. Bu nedenle mevcut repository için endpoint bazında request/response schema'sı ve tüm HTTP status/error response örnekleri sağlamak mümkün değildir; bunları uydurmak source of truth kuralını ihlal eder.

## Kaynaklar

[1]: ./docs/03-technical/API_INVENTORY.md "Stale panel API inventory"
[2]: ./CHANGELOG.md "Repository history and panel removal summary"
[3]: ./modules/capabilities/reverse-proxy/default.nix "nginx, ACME and firewall configuration"
[4]: ./modules/services/forgejo/default.nix "Forgejo upstream and proxy settings"
[5]: ./modules/services/vaultwarden/default.nix "Vaultwarden upstream and proxy settings"
[6]: ./modules/capabilities/metrics/default.nix "Prometheus ports and scrape targets"
[7]: ./modules/capabilities/logging/default.nix "Loki and fluent-bit configuration"
[8]: ./modules/capabilities/cache/default.nix "nix-serve cache configuration"
[9]: ./modules/services/grafana/default.nix "Conditional Grafana service"

> **Not:** `[2]` repository'nin Git history'sini özetleyen `CHANGELOG.md` dosyasına yapılan atıftır. Changelog için ayrıntılı commit bilgisi aynı dosyada verilmiştir.

