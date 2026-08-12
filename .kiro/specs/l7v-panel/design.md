# Design Document: l7v-panel

## Overview

`l7v-panel` is a professional web-based control panel for the l7v NixOS infrastructure.
It consists of two binaries — a Go agent (`panel-agent`) running on each managed host and a
Next.js 16 frontend served by the server host — plus a single NixOS module that provisions both.

All source code lives inside `nixos/l7v-panel/` in this repository. The NixOS derivations at
`platform/pkgs/panel-agent/` and `platform/pkgs/panel-frontend/` reference that local path, so
`nix build` always builds the version in the working tree.

Phase 1 delivers: real-time metrics, systemd service management, power control, network/Bluetooth
status, live log streaming, and Grafana dashboard embedding. Authentication (Phase 2), interactive
terminal (Phase 3), and all other capabilities listed in the requirements non-goals are explicitly
out of scope here.

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ Browser                                                             │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────────────┐
│ nginx  (server host — panel.l7v.dev)                                │
│  /                → Next.js :3002          (proxy_pass)             │
│  /api/agent/laptop/* → panel-agent         (unix socket upstream)   │
│  /grafana/*       → grafana.l7v.dev:3001   (proxy_pass)             │
└───┬──────────────────────────┬──────────────────────────────────────┘
    │                          │
    │ HTTP/Unix                │ HTTP/TCP
┌───▼──────────┐   ┌──────────▼──────────────────────────────────────┐
│ Next.js 16   │   │ panel-agent (Go)  — laptop host                  │
│ :3002        │   │  /run/panel-agent/panel-agent.sock               │
│              │   │  ├── /api/v1/metrics                             │
│ Server       │   │  ├── /api/v1/services                            │
│ Actions ──►  │   │  ├── /api/v1/services/{unit}/{action}            │
│  Forgejo     │   │  ├── /api/v1/power/{action}                      │
│  Vaultwarden │   │  ├── /api/v1/network/{wifi,bluetooth}            │
│  Prometheus  │   │  ├── /api/v1/logs/stream   (SSE)                 │
│  ntfy        │   │  ├── /api/v1/health                              │
└──────────────┘   │  └── /metrics             (Prometheus)           │
                   └─────────────────────────────────────────────────┘
```

### Deployment Topology

| Component | Host | Process | Transport |
|-----------|------|---------|-----------|
| nginx | server | `nginx.service` | TCP 80/443 |
| Next.js frontend | server | `panel-frontend.service` | TCP 3002 (loopback) |
| panel-agent | laptop | `panel-agent.service` (socket-activated) | Unix `/run/panel-agent/panel-agent.sock` |
| Grafana | server | `grafana.service` | TCP 3001 (loopback) |

nginx on the server proxies `/api/agent/laptop/*` to the panel-agent socket via a
`proxy_pass http://unix:/run/panel-agent/panel-agent.sock` upstream. For multi-host support
(Phase 2) additional upstream blocks are generated from `managedHosts`.

### Request Flow

1. Browser → HTTPS → nginx
2. nginx → Next.js (port 3002) for all non-agent, non-grafana paths
3. Next.js API route `/api/agent/[host]/[...path]` → nginx upstream → agent Unix socket
4. Agent reads procfs / calls D-Bus / tails journald → responds via Unix socket
5. nginx streams response back to Next.js → back to browser

SSE responses travel the same path; nginx is configured with `proxy_read_timeout 60s` and
`proxy_buffering off` to keep the stream alive.


---

## Directory Structure

### Application Source (`nixos/l7v-panel/`)

```
l7v-panel/
├── apps/
│   ├── web/                              # Next.js 16 frontend
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx               # Root layout with sidebar nav
│   │   │   ├── page.tsx                 # Dashboard (metrics overview)
│   │   │   ├── services/
│   │   │   │   └── page.tsx             # Service list + control
│   │   │   ├── power/
│   │   │   │   └── page.tsx             # Power control
│   │   │   ├── network/
│   │   │   │   └── page.tsx             # Network + Bluetooth
│   │   │   ├── logs/
│   │   │   │   └── page.tsx             # Log streaming
│   │   │   ├── monitoring/
│   │   │   │   └── page.tsx             # Grafana iframe embed
│   │   │   └── integrations/
│   │   │       └── page.tsx             # Forgejo / Vaultwarden health
│   │   ├── api/
│   │   │   └── agent/
│   │   │       └── [host]/
│   │   │           └── [...path]/
│   │   │               └── route.ts     # Agent proxy (streaming-capable)
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx           # Host selector + theme toggle
│   │   │   │   └── NavItem.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── MetricCard.tsx
│   │   │   │   ├── CpuChart.tsx
│   │   │   │   ├── MemoryBar.tsx
│   │   │   │   ├── DiskTable.tsx
│   │   │   │   └── NetworkChart.tsx
│   │   │   ├── services/
│   │   │   │   ├── ServiceTable.tsx
│   │   │   │   ├── ServiceRow.tsx
│   │   │   │   └── ServiceBadge.tsx
│   │   │   ├── power/
│   │   │   │   ├── PowerButton.tsx
│   │   │   │   └── ConfirmDialog.tsx
│   │   │   ├── network/
│   │   │   │   ├── WifiCard.tsx
│   │   │   │   └── BluetoothCard.tsx
│   │   │   ├── logs/
│   │   │   │   ├── LogViewer.tsx
│   │   │   │   ├── LogEntry.tsx
│   │   │   │   └── LogFilters.tsx
│   │   │   └── shared/
│   │   │       ├── StatusBadge.tsx      # Reusable coloured badge
│   │   │       ├── LoadingSkeleton.tsx
│   │   │       ├── ErrorToast.tsx
│   │   │       └── HostSelector.tsx
│   │   ├── hooks/
│   │   │   ├── useMetrics.ts
│   │   │   ├── useServices.ts
│   │   │   ├── usePower.ts
│   │   │   ├── useNetwork.ts
│   │   │   └── useLogs.ts              # SSE hook with reconnect
│   │   ├── lib/
│   │   │   ├── agent-client.ts          # fetch wrapper for /api/agent/*
│   │   │   ├── thresholds.ts            # badge classifier pure function
│   │   │   ├── backoff.ts               # exponential back-off calculator
│   │   │   └── priority-color.ts        # log priority → color mapping
│   │   ├── store/
│   │   │   ├── host-store.ts            # Zustand — selected host + localStorage
│   │   │   └── theme-store.ts           # Zustand — light/dark theme
│   │   ├── types/
│   │   │   └── api.ts                   # All TypeScript API types
│   │   ├── actions/                     # Next.js server actions
│   │   │   ├── forgejo.ts
│   │   │   ├── vaultwarden.ts
│   │   │   ├── prometheus.ts
│   │   │   └── ntfy.ts
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── agent/                           # Go binary
│       ├── cmd/
│       │   └── panel-agent/
│       │       └── main.go              # Entry point; socket activation
│       ├── internal/
│       │   ├── api/
│       │   │   ├── router.go            # ServeMux wiring
│       │   │   ├── metrics.go           # /api/v1/metrics handler
│       │   │   ├── services.go          # /api/v1/services handlers
│       │   │   ├── power.go             # /api/v1/power handlers
│       │   │   ├── network.go           # /api/v1/network handlers
│       │   │   ├── logs.go              # /api/v1/logs/stream SSE handler
│       │   │   ├── health.go            # /api/v1/health handler
│       │   │   ├── prommetrics.go       # /metrics Prometheus handler
│       │   │   └── middleware.go        # Request ID, logging, error wrap
│       │   ├── dbus/
│       │   │   ├── interface.go         # DBusClient interface (mockable)
│       │   │   ├── systemd.go           # org.freedesktop.systemd1 impl
│       │   │   ├── logind.go            # org.freedesktop.login1 impl
│       │   │   ├── networkmanager.go    # org.freedesktop.NetworkManager impl
│       │   │   └── bluez.go             # org.bluez impl
│       │   ├── metrics/
│       │   │   ├── procfs.go            # /proc/stat, /proc/meminfo reader
│       │   │   └── types.go             # MetricsSnapshot struct
│       │   └── journal/
│       │       ├── reader.go            # journald tail (sdjournal binding)
│       │       └── types.go             # LogEntry struct
│       ├── go.mod
│       ├── go.sum
│       └── gomod2nix.toml
├── packages/
│   └── ui/                              # Shared shadcn/ui components
│       ├── components/
│       │   └── (re-exported shadcn components)
│       ├── package.json
│       └── tsconfig.json
├── package.json                         # pnpm workspace root
├── pnpm-workspace.yaml
├── turbo.json
└── flake.nix                            # Dev shell (Go + Node + pnpm)
```

### NixOS Repository Additions

```
nixos/
├── l7v-panel/                           # (above)
├── services/
│   └── panel/
│       └── default.nix                  # NixOS module (agent + frontend)
└── platform/
    └── pkgs/
        ├── panel-agent/
        │   └── default.nix              # buildGoModule derivation
        └── panel-frontend/
            └── default.nix              # mkDerivation (Node/Next.js)
```


---

## Agent Design (Go)

### Package Layout and Responsibilities

| Package | Responsibility |
|---------|---------------|
| `cmd/panel-agent` | Entry point: socket activation, slog setup, dependency wiring, graceful shutdown |
| `internal/api` | HTTP router, handlers, middleware (request ID, structured logging, error wrapping) |
| `internal/dbus` | D-Bus client interface + concrete implementations for systemd, logind, NM, BlueZ |
| `internal/metrics` | Procfs readers for CPU (`/proc/stat`), memory (`/proc/meminfo`), disk (`/proc/mounts` + `syscall.Statfs`), network (`/proc/net/dev`) |
| `internal/journal` | Journal tail reader using `github.com/coreos/go-systemd/sdjournal`; goroutine-per-client with context cancellation |

### D-Bus Interface (Mockable)

All D-Bus interactions are behind a single `DBusClient` interface, enabling unit tests to inject
a mock without a running systemd/NetworkManager.

```go
// internal/dbus/interface.go

package dbus

import "context"

// SystemdClient interacts with org.freedesktop.systemd1.
type SystemdClient interface {
    ListUnits(ctx context.Context) ([]UnitStatus, error)
    StartUnit(ctx context.Context, unit string) error
    StopUnit(ctx context.Context, unit string) error
    EnableUnit(ctx context.Context, unit string) error
    DisableUnit(ctx context.Context, unit string) error
    HealthCheck(ctx context.Context) error
}

// LogindClient interacts with org.freedesktop.login1.
type LogindClient interface {
    PowerOff(ctx context.Context) error
    Reboot(ctx context.Context) error
    Suspend(ctx context.Context) error
    HealthCheck(ctx context.Context) error
}

// NetworkClient interacts with org.freedesktop.NetworkManager.
type NetworkClient interface {
    GetWifiStatus(ctx context.Context) (*WifiStatus, error)
    ToggleWifi(ctx context.Context) error
}

// BluetoothClient interacts with org.bluez.
type BluetoothClient interface {
    GetBluetoothStatus(ctx context.Context) (*BluetoothStatus, error)
    ToggleBluetooth(ctx context.Context) error
}

// UnitStatus mirrors the D-Bus UnitStatus struct from org.freedesktop.systemd1.Manager.ListUnits.
type UnitStatus struct {
    Name            string
    Description     string
    LoadState       string
    ActiveState     string
    SubState        string
    UnitFileState   string
}

type WifiStatus struct {
    Enabled   bool
    SSID      *string
    SignalDBm  *int32
    IPAddress *string
}

type BluetoothStatus struct {
    Enabled bool
    Devices []BTDevice
}

type BTDevice struct {
    Name      string
    Address   string
    Connected bool
}
```

### HTTP Router Setup (stdlib ServeMux)

```go
// internal/api/router.go

package api

import (
    "log/slog"
    "net/http"
    "github.com/l7v/panel-agent/internal/dbus"
    "github.com/l7v/panel-agent/internal/journal"
    "github.com/l7v/panel-agent/internal/metrics"
)

type Deps struct {
    Systemd    dbus.SystemdClient
    Logind     dbus.LogindClient
    Network    dbus.NetworkClient
    Bluetooth  dbus.BluetoothClient
    Procfs     metrics.ProcfsReader
    Journal    journal.Reader
    Logger     *slog.Logger
    Version    string
    Thresholds metrics.Thresholds
}

func NewRouter(d Deps) http.Handler {
    mux := http.NewServeMux()

    mux.Handle("GET /api/v1/health",                     healthHandler(d))
    mux.Handle("GET /api/v1/metrics",                    metricsHandler(d))
    mux.Handle("GET /api/v1/services",                   listServicesHandler(d))
    mux.Handle("POST /api/v1/services/{unit}/start",     serviceActionHandler(d, "start"))
    mux.Handle("POST /api/v1/services/{unit}/stop",      serviceActionHandler(d, "stop"))
    mux.Handle("POST /api/v1/services/{unit}/enable",    serviceActionHandler(d, "enable"))
    mux.Handle("POST /api/v1/services/{unit}/disable",   serviceActionHandler(d, "disable"))
    mux.Handle("POST /api/v1/power/shutdown",            powerHandler(d, "shutdown"))
    mux.Handle("POST /api/v1/power/reboot",              powerHandler(d, "reboot"))
    mux.Handle("POST /api/v1/power/sleep",               powerHandler(d, "sleep"))
    mux.Handle("GET /api/v1/network/wifi",               wifiStatusHandler(d))
    mux.Handle("POST /api/v1/network/wifi/toggle",       wifiToggleHandler(d))
    mux.Handle("GET /api/v1/network/bluetooth",          bluetoothStatusHandler(d))
    mux.Handle("POST /api/v1/network/bluetooth/toggle",  bluetoothToggleHandler(d))
    mux.Handle("GET /api/v1/logs/stream",                logsStreamHandler(d))
    mux.Handle("GET /metrics",                           prometheusHandler(d))

    return withMiddleware(mux, d.Logger)
}
```

### Systemd Socket Activation

```go
// cmd/panel-agent/main.go  (sketch)

package main

import (
    "context"
    "log/slog"
    "net"
    "net/http"
    "os"
    "os/signal"
    "syscall"

    "github.com/coreos/go-systemd/v22/activation"
    "github.com/l7v/panel-agent/internal/api"
    "github.com/l7v/panel-agent/internal/dbus"
    "github.com/l7v/panel-agent/internal/journal"
    "github.com/l7v/panel-agent/internal/metrics"
)

func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
    }))

    // Receive listener from systemd socket activation (sd_listen_fds).
    // Falls back to a manual Unix socket when run directly (development).
    listeners, err := activation.Listeners()
    var ln net.Listener
    if err != nil || len(listeners) == 0 {
        const sockPath = "/run/panel-agent/panel-agent.sock"
        ln, err = net.Listen("unix", sockPath)
        if err != nil {
            logger.Error("listen failed", "err", err)
            os.Exit(1)
        }
    } else {
        ln = listeners[0]
    }

    systemd, _ := dbus.NewSystemdClient()
    logind, _  := dbus.NewLogindClient()
    network, _ := dbus.NewNetworkClient()
    bt, _      := dbus.NewBluetoothClient()

    deps := api.Deps{
        Systemd:   systemd,
        Logind:    logind,
        Network:   network,
        Bluetooth: bt,
        Procfs:    metrics.NewProcfsReader(),
        Journal:   journal.NewReader(),
        Logger:    logger,
        Version:   version, // injected at build time via -ldflags
    }

    srv := &http.Server{Handler: api.NewRouter(deps)}

    ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
    defer stop()

    go srv.Serve(ln)
    <-ctx.Done()
    srv.Shutdown(context.Background())
}
```

### SSE Implementation

Each SSE client gets its own goroutine. When the client disconnects, the request context is
cancelled, which unblocks the journal tail loop via `select`.

```go
// internal/api/logs.go  (sketch)

func logsStreamHandler(d Deps) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        unit     := r.URL.Query().Get("unit")
        priority := r.URL.Query().Get("priority")

        w.Header().Set("Content-Type", "text/event-stream")
        w.Header().Set("Cache-Control", "no-cache")
        w.Header().Set("X-Accel-Buffering", "no") // disable nginx buffering
        w.WriteHeader(http.StatusOK)
        flusher := w.(http.Flusher)

        entries := make(chan journal.LogEntry, 64)
        errCh   := make(chan error, 1)

        go d.Journal.Tail(r.Context(), journal.TailOptions{
            Unit:            unit,
            MinPriority:     parsePriority(priority),
            Out:             entries,
            Err:             errCh,
        })

        for {
            select {
            case <-r.Context().Done():
                return
            case err := <-errCh:
                fmt.Fprintf(w, "event: error\ndata: %s\n\n",
                    mustJSON(map[string]string{"message": err.Error()}))
                flusher.Flush()
                return
            case entry := <-entries:
                fmt.Fprintf(w, "data: %s\n\n", mustJSON(entry))
                flusher.Flush()
            }
        }
    }
}
```

### Structured Logging (slog)

All handlers log at INFO with a consistent field set:

```go
// internal/api/middleware.go  (sketch)

func withMiddleware(next http.Handler, logger *slog.Logger) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        reqID := r.Header.Get("X-Request-ID")
        if reqID == "" {
            reqID = newUUIDv4()
        }
        rw := &responseWriter{ResponseWriter: w, status: 200}
        r    = r.WithContext(context.WithValue(r.Context(), ctxKeyReqID, reqID))
        start := time.Now()

        next.ServeHTTP(rw, r)

        logger.InfoContext(r.Context(), "request",
            "method",     r.Method,
            "path",       r.URL.Path,
            "status",     rw.status,
            "duration_ms", time.Since(start).Milliseconds(),
            "request_id", reqID,
        )
    })
}
```


---

## Frontend Design (Next.js 16)

### App Router Structure

```
app/
├── layout.tsx           # RootLayout: html > body > ThemeProvider > SidebarLayout
├── globals.css          # Tailwind base + CSS variables for light/dark tokens
├── page.tsx             # Dashboard — metrics polling
├── services/page.tsx    # Service list table + action buttons
├── power/page.tsx       # Three power buttons + confirmation dialog
├── network/page.tsx     # WiFi card + Bluetooth card + toggles
├── logs/page.tsx        # Log viewer + filter bar (SSE)
├── monitoring/page.tsx  # Grafana iframe
└── integrations/page.tsx # Forgejo / Vaultwarden health via server actions
```

### Server-Side Agent Proxy Route (Streaming-Capable)

The catch-all route at `app/api/agent/[host]/[...path]/route.ts` forwards every request to
the agent via an internal HTTP call. It passes through body, headers (except host), and supports
streaming responses so SSE events reach the browser without buffering.

```typescript
// app/api/agent/[host]/[...path]/route.ts

import { NextRequest } from "next/server";

const AGENT_BASE = process.env.AGENT_BASE_URL ?? "http://unix:/run/panel-agent/panel-agent.sock:";

export async function GET(
  request: NextRequest,
  { params }: { params: { host: string; path: string[] } }
) {
  return proxyToAgent(request, params.host, params.path, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: { host: string; path: string[] } }
) {
  return proxyToAgent(request, params.host, params.path, "POST");
}

async function proxyToAgent(
  request: NextRequest,
  host: string,
  pathSegments: string[],
  method: string
): Promise<Response> {
  const agentPath = "/" + pathSegments.join("/");
  const search    = request.nextUrl.search;
  const url       = `${AGENT_BASE}${agentPath}${search}`;

  const upstreamReq = new Request(url, {
    method,
    headers: {
      "X-Request-ID": request.headers.get("X-Request-ID") ?? crypto.randomUUID(),
    },
    body: method === "POST" ? request.body : undefined,
    // @ts-expect-error — Node.js fetch supports duplex for streaming
    duplex: "half",
  });

  const upstream = await fetch(upstreamReq);

  // Stream SSE directly without buffering.
  return new Response(upstream.body, {
    status:  upstream.status,
    headers: upstream.headers,
  });
}
```

In the NixOS systemd unit for the frontend, `AGENT_BASE_URL` is set to
`http+unix://%2Frun%2Fpanel-agent%2Fpanel-agent.sock/` so that Node.js targets the Unix socket.
For multi-host (Phase 2), a map of `host → socket path` is injected as environment variables.

### Zustand Store Definitions

```typescript
// store/host-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface HostStore {
  selectedHost: string;
  availableHosts: string[];
  setHost: (host: string) => void;
}

export const useHostStore = create<HostStore>()(
  persist(
    (set) => ({
      selectedHost:    "laptop",
      availableHosts:  ["laptop"],
      setHost: (host) => set({ selectedHost: host }),
    }),
    { name: "l7v-panel-host" }   // key in localStorage
  )
);
```

```typescript
// store/theme-store.ts
import { create } from "zustand";

type Theme = "light" | "dark" | "system";

interface ThemeStore {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const useThemeStore = create<ThemeStore>()((set) => ({
  theme:    "system",
  setTheme: (theme) => set({ theme }),
}));
```

### TanStack Query Hooks Per Feature

```typescript
// hooks/useMetrics.ts
import { useQuery } from "@tanstack/react-query";
import { fetchAgent } from "@/lib/agent-client";
import { useHostStore } from "@/store/host-store";
import type { MetricsSnapshot } from "@/types/api";

export function useMetrics() {
  const host = useHostStore((s) => s.selectedHost);
  return useQuery<MetricsSnapshot>({
    queryKey:  ["metrics", host],
    queryFn:   () => fetchAgent<MetricsSnapshot>(host, "/api/v1/metrics"),
    refetchInterval: 5_000,
    staleTime:       4_000,
  });
}

// hooks/useServices.ts  — 2s poll
export function useServices() { /* refetchInterval: 2_000 */ }

