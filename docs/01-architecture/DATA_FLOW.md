# Data Flow & Communication Channels

> **Scope:** Inter-Process Communication (IPC), D-Bus, Unix Domain Sockets, HTTP/SSE, WebSockets, Metric Pipelines, and Offsite Sync.

---

## 🔄 Core Data Flow Diagrams

### 1. Panel Agent & Web Dashboard Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Web Browser / Operator
    participant Nginx as Nginx Reverse Proxy
    participant Frontend as Next.js Web Server (Port 3002)
    participant Socket as Unix Domain Socket (/run/panel-agent/...)
    participant Agent as Go panel-agent Daemon
    participant DBus as Linux D-Bus (systemd1, login1, NM)
    participant Kernel as Linux Kernel / procfs / journald

    Operator->>Nginx: HTTPS GET /cockpit (panel.l7v.dev)
    Nginx->>Frontend: Proxy Pass to 127.0.0.1:3002
    Frontend-->>Operator: Deliver React/Next.js Application
    
    rect rgb(240, 248, 255)
    note over Operator, Agent: Real-time Metric & Log Streaming (SSE)
    Operator->>Nginx: GET /api/agent/api/v1/logs/stream
    Nginx->>Socket: Proxy Pass to Unix Socket
    Socket->>Agent: Handle logsStreamHandler
    Agent->>Kernel: Read /var/log/journal
    Kernel-->>Agent: New Journal Log Events
    Agent-->>Operator: Server-Sent Events (data: {JSON})
    end

    rect rgb(255, 245, 238)
    note over Operator, DBus: System Control & Rebuild Action
    Operator->>Nginx: POST /api/agent/api/v1/nixos/rebuild
    Nginx->>Socket: Forward JSON Body
    Socket->>Agent: Trigger nixosRebuildHandler
    Agent->>DBus: Request unit restart or spawn 'nh os switch'
    DBus-->>Agent: Execution exit code / stream
    Agent-->>Operator: 200 OK + Job ID
    end

    rect rgb(240, 255, 240)
    note over Operator, Agent: Interactive PTY Terminal (WebSocket)
    Operator->>Nginx: WSS /api/agent/api/v1/terminal/ws/{id}
    Nginx->>Socket: HTTP/1.1 Upgrade: WebSocket
    Socket->>Agent: Attach PTY /bin/zsh session
    Operator<<->>Agent: Full-duplex character stream (xterm.js)
    end
```

---

### 2. Observability & Telemetry Pipeline

```mermaid
flowchart LR
    subgraph Nodes["Host Fleet (laptop, server, builder, backup)"]
        NodeExp["Node Exporter\n(Port 9100)"]
        SysExp["Systemd Exporter\n(Port 9558)"]
        PgExp["PostgreSQL Exporter\n(Port 9187)"]
        NgxExp["Nginx Exporter\n(Port 9113)"]
        FluentBit["Fluent-bit\n(Journald Tail)"]
    end

    subgraph MonitoringNode["Observability Hub (server.l7v.dev)"]
        Prometheus["Prometheus Server\n(Port 9090)"]
        Loki["Loki TSDB v13\n(Port 3100)"]
        Grafana["Grafana Dashboards\n(Port 3001)"]
    end

    NodeExp -->|Pull HTTP :9100| Prometheus
    SysExp -->|Pull HTTP :9558| Prometheus
    PgExp -->|Pull HTTP :9187| Prometheus
    NgxExp -->|Pull HTTP :9113| Prometheus
    FluentBit -->|Push JSON :3100| Loki
    Prometheus -->|Datasource| Grafana
    Loki -->|Datasource| Grafana
```

---

### 3. Backup & Disaster Recovery Flow

```mermaid
flowchart TD
    subgraph HostFileSystem["Local Host (Workstation / Server)"]
        Btrfs["Btrfs Root Subvolume"]
        Snapper["Snapper Hourly/Daily Snapshots\n(.snapshots/)"]
        AppExports["Application Dumps\n(/var/backup/vaultwarden/sqlite.db)"]
    end

    subgraph Secrets["SOPS / Age"]
        AgeKey["/etc/age/key"]
        ResticPass["/run/secrets/backup/restic_password"]
        AWSCreds["/run/restic-s3-env"]
    end

    subgraph BackupTargets["Remote Storage Targets"]
        S3Bucket["AWS S3 Bucket: l7v-backups\n(eu-central-1)"]
        SFTPNode["SFTP Node: backup.l7v.dev\n(/srv/backup/restic)"]
    end

    Btrfs --> Snapper
    Snapper -->|Backup Source| ResticTimer["systemd.services.restic-backups-l7v"]
    AppExports -->|Backup Source| ResticTimer
    AgeKey --> ResticPass --> ResticTimer
    AgeKey --> AWSCreds --> ResticTimer
    ResticTimer -->|Option 1: S3 HTTPS| S3Bucket
    ResticTimer -->|Option 2: SFTP SSH| SFTPNode
```
