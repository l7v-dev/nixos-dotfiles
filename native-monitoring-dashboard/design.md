# Tasarım Dokümanı — Yerel İzleme Paneli

## Overview

Bu özellik, laptop iş istasyonundaki (L7V) `/monitoring` sayfasını Grafana iframe embed'inden Recharts tabanlı, yerel bir izleme paneline dönüştürür. Grafana yerel modu kaldırılır; yerine Go ajanına eklenen bir Prometheus proxy uç noktası ve bu uç noktayı sorgulayan React bileşenleri hayata geçirilir.

### Motivasyon

Mevcut `/monitoring` sayfası, `localhost:3001`'de çalışan Grafana'yı bir `<iframe>` içinde göstermektedir. Bu yapının getirdiği sorunlar:

- Grafana yerel modu için ekstra bir NixOS servisi çalıştırma zorunluluğu.
- İframe embed güvenlik kısıtlamaları nedeniyle kimlik doğrulama ve erişim yönetiminin karmaşıklaşması.
- Panel tasarım sistemi (Tailwind, CSS değişkenleri, kart stili) ile Grafana görsel dilinin uyumsuzluğu.
- Veri görselleştirme üzerinde kontrol eksikliği — hangi grafiklerin gösterileceği Grafana konfigürasyonuna bağımlıdır.

### Hedef Durum

```
┌─────────────────────────────────────────────────┐
│  /monitoring  (Next.js)                         │
│                                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│  │ CPU  │ │ RAM  │ │Disk  │ │  Ağ  │  ← anlık  │
│  └──────┘ └──────┘ └──────┘ └──────┘           │
│                                                 │
│  [ 15m | 1s | 6s | 24s ]  ← zaman seçici       │
│                                                 │
│  ┌─── CPU Grafikleri ──────────────────────┐   │
│  │  LineChart (toplam) + AreaChart (core)  │   │
│  └─────────────────────────────────────────┘   │
│  ┌─── Bellek ─────────────────────────────┐   │
│  │  AreaChart (used/cached/buffers/swap)   │   │
│  └─────────────────────────────────────────┘   │
│  ... Disk I/O, Ağ, Systemd, Termal ...         │
└─────────────────────────────────────────────────┘
         ↑ fetchAgent()  ↑ fetchAgent()
    /api/v1/metrics   /api/v1/metrics/query_range
         ↑                    ↑
    procfs (5s)         Prometheus proxy (60s)
                             ↓
                     localhost:9090
```

---

## Architecture

### İki Katmanlı Veri Modeli

| Katman | Kaynak | Endpoint | Güncelleme Aralığı | Kullanım Amacı |
|--------|--------|----------|--------------------|----------------|
| Anlık | procfs | `GET /api/v1/metrics` | 5 saniye | Stat kartları (CPU%, RAM, Disk I/O, Ağ) |
| Zaman Serisi | Prometheus | `GET /api/v1/metrics/query_range` | 60 saniye | Recharts grafikleri |

Bu iki katmanlı tasarım, stat kartları için düşük gecikme (procfs doğrudan okunur) ile grafikler için zengin geçmiş veriyi (Prometheus TSDB) birleştirir. Her iki veri kaynağı da mevcut `fetchAgent()` istemcisi üzerinden erişilir; frontend için tek bir API yüzey alanı sunulur.

### Veri Akışı

```
┌─────────────────────────────────────────────────────┐
│                  Next.js Frontend                   │
│                                                     │
│  useMetrics()          useQueryRange() / useInstant │
│  (refetchInterval:5s)  (refetchInterval:60s)        │
│       │                        │                    │
│  fetchAgent(host,              fetchAgent(host,      │
│  "/api/v1/metrics")   "/api/v1/metrics/query_range")│
└──────────┬─────────────────────┬───────────────────┘
           │                     │
           ▼                     ▼
┌──────────────────┐   ┌──────────────────────────┐
│  Go Ajanı        │   │  Go Ajanı                │
│  metricsHandler  │   │  prometheusProxyHandler  │
│  (procfs okur)   │   │  (PANEL_PROMETHEUS_WIDGET│
│                  │   │   env var ile koşullu)   │
└──────────────────┘   └────────────┬─────────────┘
                                    │ http GET (10s timeout)
                                    ▼
                          ┌──────────────────┐
                          │  Prometheus       │
                          │  localhost:9090   │
                          │  (30d retention)  │
                          └──────────────────┘
```