// hooks/usePower.ts  — mutations for shutdown/reboot/sleep
export function usePowerMutation(action: "shutdown" | "reboot" | "sleep") {
  const host = useHostStore((s) => s.selectedHost);
  return useMutation({
    mutationFn: () => fetchAgent(host, `/api/v1/power/${action}`, { method: "POST" }),
  });
}

// hooks/useNetwork.ts  — GET wifi + bluetooth, mutations for toggles
// hooks/useLogs.ts     — SSE with exponential back-off (custom hook, not useQuery)
```

### Component Tree for Each Page

**Dashboard** (`page.tsx`)
```
DashboardPage
├── MetricCard [CPU]      — useMetrics().data.cpu
├── MetricCard [RAM]      — useMetrics().data.memory
├── DiskTable             — useMetrics().data.disks (refetch 30s)
└── NetworkChart          — useMetrics().data.network
```

**Services** (`services/page.tsx`)
```
ServicesPage
├── Input [filter]        — local state, debounced 100ms
└── ServiceTable
    └── ServiceRow × N
        ├── ServiceBadge [active_state/sub_state]
        └── ActionButtons [Start | Stop | Enable | Disable]
```

**Power** (`power/page.tsx`)
```
PowerPage
├── PowerButton [Shutdown]  → opens ConfirmDialog
├── PowerButton [Reboot]    → opens ConfirmDialog
└── PowerButton [Sleep]     → opens ConfirmDialog
    └── ConfirmDialog (modal, shadcn Dialog)
