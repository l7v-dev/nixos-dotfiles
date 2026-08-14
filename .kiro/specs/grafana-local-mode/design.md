# Design Document: Grafana Local Mode

## Overview

Bu özellik `modules/services/grafana/default.nix` içindeki `l7v.services.grafana` NixOS modülüne `localMode` boolean seçeneği ekler. Seçenek etkinleştirildiğinde modül, SOPS / nginx / Prometheus zorunluluklarını kaldırarak Grafana'yı workstation host'larında doğrudan HTTP üzerinden çalıştırabilir hale getirir.

Değişikliğin kapsamı tek bir Nix dosyasıyla sınırlıdır: `modules/services/grafana/default.nix`. Panel monitoringing sayfası (`/monitoring`) mevcut `/grafana/` iFrame yapısını koruyacak; local mode için panel-agent aynı laptop host'unda çalışacağından nginx proxy katmanı gerekmeyecektir.

### Tasarım Motivasyonu

Mevcut modül üç zorunlu bağımlılık zinciri içerir:

```
l7v.services.grafana
  ├─ assertion: l7v.metrics.enable
  ├─ assertion: l7v.reverseProxy.enable
  └─ assertion: l7v.secrets.enable
```

Bu zincir server rollerinde anlamlıdır ancak workstation'larda —özellikle laptop host'unda— tüm bu servisler kurulu değildir. `localMode` seçeneği, mevcut server-mode davranışını bozmadan bu kısıtlamaları koşullu hale getirir.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  hosts/laptop/default.nix                                │
│                                                          │
│  l7v.services.grafana = {                                │
│    enable    = true;                                     │
│    localMode = true;   ← yeni seçenek                    │
│  };                                                      │
└──────────────────────┬───────────────────────────────────┘
                       │ NixOS evaluation
                       ▼
┌──────────────────────────────────────────────────────────┐
│  modules/services/grafana/default.nix                    │
│                                                          │
│  lib.mkMerge [                                           │
│    (lib.mkIf (!cfg.localMode) { /* server-mode */ })     │
│    (lib.mkIf cfg.localMode   { /* local-mode  */ })      │
│  ]                                                       │
└───────────┬──────────────────────┬───────────────────────┘
            │ server mode          │ local mode
            ▼                      ▼
  ┌──────────────────┐   ┌──────────────────────────────┐
  │ Grafana :3001    │   │ Grafana :3001                 │
  │ + nginx vhost    │   │ HTTP-only, no nginx           │
  │ + SOPS secret    │   │ plain-text adminPassword      │
  │ + Prometheus DS  │   │ optional Prometheus DS        │
  └──────────────────┘   └──────────────────────────────┘
```

### Panel /monitoring Akışı (Local Mode)

```
Browser
  └─► panel-frontend (Next.js :3002)
        └─► <iframe src="/grafana/" />
              └─► nginx /grafana/ → proxy_pass http://127.0.0.1:3001/
                    └─► Grafana :3001  (local mode)
```

Panel-frontend server host'ta çalışırken `/grafana/` proxy yolu `module.nix` içinde tanımlanmıştır ve `lib.mkIf config.l7v.services.grafana.enable` ile koşullandırılmıştır. Local mode için laptop ortamında panel-agent aynı makinede çalışır; Grafana da aynı makinede `127.0.0.1:3001` üzerinde dinler. Browser doğrudan `http://127.0.0.1:3001` üzerinden Grafana'ya da erişebilir (panel embedding olmadan).

---

## Components and Interfaces

### 1. `l7v.services.grafana` NixOS Modülü (tek değişiklik noktası)

**Dosya:** `modules/services/grafana/default.nix`

#### Yeni Seçenekler

| Seçenek | Tip | Varsayılan | Açıklama |
|---------|-----|-----------|----------|
| `l7v.services.grafana.localMode` | `lib.types.bool` | `false` | Workstation-uyumlu çalışma modunu etkinleştirir |
| `l7v.services.grafana.adminPassword` | `lib.types.str` | `"admin"` | Local mode admin şifresi (plain-text) |

