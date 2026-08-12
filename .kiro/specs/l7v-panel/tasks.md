# Implementation Plan: l7v-panel

## Overview

Implements the full l7v-panel system: a Go agent (`panel-agent`) running on the laptop host,
a Next.js 16 frontend served on the server host, NixOS module + Nix derivations, and a
complete property-based + unit test suite. All source lives under `nixos/l7v-panel/` with
NixOS integration at `services/panel/` and `platform/pkgs/`.

The implementation order follows the dependency graph: repo scaffold → agent core → agent
features → frontend core → frontend pages → property tests → Nix packaging → NixOS
integration → validation.

---

## Tasks

- [x] 1. Repository scaffolding — monorepo structure, workspace config, dev shell
  - Create the `l7v-panel/` directory tree matching the design's full directory structure:
    `apps/agent/`, `apps/web/`, `packages/ui/`
  - Write `l7v-panel/package.json` as the pnpm workspace root with `name: "l7v-panel"`,
    `packageManager: "pnpm@9"`, and a `scripts` block delegating to turbo
  - Write `l7v-panel/pnpm-workspace.yaml` declaring `apps/*` and `packages/*` as workspaces
  - Write `l7v-panel/turbo.json` with a pipeline for `build`, `lint`, `typecheck`, `test`,
    with correct `dependsOn` and `outputs` fields
  - Write `l7v-panel/flake.nix` dev shell providing `go_1_22`, `gomod2nix`, `nodejs_22`,
    `pnpm_9`; include `packages` outputs that `callPackage` both derivations so `nix build
    .#panel-agent` and `nix build .#panel-frontend` work from within `l7v-panel/`
  - Initialise the Go module: `apps/agent/go.mod` with module path
    `github.com/l7v/panel-agent`; add initial `go.sum` and `gomod2nix.toml` (empty vendor
    hash placeholder)
  - _Requirements: 9.1, 9.2, 9.10, NFR-1_

- [x] 2. Agent foundation — entry point, socket activation, middleware, health endpoint
  - [x] 2.1 Create agent directory layout and core types
    - Create all subdirectory stubs: `cmd/panel-agent/`, `internal/api/`, `internal/dbus/`,
      `internal/metrics/`, `internal/journal/`
    - Write `internal/metrics/types.go` with `Thresholds`, `CPUStats`, `MemoryStats`,
      `DiskStats`, `NetStats`, `MetricsSnapshot` structs matching the design's data model
    - Write `internal/journal/types.go` with `LogEntry` and `TailOptions` structs
    - Write `internal/dbus/interface.go` with all four client interfaces (`SystemdClient`,
      `LogindClient`, `NetworkClient`, `BluetoothClient`) plus `UnitStatus`, `WifiStatus`,
      `BluetoothStatus`, `BTDevice` types exactly as specified in the design
    - _Requirements: 7.1, 7.2, 7.3, NFR-3_
  - [x] 2.2 Implement HTTP middleware and error writer
    - Write `internal/api/middleware.go`: `withMiddleware` wrapping handler with request-ID
      propagation (read `X-Request-ID`, generate UUID v4 if absent), structured slog request
      logging (method, path, status, duration_ms, request_id), and response writer wrapper
      capturing status code
    - Write `writeError(w, status, fields)` canonical helper in `internal/api/middleware.go`
      that sets `Content-Type: application/json`, writes the given status, and JSON-encodes
      the fields map
    - _Requirements: 7.6, 7.9, NFR-2_
  - [x] 2.3 Implement health endpoint and router wiring
    - Write `internal/api/health.go` handler: `GET /api/v1/health` — call
      `d.Systemd.HealthCheck(ctx)` and `d.Logind.HealthCheck(ctx)`; return 200
      `{"status":"ok","version":"<version>"}` if both pass, 503
      `{"status":"degraded","message":"..."}` otherwise
    - Write `internal/api/router.go` with `Deps` struct and `NewRouter` function registering
      all routes on a stdlib `ServeMux` exactly as shown in the design, wrapped in
      `withMiddleware`; stub all non-health handlers as `http.NotFound` placeholders
    - _Requirements: 7.1, 7.10, 7.11_
  - [x] 2.4 Implement `cmd/panel-agent/main.go` entry point
    - Implement systemd socket activation via `github.com/coreos/go-systemd/v22/activation`;
      fall back to manual Unix socket at `/run/panel-agent/panel-agent.sock` (or
      `/tmp/panel-agent-dev.sock` with `--dev` flag) for local development
    - Wire all `Deps` fields (stub D-Bus clients initially), construct `http.Server`, handle
      `SIGTERM`/`SIGINT` via `signal.NotifyContext`, and call `srv.Shutdown` on signal
    - Inject `version` at build time via `-ldflags "-X main.version=<ver>"`
    - _Requirements: 7.7, 7.8, 9.3, 11.4_
  - [ ]* 2.5 Write property test — Error Response Schema Invariant (Property 1)
    - **Property 1: Error Response Schema Invariant**
    - **Validates: Requirements 1.7, 2.9, 3.7, 4.10, 7.4, 7.5, 8.5**
    - Use `pgregory.net/rapid` + `net/http/httptest` against the real router with a mock
      `Deps`; generate arbitrary paths and methods; assert every non-2xx response has
      `Content-Type: application/json` and body with `"message"` string field
    - Run 100 iterations; place in `internal/api/error_property_test.go`