```

**Network** (`network/page.tsx`)
```
NetworkPage
├── WifiCard
│   ├── Toggle [enable/disable]
│   ├── SSID display
│   └── Signal strength bar
└── BluetoothCard
    ├── Toggle [enable/disable]
    └── DeviceList × N (name, address, connected badge)
```

**Logs** (`logs/page.tsx`)
```
LogsPage
├── LogFilters
│   ├── Input [unit filter]
│   └── Select [min priority]
└── LogViewer (virtualized list, max 1000 entries)
    └── LogEntry × N (timestamp, unit, priority badge, message)
```

**Monitoring** (`monitoring/page.tsx`)
```
MonitoringPage
├── ErrorBanner (shown when iframe fails to load)
└── iframe [src="/grafana/"]
```

### Integration Clients (Server Actions)

All external service calls from the frontend use Next.js Server Actions so that credentials and
internal URLs never reach the browser. Each action runs on the server host.

```typescript
// actions/forgejo.ts
"use server";
export async function getForgejoStats(): Promise<ForgejoStats> {
  const res = await fetch("https://git.l7v.dev/api/v1/repos/search?limit=50", {
    headers: { Authorization: `token ${process.env.FORGEJO_TOKEN}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Forgejo API ${res.status}`);
  return res.json();
}

// actions/vaultwarden.ts
"use server";
export async function getVaultwardenHealth(): Promise<{ alive: boolean }> {
  const res = await fetch("https://vault.l7v.dev/api/health_check", {
    next: { revalidate: 30 },
  });
  return { alive: res.ok };
}

// actions/prometheus.ts
"use server";
export async function queryPrometheus(query: string): Promise<PrometheusResult> {
  const url = new URL("http://127.0.0.1:9090/api/v1/query");
  url.searchParams.set("query", query);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Prometheus ${res.status}`);
  return res.json();
}

// actions/ntfy.ts
"use server";
export async function publishNtfy(topic: string, message: string): Promise<void> {
  await fetch(`https://ntfy.l7v.dev/${topic}`, {
    method:  "POST",
    body:    message,
    headers: { Authorization: `Bearer ${process.env.NTFY_TOKEN}` },
  });
}
```


---

## NixOS Module Design

### Full Option Schema

```nix
# services/panel/default.nix
options.l7v.services.panel = {
  agent = {
    enable = lib.mkEnableOption "panel-agent systemd-socket service";

    socketPath = lib.mkOption {
      type    = lib.types.str;
      default = "/run/panel-agent/panel-agent.sock";
      description = "Unix socket path for the agent listener.";
    };

    managedHosts = lib.mkOption {
      type        = lib.types.attrsOf lib.types.str;
      default     = {};
      example     = { laptop = "/run/panel-agent/panel-agent.sock"; };
      description = "Map of logical host names to upstream Unix socket paths.";
    };

    metricsThresholds = {
      cpuWarnPct  = lib.mkOption { type = lib.types.int; default = 70; };
      cpuCritPct  = lib.mkOption { type = lib.types.int; default = 90; };
      ramWarnPct  = lib.mkOption { type = lib.types.int; default = 80; };
      ramCritPct  = lib.mkOption { type = lib.types.int; default = 95; };
      diskWarnPct = lib.mkOption { type = lib.types.int; default = 80; };
      diskCritPct = lib.mkOption { type = lib.types.int; default = 90; };
    };

    prometheusWidget = lib.mkOption {
      type    = lib.types.bool;
      default = false;
      description = "Enable /api/v1/metrics/query Prometheus proxy endpoint.";
    };
  };

  frontend = {
    enable = lib.mkEnableOption "panel-frontend Next.js service + nginx vhost";

    domain = lib.mkOption {
      type    = lib.types.str;
      default = "panel.l7v.dev";
      description = "Public FQDN for the panel frontend.";
    };

    port = lib.mkOption {
      type    = lib.types.port;
      default = 3002;
      description = "Local TCP port the Next.js server listens on.";
    };

    allowedCIDRs = lib.mkOption {
      type        = lib.types.listOf lib.types.str;
      default     = [ "127.0.0.1/32" ];
      example     = [ "10.0.0.0/8" "192.168.1.0/24" ];
      description = "CIDR ranges allowed to access panel.l7v.dev (nginx allow/deny).";
    };
  };
};
```

### Assertions

```nix
assertions = [
  {
    assertion = config.l7v.reverseProxy.enable;
    message = "l7v.services.panel.frontend requires l7v.reverseProxy.enable = true";
  }
];
```

### Systemd Units

```nix
# Socket unit (laptop host)
systemd.sockets.panel-agent = {
  description = "panel-agent Unix socket";
  wantedBy    = [ "sockets.target" ];
  socketConfig = {
    ListenStream = cfg.agent.socketPath;
    SocketUser   = "panel-agent";
    SocketMode   = "0600";
  };
};