### NixOS Konfigürasyon Değişiklikleri

```
hosts/laptop/default.nix
  - l7v.services.grafana { enable, localMode } KALDIRILDI
  + l7v.metrics.enable = true
  + l7v.services.panel.agent.prometheusWidget = true

modules/services/grafana/default.nix
  - localConfig bloğu KALDIRILDI
  - localMode seçeneği KALDIRILDI
  - adminPassword seçeneği KALDIRILDI
  (serverConfig ve commonConfig korunur)

panel/nix/module.nix
  - locations."/grafana/" bloğu KALDIRILDI
  (diğer tüm nginx location'lar korunur)
```

---

## Components and Interfaces

### Go Ajanı — Yeni Dosya: `internal/api/prometheus_proxy.go`

```go
// prometheusProxyHandler: hem query hem query_range için tek handler.
// Yalnızca PANEL_PROMETHEUS_WIDGET=1 ise router'a kaydedilir.
func prometheusProxyHandler(prometheusBase string) http.HandlerFunc
```

Handler sorumlulukları (sırasıyla):

1. `query` parametresini doğrula (boş değil, ≤4096 karakter).
2. Allowlist doğrulaması (`node_`, `systemd_`, `go_`, `process_` önekleri).
3. `start` / `end` parametrelerini doğrula (geçerli Unix timestamp, fark ≤30 gün). Yalnızca `query_range` için.
4. 10 saniyelik `http.Client` timeout ile `http://localhost:9090/api/v1/{query|query_range}` adresine GET isteği at.
5. Prometheus yanıtını — `Content-Type` dahil — byte-for-byte istemciye aktar (`io.Copy`).

**`router.go` değişikliği:**

```go
// Deps yapısına PrometheusWidget bool alanı eklenir.
// NewRouter() içinde koşullu kayıt:
if d.PrometheusWidget {
    mux.Handle("GET /api/v1/metrics/query",       prometheusProxyHandler("query"))
    mux.Handle("GET /api/v1/metrics/query_range", prometheusProxyHandler("query_range"))
    d.Logger.Info("prometheus proxy enabled",
        "endpoints", []string{"/api/v1/metrics/query", "/api/v1/metrics/query_range"})
} else {
    d.Logger.Info("prometheus proxy disabled (PANEL_PROMETHEUS_WIDGET != 1)")
}
```

**`Deps` yapısına eklenen alan:**

```go
type Deps struct {
    // ... mevcut alanlar ...
    PrometheusWidget bool   // PANEL_PROMETHEUS_WIDGET=1 ise true
}
```

### Frontend — Yeni Hook: `hooks/usePrometheusQuery.ts`

```typescript
// Zaman aralığından otomatik step hesaplama
export type TimeRange = "15m" | "1h" | "6h" | "24h";

export function deriveStep(range: TimeRange): number  // saf fonksiyon

export function useQueryRange(
    query: string,
    timeRange: TimeRange,
    options?: { enabled?: boolean }
): UseQueryResult<PrometheusRangeResult>

export function useInstantQuery(
    query: string,
    options?: { enabled?: boolean }
): UseQueryResult<PrometheusInstantResult>
```

`useQueryRange` iç yapısı:

```typescript
const step = deriveStep(timeRange);
const now = Math.floor(Date.now() / 1000);
const start = now - TIME_RANGE_SECONDS[timeRange];

return useQuery({
    queryKey: ["prometheus-range", host, query, timeRange],
    queryFn: () => fetchAgent<PrometheusRangeResult>(host,
        `/api/v1/metrics/query_range?query=${encodeURIComponent(query)}&start=${start}&end=${now}&step=${step}`
    ),
    refetchInterval: 60_000,
    staleTime: 55_000,
});
```

