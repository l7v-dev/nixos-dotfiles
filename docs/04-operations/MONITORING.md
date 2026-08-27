# Monitoring, Telemetry & Observability Guide

> **Scope:** Prometheus exporters, scrape configurations, Loki log shipping, and Grafana visualization.

---

## 📊 1. Prometheus Architecture & Scrape Configs

Prometheus runs on port `9090` with a 30-day retention policy and 15s scrape interval.

### Exporters Port Registry:
- **Port `9100`:** `node_exporter` (CPU, memory, diskstats, filesystem, netdev, systemd, thermal_zone).
- **Port `9558`:** `systemd_exporter` (Systemd unit states, restarts, failed states).
- **Port `9187`:** `postgres_exporter` (Enabled conditionally when `database.enable = true`).
- **Port `9113`:** `nginx_exporter` (Scrapes `/nginx_status` when `reverseProxy.enable = true`).

```nix
# Gated scrape configurations prevent connection-refused errors on headless nodes:
scrapeConfigs = [
  { job_name = "prometheus"; static_configs = [{ targets = [ "localhost:9090" ]; }]; }
  { job_name = "node";       static_configs = [{ targets = [ "localhost:9100" ]; }]; }
  { job_name = "systemd";    static_configs = [{ targets = [ "localhost:9558" ]; }]; }
]
++ lib.optional config.l7v.reverseProxy.enable { job_name = "nginx"; static_configs = [{ targets = [ "localhost:9113" ]; }]; }
++ lib.optional config.l7v.database.enable { job_name = "postgres"; static_configs = [{ targets = [ "localhost:9187" ]; }]; };
```

---

## 🪵 2. Loki Log Aggregation & Fluent-Bit Shipping

- **Engine:** Grafana Loki v2.8+ running TSDB schema v13.
- **Collector:** `fluent-bit` tailing `/var/log/journal`.
- **Field Normalization:** `_SYSTEMD_UNIT` is mapped to `$unit` for uniform querying in Grafana and Panel.

### LogQL Query Examples:
```logql
# Filter logs from forgejo unit
{job="systemd", unit="forgejo.service"}

# Search for errors across all units
{job="systemd"} |= "ERROR"
```

---

## 📈 3. Grafana Dashboards (`services/grafana`)

- **URL:** `https://grafana.l7v.dev` (Port 3001).
- **Admin Password:** Decrypted automatically from `grafana/admin_password` via SOPS (`$__file{...}`).
- **Pre-provisioned Datasources:** Prometheus (`http://127.0.0.1:9090`) set as default.
