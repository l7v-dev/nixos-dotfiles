# Gereksinimler Dokümanı

## Giriş

Bu özellik, laptop iş istasyonunda (L7V) çalışan Grafana iframe embed'ini kaldırır ve yerine Recharts tabanlı, yerel bir izleme paneli sunar. İki katmanlı bir mimariye dayanır: anlık metrikler için mevcut `GET /api/v1/metrics` procfs uç noktası 5 saniyede bir sorgulanırken, zaman serisi grafikleri için Go ajanına eklenen yeni bir Prometheus proxy uç noktası (`GET /api/v1/metrics/query` ve `GET /api/v1/metrics/query_range`) kullanılır. NixOS tarafında Grafana yerel modu kaldırılır, Prometheus laptop'ta etkinleştirilir ve `panel.agent.prometheusWidget = true` seçeneği aktif hale getirilir.

## Sözlük

- **Go_Ajanı**: `panel/apps/agent` dizinindeki Go backend servisi; REST/SSE API'yi sunar.
- **Prometheus_Proxy**: Go_Ajanı içindeki `/api/v1/metrics/query` ve `/api/v1/metrics/query_range` uç noktaları; PromQL sorgularını `localhost:9090`'a yönlendirir.
- **İzleme_Sayfası**: Next.js frontend'deki `/monitoring` route'u; Recharts bileşenlerini barındırır.
- **Anlık_Metrik_Kartları**: 5 saniyede bir güncellenen, CPU/RAM/Disk I/O/Ağ özetlerini gösteren kartlar.
- **Zaman_Serisi_Grafiği**: Prometheus verisiyle belirli bir zaman aralığını gösteren Recharts grafikleri.
- **Zaman_Aralığı_Seçici**: Kullanıcının 15 dakika, 1 saat, 6 saat veya 24 saatlik pencere seçebildiği kontrol.
- **Node_Exporter**: Prometheus node exporter; CPU, bellek, disk, ağ ve termal metrikleri üretir (port 9100).
- **Systemd_Exporter**: Prometheus systemd exporter; servis uptime ve yeniden başlatma sayısını üretir (port 9558).
- **PANEL_PROMETHEUS_WIDGET**: Go_Ajanı'nda Prometheus_Proxy'yi aktif eden ortam değişkeni (`1` = etkin).
- **fetchAgent**: Frontend'deki mevcut HTTP istemci yardımcısı; tüm ajan çağrıları bu fonksiyon üzerinden yapılır.

---

## Gereksinimler

### Gereksinim 1: Grafana Yerel Modunun Kaldırılması

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, Grafana yerel modunun laptop konfigürasyonundan çıkarılmasını istiyorum; böylece gereksiz bir servis arka planda çalışmayacak ve `/monitoring` sayfası artık Grafana iframe'ine bağımlı olmayacak.

#### Kabul Kriterleri

1. THE NixOS_Konfigürasyonu SHALL `hosts/laptop/default.nix` dosyasındaki `l7v.services.grafana` bloğunu içermeyecek şekilde güncellenmiş olmalıdır.
2. THE NixOS_Konfigürasyonu SHALL `modules/services/grafana/default.nix` dosyasındaki `localConfig` bloğunu ve `localMode` seçeneğini kaldırmalıdır; server modu blokları bu dosyada korunur.
3. THE NixOS_Konfigürasyonu SHALL `panel/nix/module.nix` dosyasındaki Grafana embed proxy bloğunu (`/grafana/` location) `frontendCfg.enable` dalından silmelidir.
4. IF Grafana yerel modu kaldırıldıktan sonra `nix flake check --no-build` çalıştırılırsa, THEN THE NixOS_Konfigürasyonu SHALL herhangi bir derleme hatası üretmemelidir.

---

### Gereksinim 2: Laptop'ta Prometheus Etkinleştirme

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, laptop iş istasyonunda Prometheus ve ilgili exporters'ları etkinleştirmek istiyorum; böylece zaman serisi metrikleri yerel olarak depolanacak ve İzleme_Sayfası'ndan sorgulanabilecek.

