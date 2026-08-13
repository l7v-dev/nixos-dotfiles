# Implementation Plan: l7v-panel MVP

## Overview

Gerçek kaynak kodu analizi sonucu oluşturulan güncel plan.
Kaynak: `panel/` (eski spec'teki `l7v-panel/` değil).
Nix entegrasyonu: `panel/nix/` (eski spec'teki `platform/pkgs/` ve `services/panel/` değil).

**Mimari:**
```
panel/
├── apps/agent/          Go binary — D-Bus/procfs/journal REST+SSE API
├── apps/web/            Next.js 15 frontend
└── nix/
    ├── module.nix       NixOS service module (TAMAMLANDI ✅)
    └── pkgs/
        ├── panel-agent/ Go derivation (TAMAMLANDI ✅)
        └── panel-frontend/ Next.js derivation (TAMAMLANDI ✅)
```

**NixOS entegrasyonu:**
- `modules/services/default.nix` → `../../panel/nix/module.nix` import (TAMAMLANDI ✅)
- `hosts/laptop/default.nix` → `l7v.services.panel.agent.enable = true` (TAMAMLANDI ✅)
- `hosts/server/default.nix` → `l7v.services.panel.frontend.enable = true` (TAMAMLANDI ✅)

---

## Gerçek Durum Özeti

### ✅ Tamamen Yapılmış
- Agent: tüm handler'lar (`health`, `metrics`, `services`, `power`, `network`, `logs`, `prommetrics`)
- Agent: tüm D-Bus client'lar (`systemd`, `logind`, `networkmanager`, `bluez`)
- Agent: procfs reader (CPU, memory, disk, network)
- Agent: journal SSE reader
- Agent: `main.go` (socket activation, graceful shutdown, stub fallback)
- Agent: property testleri (Property 1, 3, 7)
- Frontend: tüm sayfalar (`dashboard`, `services`, `power`, `network`, `logs`, `monitoring`, `integrations`)
- Frontend: hooks (`useMetrics`, `useServices`, `useServiceAction`, `usePowerMutation`, `useWifi`, `useBluetooth`, `useLogs`)
- Frontend: lib (`thresholds`, `backoff`, `priority-color`, `agent-client`)
- Frontend: stores (`host-store`, `theme-store`)
- Frontend: layout (`Sidebar`, `Header`, `Providers`)
- Frontend: `StatusBadge` component
- Frontend: `actions/forgejo.ts` (Forgejo + Vaultwarden)
- Nix: `panel/nix/module.nix` (options, systemd socket/service, nginx vhost, polkit)
- Nix: `panel/nix/pkgs/panel-agent/default.nix`
- Nix: `panel/nix/pkgs/panel-frontend/default.nix`
- NixOS: `modules/services/default.nix` → import
- NixOS: `hosts/laptop/default.nix` → agent enable
- NixOS: `hosts/server/default.nix` → frontend enable

### ❌ Eksik / Yapılmamış
- Agent: `go.sum` ve `gomod2nix.toml` güncel değil (build kırık olabilir)
- Agent: `stubs.go`'da `stubLogind`, `stubNetwork`, `stubBluetooth` eksik
- Frontend: `services/page.tsx` `useServices`/`useServiceAction`'ı yanlış dosyadan import ediyor (`@/hooks/useMetrics` yerine ayrı `useServices` hook olmalı — küçük bug)
- Frontend: `actions/` altında `ntfy.ts` ve `prometheus.ts` yok
- Frontend: `app/integrations/page.tsx`'te ntfy form yok
- Frontend: `components/shared/` altında `LoadingSkeleton`, `ErrorToast` yok
- Frontend: `components/layout/NavItem.tsx` yok
- Frontend: `components/shared/HostSelector.tsx` yok
- Frontend: `store/__tests__/host-store.test.ts` var ama boş/stub olabilir
- Frontend: `vitest.config.ts` var ama test suite çalışıp çalışmadığı doğrulanmadı
- Nix: `vendorHash` placeholder (`null`) — `go build` başarısız
- Nix: `pnpmDeps.hash` placeholder (`sha256-AAAA...`) — `nix build` başarısız
- Nix: `panel-frontend.service`'te `ExecStart` yolu yanlış (`server.js` wrap mantığı kontrolü gerekli)
- Validation: `./scripts/validate.sh` hiç çalıştırılmadı

---

## Tasks

### Wave 1 — Agent: Build Doğrulaması

- [x] 1. Agent'ı derle ve stub'ları tamamla
  - `panel/apps/agent/` altında `go build ./...` çalıştır; varsa derleme hatalarını düzelt
  - `cmd/panel-agent/stubs.go` dosyasına eksik stub implementasyonlarını ekle:
    - `stubLogind`: `PowerOff`, `Reboot`, `Suspend`, `HealthCheck` — hepsi `nil` döner
    - `stubNetwork`: `GetWifiStatus` → `&WifiStatus{Enabled: false}` döner, `ToggleWifi` → `nil`
    - `stubBluetooth`: `GetBluetoothStatus` → `&BluetoothStatus{Enabled: false, Devices: []}` döner, `ToggleBluetooth` → `nil`
  - `go test ./...` çalıştır; mevcut 3 property testi geçmeli
  - _Requirements: 3.4–3.6, 4.7–4.9, NFR-3_

- [x] 2. `gomod2nix.toml` güncelle
  - `panel/apps/agent/` dizininde `gomod2nix generate` çalıştır
  - Üretilen `gomod2nix.toml` dosyasını commit et
  - `panel/nix/pkgs/panel-agent/default.nix` içinde `vendorHash = null;` satırını
    `gomod2nix generate` çıktısındaki hash ile güncelle (veya `gomod2nix`'in
    otomatik hash yönetimi kullanılıyorsa `vendorHash` kaldır)
  - `nix build .#panel-agent` ile derlemenin geçtiğini doğrula (sadece hash hatası beklenir, başka hata olmamalı)
  - _Requirements: 9.10, NFR-1_

---

### Wave 2 — Frontend: Eksik Parçalar

- [x] 3. Import bug düzelt — `services/page.tsx`
  - `panel/apps/web/app/services/page.tsx` dosyasında:
    ```ts
    import { useServices, useServiceAction } from "@/hooks/useMetrics";
    ```
    satırını şöyle değiştir:
    ```ts
    import { useServices, useServiceAction } from "@/hooks/useMetrics";
    ```
    Not: `useServices` ve `useServiceAction` zaten `hooks/useMetrics.ts` içinde export ediliyor —
    mevcut import **doğru**. Ancak dosyayı açıp `import` yolunun gerçekten `@/hooks/useMetrics`
    olduğunu doğrula, TypeScript hatasına yol açmıyorsa bu task'ı atla.
  - `pnpm --filter @l7v-panel/web typecheck` çalıştır; sıfır hata olmalı
  - _Requirements: 2.3, 2.4_

- [x] 4. Eksik shared component'leri ekle
  - `panel/apps/web/components/shared/LoadingSkeleton.tsx` yaz:
    - `<div className="animate-pulse space-y-2">` içinde 3 adet `<div className="h-4 bg-muted rounded" />` satırı
    - `lines?: number` prop ile kaç satır gösterileceği ayarlanabilir olsun
  - `panel/apps/web/components/shared/ErrorToast.tsx` yaz:
    - `message: string`, `status?: number` props alan bir component
    - Kırmızı arka planlı, dismiss butonu olan bir toast benzeri satır içi banner
    - Zustand veya harici toast kütüphanesi kullanmak yerine basit `useState` ile kapatılabilir
  - `panel/apps/web/components/layout/NavItem.tsx` yaz:
    - `href: string`, `label: string`, `icon: React.ReactNode` props
    - `usePathname()` ile aktif durumu tespit et, aktifse highlight uygula
    - `Sidebar.tsx` bu component'i kullanacak şekilde refactor et
  - `panel/apps/web/components/shared/HostSelector.tsx` yaz:
    - `useHostStore`'dan `selectedHost` ve `setHost` oku
    - Dropdown menü ile host seçimi; şimdilik sabit `["laptop", "server"]` listesi
    - `Header.tsx`'e entegre et
  - _Requirements: 8.2, 8.6, 8.7_

- [x] 5. Eksik server actions ekle
  - `panel/apps/web/actions/ntfy.ts` yaz:
    ```ts
    "use server";
    export async function publishNtfy(topic: string, message: string): Promise<void>
    ```
    - `https://ntfy.l7v.dev/${topic}` adresine `Authorization: Bearer ${NTFY_TOKEN}` ile POST at
    - Hata durumunda `Error` fırlat
  - `panel/apps/web/actions/prometheus.ts` yaz:
    ```ts
    "use server";
    export async function queryPrometheus(query: string): Promise<unknown>
    ```
    - `http://127.0.0.1:9090/api/v1/query?query=<query>` adresini fetch et
    - `next: { revalidate: 0 }` (gerçek zamanlı)
    - Ham Prometheus JSON response'unu döndür
  - `panel/apps/web/app/integrations/page.tsx`'e ntfy publish formu ekle:
    - `topic` input + `message` textarea + "Publish" butonu
    - `useState` + `useTransition` ile form state yönetimi
    - Başarıda yeşil, hata durumunda kırmızı mesaj göster
  - _Requirements: NFR-1_

---

### Wave 3 — Frontend: Build Doğrulaması

- [x] 6. Frontend build doğrula
  - `panel/apps/web/` dizininde `pnpm typecheck` çalıştır; sıfır TypeScript hatası olmalı
  - `pnpm build` çalıştır; başarılı standalone output üretmeli
  - `pnpm test` çalıştır; mevcut testler geçmeli
  - Varsa hataları düzelt; build çıktısı `apps/web/.next/standalone/` altında olmalı
  - _Requirements: 8.1, 8.10, 9.10_

---

### Wave 4 — Nix: Hash Güncellemeleri

- [x] 7. `panel-frontend` pnpm hash güncelle
  - `nix run nixpkgs#prefetch-pnpm-deps -- panel/pnpm-lock.yaml` çalıştır
  - Çıktıdaki `sha256-...` hash'ini `panel/nix/pkgs/panel-frontend/default.nix` içindeki
    `pnpmDeps.hash` alanına yaz (`sha256-AAAA...` placeholder'ının yerine)
  - `nix build .#panel-frontend` çalıştır; sadece hash doğrulama geçmeli
  - _Requirements: 9.10_

- [x] 8. `panel-frontend.service` ExecStart yolunu doğrula
  - `panel/nix/module.nix` içindeki `panel-frontend.service` bloğuna bak:
    ```nix
    ExecStart = "${pkgs.nodejs_22}/bin/node ${panelFrontendPkg}/server.js";
    WorkingDirectory = "${panelFrontendPkg}";
    ```
  - `panel/nix/pkgs/panel-frontend/default.nix` installPhase'de `server.js`'nin tam yolunu kontrol et:
    Next.js standalone output `apps/web/server.js` konumuna kopyalanıyor —
    `ExecStart`'ı `${panelFrontendPkg}/apps/web/server.js` ve
    `WorkingDirectory`'yi `${panelFrontendPkg}/apps/web` olarak güncelle
  - `HOSTNAME` ve `PORT` env var'larının doğru iletildiğini doğrula
  - _Requirements: 9.4_

---

### Wave 5 — Validation

- [x] 9. `./scripts/validate.sh` geçir
  - Repo kökünden `./scripts/validate.sh L7V` çalıştır
  - `nixfmt-rfc-style` hatası varsa `panel/nix/` altındaki `.nix` dosyalarını formatla
  - `statix` veya `deadnix` uyarısı varsa düzelt
  - `shellcheck` varsa yeni shell script yok, bu adım hızlı geçer
  - `nix flake check --no-build` çalıştır; evaluation hataları olmamalı
  - _Requirements: 9.10_

- [x] 10. End-to-end smoke test
  - Laptop'ta `nix build .#panel-agent` başarıyla tamamlanmalı
  - Server'da `nix build .#panel-frontend` başarıyla tamamlanmalı
  - `colmena build` (deploy etmeden sadece build) hatasız çalışmalı
  - Laptop'ta agent binary'yi `--dev` flag'i ile çalıştır:
    `result/bin/panel-agent --dev`
  - Ayrı terminalde: `curl --unix-socket /tmp/panel-agent-dev.sock http://localhost/api/v1/health`
    → `{"status":"ok","version":"0.1.0"}` dönmeli
  - `curl --unix-socket /tmp/panel-agent-dev.sock http://localhost/api/v1/metrics`
    → CPU/RAM/disk/network JSON dönmeli
  - _Requirements: 7.10, 1.1–1.4, 9.10_

---

## Kapsam Dışı (MVP'ye dahil değil)

Aşağıdakiler kasıtlı olarak MVP dışında bırakıldı:

- Property testleri (agent: Property 2, frontend: Property 4–12) — işlevselliği etkilemiyor
- `10.2` proxy route unit testleri — manuel test yeterli
- `19.2` agent tablo testleri — manuel test yeterli
- `24.3` goroutine leak testi — production'da izleme ile kapsanıyor
- Phase 2: JWT RS256 auth, SOPS token yönetimi, multi-host UI

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["1", "2"] },
    { "id": 2, "tasks": ["3", "4", "5"] },
    { "id": 3, "tasks": ["6"] },
    { "id": 4, "tasks": ["7", "8"] },
    { "id": 5, "tasks": ["9", "10"] }
  ]
}
```

---

## Notes

- Task 3 (`services/page.tsx` import bug): Dosyayı açıp kontrol et — `useServices` zaten
  `hooks/useMetrics.ts` içinde export ediliyor, TypeScript hatası yoksa bu task'ı atla.
- Task 7 (pnpm hash): `prefetch-pnpm-deps` komutu monorepo kökündeki `pnpm-lock.yaml`'ı
  kullanır (`panel/pnpm-lock.yaml`), `apps/web/` altındakini değil.
- Task 8 (ExecStart yolu): `panel/nix/pkgs/panel-frontend/default.nix` installPhase'de
  `server.js`'nin tam path'i `$out/apps/web/server.js` olarak kopyalanıyor — buna göre
  `module.nix`'i güncelle.
- `vendorHash`: `gomod2nix` kullanıyorsa `buildGoModule` yerine `buildGoApplication`
  kullanıyor olabilir; `panel/apps/agent/gomod2nix.toml` içeriğine göre karar ver.
- Tüm `.nix` dosyaları `nixfmt-rfc-style` ile formatlanmış olmalı; commit öncesi
  `nixfmt panel/nix/` çalıştır.
- Phase 2 (JWT auth, multi-host) bu scope'ta yok; `module.nix` içindeki inline comment'ler
  bu noktaları zaten belgeliyor.