- [x] 3. Agent: procfs metrics reader
  - [x] 3.1 Implement `ProcfsReader` interface and CPU/memory readers
    - Write `internal/metrics/procfs.go`: define `ProcfsReader` interface with
      `ReadSnapshot(ctx) (MetricsSnapshot, error)` method
    - Implement `NewProcfsReader()` returning a concrete struct
    - CPU: read `/proc/stat`, take two samples 1 second apart via `time.Sleep`, compute
      `usage_pct` as `(non_idle_delta / total_delta) * 100`, clamped to `[0, 100]`
    - Memory: parse `/proc/meminfo` for `MemTotal` and `MemAvailable`; compute
      `used_mib = (MemTotal - MemAvailable) / 1024`, `usage_pct`
    - Return HTTP 503-compatible error if either file is unreadable
    - _Requirements: 1.5, 1.6, 1.7_
  - [x] 3.2 Implement disk and network readers
    - Disk: read `/proc/mounts`, filter to `ext4`, `btrfs`, `xfs`, `vfat`; call
      `syscall.Statfs` on each mount point; populate `DiskStats` (total/used/avail in GiB,
      percentage)
    - Network: parse `/proc/net/dev`, skip `lo`; take two samples 1 second apart; compute
      `rx_kbps` and `tx_kbps` as byte-delta / 1024
    - _Requirements: 1.3, 1.4_
  - [x] 3.3 Implement `/api/v1/metrics` handler
    - Write `internal/api/metrics.go`: call `d.Procfs.ReadSnapshot(ctx)`; on error return 503
      via `writeError`; on success JSON-encode the `MetricsSnapshot` with 200
    - Read threshold env vars (`PANEL_CPU_WARN`, etc.) in `main.go` and populate
      `Deps.Thresholds`; expose them in the JSON response as a `thresholds` field for the
      frontend badge classifier
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.9_
  - [ ]* 3.4 Write property test — Metric Computation from Procfs (Property 7)
    - **Property 7: Metric Computation from Procfs**
    - **Validates: Requirements 1.5, 1.6**
    - Generate arbitrary pairs of `/proc/stat` CPU line snapshots and `MemTotal`/`MemAvailable`
      values using `rapid`; call the internal computation functions directly (not via HTTP);
      assert `cpu_pct` formula and clamping, assert `used_mib` formula
    - Place in `internal/metrics/procfs_property_test.go`

- [x] 4. Agent: D-Bus systemd interface + service management
  - [x] 4.1 Implement `SystemdClient` concrete implementation
    - Write `internal/dbus/systemd.go`: connect to the system D-Bus via
      `github.com/godbus/dbus/v5`; implement `ListUnits` by calling
      `org.freedesktop.systemd1.Manager.ListUnits` and mapping the 10-field tuple to
      `UnitStatus`; implement `StartUnit`, `StopUnit`, `EnableUnit`, `DisableUnit` via the
      corresponding `Manager` methods; implement `HealthCheck` by calling `GetVersion`
    - Return typed errors that the handler can distinguish (unit not found → 422, D-Bus
      unavailable → 503)
    - _Requirements: 2.2, 2.8, 7.10, 7.11_
  - [x] 4.2 Implement `/api/v1/services` handlers
    - Write `internal/api/services.go`:
      - `listServicesHandler`: call `d.Systemd.ListUnits`, JSON-encode the slice; 503 on error
      - `serviceActionHandler(d, action)`: extract `{unit}` path param, call the appropriate
        `SystemdClient` method, return `{"unit":"...","status":"..."}` on success; 422 with
        `unit`+`operation`+`message` fields on D-Bus unit error; 503 on connection error
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.6, 2.7, 2.9_
  - [ ]* 4.3 Write property test — Service List D-Bus Round-Trip (Property 2)
    - **Property 2: Service List D-Bus Round-Trip**
    - **Validates: Requirements 2.2**
    - Implement a `MockSystemdClient` in `internal/dbus/mock_test.go`; use `rapid` to generate
      arbitrary `[]UnitStatus` slices; call `listServicesHandler` via `httptest`; unmarshal
      response JSON; assert every field equals the input — no mutation, no loss
    - Place in `internal/api/services_property_test.go`

- [x] 5. Agent: D-Bus logind power control
  - [x] 5.1 Implement `LogindClient` concrete implementation
    - Write `internal/dbus/logind.go`: connect to system D-Bus; implement `PowerOff`, `Reboot`,
      `Suspend` by calling `org.freedesktop.login1.Manager.PowerOff/Reboot/Suspend` with
      `interactive = false`; implement `HealthCheck` by pinging the logind service object
    - _Requirements: 3.4, 3.5, 3.6, 3.8_
  - [x] 5.2 Implement `/api/v1/power` handlers
    - Write `internal/api/power.go`: `powerHandler(d, action)` — call the corresponding
      `LogindClient` method; return 200 `{"action":"...","status":"initiated"}` on success;
      503 with `action`+`message` fields on failure
    - _Requirements: 3.2, 3.7_