# Service unit (laptop host)
systemd.services.panel-agent = {
  description   = "panel-agent REST/SSE API";
  after         = [ "network.target" "dbus.service" ];
  requires      = [ "panel-agent.socket" ];
  serviceConfig = {
    Type             = "notify";
    ExecStart        = "${pkgs.panel-agent}/bin/panel-agent";
    User             = "panel-agent";
    Group            = "panel-agent";
    Restart          = "on-failure";
    RestartSec       = 5;
    StandardOutput   = "journal";
    StandardError    = "journal";
    # Hardening
    NoNewPrivileges  = true;
    ProtectSystem    = "strict";
    ProtectHome      = true;
    PrivateTmp       = true;
    ReadWritePaths   = [ "/run/panel-agent" ];
    # Environment — threshold values injected from NixOS module options
    Environment = [
      "PANEL_CPU_WARN=${toString cfg.agent.metricsThresholds.cpuWarnPct}"
      "PANEL_CPU_CRIT=${toString cfg.agent.metricsThresholds.cpuCritPct}"
      "PANEL_RAM_WARN=${toString cfg.agent.metricsThresholds.ramWarnPct}"
      "PANEL_RAM_CRIT=${toString cfg.agent.metricsThresholds.ramCritPct}"
      "PANEL_DISK_WARN=${toString cfg.agent.metricsThresholds.diskWarnPct}"
      "PANEL_DISK_CRIT=${toString cfg.agent.metricsThresholds.diskCritPct}"
      "PANEL_PROMETHEUS_WIDGET=${if cfg.agent.prometheusWidget then "1" else "0"}"
    ];
  };
};

