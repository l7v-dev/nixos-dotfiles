# Operational Runbook: Service Operations

> **Target:** Systemd Services, PostgreSQL, PgBouncer, Prometheus & Web Dashboard

---

## 1. Systemd Service Management
```bash
# Check service status
systemctl status nginx.service
systemctl status postgresql.service
systemctl status forgejo.service

# Restart service after configuration switch
sudo systemctl restart <service-name>
```

---

## 2. PostgreSQL & PgBouncer Administration
```bash
# Connect to PostgreSQL via peer authentication
sudo -u postgres psql

# Check PgBouncer connection pooler
psql -p 6432 -h 127.0.0.1 -U postgres pgbouncer
```
