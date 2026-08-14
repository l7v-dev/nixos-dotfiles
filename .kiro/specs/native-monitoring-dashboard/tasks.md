# Implementation Plan: Native Monitoring Dashboard

## Overview

Grafana yerel modu kaldırılır, laptop'ta Prometheus etkinleştirilir, Go ajanına Prometheus proxy endpoint'i eklenir ve `/monitoring` sayfası Recharts tabanlı native bir dashboard olarak yeniden yazılır. Tüm değişiklikler 4 bağımsız şeritte ilerler: NixOS, Go agent, TypeScript frontend, testler.

## Tasks

- [ ] 1. NixOS konfigürasyonu güncelle
  - [ ] 1.1 Grafana yerel modunu laptop konfigürasyonundan kaldır
    - `hosts/laptop/default.nix` içindeki `l7v.services.grafana { enable = true; localMode = true; }` bloğunu sil
    - _Requirements: 1.1_

  - [ ] 1.2 Laptop'ta Prometheus ve prometheusWidget'ı etkinleştir
    - `hosts/laptop/default.nix` içindeki `l7v` atribute set'ine şunları ekle:
      ```nix
      metrics.enable = true;
      services.panel.agent.prometheusWidget = true;
      ```
    - _Requirements: 2.1, 2.5_

  - [ ] 1.3 `modules/services/grafana/default.nix`'ten localMode kaldır
    - `localConfig` let binding'ini sil
    - `lib.mkIf cfg.localMode localConfig` satırını `lib.mkMerge` listesinden çıkar
    - `localMode` ve `adminPassword` option tanımlarını sil
    - `commonConfig` ve `serverConfig` blokları olduğu gibi korunur
    - _Requirements: 1.2_

  - [ ] 1.4 `panel/nix/module.nix`'ten `/grafana/` nginx location bloğunu kaldır
    - `frontendCfg.enable` dalındaki `locations."/grafana/"` bloğunu sil
    - Grafana embed için eklenen `services.grafana.settings = lib.mkIf ...` bloğunu da sil
    - _Requirements: 1.3_

  - [ ] 1.5 Checkpoint: Nix değerlendirmesini doğrula
    - `nix flake check --no-build` çalıştır — derleme hatası olmamalı
    - `nix eval .#nixosConfigurations.L7V.config.services.grafana.enable` → `false` çıktısı gelmeli
    - `nix eval .#nixosConfigurations.L7V.config.services.prometheus.enable` → `true` çıktısı gelmeli
    - _Requirements: 1.4, 2.2_

- [ ] 2. Go agent — Prometheus proxy handler
  - [ ] 2.1 `internal/api/prometheus_proxy.go` dosyasını oluştur
    - `prometheusProxyHandler(mode string) http.HandlerFunc` fonksiyonunu yaz (mode: `"query"` veya `"query_range"`)
    - Doğrulama sırası:
      1. `query` parametresi boş değil ve ≤4096 karakter (HTTP 400)
      2. `isQueryAllowed(query)` allowlist kontrolü (HTTP 403)
      3. `query_range` modunda `start`/`end` geçerli Unix timestamp ve fark ≤2_592_000 (HTTP 400)
    - 10 saniyelik timeout'lu `http.Client` ile `http://localhost:9090/api/v1/{mode}` adresine GET isteği at
    - Prometheus yanıtını `Content-Type` başlığı dahil `io.Copy` ile istemciye aktar
    - Prometheus erişilemezse HTTP 502, timeout ise HTTP 504
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 13.1, 13.2, 13.3, 13.4_

  - [ ] 2.2 `isQueryAllowed` ve `validateTimeRange` yardımcı fonksiyonlarını yaz
    - `allowedPrefixes = []string{"node_", "systemd_", "go_", "process_"}` sabitini tanımla
    - `isQueryAllowed(query string) bool` — PromQL'deki metrik isimlerini tarar, allowlist dışında ise false
    - `validateTimeRange(start, end int64) error` — geçersiz timestamp veya >30 gün ise hata döner
    - _Requirements: 13.2, 13.3_

  - [ ] 2.3 `router.go` Deps yapısını ve route kaydını güncelle
    - `Deps` struct'ına `PrometheusWidget bool` alanı ekle
    - `NewRouter()` içinde `if d.PrometheusWidget` bloğuyla iki endpoint'i koşullu kaydet:
      ```go
      mux.Handle("GET /api/v1/metrics/query",       prometheusProxyHandler("query"))
      mux.Handle("GET /api/v1/metrics/query_range", prometheusProxyHandler("query_range"))
      ```
    - Başlangıç logunda `"prometheus proxy enabled"` veya `"prometheus proxy disabled"` yaz
    - _Requirements: 3.1, 3.2, 3.4, 3.7_

  - [ ] 2.4 `main.go`'ya `PANEL_PROMETHEUS_WIDGET` env var okuma ekle
    - `prometheusWidget := os.Getenv("PANEL_PROMETHEUS_WIDGET") == "1"` satırını ekle
    - `Deps` yapısını oluştururken `PrometheusWidget: prometheusWidget` geç
    - _Requirements: 3.1, 3.2_

  - [ ] 2.5 Checkpoint: Go agent derleme ve birim testler
    - `go build ./...` hatasız tamamlanmalı
    - `go test ./internal/api/...` geçmeli
    - `PANEL_PROMETHEUS_WIDGET=0` ile başlatıldığında `/api/v1/metrics/query` → 404 döndürmeli
    - _Requirements: 3.4_