#### Assertion Mantığı

| Assertion | Server Mode (`localMode = false`) | Local Mode (`localMode = true`) |
|-----------|----------------------------------|--------------------------------|
| `l7v.metrics.enable` | Zorunlu | Kaldırıldı |
| `l7v.reverseProxy.enable` | Zorunlu | Kaldırıldı |
| `l7v.secrets.enable` | Zorunlu | Kaldırıldı |
| `localMode + isServer` uyarısı | N/A | Uyarı assertion'ı eklendi |

#### Yapılandırma Ayrışması

```nix
config = lib.mkIf cfg.enable (lib.mkMerge [
  # ── Ortak (her iki modda da geçerli) ─────────────────────
  commonConfig

  # ── Server mode (varsayılan) ──────────────────────────────
  (lib.mkIf (!cfg.localMode) serverConfig)

  # ── Local mode ────────────────────────────────────────────
  (lib.mkIf cfg.localMode localConfig)
]);
```

### 2. Panel Monitoring Sayfası (değişiklik yok)

`panel/apps/web/app/monitoring/page.tsx` herhangi bir değişiklik gerektirmez. Sayfa halihazırda `/grafana/` iFrame'ini kullanmakta olup Grafana'nın erişilemez olduğunda hata yönetimini yapmaktadır. Local mode'da Grafana `http://127.0.0.1:3001` üzerinde direkt erişilebilir olacak; panel iFrame'i ise `/grafana/` proxy yolunu kullanmaya devam edecektir.

### 3. Panel Module (değişiklik yok)

`panel/nix/module.nix` içindeki `/grafana/` nginx proxy yapılandırması `lib.mkIf config.l7v.services.grafana.enable` ile koşullandırılmıştır ve mevcut haliyle doğrudur. Local mode'da panel-frontend sunucu üzerinde çalışmayacağından bu bloğun etkisi olmaz.

---

## Data Models

### NixOS Modül Seçenek Şeması

```nix
options.l7v.services.grafana = {
  enable = lib.mkEnableOption "grafana dashboard service";

  localMode = lib.mkOption {
    type    = lib.types.bool;
    default = false;
    description = ''
      Workstation-uyumlu çalışma modunu etkinleştirir.
      true olduğunda SOPS, nginx ve Prometheus zorunlulukları kaldırılır;
      Grafana doğrudan HTTP üzerinden 127.0.0.1:3001 adresinde dinler.
    '';
  };

  adminPassword = lib.mkOption {
    type    = lib.types.str;
    default = "admin";
    description = ''
      Local mode admin şifresi (plain-text).
      localMode = false olduğunda bu seçenek yok sayılır;
      SOPS secret dosyası kullanılmaya devam eder.
    '';
  };

  domain = lib.mkOption {
    type    = lib.types.str;
    default = "grafana.l7v.dev";
    description = "Public FQDN for the Grafana instance.";
  };

  adminEmail = lib.mkOption {
    type    = lib.types.str;
    default = "admin@l7v.dev";
    description = "Admin contact address.";
  };
};
```

### Server Mode Yapılandırma Çıktısı (değişmez)

```nix
# serverConfig — localMode = false olduğunda geçerli
{
  assertions = [
    { assertion = config.l7v.metrics.enable;      message = "..."; }
    { assertion = config.l7v.reverseProxy.enable; message = "..."; }
    { assertion = config.l7v.secrets.enable;      message = "..."; }
  ];

  sops.secrets."grafana/admin_password".owner = "grafana";

  services.grafana.settings = {
    server = {
      domain   = cfg.domain;
      root_url = "https://${cfg.domain}";
      http_addr = "127.0.0.1";
      http_port = 3001;
    };
    security = {
      admin_user     = "admin";
      admin_password = "$__file{${config.sops.secrets."grafana/admin_password".path}}";
      cookie_secure  = true;
    };
  };

  services.nginx.virtualHosts.${cfg.domain} = { /* SSL + ACME */ };
}
```