#### Kabul Kriterleri

1. THE NixOS_Konfigürasyonu SHALL `hosts/laptop/default.nix` dosyasında `l7v.metrics.enable = true` seçeneğini içermelidir.
2. WHEN `l7v.metrics.enable = true` ayarlandığında, THE Prometheus SHALL `localhost:9090`'da çalışmalı, Node_Exporter port 9100'de ve Systemd_Exporter port 9558'de hizmet vermelidir.
3. THE Prometheus SHALL metrikleri en az 30 gün boyunca saklayacak şekilde yapılandırılmalıdır.
4. THE NixOS_Konfigürasyonu SHALL `modules/capabilities/metrics/default.nix` dosyasındaki mevcut exporter listesine (node, systemd) laptop için ek bir exporter eklemeden kullanmalıdır.
5. THE NixOS_Konfigürasyonu SHALL `l7v.services.panel.agent.prometheusWidget = true` seçeneğini `hosts/laptop/default.nix` dosyasında etkinleştirmelidir.

---

### Gereksinim 3: Go Ajanına Prometheus Proxy Uç Noktasının Eklenmesi

**Kullanıcı Hikayesi:** Bir frontend geliştiricisi olarak, Go_Ajanı üzerinden PromQL sorguları çalıştırmak istiyorum; böylece İzleme_Sayfası doğrudan Prometheus'a bağlanmak yerine mevcut `fetchAgent()` altyapısını kullanabilecek.

#### Kabul Kriterleri

1. WHEN `PANEL_PROMETHEUS_WIDGET=1` ortam değişkeni ayarlandığında, THE Go_Ajanı SHALL `GET /api/v1/metrics/query` uç noktasını kaydetmelidir.
2. WHEN `PANEL_PROMETHEUS_WIDGET=1` ortam değişkeni ayarlandığında, THE Go_Ajanı SHALL `GET /api/v1/metrics/query_range` uç noktasını kaydetmelidir.
3. THE Prometheus_Proxy SHALL `query`, `start`, `end` ve `step` sorgu parametrelerini `http://localhost:9090/api/v1/query` ve `http://localhost:9090/api/v1/query_range` adreslerine iletmelidir.
4. IF `PANEL_PROMETHEUS_WIDGET=0` veya tanımsız olduğunda, THEN THE Go_Ajanı SHALL bu uç noktalara yapılan isteklere HTTP 404 yanıtı döndürmelidir.
5. WHEN Prometheus `localhost:9090`'da erişilemez durumdayken bir sorgu alındığında, THE Prometheus_Proxy SHALL HTTP 502 hata kodu ve açıklayıcı mesaj içeren JSON yanıtı döndürmelidir.
6. THE Prometheus_Proxy SHALL Prometheus'tan gelen yanıtı değiştirmeksizin istemciye aktarmalıdır (content-type ve gövde aynen korunur).
7. THE Go_Ajanı SHALL Prometheus_Proxy uç noktalarının etkinleştirilip etkinleştirilmediğini başlangıç logunda belirtmelidir.

---

### Gereksinim 4: Anlık Metrik Kartları

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, `/monitoring` sayfasında anlık CPU, bellek, disk I/O ve ağ istatistiklerini görmek istiyorum; böylece sistemin mevcut durumu hakkında hızlı bilgi sahibi olabileceğim.

#### Kabul Kriterleri