- [ ] 3. Frontend — tip tanımları ve yardımcılar
  - [ ] 3.1 `types/prometheus.ts` oluştur
    - `PrometheusMetric`, `PrometheusSeries`, `PrometheusMatrix`, `PrometheusVector` interface'lerini tanımla
    - `PrometheusRangeResult` ve `PrometheusInstantResult` wrapper tiplerini ekle
    - `ChartDataPoint { time: number; value: number; label?: string }` interface'ini ekle
    - _Requirements: 12.1_

  - [ ] 3.2 `lib/prometheus.ts` oluştur
    - `parseRangeData(series: PrometheusSeries): ChartDataPoint[]` — NaN/Infinity değerleri filtreler
    - `mergeSeriesForRecharts(result: PrometheusMatrix, labelKey?: string): Record<string, number>[]` — çok serili grafik için birleştirme
    - _Requirements: 12.1, 12.3_

  - [ ] 3.3 `hooks/usePrometheusQuery.ts` oluştur
    - `TimeRange = "15m" | "1h" | "6h" | "24h"` tipini tanımla
    - `TIME_RANGE_SECONDS` ve `STEP_SECONDS` sabitlerini tanımla
    - `deriveStep(range: TimeRange): number` saf fonksiyonunu yaz
    - `useQueryRange(query, timeRange, options?)` — TanStack Query ile `refetchInterval: 60_000`, queryKey `["prometheus-range", host, query, timeRange]`
    - `useInstantQuery(query, options?)` — anlık sorgu için
    - `fetchAgent()` ve `useHostStore` kullan (mevcut paternlerle aynı)
    - _Requirements: 11.3, 11.4, 12.4, 12.5_