### Local Mode Yapılandırma Çıktısı (yeni)

```nix
# localConfig — localMode = true olduğunda geçerli
{
  assertions = [
    {
      assertion = !config.l7v.infrastructure.isServer;
      message   = "l7v.services.grafana.localMode = true is intended for workstation hosts. Consider localMode = false for servers.";
    }
  ];

  services.grafana.settings = {
    server = {
      http_addr        = "127.0.0.1";
      http_port        = 3001;
      root_url         = "http://127.0.0.1:3001";
      protocol         = "http";
    };
    security = {
      admin_user       = "admin";
      admin_password   = cfg.adminPassword;
      cookie_secure    = false;
      cookie_samesite  = "disabled";
      allow_embedding  = true;
      disable_gravatar = true;
    };
    users.allow_sign_up = false;
    analytics = {
      reporting_enabled  = false;
      check_for_updates  = false;
    };
  };

  services.grafana.provision = {
    enable = true;
    datasources.settings.datasources =
      lib.optional config.l7v.metrics.enable {
        name      = "Prometheus";
        type      = "prometheus";
        url       = "http://127.0.0.1:9090";
        isDefault = true;
      };
      # metrics.enable = false → boş liste, hata yok
  };

  # nginx sanal host yok — doğrudan HTTP
}
```

### Laptop Host Kullanım Örneği

```nix
# hosts/laptop/default.nix içine eklenen tek satır bloğu
l7v.services.grafana = {
  enable    = true;
  localMode = true;
  # adminPassword = "admin";  # varsayılan, isteğe bağlı override
};
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Bu özellik bir NixOS modülüdür: Nix değerlendirme zamanında (`lib.mkIf`, `lib.mkMerge`, `assertions`) çalışır. Giriş uzayı sonlu ve sınırlıdır (`localMode` × `isServer` × `metrics.enable` = 8 kombinasyon). Bu nedenle doğruluğu example-based snapshot testlerle sağlamak uygundur; PBT bu senaryo için anlamlı ekstra hata bulmaz.

### Property 1: Mode Isolation (Mod İzolasyonu)

Server mode (`localMode = false`) ve local mode (`localMode = true`) yapılandırma çıktıları birbirini etkilemez: server mode çıktısında nginx vhost ve SOPS secret referansı bulunur; local mode çıktısında bunlar kesinlikle yer almaz.

**Formal:** `∀ cfg: cfg.localMode = false → nginx vhost ∈ output ∧ sops.secret ∈ output`
`∀ cfg: cfg.localMode = true  → nginx vhost ∉ output ∧ sops.secret ∉ output`

**Validates: Requirements 1.2, 2.6, 3.4, 7.4**

### Property 2: Assertion Completeness (Assertion Tamlığı)

`localMode = false` ile aktif olan her assertion, `localMode = true` durumunda evaluation-time hatası üretmez. Aksine `localMode = true` yalnızca `isServer = true` kombinasyonunda uyarı assertion'ı tetikler.

**Formal:** `∀ cfg: cfg.localMode = true ∧ ¬cfg.isServer → assertions pass (no failure)`
`∀ cfg: cfg.localMode = false ∧ ¬cfg.metrics.enable → assertion failure`

**Validates: Requirements 1.3, 1.4, 1.5, 6.1, 6.3, 7.2**

### Property 3: Datasource Conditional (Koşullu Datasource)

Local mode'da Prometheus datasource listesi `metrics.enable` değerine göre deterministik olarak belirlenir: `true` ise tam olarak bir Prometheus datasource vardır; `false` ise liste boştur.

**Formal:** `∀ cfg: cfg.localMode = true → |datasources| = (if cfg.metrics.enable then 1 else 0)`

**Validates: Requirements 4.1, 4.2, 4.3**

**PBT kararı:** Bu özellik için property-based testing uygun **değildir**. Tüm anlamlı giriş kombinasyonları 8 adet olup exhaustive example-based testing daha verimlidir. Doğruluğu sağlama stratejisi: **snapshot/example-based tests** + `nix eval` ile configuration tree doğrulama.

---

## Error Handling

### NixOS Evaluation-Time Hataları

| Senaryo | Beklenen Davranış |
|---------|-------------------|
| `localMode = false` + `l7v.metrics.enable = false` | Assertion hatası: `"l7v.services.grafana requires l7v.metrics.enable = true"` |
| `localMode = false` + `l7v.reverseProxy.enable = false` | Assertion hatası: `"l7v.services.grafana requires l7v.reverseProxy.enable = true"` |
| `localMode = false` + `l7v.secrets.enable = false` | Assertion hatası: `"l7v.services.grafana requires l7v.secrets.enable = true"` |
| `localMode = true` + `isServer = true` | Assertion uyarısı: `"l7v.services.grafana.localMode = true is intended for workstation hosts..."` |
| `localMode = true` + `metrics.enable = false` | Hatasız; datasource listesi boş |
| `localMode = true` + `metrics.enable = true` | Hatasız; Prometheus datasource eklenir |

### Runtime Hataları

| Senaryo | Beklenen Davranış |
|---------|-------------------|
| Grafana servisi başlamazsa | systemd `Restart = "on-failure"` ile yeniden başlatır (mevcut upstream davranışı) |
| Panel `/monitoring` iFrame yüklenemezse | `loadError` state'i `true` olur, "Retry" butonu gösterilir (mevcut panel davranışı) |
| Port 3001 başka servis tarafından kullanılıyorsa | Grafana başlatma hatası; `journalctl -u grafana` ile görülür |

### Yanlış Yapılandırma Koruması

`adminPassword` seçeneği `localMode = false` olduğunda yok sayılır — server mode'da SOPS secret dosyası her zaman kullanılır. Bu davranış `lib.mkIf cfg.localMode` ile sağlanır; karışıklık veya ikili tanım riski yoktur.

---

## Testing Strategy

Bu özellik NixOS IaC değişikliği olduğundan test stratejisi snapshot/example-based testler ve manuel doğrulama üzerine kuruludur. Property-based testing bu senaryo için uygun değildir (yukarıda gerekçelendirildi).

### 1. Nix Evaluation Testleri (Example-Based)

Her kombinasyon için `nix eval` ile yapılandırma ağacı doğrulanır:

```bash
# Local mode — temel doğrulama
nix eval .#nixosConfigurations.L7V.config.services.grafana.settings