1. THE İzleme_Sayfası SHALL dört Anlık_Metrik_Kartı içermelidir: CPU Kullanımı, Bellek (kullanılan/toplam + swap), Disk I/O (okuma+yazma iş hacmi), Ağ (rx+tx iş hacmi).
2. WHEN sayfa yüklendiğinde ve ardından her 5 saniyede bir, THE İzleme_Sayfası SHALL `GET /api/v1/metrics` uç noktasını sorgulayarak kartları güncellenmiş verilerle yenilenmelidir.
3. THE CPU_Kartı SHALL mevcut CPU kullanım yüzdesini göstermeli ve `classifyThreshold()` fonksiyonu aracılığıyla eşik renklemesini (yeşil/amber/kırmızı) uygulamalıdır.
4. THE Bellek_Kartı SHALL kullanılan MiB, toplam MiB ve swap kullanımını göstermeli ve bellek eşik değerleriyle renk sınıflandırması yapılmalıdır.
5. THE DiskIO_Kartı SHALL procfs anlık görüntüsünden elde edilen toplam okuma ve yazma iş hacmini (kB/s) göstermelidir.
6. THE Ağ_Kartı SHALL tüm arayüzlerin toplam rx ve tx değerlerini (kB/s) göstermelidir.
7. IF `/api/v1/metrics` uç noktasına bağlanılamazsa, THEN THE İzleme_Sayfası SHALL kartların yerinde hata durumu mesajı göstermeli ve arka planda yeniden denemeyi sürdürmelidir.

---

### Gereksinim 5: CPU Zaman Serisi Grafikleri

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, seçilen zaman aralığında CPU kullanımının zaman serisi grafiklerini görmek istiyorum; böylece yük örüntülerini ve darboğazları analiz edebileceğim.

#### Kabul Kriterleri

1. THE İzleme_Sayfası SHALL aşağıdaki CPU metriklerini Recharts grafikleri olarak sunmalıdır: toplam CPU kullanımı (%), çekirdek başına kullanım dağılımı (yığılı alan), I/O wait (%), steal (%).
2. WHEN Zaman_Aralığı_Seçici değiştirildiğinde, THE İzleme_Sayfası SHALL Prometheus_Proxy üzerinden güncel zaman aralığına karşılık gelen PromQL sorgularını çalıştırmalı ve grafikleri yenilemelidir.
3. THE CPU_Zaman_Serisi_Grafikleri SHALL Prometheus'tan `rate(node_cpu_seconds_total[step])` metriğini kullanmalıdır.
4. THE İzleme_Sayfası SHALL çekirdek başına kullanım grafiğini yığılı alan (stacked area) olarak çizmelidir.
5. WHILE Zaman_Serisi_Grafikleri yükleniyorken, THE İzleme_Sayfası SHALL grafik alanında yükleme iskelet ekranı göstermelidir.

---

### Gereksinim 6: Bellek Zaman Serisi Grafikleri

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, bellek kullanımının zaman içindeki seyrini — kullanılan, önbellek, tampon ve swap ayrımıyla — görmek istiyorum; böylece bellek baskısını tespit edebileceğim.

#### Kabul Kriterleri

1. THE İzleme_Sayfası SHALL aşağıdaki bellek metriklerini Recharts grafikleri olarak sunmalıdır: kullanılan bellek (MiB), önbellek (cached), tampon (buffers), swap kullanımı — yığılı alan grafiği olarak.
2. THE Bellek_Zaman_Serisi_Grafikleri SHALL Prometheus'tan `node_memory_*` metriklerini kullanmalıdır.
3. WHEN Zaman_Aralığı_Seçici değiştirildiğinde, THE İzleme_Sayfası SHALL bellek grafikleri için Prometheus_Proxy sorgularını yenilemelidir.

---

### Gereksinim 7: Disk I/O Zaman Serisi Grafikleri

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, disk okuma/yazma IOPS ve iş hacmini zaman içinde görmek istiyorum; böylece I/O darboğazlarını tespit edebileceğim.

#### Kabul Kriterleri

1. THE İzleme_Sayfası SHALL aşağıdaki disk I/O metriklerini Recharts grafikleri olarak sunmalıdır: okuma IOPS, yazma IOPS, okuma iş hacmi (MB/s), yazma iş hacmi (MB/s).
2. THE Disk_IO_Zaman_Serisi_Grafikleri SHALL Prometheus'tan `rate(node_disk_reads_completed_total[step])` ve `rate(node_disk_written_bytes_total[step])` metriklerini kullanmalıdır.
3. WHEN Zaman_Aralığı_Seçici değiştirildiğinde, THE İzleme_Sayfası SHALL disk I/O grafikleri için Prometheus_Proxy sorgularını yenilemelidir.

---