- [x] 6. Agent: D-Bus NetworkManager and BlueZ (WiFi + Bluetooth)
  - [x] 6.1 Implement `NetworkClient` (NetworkManager WiFi)
    - Write `internal/dbus/networkmanager.go`: implement `GetWifiStatus` by querying
      `org.freedesktop.NetworkManager` for device type Wifi, reading `ActiveAccessPoint`
      properties (SSID, Strength, IP4Config); implement `ToggleWifi` by setting the
      `WirelessEnabled` property on the NM manager object
    - Return graceful `WifiStatus{Enabled: false}` when no WiFi adapter is present (no error)
    - _Requirements: 4.1, 4.3, 4.5, 4.7, 4.8_
  - [x] 6.2 Implement `BluetoothClient` (BlueZ)
    - Write `internal/dbus/bluez.go`: implement `GetBluetoothStatus` by querying
      `org.bluez.Adapter1` for the `Powered` property and `org.bluez.Device1` objects for
      paired devices (Name, Address, Connected); implement `ToggleBluetooth` by setting
      `Powered` on the adapter
    - Return graceful `BluetoothStatus{Enabled: false, Devices: []}` when no adapter present
    - _Requirements: 4.2, 4.4, 4.6, 4.7, 4.9_
  - [x] 6.3 Implement `/api/v1/network` handlers
    - Write `internal/api/network.go`:
      - `wifiStatusHandler`: call `d.Network.GetWifiStatus`, JSON-encode result
      - `wifiToggleHandler`: call `d.Network.ToggleWifi`, then re-fetch and return updated status
      - `bluetoothStatusHandler` / `bluetoothToggleHandler`: same pattern for BlueZ
      - Return 503 with `interface`+`message` on toggle failures; never error on missing adapter
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.8, 4.9, 4.10_

- [x] 7. Agent: journal SSE streaming
  - [x] 7.1 Implement `journal.Reader` with `Tail`
    - Write `internal/journal/reader.go`: define `Reader` interface with
      `Tail(ctx, TailOptions)` method
    - Implement using `github.com/coreos/go-systemd/sdjournal`: open journal, seek to tail,
      add match for `_SYSTEMD_UNIT` if `TailOptions.Unit` is non-empty, loop calling
      `journal.Wait` and `journal.GetEntry`; filter by `MinPriority`; send each `LogEntry` to
      `TailOptions.Out` channel; send error to `TailOptions.Err` and return on journal open
      failure
    - Cancel loop via `select { case <-ctx.Done() }` to prevent goroutine leaks (Req 11.5)
    - _Requirements: 5.1, 5.2, 5.5, 5.8, 11.5_
  - [x] 7.2 Implement `/api/v1/logs/stream` SSE handler
    - Write `internal/api/logs.go`: set SSE headers (`Content-Type: text/event-stream`,
      `Cache-Control: no-cache`, `X-Accel-Buffering: no`); start `d.Journal.Tail` in a
      goroutine; select over `ctx.Done()` / `errCh` / `entries`; write `data: <json>\n\n` and
      flush for each entry; write `event: error\ndata: {...}\n\n` and return on error
    - Parse `unit` and `priority` query params; pass to `TailOptions`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.8, 7.3_
  - [ ]* 7.3 Write property test — LogEntry SSE Serialisation Round-Trip (Property 3)
    - **Property 3: LogEntry SSE Serialisation Round-Trip**
    - **Validates: Requirements 5.1, 5.2**
    - Use `rapid` to generate arbitrary `LogEntry` values (timestamp as valid RFC3339, unit as
      arbitrary string, priority 0–7, message including Unicode and newlines); serialise to the
      SSE JSON format used by `logs.go`; deserialise back; assert structural equality
    - Place in `internal/journal/sse_property_test.go`