# Frontend service unit (server host)
systemd.services.panel-frontend = {
  description   = "panel-frontend Next.js server";
  wantedBy      = [ "multi-user.target" ];
  after         = [ "network.target" ];
  environment   = {
    NODE_ENV         = "production";
    PORT             = toString cfg.frontend.port;
    AGENT_BASE_URL   = "http+unix://%2Frun%2Fpanel-agent%2Fpanel-agent.sock/";
    # FORGEJO_TOKEN, NTFY_TOKEN injected via EnvironmentFile from sops (Phase 2)
  };
  serviceConfig = {
    Type           = "simple";
    ExecStart      = "${pkgs.panel-frontend}/bin/server.js";
    WorkingDirectory = "${pkgs.panel-frontend}";
    Restart        = "on-failure";
    RestartSec     = 5;
    StandardOutput = "journal";
    StandardError  = "journal";
  };
};
```

### System User

```nix
users.users.panel-agent = {
  isSystemUser = true;
  group        = "panel-agent";
  description  = "panel-agent service account";
  extraGroups  = [ "systemd-journal" ];  # journal read access
};
users.groups.panel-agent = {};
```

### Polkit Rules

```nix
security.polkit.extraConfig = ''
  // panel-agent: service control and power management
  polkit.addRule(function(action, subject) {
    var allowed_actions = [
      "org.freedesktop.systemd1.manage-units",
      "org.freedesktop.login1.power-off",
      "org.freedesktop.login1.reboot",
      "org.freedesktop.login1.suspend",
    ];
    if (allowed_actions.indexOf(action.id) >= 0 &&
        subject.user === "panel-agent") {
      return polkit.Result.YES;
    }
  });
'';
```

### nginx Virtual Host

```nix
services.nginx.virtualHosts.${cfg.frontend.domain} = {
  forceSSL   = true;
  enableACME = true;

  extraConfig = lib.concatMapStringsSep "\n"
    (cidr: "allow ${cidr};")
    cfg.frontend.allowedCIDRs
    + "\ndeny all;";

  # Security headers
  # Note: Phase 2 will add JWT RS256 auth via SOPS-managed keys.
  # X-Frame-Options is SAMEORIGIN to allow Grafana embed within the panel only.
  locations."/" = {
    proxyPass = "http://127.0.0.1:${toString cfg.frontend.port}";
    extraConfig = ''
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-Proto $scheme;
      add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
      add_header X-Frame-Options "SAMEORIGIN" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    '';
  };

  # Agent proxy: Unix socket upstream, long timeout for SSE.
  # proxy_buffering off is essential for SSE to reach the browser.
  locations."/api/agent/" = {
    extraConfig = ''
      proxy_pass http://unix:/run/panel-agent/panel-agent.sock;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_read_timeout 60s;
      proxy_buffering off;
    '';
  };

  # Grafana embed proxy — same IP allowlist applies at vhost level.
  locations."/grafana/" = {
    proxyPass = "http://127.0.0.1:3001/";
    extraConfig = ''
      proxy_set_header Host grafana.l7v.dev;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-Proto $scheme;
    '';
  };
};
```

### Grafana `allow_embedding` Patch

Applied in the Grafana service module (or via `services/panel/default.nix` when
`l7v.services.panel.frontend.enable = true`):

```nix
services.grafana.settings.security.allow_embedding = true;
```

This is set unconditionally when both `l7v.services.grafana.enable` and
`l7v.services.panel.frontend.enable` are true. The NixOS module includes the assertion:

```nix
{
  assertion = config.l7v.services.grafana.enable -> config.services.grafana.settings.security.allow_embedding;
  message   = "Grafana allow_embedding must be true when panel frontend is enabled.";
}
```


---

## Nix Derivation Design

### Agent: `buildGoModule`

```nix
# platform/pkgs/panel-agent/default.nix
{ lib, buildGoModule }:

buildGoModule rec {
  pname   = "panel-agent";
  version = "0.1.0";

  # Source is the local l7v-panel directory in this repo.
  # Using a relative path means `nix build` always tracks the working-tree version.
  src = lib.cleanSource ../../../l7v-panel/apps/agent;

  # Regenerate with: cd l7v-panel/apps/agent && gomod2nix
  vendorHash = "<sha256 from gomod2nix>";

  ldflags = [
    "-s" "-w"
    "-X main.version=${version}"
  ];

  meta = with lib; {
    description = "panel-agent: REST/SSE API for l7v-panel";
    license     = licenses.mit;
    mainProgram = "panel-agent";
    platforms   = [ "x86_64-linux" "aarch64-linux" ];
  };
}
```

Dependency hashes are pinned via `gomod2nix.toml` in `apps/agent/`. Update with:

```bash
cd l7v-panel/apps/agent
gomod2nix generate
# commit gomod2nix.toml and update vendorHash in default.nix
```

### Frontend: `mkDerivation` (Node/Next.js)

```nix
# platform/pkgs/panel-frontend/default.nix
{
  lib,
  stdenv,
  nodejs_22,
  pnpm_9,
}:

stdenv.mkDerivation rec {
  pname   = "panel-frontend";
  version = "0.1.0";

  src = lib.cleanSource ../../../l7v-panel;

  nativeBuildInputs = [ nodejs_22 pnpm_9 ];

  # pnpm offline store is pre-fetched and injected via fetchPnpmDeps.
  # Hash: run `nix run nixpkgs#prefetch-pnpm-deps -- l7v-panel/pnpm-lock.yaml`
  pnpmDeps = pnpm_9.fetchDeps {
    inherit pname version src;
    hash = "<sha256 from prefetch-pnpm-deps>";
  };

  buildPhase = ''
    runHook preBuild
    export HOME=$TMPDIR
    pnpm install --frozen-lockfile --offline
    pnpm --filter @l7v-panel/web run build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p $out
    # Next.js standalone output bundles server.js + static assets.
    cp -r apps/web/.next/standalone/. $out/
    cp -r apps/web/.next/static         $out/apps/web/.next/static
    cp -r apps/web/public               $out/apps/web/public
    # Wrap server.js to be directly executable.
    wrapProgram $out/apps/web/server.js \
      --prefix PATH : ${lib.makeBinPath [ nodejs_22 ]}
    runHook postInstall
  '';

  meta = with lib; {
    description = "panel-frontend: Next.js 16 web UI for l7v-panel";
    license     = licenses.mit;
    mainProgram = "server.js";
    platforms   = [ "x86_64-linux" "aarch64-linux" ];
  };
}
```

`next.config.ts` must include `output: "standalone"` for this to work:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  // ...
};
```