### Gereksinim 8: Ağ Zaman Serisi Grafikleri

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, arayüz bazında ağ iş hacmini, paket düşmelerini ve hataları zaman içinde görmek istiyorum; böylece ağ sorunlarını tespit edebileceğim.

#### Kabul Kriterleri

1. THE İzleme_Sayfası SHALL aşağıdaki ağ metriklerini Recharts grafikleri olarak sunmalıdır: arayüz başına rx kBps, arayüz başına tx kBps, paket düşmeleri, hatalar.
2. THE Ağ_Zaman_Serisi_Grafikleri SHALL Prometheus'tan `rate(node_network_receive_bytes_total[step])`, `rate(node_network_transmit_bytes_total[step])`, `rate(node_network_receive_drop_total[step])` ve `rate(node_network_receive_errs_total[step])` metriklerini kullanmalıdır.
3. WHEN Zaman_Aralığı_Seçici değiştirildiğinde, THE İzleme_Sayfası SHALL ağ grafikleri için Prometheus_Proxy sorgularını yenilemelidir.

---

### Gereksinim 9: Systemd Servis Grafikleri

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, servisler bazında yeniden başlatma sayısını ve uptime süresini görmek istiyorum; böylece kararsız servisleri hızlıca tespit edebileceğim.

#### Kabul Kriterleri

1. THE İzleme_Sayfası SHALL en yüksek yeniden başlatma sayısına sahip servisleri sıralı biçimde gösteren bir grafik içermelidir.
2. THE İzleme_Sayfası SHALL systemd servis uptime sürelerini gösteren bir grafik içermelidir.
3. THE Systemd_Grafikleri SHALL Prometheus'tan `systemd_unit_start_time_seconds` ve `node_systemd_unit_state` metriklerini Systemd_Exporter aracılığıyla kullanmalıdır.
4. WHEN Zaman_Aralığı_Seçici değiştirildiğinde, THE İzleme_Sayfası SHALL systemd grafikleri için Prometheus_Proxy sorgularını yenilemelidir.

---

### Gereksinim 10: Termal Zaman Serisi Grafikleri

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, CPU sıcaklıklarını sensör bazında zaman içinde görmek istiyorum; böylece ısınma sorunlarını tespit edebileceğim.

#### Kabul Kriterleri

1. THE İzleme_Sayfası SHALL sensör başına CPU sıcaklığını (°C) zaman serisi olarak gösteren bir Recharts grafiği içermelidir.
2. THE Termal_Grafik SHALL Prometheus'tan `node_thermal_zone_temp` metriğini kullanmalıdır.
3. WHEN Zaman_Aralığı_Seçici değiştirildiğinde, THE İzleme_Sayfası SHALL termal grafik için Prometheus_Proxy sorgularını yenilemelidir.

---

### Gereksinim 11: Zaman Aralığı Seçici ve Veri Yenileme

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, tüm zaman serisi grafikleri için zaman penceresini (15 dakika, 1 saat, 6 saat, 24 saat) seçmek istiyorum; böylece farklı granülerlikte analiz yapabileceğim.

#### Kabul Kriterleri

1. THE İzleme_Sayfası SHALL 15m, 1s, 6s ve 24s seçeneklerini sunan bir Zaman_Aralığı_Seçici içermelidir.
2. WHEN kullanıcı Zaman_Aralığı_Seçici'den bir seçenek seçtiğinde, THE İzleme_Sayfası SHALL tüm Zaman_Serisi_Grafiklerini seçilen aralığa karşılık gelen Prometheus_Proxy sorgusuyla yenilemelidir.
3. THE İzleme_Sayfası SHALL seçilen zaman aralığına göre `step` parametresini otomatik olarak hesaplamalıdır: 15m → 15s, 1s → 60s, 6s → 300s, 24s → 900s.
4. THE Zaman_Serisi_Grafikleri SHALL her 60 saniyede bir otomatik olarak yenilenmelidir.
5. IF Prometheus_Proxy sorgusu hata döndürürse, THEN THE İzleme_Sayfası SHALL ilgili grafik alanında hata mesajını göstermeli ve diğer grafiklerin çalışmasını engellememeli.