- [x] 8. Agent: Prometheus `/metrics` endpoint
  - [x] 8.1 Implement Prometheus metrics handler
    - Add `github.com/prometheus/client_golang` dependency
    - Write `internal/api/prommetrics.go`: register custom `prometheus.CounterVec` for request
      count per endpoint, `prometheus.HistogramVec` for request duration, `prometheus.Gauge` for
      active SSE connections, `prometheus.CounterVec` for D-Bus errors; expose via
      `promhttp.Handler()` at `GET /metrics`
    - Increment the active SSE gauge in `logsStreamHandler` on connect/disconnect
    - Increment the D-Bus error counter in each D-Bus handler on error
    - _Requirements: NFR-2_
  - [ ] 8.2 Agent checkpoint — build and test the agent
    - Run `go build ./...` in `apps/agent/`; fix any compilation errors
    - Run `go test ./...` (includes property tests); all tests must pass
    - Ensure all 7 placeholder routes in `router.go` are replaced with real handlers
    - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Frontend foundation — Next.js 16, Tailwind, shadcn/ui, Zustand, TanStack Query, layout
  - [x] 9.1 Initialise the Next.js 16 app and shared UI package
    - Scaffold `apps/web/` as a Next.js 16 app with the App Router; configure `tsconfig.json`
      with `strict: true`, path alias `@/*` → `./`; add `next.config.ts` with
      `output: "standalone"` and no `basePath`
    - Install dependencies: `tailwindcss`, `shadcn/ui`, `@tanstack/react-query`,
      `zustand`, `lucide-react`; configure Tailwind with the design's CSS variable tokens in
      `globals.css`
    - Scaffold `packages/ui/` as a shared package re-exporting shadcn components;
      write its `package.json` with `name: "@l7v-panel/ui"`
    - Initialise shadcn/ui (`components.json`); add base components: `Button`, `Badge`,
      `Dialog`, `Input`, `Select`, `Skeleton`, `Toaster`, `Switch`, `Table`
    - _Requirements: 8.1, 8.10_
  - [x] 9.2 Write TypeScript API types and pure utility functions
    - Write `types/api.ts` with all TypeScript interfaces exactly as defined in the design's
      data models section: `CPUStats`, `MemoryStats`, `DiskStats`, `NetStats`,
      `MetricsSnapshot`, `ServiceUnit`, `WifiStatus`, `BluetoothDevice`, `BluetoothStatus`,
      `LogEntry`, `HealthResponse`, `AgentError`, `ThresholdLevel`, `Thresholds`
    - Write `lib/thresholds.ts`: pure `classifyThreshold(v: number, warn: number, crit:
      number): ThresholdLevel` function — green/amber/red boundaries exactly as per design
    - Write `lib/backoff.ts`: pure `computeBackoff(attempt: number): number` function —
      exponential back-off, 1s base, 30s cap, monotone
    - Write `lib/priority-color.ts`: pure `priorityToColor(p: number): string` function —
      0–3 red, 4 amber, 5–6 green, 7 grey
    - Write `lib/agent-client.ts`: `fetchAgent<T>(host, path, init?)` wrapping `fetch` to
      `/api/agent/${host}${path}` with `X-Request-ID` header; throws `AgentError` on non-2xx
    - _Requirements: 1.8, 5.9, 8.4, 8.5_
  - [x] 9.3 Implement Zustand stores
    - Write `store/host-store.ts`: `useHostStore` with `selectedHost`, `availableHosts`,
      `setHost`; persist to `localStorage` key `"l7v-panel-host"` via `zustand/middleware`
    - Write `store/theme-store.ts`: `useThemeStore` with `theme: "light"|"dark"|"system"`,
      `setTheme`
    - _Requirements: 8.6, 8.8, 8.9_
  - [x] 9.4 Implement root layout with sidebar navigation
    - Write `app/layout.tsx`: `RootLayout` wrapping children in `ThemeProvider`,
      `QueryClientProvider` (TanStack Query), and `SidebarLayout`
    - Write `components/layout/Sidebar.tsx`: nav links for Dashboard, Services, Power, Network,
      Logs, Monitoring, Integrations using Next.js `<Link>`; highlight active route via
      `usePathname`
    - Write `components/layout/Header.tsx`: host selector dropdown (reads/writes
      `useHostStore`), theme toggle button (reads/writes `useThemeStore`)
    - Write `components/layout/NavItem.tsx`: single nav link with icon + label + active state
    - Write shared components: `components/shared/StatusBadge.tsx` (colour from
      `ThresholdLevel`), `components/shared/LoadingSkeleton.tsx`, `components/shared/
      ErrorToast.tsx` (reads HTTP status + `message` from `AgentError`)
    - Write `components/shared/HostSelector.tsx` dropdown reading `useHostStore`
    - _Requirements: 8.2, 8.3, 8.6, 8.7, 8.9_

- [x] 10. Frontend: agent proxy API route (streaming-capable)
  - [x] 10.1 Implement the catch-all agent proxy route
    - Write `app/api/agent/[host]/[...path]/route.ts` with `GET` and `POST` exports matching
      the design's `proxyToAgent` implementation: reads `AGENT_BASE_URL` env var (default
      `http://unix:/run/panel-agent/panel-agent.sock:`), constructs upstream URL from path
      segments + query string, passes `X-Request-ID`, streams the response body (SSE
      pass-through) via `new Response(upstream.body, {...})`
    - Set `export const dynamic = "force-dynamic"` to prevent caching
    - _Requirements: 8.4, 7.7_
  - [ ]* 10.2 Write unit tests for the proxy route
    - Mock `fetch` with `vitest`; verify header forwarding, path construction, status
      pass-through, and streaming body pass-through for both GET and POST
    - _Requirements: 8.4, NFR-3_

- [x] 11. Frontend: TanStack Query hooks
  - [x] 11.1 Implement data-fetching hooks
    - Write `hooks/useMetrics.ts`: `useQuery` with `queryKey: ["metrics", host]`,
      `queryFn: () => fetchAgent<MetricsSnapshot>(host, "/api/v1/metrics")`,
      `refetchInterval: 5_000`, `staleTime: 4_000`
    - Write `hooks/useServices.ts`: same pattern, `refetchInterval: 2_000`; also export
      `useServiceAction(unit, action)` mutation calling `POST /api/v1/services/{unit}/{action}`
      and invalidating the services query on settle
    - Write `hooks/usePower.ts`: export three mutations for shutdown/reboot/sleep — set
      `isPending` flag to disable all buttons while any is in flight; reset on success or error
    - Write `hooks/useNetwork.ts`: queries for wifi and bluetooth; mutations for toggles;
      invalidate on settle
    - _Requirements: 1.1, 1.2, 2.1, 2.4, 3.2, 3.9, 4.1, 4.2, 4.5, 4.6, 8.7_
  - [x] 11.2 Implement SSE hook (`useLogs.ts`)
    - Write `hooks/useLogs.ts`: custom hook — open `EventSource` to
      `/api/agent/${host}/api/v1/logs/stream?unit=...&priority=...`; on `message` event,
      prepend `LogEntry` to state and trim to 1000; on `error` event, close and schedule
      reconnect using `computeBackoff(attempt)` via `setTimeout`; stop after 5 attempts;
      return `{ entries, isConnected, error }`; close `EventSource` on hook unmount
    - _Requirements: 5.1, 5.3, 5.4, 5.6, 5.7_