---

## Complete API Table

All endpoints are served by the agent over the Unix socket.
The nginx proxy strips the `/api/agent/{host}` prefix before forwarding.

| Method | Path | Query Params | Request Body | Response Schema | Status Codes |
|--------|------|-------------|--------------|-----------------|--------------|
| GET | `/api/v1/health` | — | — | `{"status":"ok","version":"<semver>"}` or `{"status":"degraded","message":"<str>"}` | 200, 503 |
| GET | `/api/v1/metrics` | — | — | `MetricsSnapshot` (see Data Models) | 200, 503 |
| GET | `/api/v1/services` | — | — | `ServiceUnit[]` | 200, 503 |
| POST | `/api/v1/services/{unit}/start` | — | — | `{"unit":"<str>","status":"started"}` | 200, 422, 503 |
| POST | `/api/v1/services/{unit}/stop` | — | — | `{"unit":"<str>","status":"stopped"}` | 200, 422, 503 |
| POST | `/api/v1/services/{unit}/enable` | — | — | `{"unit":"<str>","status":"enabled"}` | 200, 422, 503 |
| POST | `/api/v1/services/{unit}/disable` | — | — | `{"unit":"<str>","status":"disabled"}` | 200, 422, 503 |
| POST | `/api/v1/power/shutdown` | — | — | `{"action":"shutdown","status":"initiated"}` | 200, 503 |
| POST | `/api/v1/power/reboot` | — | — | `{"action":"reboot","status":"initiated"}` | 200, 503 |
| POST | `/api/v1/power/sleep` | — | — | `{"action":"sleep","status":"initiated"}` | 200, 503 |
| GET | `/api/v1/network/wifi` | — | — | `WifiStatus` | 200, 503 |
| POST | `/api/v1/network/wifi/toggle` | — | — | `WifiStatus` | 200, 503 |
| GET | `/api/v1/network/bluetooth` | — | — | `BluetoothStatus` | 200, 503 |
| POST | `/api/v1/network/bluetooth/toggle` | — | — | `BluetoothStatus` | 200, 503 |
| GET | `/api/v1/logs/stream` | `unit=<str>`, `priority=0-7` | — | SSE stream of `LogEntry` events | 200 (stream), 503 |
| GET | `/api/v1/metrics/query` | `query=<promql>` | — | Prometheus JSON response | 200, 400, 503 |
| GET | `/metrics` | — | — | Prometheus text format | 200 |

**Error body schema** (all non-2xx non-SSE responses):
```json
{
  "message": "<human-readable description>",
  "unit":    "<systemd unit name if applicable>",
  "operation": "<action name if applicable>",
  "action":  "<power action if applicable>",
  "interface": "<network interface if applicable>"
}
```
All fields except `"message"` are optional and present only when relevant.

**Response Headers** (all responses):
- `Content-Type: application/json` — non-SSE
- `Content-Type: text/event-stream; Cache-Control: no-cache` — SSE
- `X-Request-ID: <uuid>` — always


---

## Data Models

### Go Structs (Agent)

```go
// internal/metrics/types.go

package metrics

type Thresholds struct {
    CPUWarnPct   int
    CPUCritPct   int
    RAMWarnPct   int
    RAMCritPct   int
    DiskWarnPct  int
    DiskCritPct  int
}

type CPUStats struct {
    UsagePct float64 `json:"usage_pct"`
}

type MemoryStats struct {
    TotalMiB     uint64  `json:"total_mib"`
    UsedMiB      uint64  `json:"used_mib"`
    UsagePct     float64 `json:"usage_pct"`
}

type DiskStats struct {
    Mount      string  `json:"mount"`
    FSType     string  `json:"fs_type"`
    TotalGiB   float64 `json:"total_gib"`
    UsedGiB    float64 `json:"used_gib"`
    AvailGiB   float64 `json:"avail_gib"`
    UsagePct   float64 `json:"usage_pct"`
}

type NetStats struct {
    Interface  string  `json:"interface"`
    RxKBps     float64 `json:"rx_kbps"`
    TxKBps     float64 `json:"tx_kbps"`
}

type MetricsSnapshot struct {
    CPU       CPUStats    `json:"cpu"`
    Memory    MemoryStats `json:"memory"`
    Disks     []DiskStats `json:"disks"`
    Network   []NetStats  `json:"network"`
    Timestamp time.Time   `json:"timestamp"`
}
```

```go
// internal/dbus/interface.go  (continued)

package dbus

// ServiceUnit is the JSON-serialisable representation of a systemd unit.
type ServiceUnit struct {
    Name          string `json:"name"`
    Description   string `json:"description"`
    LoadState     string `json:"load_state"`
    ActiveState   string `json:"active_state"`
    SubState      string `json:"sub_state"`
    UnitFileState string `json:"unit_file_state"`
}
```

```go
// internal/journal/types.go

package journal

import "time"

type LogEntry struct {
    Timestamp time.Time `json:"timestamp"`
    Unit      string    `json:"unit"`
    Priority  int       `json:"priority"` // 0–7 per journald
    Message   string    `json:"message"`
}

type TailOptions struct {
    Unit        string
    MinPriority int
    Out         chan<- LogEntry
    Err         chan<- error
}
```

### TypeScript Interfaces (Frontend)

```typescript
// types/api.ts

export interface CPUStats {
  usage_pct: number;
}

export interface MemoryStats {
  total_mib: number;
  used_mib:  number;
  usage_pct: number;
}

export interface DiskStats {
  mount:      string;
  fs_type:    string;
  total_gib:  number;
  used_gib:   number;
  avail_gib:  number;
  usage_pct:  number;
}

export interface NetStats {
  interface: string;
  rx_kbps:   number;
  tx_kbps:   number;
}

export interface MetricsSnapshot {
  cpu:       CPUStats;
  memory:    MemoryStats;
  disks:     DiskStats[];
  network:   NetStats[];
  timestamp: string; // ISO 8601
}

export interface ServiceUnit {
  name:            string;
  description:     string;
  load_state:      string;
  active_state:    string;
  sub_state:       string;
  unit_file_state: string;
}

export interface WifiStatus {
  enabled:    boolean;
  ssid:       string | null;
  signal_dbm: number | null;
  ip_address: string | null;
}

export interface BluetoothDevice {
  name:      string;
  address:   string;
  connected: boolean;
}

export interface BluetoothStatus {
  enabled: boolean;
  devices: BluetoothDevice[];
}

export interface LogEntry {
  timestamp: string; // ISO 8601
  unit:      string;
  priority:  number; // 0–7
  message:   string;
}

export interface HealthResponse {
  status:   "ok" | "degraded";
  version?: string;
  message?: string;
}

export interface AgentError {
  message:    string;
  unit?:      string;
  operation?: string;
  action?:    string;
  interface?: string;
}

export type ThresholdLevel = "green" | "amber" | "red";

export interface Thresholds {
  warnPct: number;
  critPct: number;
}
```