- [ ] 4. Frontend — monitoring sayfasını yeniden yaz
  - [ ] 4.1 `TimeRangeSelector` bileşenini yaz
    - `app/monitoring/` altında veya `components/monitoring/TimeRangeSelector.tsx` olarak oluştur
    - 4 segment: `15m | 1h | 6h | 24h`, aktif seçenek `bg-primary text-primary-foreground` stilinde
    - `value` ve `onChange` prop'larını al — kontrollü bileşen
    - Mevcut Tailwind/border/card tasarım sistemine uy
    - _Requirements: 11.1, 12.2_

  - [ ] 4.2 `ChartSection` wrapper bileşenini yaz
    - `components/monitoring/ChartSection.tsx` olarak oluştur
    - Prop'lar: `title`, `subtitle?`, `children`, `isLoading`, `isError`, `onRetry`
    - `isLoading` → animasyonlu iskelet (mevcut `PageSkeleton` paterniyle tutarlı)
    - `isError` → hata mesajı + Retry butonu (sadece bu bölümü etkiler, diğerleri çalışmaya devam eder)
    - Kart stili: `rounded-lg border border-border bg-card p-5`
    - _Requirements: 11.5, 12.2_

  - [ ] 4.3 CPU grafik bileşenlerini yaz
    - `components/monitoring/CpuCharts.tsx` oluştur
    - `rate(node_cpu_seconds_total{mode!="idle"}[{step}s])` ile toplam CPU LineChart
    - `rate(node_cpu_seconds_total{mode!="idle"}[{step}s]) by (cpu)` ile per-core yığılı AreaChart
    - `rate(node_cpu_seconds_total{mode="iowait"}[{step}s])` ve `mode="steal"` için LineChart
    - Tüm renkler CSS değişkenlerinden: `hsl(var(--primary))`, `hsl(var(--chart-2))` vb.
    - `useQueryRange` hook'unu kullan, `parseRangeData` ile dönüştür
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 4.4 Bellek grafik bileşenini yaz
    - `components/monitoring/MemoryChart.tsx` oluştur
    - Sorgular:
      - Used: `node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes`
      - Cached: `node_memory_Cached_bytes`
      - Buffers: `node_memory_Buffers_bytes`
      - Swap: `node_memory_SwapTotal_bytes - node_memory_SwapFree_bytes`
    - Yığılı AreaChart, Y ekseni MiB cinsinden
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 4.5 Disk I/O grafik bileşenlerini yaz
    - `components/monitoring/DiskCharts.tsx` oluştur
    - IOPS LineChart: `rate(node_disk_reads_completed_total[{step}s])` + `rate(node_disk_writes_completed_total[{step}s])`
    - Throughput LineChart: `rate(node_disk_read_bytes_total[{step}s]) / 1024 / 1024` (MB/s) + write
    - Her iki grafik ayrı `ChartSection` içinde
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 4.6 Ağ grafik bileşenlerini yaz
    - `components/monitoring/NetworkCharts.tsx` oluştur
    - Throughput LineChart: `rate(node_network_receive_bytes_total[{step}s]) / 1024` ve `transmit`, `device!="lo"` filtresiyle
    - Hata/drop LineChart: `rate(node_network_receive_drop_total[{step}s])` + `receive_errs_total` + `transmit_drop_total` + `transmit_errs_total`
    - Loopback (`lo`) arayüzü hariç tutulur
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 4.7 Systemd grafik bileşenlerini yaz
    - `components/monitoring/SystemdCharts.tsx` oluştur
    - Top-10 restart BarChart: anlık sorgu `topk(10, node_systemd_unit_tasks_current)` — not: restart count için `systemd_unit_start_time_seconds` ile son n saatteki fark kullanılır
    - Uptime tablosu: `systemd_unit_start_time_seconds{state="active"}` ile hesaplanan uptime süresi, azalan sırada
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 4.8 Termal grafik bileşenini yaz
    - `components/monitoring/ThermalChart.tsx` oluştur
    - `node_thermal_zone_temp` sorgusundan tüm thermal zone'ları LineChart'ta göster
    - Y ekseni °C cinsinden
    - 90°C eşiği için kesik çizgili referans çizgisi ekle (`ReferenceLine`)
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 4.9 Anlık metrik kartlarını (StatCardRow) yaz
    - `components/monitoring/StatCardRow.tsx` oluştur
    - Mevcut `useMetrics()` hook'unu kullan (5s refetch — değişiklik yok)
    - CPU kartı: `classifyThreshold()` ile renk sınıflandırması (mevcut `page.tsx`'deki gibi)
    - Bellek kartı: used/total + swap
    - Disk I/O kartı: procfs'tan tüm disk toplamı rx+tx kBps
    - Ağ kartı: tüm interface toplamı rx+tx kBps
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ] 4.10 `app/monitoring/page.tsx`'i yeniden yaz
    - Mevcut iframe içeriğini tamamen kaldır
    - Sayfa düzeni:
      ```
      <StatCardRow />
      <TimeRangeSelector value={range} onChange={setRange} />
      <ChartSection title="CPU"> <CpuCharts timeRange={range} /> </ChartSection>
      <ChartSection title="Bellek"> <MemoryChart timeRange={range} /> </ChartSection>
      <ChartSection title="Disk I/O"> <DiskCharts timeRange={range} /> </ChartSection>
      <ChartSection title="Ağ"> <NetworkCharts timeRange={range} /> </ChartSection>
      <ChartSection title="Systemd"> <SystemdCharts timeRange={range} /> </ChartSection>
      <ChartSection title="Termal"> <ThermalChart timeRange={range} /> </ChartSection>
      ```
    - Sayfa başlığı: "Monitoring", alt metin: "System metrics via Prometheus"
    - `"use client"` yönergesi korunur
    - _Requirements: 4.1, 11.1, 11.2, 12.1, 12.2_