- [x] 12. Frontend: Dashboard page (metrics + charts)
  - [x] 12.1 Implement metric display components
    - Write `components/dashboard/MetricCard.tsx`: displays label + value + `StatusBadge`
      (colour from `classifyThreshold`); accepts `value`, `warn`, `crit`, `unit` props
    - Write `components/dashboard/CpuChart.tsx`: recharts `LineChart` plotting the last 60
      samples of CPU `usage_pct`; data fed from a rolling buffer updated by `useMetrics`
    - Write `components/dashboard/MemoryBar.tsx`: shadcn `Progress` showing `used_mib /
      total_mib` with amber/red colour above thresholds
    - Write `components/dashboard/DiskTable.tsx`: shadcn `Table` of `DiskStats` rows with
      per-row `StatusBadge`
    - Write `components/dashboard/NetworkChart.tsx`: dual-line chart for rx/tx kBps
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.8_
  - [x] 12.2 Implement Dashboard page
    - Write `app/page.tsx`: compose `MetricCard` × 2 (CPU, RAM), `CpuChart`,
      `MemoryBar`, `DiskTable`, `NetworkChart`; use `useMetrics()` for data; show
      `LoadingSkeleton` while loading; show `ErrorToast` on error
    - Disk refetch override: wrap disk data in a separate query with `refetchInterval: 30_000`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.7_

- [x] 13. Frontend: Services page (table + actions)
  - [x] 13.1 Implement service components
    - Write `components/services/ServiceBadge.tsx`: maps `active_state`/`sub_state` pairs to
      badge colour — `active/running` → green, `active/exited` → blue, `failed` → red,
      others → grey
    - Write `components/services/ServiceRow.tsx`: table row with name, description,
      `ServiceBadge`, and Start/Stop/Enable/Disable buttons; disable relevant buttons based on
      current state; show spinner while mutation is pending
    - Write `components/services/ServiceTable.tsx`: renders `ServiceRow` for each filtered
      unit; accepts `units` and `filter` props
    - _Requirements: 2.1, 2.3, 2.11_
  - [x] 13.2 Implement Services page
    - Write `app/services/page.tsx`: controlled filter `Input` with 100ms debounce; pass
      filtered list to `ServiceTable`; call `useServices()` and `useServiceAction()`; show
      skeleton and error toast
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 14. Frontend: Power page (confirmation dialog)
  - [x] 14.1 Implement power components and page
    - Write `components/power/ConfirmDialog.tsx`: shadcn `Dialog` modal; props `action`,
      `host`, `onConfirm`, `onCancel`; shows action name + target host in body; Confirm and
      Cancel buttons
    - Write `components/power/PowerButton.tsx`: button that sets local `pendingAction` state
      to open `ConfirmDialog`; on confirm calls `usePowerMutation(action).mutate()`; disabled
      while any power mutation `isPending`; shows spinner while pending
    - Write `app/power/page.tsx`: three `PowerButton` components (Shutdown, Reboot, Sleep);
      loading indicator covering all three while any request is in flight
    - _Requirements: 3.1, 3.2, 3.3, 3.9_

- [x] 15. Frontend: Network page (WiFi + Bluetooth)
  - [x] 15.1 Implement network components and page
    - Write `components/network/WifiCard.tsx`: display `enabled` badge, SSID, signal strength
      bar; `Switch` toggle calling `useNetwork().toggleWifi`; disable toggle while mutation
      is pending
    - Write `components/network/BluetoothCard.tsx`: display `enabled` badge; device list as
      a `Table` with Name, Address, and `connected` badge; `Switch` toggle
    - Write `app/network/page.tsx`: compose `WifiCard` and `BluetoothCard`; use
      `useNetwork()` hooks; skeleton and error handling
    - _Requirements: 4.1, 4.2, 4.5, 4.6, 8.7_

- [x] 16. Frontend: Logs page (SSE viewer + filters)
  - [x] 16.1 Implement log components and page
    - Write `components/logs/LogEntry.tsx`: single log line — timestamp, unit, priority badge
      (colour from `priorityToColor`), message; monospace font for message
    - Write `components/logs/LogFilters.tsx`: unit name `Input` + priority `Select`
      (0=emergency … 7=debug); calls provided `onFilterChange` callback
    - Write `components/logs/LogViewer.tsx`: renders virtualised list of `LogEntry` components
      (use `react-window` `FixedSizeList`); max 1000 entries enforced here; auto-scroll to
      bottom unless user has scrolled up
    - Write `app/logs/page.tsx`: use `useLogs(unit, priority)`; pass entries to `LogViewer`;
      show connection badge (connected/reconnecting/failed)
    - _Requirements: 5.1, 5.3, 5.4, 5.7, 5.9_