---

### Gereksinim 12: Tasarım Sistemi Uyumu

**Kullanıcı Hikayesi:** Bir frontend geliştiricisi olarak, `/monitoring` sayfasının mevcut panel tasarım sistemiyle (Tailwind, CSS değişkenleri, kart/kenarlık stili) tam uyumlu olmasını istiyorum; böylece yeni bir bileşen kütüphanesi eklenmesine gerek kalmayacak.

#### Kabul Kriterleri

1. THE İzleme_Sayfası SHALL yalnızca `recharts` (zaten `package.json`'da kayıtlı), `lucide-react`, `@tanstack/react-query` ve mevcut Tailwind CSS değişkenlerini kullanmalıdır; yeni bir bağımlılık eklenmemelidir.
2. THE İzleme_Sayfası SHALL `page.tsx` ve diğer mevcut sayfaların kullandığı `rounded-lg border border-border bg-card` kart stilini uygulamalıdır.
3. THE İzleme_Sayfası SHALL Recharts bileşenlerinde `hsl(var(--primary))`, `hsl(var(--border))`, `hsl(var(--muted-foreground))` gibi CSS değişkenlerini kullanmalı; sabit renk kodları kullanılmamalıdır.
4. THE İzleme_Sayfası SHALL mevcut `fetchAgent()` fonksiyonu ve `useQuery` (TanStack Query) kalıbını kullanarak Prometheus_Proxy uç noktalarını sorgulamalıdır.
5. THE İzleme_Sayfası SHALL mevcut `useHostStore` ile seçilen ana makineyi dikkate almalıdır.

---

### Gereksinim 13: Prometheus Proxy — Güvenlik ve Kapsam Sınırlama

**Kullanıcı Hikayesi:** Bir güvenlik yöneticisi olarak, Prometheus_Proxy'nin yalnızca önceden tanımlanmış metriklere izin vermesini ve keyfi PromQL enjeksiyonuna karşı korunmasını istiyorum.

#### Kabul Kriterleri

1. THE Prometheus_Proxy SHALL query parametresinde boş veya 4096 karakterden uzun PromQL sorgularına HTTP 400 hatası döndürmelidir.
2. THE Prometheus_Proxy SHALL yalnızca `node_`, `systemd_`, `go_`, `process_` önekli metriklere izin veren bir izin listesi (allowlist) uygulamalıdır; diğer metrik adlarına HTTP 403 döndürmelidir.
3. THE Prometheus_Proxy SHALL `start` ve `end` parametrelerinin geçerli Unix zaman damgaları olduğunu ve `end - start` değerinin 30 günü (2_592_000 saniye) geçmediğini doğrulamalıdır; geçersiz girişlerde HTTP 400 döndürmelidir.
4. THE Prometheus_Proxy SHALL Prometheus'a yapılan istekler için 10 saniyelik bağlantı zaman aşımı uygulamalıdır.

---

### Gereksinim 14: Go Ajanı — Prometheus Proxy Yuvarlak Geziş Özelliği (Round-Trip)

**Kullanıcı Hikayesi:** Bir yazılım geliştiricisi olarak, Prometheus_Proxy'nin doğru bir proxy işlevi gördüğünü — veriyi bozulmadan ilettiğini — doğrulamak istiyorum; böylece InfluxDB/Grafana döneminden kalan eski metriklerin ve yeni metriklerin tutarlı biçimde aktarıldığından emin olabileceğim.

#### Kabul Kriterleri

1. THE Prometheus_Proxy SHALL Prometheus'tan alınan JSON yanıtını gövde değişikliği yapmadan (byte-for-byte) istemciye iletmelidir.
2. FOR ALL geçerli PromQL sorgu parametresi kombinasyonları (query, start, end, step), THE Prometheus_Proxy SHALL Prometheus'tan aldığı `Content-Type` başlığını istemciye aynen yansıtmalıdır.
3. THE Prometheus_Proxy SHALL birden fazla eş zamanlı istek alındığında her birini bağımsız olarak ele almalı; bir isteğin hata durumu diğer istekleri etkilememelidir.