- [ ] 5. Testler
  - [ ] 5.1 `lib/prometheus.test.ts` — birim + özellik tabanlı testler
    - `parseRangeData` için PBT: `fc.array(fc.tuple(fc.integer(), fc.oneof(fc.float(), fc.constant("NaN"))))` girdisiyle, çıktıda `isFinite(v)` her zaman true olmalı (Property 1)
    - `deriveStep` için PBT: aynı TimeRange girdisi iki kez çağrılınca aynı değer döner (Property 2)
    - `mergeSeriesForRecharts` için tablo tabanlı testler
    - _Requirements: 12.3_

  - [ ] 5.2 `hooks/usePrometheusQuery.test.ts` — birim testler
    - `deriveStep("15m") === 15`, `"1h" === 60`, `"6h" === 300`, `"24h" === 900`
    - _Requirements: 11.3_

  - [ ] 5.3 `internal/api/prometheus_proxy_test.go` — Go birim testler
    - `isQueryAllowed` tablo tabanlı testler: izin verilen ve reddedilen önekler
    - `validateTimeRange` testleri: geçerli ve geçersiz aralıklar
    - Mock HTTP sunucusuyla proxy round-trip testi: yanıt gövdesi byte-for-byte aynı mı? (Property 5)
    - Timeout davranışı: 11 saniyelik mock sunucu → HTTP 504
    - `PANEL_PROMETHEUS_WIDGET=0` → rota kayıtlı değil doğrulaması
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 14.1, 14.2, 3.4_

  - [ ] 5.4 PBT testleri — Go (`pgregory.net/rapid`)
    - Property 3: izin verilen öneklerle oluşturulan tüm sorgular `isQueryAllowed` tarafından kabul edilmeli
    - Property 4: `validateTimeRange` için rastgele (start, diff) çiftleriyle — diff ≤2_592_000 kabul, diff >2_592_000 ret
    - Property 6: eş zamanlı N istek, birinin hata alması diğerlerini etkilememeli (goroutine fan-out testi)
    - _Requirements: 13.2, 13.3, 14.3_

- [ ] 6. Final checkpoint
  - [ ] 6.1 Tüm testler geçmeli
    - `go test ./...` — Go agent testleri
    - `pnpm test` — TypeScript testleri
    - _Requirements: tüm_

  - [ ] 6.2 Linting ve format doğrulama
    - `./scripts/validate.sh L7V` — nixfmt + statix + deadnix + shellcheck + flake check
    - `pnpm lint` ve `pnpm typecheck` — TypeScript hata yok
    - _Requirements: tüm_

  - [ ] 6.3 Nix snapshot doğrulama
    - `nix eval .#nixosConfigurations.L7V.config.services.grafana.enable` → `false`
    - `nix eval .#nixosConfigurations.L7V.config.services.prometheus.enable` → `true`
    - `nix eval .#nixosConfigurations.server.config.services.grafana` — server Grafana konfigürasyonu bozulmamış
    - _Requirements: 1.4, 2.2_

## Notes

- `modules/services/grafana/default.nix` server-mode blokları (`commonConfig`, `serverConfig`) hiç dokunulmaz; sadece localMode kaldırılır
- Node exporter'ın `thermal_zone` collector'ı zaten `metrics/default.nix`'te aktif — ekstra Nix değişikliği gerekmez
- `panel_agent_requests_total` Prometheus metriği mevcut; `/api/v1/metrics/query` endpointleri bu counter'a otomatik katkı sağlar (middleware sayesinde)
- Disk I/O metrikleri procfs snapshot'ta yoktur (`/api/v1/metrics` sadece kullanım yüzdesi verir); time-series bölümü için her zaman Prometheus kullanılır
- PBT testleri `fast-check` ile yazılır (TypeScript) ve `pgregory.net/rapid` ile yazılır (Go) — her ikisi de zaten mevcut bağımlılıklardır

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["1.5"] },
    { "id": 2, "tasks": ["2.1", "2.2", "3.1", "3.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "3.3"] },
    { "id": 4, "tasks": ["2.5"] },
    { "id": 5, "tasks": ["4.1", "4.2", "4.9"] },
    { "id": 6, "tasks": ["4.3", "4.4", "4.5", "4.6", "4.7", "4.8"] },
    { "id": 7, "tasks": ["4.10"] },
    { "id": 8, "tasks": ["5.1", "5.2", "5.3", "5.4"] },
    { "id": 9, "tasks": ["6.1", "6.2", "6.3"] }
  ]
}
```