- [x] 17. Frontend: Monitoring page (Grafana iframe)
  - [x] 17.1 Implement Monitoring page
    - Write `app/monitoring/page.tsx`: `<iframe src="/grafana/" />` sized to fill viewport
      height minus nav header height (CSS `calc(100vh - <nav-height>)`); handle load failure
      via `onLoad` check — detect empty/error frame and show `ErrorBanner` with "Grafana is
      currently unavailable" text and a Retry button that resets the `src`
    - _Requirements: 6.1, 6.4, 6.5_

- [x] 18. Frontend: Integrations page (server actions)
  - [x] 18.1 Implement server actions and Integrations page
    - Write `actions/forgejo.ts`: `"use server"` action `getForgejoStats()` — fetch
      `GET /api/v1/repos/search?limit=50` with `Authorization: token ${FORGEJO_TOKEN}`;
      `next: { revalidate: 60 }` cache
    - Write `actions/vaultwarden.ts`: `"use server"` action `getVaultwardenHealth()` — fetch
      `/api/health_check`; return `{ alive: boolean }`; `next: { revalidate: 30 }`
    - Write `actions/prometheus.ts`: `"use server"` action `queryPrometheus(query)` — fetch
      `http://127.0.0.1:9090/api/v1/query?query=<q>`
    - Write `actions/ntfy.ts`: `"use server"` action `publishNtfy(topic, message)` — POST to
      `https://ntfy.l7v.dev/${topic}` with `Authorization: Bearer ${NTFY_TOKEN}`
    - Write `app/integrations/page.tsx`: display Forgejo repo count, Vaultwarden alive/down
      badge, ntfy publish form; all data via server actions with `Suspense` boundaries and
      error states
    - _Requirements: 8.2, NFR-1_
  - [ ] 18.2 Frontend checkpoint — build and type-check
    - Run `pnpm --filter @l7v-panel/web build`; fix type errors and build failures
    - Run `pnpm typecheck`; zero TypeScript errors
    - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Property-based tests: agent (pgregory.net/rapid)
  - [ ] 19.1 Add `pgregory.net/rapid` and write remaining agent property tests
    - Add `pgregory.net/rapid` to `go.mod` and `gomod2nix.toml`
    - Property tests 1, 2, 3, 7 are already scaffolded in tasks 2.5, 4.3, 7.3, 3.4; complete
      any that have stub implementations
  - [ ]* 19.2 Write agent unit tests for all handler branches
    - For every handler in `internal/api/`, write table-driven unit tests covering: success
      path, D-Bus error (→ 503), client error (wrong method → 405, unknown path → 404), and
      missing query params
    - Use `net/http/httptest` with mock `Deps` implementing stub interfaces
    - _Requirements: NFR-3_