**Step türetme tablosu:**

| TimeRange | Saniye | Step |
|-----------|--------|------|
| `"15m"` | 900 | 15s |
| `"1h"` | 3600 | 60s |
| `"6h"` | 21600 | 300s |
| `"24h"` | 86400 | 900s |

### Frontend — Yeni Tipler: `types/prometheus.ts`

```typescript
export interface PrometheusMetric {
    [key: string]: string;
    __name__: string;
}

export interface PrometheusSeries {
    metric: PrometheusMetric;
    values: [number, string][];   // [unix_timestamp, "value_string"]
}

export interface PrometheusMatrix {
    resultType: "matrix";
    result: PrometheusSeries[];
}

export interface PrometheusVector {
    resultType: "vector";
    result: Array<{
        metric: PrometheusMetric;
        value: [number, string];
    }>;
}

export interface PrometheusRangeResult {
    status: "success" | "error";
    data: PrometheusMatrix;
    error?: string;
}

export interface PrometheusInstantResult {
    status: "success" | "error";
    data: PrometheusVector;
    error?: string;
}

// Recharts için dönüştürülmüş format
export interface ChartDataPoint {
    time: number;    // unix timestamp (ms)
    value: number;   // sonlu sayı, NaN içermez
    label?: string;  // grafik açıklaması için
}
```

### Frontend — Yeni Yardımcı: `lib/prometheus.ts`

```typescript
/**
 * Prometheus matrix sonucunu Recharts {time, value}[] formatına dönüştürür.
 * NaN veya sonsuz değerleri filtreler.
 *
 * Feature: native-monitoring-dashboard
 * Property 1: parseRangeData çıktısında NaN değer bulunmamalıdır.
 */
export function parseRangeData(series: PrometheusSeries): ChartDataPoint[] {
    return series.values
        .map(([ts, val]) => ({ time: ts * 1000, value: parseFloat(val) }))
        .filter(({ value }) => isFinite(value));
}

/**
 * Birden fazla seriyi tek bir Recharts veri dizisine birleştirir.
 * Her seri için ayrı bir key oluşturur.
 */
export function mergeSeriesForRecharts(
    result: PrometheusMatrix,
    labelKey: string = "__name__"
): Record<string, number>[] { ... }
```

### Frontend — Yeniden Yazılan: `app/monitoring/page.tsx`

Sayfa yapısı:

```
MonitoringPage
├── StatCardRow (anlık metrikler, 5s yenileme)
│   ├── StatCard (CPU)
│   ├── StatCard (Bellek)
│   ├── StatCard (Disk I/O)
│   └── StatCard (Ağ)
├── TimeRangeSelector (useState, 15m/1h/6h/24h)
├── ChartSection (CPU)
│   ├── <Suspense> → ChartSkeleton
│   ├── LineChart (toplam CPU kullanımı)
│   └── AreaChart (çekirdek başına yığılı)
├── ChartSection (Bellek)
│   └── AreaChart (used/cached/buffers/swap yığılı)
├── ChartSection (Disk I/O)
│   ├── LineChart (IOPS: okuma/yazma)
│   └── LineChart (iş hacmi MB/s)
├── ChartSection (Ağ)
│   ├── LineChart (arayüz başına rx/tx kBps)
│   └── LineChart (düşmeler + hatalar)
├── ChartSection (Systemd)
│   ├── BarChart (top-10 yeniden başlatma)
│   └── Tablo (servis uptime sıralaması)
└── ChartSection (Termal)
    └── LineChart (°C / termal bölge başına)
```

Her `ChartSection` bileşeni bağımsız bir hata sınırı (`ErrorBoundary`) içerir; böylece tek bir grafiğin hatalı olması diğerlerini etkilemez.