---

## Integration Points

### Grafana

- **Embed**: The Monitoring page renders `<iframe src="/grafana/" />` which nginx proxies to
  `http://127.0.0.1:3001` with `Host: grafana.l7v.dev`.
- **Embedding requirement**: `services.grafana.settings.security.allow_embedding = true` must be
  set. The NixOS module sets this automatically when `panel.frontend.enable = true` and
  `l7v.services.grafana.enable = true` are both set on the same host.
- **IP allowlist**: the `/grafana/` location block sits inside the `panel.l7v.dev` vhost, so it
  inherits the same CIDR allowlist.

### Forgejo

- Accessed via a Next.js server action (`actions/forgejo.ts`) using the Forgejo REST API v1.
- The API token is injected at runtime via an environment variable (`FORGEJO_TOKEN`) read from a
  sops-managed secret (Phase 2). In Phase 1, the token is set in the systemd unit environment
  directly.
- Endpoint used: `GET /api/v1/repos/search`, `GET /api/v1/user`.

### Vaultwarden

- Accessed via a Next.js server action (`actions/vaultwarden.ts`).
- Phase 1 uses only the public `/api/health_check` endpoint — no credentials needed.
- The integrations page displays alive/down status with last-check timestamp.

### Prometheus

- The `prometheusWidget` option enables a proxy endpoint on the agent at
  `GET /api/v1/metrics/query?query=<promql>`. The agent forwards to
  `http://127.0.0.1:9090/api/v1/query` and returns the Prometheus JSON response verbatim.
- The frontend's `actions/prometheus.ts` server action calls the same Prometheus API directly
  (server-side, no agent needed) for the integrations page.

### ntfy

- Accessed via `actions/ntfy.ts` server action for publishing notifications from the panel.
- The ntfy token is injected via environment variable (`NTFY_TOKEN`) from sops (Phase 2).

---

## Build and Development

### Prerequisites

```bash
# Enter the dev shell (provides Go 1.22+, Node.js 22, pnpm 9, turbo)
cd nixos/l7v-panel
nix develop        # or direnv allow if .envrc is present
```

### Local Development

```bash
# Start the agent (requires running systemd on the dev machine, or use mock mode)
cd apps/agent
go run ./cmd/panel-agent --dev   # binds to /tmp/panel-agent-dev.sock

# Start the frontend
cd ../..
pnpm install
pnpm dev           # starts Next.js at http://localhost:3002
                   # AGENT_BASE_URL defaults to http+unix:///tmp/panel-agent-dev.sock/
```

### Turborepo Commands

```bash
pnpm build         # builds all packages (turbo build)
pnpm lint          # runs eslint across all packages (turbo lint)
pnpm typecheck     # runs tsc --noEmit across all packages (turbo typecheck)
pnpm test          # runs all test suites (turbo test)
```

### Individual Package Commands

```bash
# Frontend
pnpm --filter @l7v-panel/web dev
pnpm --filter @l7v-panel/web build
pnpm --filter @l7v-panel/web test       # vitest --run

# Agent
cd apps/agent
go build ./...
go test ./...
go test -v -count=100 ./...   # property test with 100 iterations
```

### Nix Build Commands

```bash
# Build the Go agent binary
nix build .#panel-agent

# Build the Next.js frontend
nix build .#panel-frontend

# Build both (from nixos root)
nix build .#packages.x86_64-linux.panel-agent
nix build .#packages.x86_64-linux.panel-frontend

# Validate (nixfmt + statix + deadnix + shellcheck + flake check)
./scripts/validate.sh L7V
```

### flake.nix (l7v-panel/ dev shell sketch)

```nix
{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    gomod2nix.url = "github:nix-community/gomod2nix";
  };

  outputs = { self, nixpkgs, gomod2nix }: let
    system = "x86_64-linux";
    pkgs   = nixpkgs.legacyPackages.${system};
  in {
    devShells.${system}.default = pkgs.mkShell {
      buildInputs = with pkgs; [
        go_1_22
        gomod2nix.packages.${system}.default
        nodejs_22
        nodePackages.pnpm
      ];
    };

    packages.${system} = {
      panel-agent    = pkgs.callPackage ../platform/pkgs/panel-agent {};
      panel-frontend = pkgs.callPackage ../platform/pkgs/panel-frontend {};
    };
  };
}
```

### Adding the Derivations to the Nixos Flake

In `platform/default.nix`, add the packages to `environment.systemPackages` (if needed for PATH)
or expose them via `pkgs.callPackage` in the flake outputs:

```nix
# platform/default.nix — add to imports
./pkgs/panel-agent
./pkgs/panel-frontend
```

Or expose directly in the top-level `flake.nix` outputs:

```nix
packages.x86_64-linux.panel-agent    = nixpkgs.legacyPackages.x86_64-linux.callPackage ./platform/pkgs/panel-agent {};
packages.x86_64-linux.panel-frontend = nixpkgs.legacyPackages.x86_64-linux.callPackage ./platform/pkgs/panel-frontend {};
```

### Host Configuration

```nix
# hosts/laptop/default.nix — add
l7v.services.panel.agent.enable = true;

# hosts/server/default.nix — add
l7v.services = {
  panel.frontend = {
    enable       = true;
    allowedCIDRs = [ "10.0.0.0/8" "192.168.0.0/16" ];
  };
  grafana.enable = true;   # already set; allow_embedding added by panel module
};
```


---

## Error Handling

### Agent Error Strategy

All handlers follow a consistent error-wrapping pattern via middleware:

1. **Internal errors** (procfs read failure, D-Bus disconnect): return the appropriate HTTP status
   (503) with a JSON body containing `"message"`. Never panic.
2. **Client errors** (bad path, wrong method, invalid unit name): return 404, 405, or 422 as
   appropriate.
3. **D-Bus call errors**: logged at WARN level with `slog`; the error message from the D-Bus
   layer is included in the response body.
4. **Journal open failure**: emit a final `event: error\ndata: {...}\n\n` SSE event and close
   the connection.
5. **SSE client disconnect**: the request context is cancelled; the journal tail goroutine exits
   within 1 second via the `select` on `ctx.Done()`.

```go
// writeError is the canonical error writer used by all handlers.
func writeError(w http.ResponseWriter, status int, fields map[string]string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(fields)
}
```

### Frontend Error Strategy

1. **TanStack Query** wraps all agent calls. On error, the `onError` callback triggers a toast
   notification via the `ErrorToast` component with the HTTP status and `message` field.
2. **SSE hook** (`useLogs.ts`) catches `EventSource` errors, increments the retry counter, and
   applies exponential back-off (1s base, 30s cap, 5 attempts).
3. **Grafana iframe**: an `onError` / `onLoad` check detects load failure and renders the
   `ErrorBanner` component with a retry button.
4. **Power action**: the `usePowerMutation` hook disables all Power Control buttons via a
   `isPending` state flag. After success or error, the flag resets to `false`. This reset is
   idempotent (calling it twice produces the same state).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions
of a system — essentially, a formal statement about what the system should do. Properties serve
as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Error Response Schema Invariant

*For any* request to the agent that produces a non-2xx HTTP response, the response body shall be
valid JSON, the `Content-Type` header shall be `application/json`, and the body shall contain a
`"message"` field of type string. This holds regardless of the request path, method, unit name,
or query parameters.