- [x] 20. Property-based tests: frontend (fast-check + Vitest)
  - [ ] 20.1 Configure Vitest and fast-check
    - Add `vitest`, `@testing-library/react`, `@testing-library/user-event`, `fast-check`,
      `jsdom`, `@vitejs/plugin-react` to `apps/web` dev dependencies
    - Write `vitest.config.ts` with `environment: "jsdom"` and coverage reporting
  - [ ]* 20.2 Write property test — Metric Threshold Badge Classification (Property 4)
    - **Property 4: Metric Threshold Badge Classification**
    - **Validates: Requirements 1.8**
    - Use `fc.property(fc.float, fc.float, fc.float)` with `fc.pre(warn < crit)`; assert
      `classifyThreshold` returns exactly one of green/amber/red with correct boundaries
    - Place in `lib/__tests__/thresholds.test.ts`
  - [ ]* 20.3 Write property test — SSE Reconnect Back-Off Bounds (Property 5)
    - **Property 5: SSE Reconnect Back-Off Bounds**
    - **Validates: Requirements 5.6**
    - Use `fc.integer({ min: 1, max: 5 })`; assert `1 ≤ computeBackoff(n) ≤ 30` and
      monotone non-decreasing for consecutive attempts
    - Place in `lib/__tests__/backoff.test.ts`
  - [ ]* 20.4 Write property test — Power Control UI State Idempotence (Property 6)
    - **Property 6: Power Control UI State Idempotence**
    - **Validates: Requirements 3.9**
    - Generate arbitrary action/outcome combinations; render `PowerButton` state reducer in
      isolation; call `resetPowerState()` once then twice; assert same result both times
    - Place in `components/power/__tests__/power-state.test.ts`
  - [ ]* 20.5 Write property test — Log Priority Colour Classifier (Property 10)
    - **Property 10: Log Priority Colour Classifier**
    - **Validates: Requirements 5.9**
    - Use `fc.integer({ min: 0, max: 7 })`; assert `priorityToColor` returns non-empty string
      and matches the defined mapping (0–3 red, 4 amber, 5–6 green, 7 grey)
    - Place in `lib/__tests__/priority-color.test.ts`
  - [ ]* 20.6 Write property test — Log Entry Buffer Size Invariant (Property 9)
    - **Property 9: Log Entry Buffer Size Invariant**
    - **Validates: Requirements 5.7**
    - Use `fc.array(fc.record({...}), { minLength: 1001 })`; simulate buffer append logic;
      assert buffer length never exceeds 1000
    - Place in `hooks/__tests__/useLogs-buffer.test.ts`
  - [ ]* 20.7 Write property test — Case-Insensitive Service Filter (Property 8)
    - **Property 8: Case-Insensitive Service Filter**
    - **Validates: Requirements 2.3**
    - Generate arbitrary service arrays and filter strings; assert filtering with lowercase
      query and uppercase query return identical result sets
    - Place in `components/services/__tests__/filter.test.ts`
  - [ ]* 20.8 Write property test — Host Selector API Routing (Property 11)
    - **Property 11: Host Selector API Routing**
    - **Validates: Requirements 8.6**
    - Generate arbitrary host names; mock `fetchAgent`; set host in `useHostStore`; call any
      hook; assert every captured URL contains `/api/agent/${host}/`
    - Place in `hooks/__tests__/host-routing.test.ts`
  - [ ]* 20.9 Write property test — Host Selection localStorage Round-Trip (Property 12)
    - **Property 12: Host Selection localStorage Round-Trip**
    - **Validates: Requirements 8.8**
    - Generate arbitrary host name strings; call `setHost`, serialise, hydrate fresh store;
      assert `selectedHost === h`
    - Place in `store/__tests__/host-store.test.ts`
  - [ ] 20.10 Frontend test checkpoint
    - Run `pnpm --filter @l7v-panel/web test` (`vitest --run`); all tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [x] 21. NixOS module — `services/panel/default.nix`
  - [ ] 21.1 Write the NixOS module
    - Create `services/panel/default.nix` with the full option schema from the design:
      `l7v.services.panel.agent.*` options (enable, socketPath, managedHosts,
      metricsThresholds.\*, prometheusWidget) and `l7v.services.panel.frontend.*` options
      (enable, domain, port, allowedCIDRs) — all using `lib.mkOption` with correct types and
      defaults
    - Implement the assertions block: (1) `l7v.reverseProxy.enable` must be true when
      frontend is enabled; (2) Grafana allow_embedding assertion when both grafana and panel
      frontend are enabled
    - Create the `panel-agent` system user with `isSystemUser = true`,
      `extraGroups = ["systemd-journal"]`
    - Emit the polkit rules block granting `panel-agent` the systemd manage-units and login1
      power-off/reboot/suspend actions
    - Emit the systemd socket unit `panel-agent.socket` with `ListenStream`, `SocketUser`,
      `SocketMode = "0600"`
    - Emit the systemd service unit `panel-agent.service` with all hardening options
      (`NoNewPrivileges`, `ProtectSystem = "strict"`, `ProtectHome`, `PrivateTmp`,
      `ReadWritePaths = ["/run/panel-agent"]`), `Type = "notify"`, `Restart = "on-failure"`,
      `RestartSec = 5`, and environment variables for all threshold values
    - _Requirements: 9.1, 9.3, 9.8, 9.9, 10.6_
  - [ ] 21.2 Write the nginx virtual host config in the module
    - Emit the nginx virtual host for `cfg.frontend.domain` with `forceSSL = true`,
      `enableACME = true`, IP allowlist `allow`/`deny` directives from
      `cfg.frontend.allowedCIDRs`, security response headers (`HSTS`, `X-Frame-Options
      SAMEORIGIN`, `X-Content-Type-Options`, `Referrer-Policy`)
    - Emit the `/api/agent/` location block with Unix socket `proxy_pass`, `proxy_read_timeout
      60s`, `proxy_buffering off`
    - Emit the `/grafana/` location block proxying to `http://127.0.0.1:3001/` with correct
      `Host` header
    - Emit the `panel-frontend.service` systemd unit with `NODE_ENV=production`,
      `PORT=<cfg.frontend.port>`, `AGENT_BASE_URL=http+unix://%2Frun%2Fpanel-agent%2Fpanel-agent.sock/`
    - Apply `services.grafana.settings.security.allow_embedding = true` conditionally
    - _Requirements: 6.2, 6.3, 9.4, 9.5, 9.7, 10.1, 10.3, 10.4, 10.5, 10.8_

- [x] 22. Nix derivations — `panel-agent` and `panel-frontend`
  - [ ] 22.1 Write the `panel-agent` buildGoModule derivation
    - Create `platform/pkgs/panel-agent/default.nix`: `buildGoModule` with `pname =
      "panel-agent"`, `version = "0.1.0"`, `src = lib.cleanSource
      ../../../l7v-panel/apps/agent`, `vendorHash` placeholder, `ldflags` injecting version,
      `meta` with `platforms = ["x86_64-linux" "aarch64-linux"]`
    - Document the `gomod2nix generate` update workflow in a comment
    - _Requirements: 9.2, 9.10, NFR-4_
  - [ ] 22.2 Write the `panel-frontend` mkDerivation
    - Create `platform/pkgs/panel-frontend/default.nix`: `stdenv.mkDerivation` with
      `nodejs_22`, `pnpm_9` as `nativeBuildInputs`; `pnpmDeps = pnpm_9.fetchDeps {...}` with
      hash placeholder; `buildPhase` running `pnpm install --frozen-lockfile --offline` and
      `pnpm --filter @l7v-panel/web run build`; `installPhase` copying Next.js standalone
      output (`.next/standalone`, `.next/static`, `public`) and wrapping `server.js` with
      `nodejs_22` in PATH
    - Document the `prefetch-pnpm-deps` hash update workflow in a comment
    - _Requirements: 9.2, 9.10, NFR-4_