---

## Data Models

### Go Ajanı — `Deps` Yapısı Güncellemesi

`router.go` içindeki `Deps` yapısına yeni alan eklenir:

```go
type Deps struct {
    Systemd          dbus.SystemdClient
    Logind           dbus.LogindClient
    Network          dbus.NetworkClient
    Bluetooth        dbus.BluetoothClient
    Procfs           metrics.ProcfsReader
    Journal          journal.Reader
    Logger           *slog.Logger
    Version          string
    Thresholds       metrics.Thresholds
    WoLHosts         map[string]string
    PrometheusWidget bool   // YENİ: PANEL_PROMETHEUS_WIDGET=1 ise true
}
```

`main.go` içinde mevcut env var okuma bloğuna ekleme:

```go
prometheusWidget := os.Getenv("PANEL_PROMETHEUS_WIDGET") == "1"
```

### Prometheus Proxy — Allowlist Mantığı

```go
var allowedPrefixes = []string{
    "node_",
    "systemd_",
    "go_",
    "process_",
}

// isQueryAllowed, PromQL sorgusunda yalnızca izin verilen
// metrik öneklerinin kullanılıp kullanılmadığını kontrol eder.
// Karmaşık PromQL ifadelerinde tüm metrik isimlerini tarar.
func isQueryAllowed(query string) bool
```

### Zaman Aralığı — Sabitler

```typescript
// hooks/usePrometheusQuery.ts
const TIME_RANGE_SECONDS: Record<TimeRange, number> = {
    "15m": 900,
    "1h":  3600,
    "6h":  21600,
    "24h": 86400,
};

const STEP_SECONDS: Record<TimeRange, number> = {
    "15m": 15,
    "1h":  60,
    "6h":  300,
    "24h": 900,
};

// Saf fonksiyon — aynı girdi her zaman aynı çıktıyı üretir.
export function deriveStep(range: TimeRange): number {
    return STEP_SECONDS[range];
}
```

### NixOS — `module.nix` Ortam Değişkeni (Mevcut)

`PANEL_PROMETHEUS_WIDGET` env var zaten `module.nix`'te tanımlıdır:

```nix
"PANEL_PROMETHEUS_WIDGET=${if agentCfg.prometheusWidget then "1" else "0"}"
```

---

## Correctness Properties

*Bir özellik, sistemin tüm geçerli çalışmalarında geçerli olması gereken bir karakteristik veya davranıştır; özünde, sistemin ne yapması gerektiğine dair biçimsel bir ifadedir. Özellikler, insan tarafından okunabilir spesifikasyonlar ile makine tarafından doğrulanabilir doğruluk güvenceleri arasında köprü işlevi görür.*

### Property 1: `parseRangeData` Çıktısında Sonluluk

*Her geçerli* Prometheus matrix girdisi için (`PrometheusSeries`), `parseRangeData()` fonksiyonu yalnızca sonlu (finite) sayısal değerler içeren `ChartDataPoint[]` dizisi üretmelidir; NaN veya Infinity değerleri içermemelidir.

**Validates: Requirements 12.3** (Recharts CSS değişkenleriyle doğru render — NaN değerler grafikleri bozar)

### Property 2: `deriveStep` Deterministliği

*Her geçerli* `TimeRange` girdisi (`"15m" | "1h" | "6h" | "24h"`) için `deriveStep()` fonksiyonu belirlenmiş adım değerini deterministik biçimde döndürmelidir: 15m→15, 1h→60, 6h→300, 24h→900. Aynı girdi her çağrıda aynı çıktıyı üretmelidir.

**Validates: Requirements 11.3**

### Property 3: Allowlist Validasyonu — Yanlış Negatif/Pozitif Yok

*Her geçerli* PromQL sorgu dizesi için `isQueryAllowed()` fonksiyonu şu iki koşulu birlikte sağlamalıdır:
(a) `node_`, `systemd_`, `go_`, `process_` öneklerinden biriyle başlayan tüm metrik isimlerini kabul etmelidir (yanlış negatif yok).
(b) Bu öneklerin dışındaki tüm metrik isimlerini reddetmelidir (yanlış pozitif yok).