**Validates: Requirements 1.7, 2.9, 3.7, 4.10, 7.4, 7.5, 8.5**

### Property 2: Service List D-Bus Round-Trip

*For any* valid list of `UnitStatus` values returned by the mock D-Bus client, parsing the
D-Bus response through the agent's internal decoder and then serialising to JSON shall produce
a JSON array where each element's `name`, `description`, `load_state`, `active_state`,
`sub_state`, and `unit_file_state` fields equal the corresponding input values without mutation
or loss.

**Validates: Requirements 2.2**

### Property 3: LogEntry SSE Serialisation Round-Trip

*For any* `LogEntry` with arbitrary `timestamp` (valid RFC3339), `unit` (arbitrary string),
`priority` (0–7), and `message` (arbitrary string including Unicode and newlines), serialising
to SSE JSON format and deserialising back shall produce a structurally equal `LogEntry`.

**Validates: Requirements 5.1, 5.2**

### Property 4: Metric Threshold Badge Classification

*For any* metric value `v` (float64) and threshold pair `(warn, crit)` where `warn < crit`, the
pure `classifyThreshold(v, warn, crit)` function shall return exactly one of `{green, amber, red}`:
`green` when `v < warn`, `amber` when `warn ≤ v < crit`, `red` when `v ≥ crit`. The three cases
are mutually exclusive and exhaustive.

**Validates: Requirements 1.8**

### Property 5: SSE Reconnect Back-Off Bounds

*For any* reconnect attempt number `n` where `1 ≤ n ≤ 5`, the `computeBackoff(n)` pure function
shall return a delay `d` satisfying `1 ≤ d ≤ 30` (seconds). Furthermore, for any `n < 5`,
`computeBackoff(n+1) ≥ computeBackoff(n)` (monotonically non-decreasing).

**Validates: Requirements 5.6**

### Property 6: Power Control UI State Idempotence

*For any* power action (shutdown, reboot, or sleep) and any outcome (success or failure), applying
the `resetPowerState()` state transition to the power control reducer shall produce the same result
whether called once or twice: all buttons re-enabled, loading indicator hidden, no action pending.

**Validates: Requirements 3.9**

### Property 7: Metric Computation from Procfs

*For any* pair of valid `/proc/stat` CPU line snapshots `(s1, s2)` and any pair of
`MemTotal`/`MemAvailable` values from `/proc/meminfo`, the agent's metric computation shall satisfy:
(a) `cpu_pct = (non_idle_delta(s1, s2) / total_delta(s1, s2)) * 100`, clamped to `[0, 100]`;
(b) `used_mib = (mem_total - mem_avail) / 1024`.

**Validates: Requirements 1.5, 1.6**

### Property 8: Case-Insensitive Service Filter

*For any* list of service units and any filter string `q`, filtering with `q.toLowerCase()` shall
return exactly the same set of units as filtering with `q.toUpperCase()` — that is, case must not
affect which units are included or excluded.

**Validates: Requirements 2.3**

### Property 9: Log Entry Buffer Size Invariant

*For any* sequence of log entries of length `N > 1000`, after appending all entries to the frontend
log buffer, the buffer length shall equal exactly 1000 (oldest entries discarded). Applying further
appends maintains the invariant.

**Validates: Requirements 5.7**

### Property 10: Log Priority Colour Classifier

*For any* priority value `p` in `{0, 1, 2, 3, 4, 5, 6, 7}`, the `priorityToColor(p)` pure
function shall return a non-empty string and shall assign: `p ∈ {0,1,2,3}` → `"red"`,
`p = 4` → `"amber"`, `p ∈ {5,6}` → `"green"`, `p = 7` → `"grey"`. The function shall be total
(defined for all values 0–7) and return the same colour for the same priority on every call.

**Validates: Requirements 5.9**

### Property 11: Host Selector API Routing

*For any* selected host name `h` in the host store, every API request issued by any frontend hook
or component shall include the host name as the second path segment of the proxy URL:
`/api/agent/{h}/...`. Setting a different host name shall cause all subsequent requests to use
the new host name without requiring a page reload.

**Validates: Requirements 8.6**

### Property 12: Host Selection localStorage Round-Trip

*For any* host name `h` selected via `useHostStore.setHost(h)`, serialising the store state to
`localStorage` and then hydrating a fresh store instance from `localStorage` shall produce a store
where `selectedHost === h`.

**Validates: Requirements 8.8**

---

## Testing Strategy

### Dual Approach

Property-based tests validate universal correctness properties (Properties 1–12 above).
Unit tests validate specific examples, edge cases, and integration points.
Together they provide comprehensive coverage.

### Agent Testing (Go)

**Property-based testing library**: `pgregory.net/rapid` (pure Go, no external process needed,
supports `testing.T` natively)

```go
// internal/api/error_test.go
func TestErrorResponseSchemaInvariant(t *testing.T) {
    // Feature: l7v-panel, Property 1: Error Response Schema Invariant
    rapid.Check(t, func(tc *rapid.T) {
        path   := rapid.StringMatching(`/api/v[0-9]+/[a-z/]+`).Draw(tc, "path")
        method := rapid.SampledFrom([]string{"GET", "POST", "DELETE", "PATCH"}).Draw(tc, "method")
        // Make request to test server, assert response schema
    })
}
```

Configuration: `rapid.Check` runs 100 iterations by default.

**Unit tests**: `testing` stdlib + `net/http/httptest` for handler tests with mock D-Bus clients.

### Frontend Testing (TypeScript)

**Property-based testing library**: `fast-check` (v3, works with Vitest)

```typescript
// lib/__tests__/thresholds.test.ts
import fc from "fast-check";
import { classifyThreshold } from "../thresholds";

// Feature: l7v-panel, Property 4: Metric Threshold Badge Classification
test("badge classification is mutually exclusive and exhaustive", () => {
  fc.assert(
    fc.property(
      fc.float({ min: 0, max: 100 }),
      fc.float({ min: 0, max: 99 }),
      fc.float({ min: 1, max: 100 }),
      (v, warn, crit) => {
        fc.pre(warn < crit);
        const result = classifyThreshold(v, warn, crit);
        expect(["green", "amber", "red"]).toContain(result);
        if (v < warn)              expect(result).toBe("green");
        else if (v < crit)         expect(result).toBe("amber");
        else                       expect(result).toBe("red");
      }
    ),
    { numRuns: 100 }
  );
});
```

**Unit tests**: Vitest + `@testing-library/react` for component tests with mocked TanStack Query.

### Coverage Targets

- Agent: property tests cover all 12 properties; unit tests cover all handler branches and
  D-Bus error paths.
- Frontend: property tests cover all pure functions (thresholds, back-off, priority color,
  buffer, state reducer, host routing); unit tests cover component render states and server
  actions.

### Performance Validation

- Agent response time: `go test -bench=.` benchmarks for each handler; target < 500ms p95.
- SSE goroutine leak: test harness opens 20 SSE connections, disconnects all, asserts goroutine
  count returns to baseline within 2 seconds.
- Frontend bundle size: `next build` output; `@next/bundle-analyzer` asserts gzipped initial JS
  ≤ 500 kB.