# Server mode — mevcut davranış korunuyor mu?
nix eval .#nixosConfigurations.server.config.services.grafana.settings

# Assertion kontrolleri: aşağıdaki değerlendirme hata vermeli
# (server host'ta localMode = true)
nix eval --impure --expr '
  (import <nixpkgs/nixos> {
    configuration = {
      l7v.infrastructure.isServer = true;
      l7v.services.grafana = { enable = true; localMode = true; };
    };
  }).config.system.build.toplevel
'
```

### 2. Test Matrisi

| `localMode` | `isServer` | `metrics.enable` | Beklenen Sonuç |
|-------------|------------|-----------------|----------------|
| `false` | `true` | `true` | Server mode — nginx vhost, SOPS secret |
| `false` | `true` | `false` | Assertion hatası |
| `true` | `false` | `false` | Local mode — HTTP, boş DS listesi |
| `true` | `false` | `true` | Local mode — HTTP, Prometheus DS |
| `true` | `true` | `*` | Assertion uyarısı |

### 3. Validation (Mevcut Araçlar)

```bash
# Formatlama + linting + flake check
./scripts/validate.sh L7V

# Laptop rebuild (smoke test)
nh os switch
```

### 4. Manuel Doğrulama Checklist

- [ ] `http://127.0.0.1:3001` Grafana arayüzü açılıyor
- [ ] `admin` / `admin` ile giriş yapılabiliyor
- [ ] Prometheus datasource görünüyor (metrics.enable = true ise)
- [ ] Panel `/monitoring` sayfasında iFrame yükleniyor
- [ ] Server host'ta mevcut Grafana deployment bozulmamış