**Validates: Requirements 13.2**

### Property 4: Zaman Aralığı Validasyonu

*Her (start, end) çifti* için aralık doğrulayıcı şu iki koşulu sağlamalıdır:
(a) `end - start ≤ 2_592_000` (30 gün) olan geçerli Unix timestamp çiftlerini kabul etmelidir.
(b) `end - start > 2_592_000` olan çiftleri reddetmelidir (HTTP 400).

**Validates: Requirements 13.3**

### Property 5: Proxy Round-Trip — İçerik Bütünlüğü

*Her geçerli PromQL parametre kombinasyonu* (`query`, `start`, `end`, `step`) için Prometheus_Proxy, Prometheus'tan aldığı JSON yanıt gövdesini **byte-for-byte değişiklik yapmadan** ve `Content-Type` başlığını **aynen koruyarak** istemciye iletmelidir.

**Validates: Requirements 14.1, 14.2, 3.6**

### Property 6: Eş Zamanlı İsteklerin Bağımsızlığı

*Her N eş zamanlı istek kümesi* için Prometheus_Proxy, her isteği bağımsız olarak işlemelidir; bir isteğin hata durumu (Prometheus bağlantısı başarısız, timeout) diğer eş zamanlı isteklerin yanıtını etkilememelidir.

**Validates: Requirements 14.3**

---

## Error Handling

### Go Ajanı — Prometheus Proxy Hata Kodları