- [x] 23. NixOS integration — host configs, services index, Grafana patch, flake outputs
  - [ ] 23.1 Wire the NixOS module into the repo infrastructure
    - Add `./panel` to the imports list in `services/default.nix` so the module is available
      to all hosts
    - Expose `panel-agent` and `panel-frontend` as named outputs in the top-level `flake.nix`
      under `packages.x86_64-linux` and `packages.aarch64-linux`
    - _Requirements: 9.1, 9.2_
  - [ ] 23.2 Enable the agent on the laptop host
    - Add `l7v.services.panel.agent.enable = true;` to `hosts/laptop/default.nix` (or its
      services include); set `metricsThresholds` to preferred values if non-default
    - _Requirements: 9.3_
  - [ ] 23.3 Enable the frontend on the server host
    - Add `l7v.services.panel.frontend.enable = true;` to `hosts/server/default.nix` with
      `domain = "panel.l7v.dev"` and `allowedCIDRs` for the home network CIDR(s)
    - Confirm `l7v.services.grafana.enable = true;` is already set (it is, per the design
      integration notes); the NixOS module automatically applies `allow_embedding = true`
    - _Requirements: 9.4, 6.2, 6.3_

- [x] 24. Validation — nix build, validate.sh, and goroutine leak test
  - [ ] 24.1 Run and fix `./scripts/validate.sh`
    - Run `./scripts/validate.sh L7V` from the repo root; fix any `nixfmt`, `statix`,
      `deadnix`, `shellcheck`, or `nix flake check` failures in the new Nix files
    - Ensure all `.nix` files pass `nixfmt-rfc-style` formatting
    - Ensure all new shell scripts use `#!/usr/bin/env bash` with `set -euo pipefail`
    - _Requirements: 9.10_
  - [ ]* 24.2 Run `nix build` for both derivations
    - Run `nix build .#panel-agent` and `nix build .#panel-frontend` from the nixos root;
      fix any build failures (likely `vendorHash` and `pnpmDeps` hash mismatches — update
      with `gomod2nix generate` and `nix run nixpkgs#prefetch-pnpm-deps`)
    - _Requirements: 9.2, 9.10_
  - [ ]* 24.3 Write goroutine leak test for SSE handler (Requirement 11.5)
    - Write `internal/api/logs_leak_test.go`: open 20 concurrent SSE connections to the
      test server using `httptest.NewServer`; record goroutine count baseline; close all 20
      clients; sleep 2 seconds; assert goroutine count has returned to baseline (±5)
    - _Requirements: 11.2, 11.5_
  - [ ] 24.4 Final checkpoint — all tests pass, nix builds succeed
    - Run `go test ./...` in `apps/agent/`; all pass
    - Run `pnpm test` in `l7v-panel/`; all pass
    - Run `./scripts/validate.sh L7V`; no errors
    - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; property tests are
  independently valuable but not blocking for a working system
- Each property test task lists its property number and the requirements clause it validates
  for full traceability
- `vendorHash` in `panel-agent/default.nix` and `pnpmDeps.hash` in `panel-frontend/default.nix`
  are placeholders — they must be computed after the actual dependency set is final (task 24.2)
- The agent's D-Bus clients require a running systemd on the build/test host; unit tests use
  mock implementations injected via the `DBusClient` interfaces (NFR-3)
- Phase 2 items (JWT auth, SOPS tokens, multi-host UI) are explicitly out of scope; the
  NixOS module includes inline comments noting where Phase 2 hooks will be added
- All `.nix` files must pass `nixfmt-rfc-style`; all shell scripts must use `set -euo pipefail`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "9.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "9.2", "9.3"] },
    { "id": 3, "tasks": ["2.4", "9.4", "10.1"] },
    { "id": 4, "tasks": ["2.5", "3.1"] },
    { "id": 5, "tasks": ["3.2", "4.1", "5.1", "6.1", "6.2", "7.1", "10.2", "11.1"] },
    { "id": 6, "tasks": ["3.3", "4.2", "5.2", "6.3", "7.2", "8.1", "11.2"] },
    { "id": 7, "tasks": ["3.4", "4.3", "7.3", "12.1", "13.1", "14.1", "15.1", "16.1", "17.1", "18.1"] },
    { "id": 8, "tasks": ["8.2", "12.2", "13.2", "18.2"] },
    { "id": 9, "tasks": ["19.1", "20.1"] },
    { "id": 10, "tasks": ["19.2", "20.2", "20.3", "20.4", "20.5", "20.6", "20.7", "20.8", "20.9"] },
    { "id": 11, "tasks": ["20.10", "21.1"] },
    { "id": 12, "tasks": ["21.2", "22.1", "22.2"] },
    { "id": 13, "tasks": ["23.1"] },
    { "id": 14, "tasks": ["23.2", "23.3"] },
    { "id": 15, "tasks": ["24.1", "24.2", "24.3"] },
    { "id": 16, "tasks": ["24.4"] }
  ]
}
```