| Durum | HTTP Kodu | JSON Yanıt |
|-------|-----------|------------|
| `query` boş veya >4096 karakter | 400 | `{"message": "query: boş veya çok uzun (max 4096)"}` |
| Allowlist dışı metrik öneki | 403 | `{"message": "query: izin verilmeyen metrik öneki"}` |
| Geçersiz `start`/`end` | 400 | `{"message": "start/end: geçersiz unix timestamp"}` |
| Aralık >30 gün | 400 | `{"message": "zaman aralığı maksimum 30 günü geçemez"}` |
| Prometheus erişilemez (bağlantı hatası) | 502 | `{"message": "prometheus erişilemez: <hata detayı>"}` |
| Prometheus isteği timeout | 504 | `{"message": "prometheus isteği zaman aşımına uğradı"}` |
| `PANEL_PROMETHEUS_WIDGET` kapalı | 404 | `{"message": "not found"}` (catch-all'dan gelir) |

### Frontend — Hata Sınırları

Her `ChartSection` bileşeni ayrı bir React `ErrorBoundary` ile sarılır:

```typescript
// Her grafik bölümü için ayrı hata durumu:
// - isError → kırmızı kenarlıklı hata kutusu (retry butonu ile)
// - isLoading → animasyonlu iskelet ekranı
// - !data → yükleme tamamlandı ama veri boş → "Veri yok" mesajı
```

Anlık metrik kartları da bağımsız hata yönetimi uygular: `/api/v1/metrics` başarısız olursa kartlar hata durumu gösterir; zaman serisi grafikleri etkilenmez.

### Frontend — Yeniden Deneme Stratejisi

TanStack Query varsayılan yeniden deneme davranışı korunur:
- 3 başarısız denemeden sonra sorgu `error` durumuna geçer.
- `refetchInterval` hata durumunda duraklar; kullanıcı `Retry` butonuna basarsa veya sekme yeniden odaklanırsa yeniden başlar.

---

## Testing Strategy

### Birim Testler

**Go (`pgregory.net/rapid` kütüphanesi):**

- `prometheus_proxy_test.go`: mock HTTP sunucusuyla doğrulama mantığı.
- Geçerli ve geçersiz query örnekleri için tablo tabanlı testler.
- Timeout davranışı (kasıtlı yavaş mock sunucu).

**TypeScript (`fast-check` kütüphanesi — zaten `package.json`'da):**

- `lib/prometheus.test.ts`: `parseRangeData()` ve `mergeSeriesForRecharts()` fonksiyonları.
- `hooks/usePrometheusQuery.test.ts`: `deriveStep()` fonksiyonu.
- Component testleri: `@testing-library/react` ile stat kartları ve zaman aralığı seçici.

### Özellik Tabanlı Testler (Property-Based Testing)

**TypeScript — `fast-check` ile:**

```typescript
// Feature: native-monitoring-dashboard, Property 1: parseRangeData sonluluk
it("parseRangeData çıktısında NaN bulunmamalıdır", () => {
    fc.assert(fc.property(
        arbitraryPrometheusSeries(),
        (series) => {
            const result = parseRangeData(series);
            return result.every(({ value }) => isFinite(value));
        }
    ), { numRuns: 100 });
});

// Feature: native-monitoring-dashboard, Property 2: deriveStep deterministliği
it("deriveStep aynı girdi için her zaman aynı çıktıyı üretmelidir", () => {
    fc.assert(fc.property(
        fc.constantFrom("15m", "1h", "6h", "24h" as const),
        (range) => deriveStep(range) === deriveStep(range)
    ), { numRuns: 100 });
});
```

**Go — `pgregory.net/rapid` ile:**

```go
// Feature: native-monitoring-dashboard, Property 3: Allowlist validasyonu
func TestProperty3_AllowlistValidation(t *testing.T) {
    rapid.Check(t, func(tc *rapid.T) {
        prefix := rapid.SampledFrom(allowedPrefixes).Draw(tc, "prefix")
        suffix := rapid.StringN(1, 64, -1).Draw(tc, "suffix")
        query := prefix + suffix
        // İzin verilen önek → kabul edilmeli
        if !isQueryAllowed(query) {
            tc.Fatalf("allowlist'teki %q öneki reddedildi", prefix)
        }
    })
}

// Feature: native-monitoring-dashboard, Property 4: Zaman aralığı validasyonu
func TestProperty4_TimeRangeValidation(t *testing.T) {
    rapid.Check(t, func(tc *rapid.T) {
        start := rapid.Int64Range(0, 9_999_999_999).Draw(tc, "start")
        diff := rapid.Int64Range(1, 4_000_000).Draw(tc, "diff")
        end := start + diff
        valid := diff <= 2_592_000
        err := validateTimeRange(start, end)
        if valid && err != nil {
            tc.Fatalf("geçerli aralık reddedildi: diff=%d", diff)
        }
        if !valid && err == nil {
            tc.Fatalf("30 günü aşan aralık kabul edildi: diff=%d", diff)
        }
    })
}

// Feature: native-monitoring-dashboard, Property 5: Proxy round-trip
func TestProperty5_ProxyRoundTrip(t *testing.T) {
    rapid.Check(t, func(tc *rapid.T) {
        body := rapid.SliceOf(rapid.Byte()).Draw(tc, "body")
        contentType := rapid.SampledFrom([]string{
            "application/json",
            "text/plain",
            "application/x-protobuf",
        }).Draw(tc, "ct")
        // Mock Prometheus sunucusu bu gövde ve content-type ile yanıt verir.
        // Proxy'nin byte-for-byte aynı gövdeyi ilettiğini doğrula.
        ...
    })
}
```

### Entegrasyon Testleri

- Prometheus localhost:9090'da gerçekten çalıştığında proxy uç noktasının 200 döndürdüğünü doğrulayan NixOS VM testi (isteğe bağlı).
- `nix flake check --no-build` ile Nix modülü derleme bütünlüğü.

### Tasarım Uyum Testleri

- `recharts`, `lucide-react`, `@tanstack/react-query` dışında yeni bağımlılık eklenmediğini `package.json` okuyarak doğrula.
- CSS değişkeni kullanımı: sabit hex renk kodu bulunmadığını kontrol et (lint kuralı).
