# Requirements Document

## Introduction

### Vision

`l7v-panel` is a professional, enterprise-grade web control panel for the l7v NixOS infrastructure. It provides a browser-accessible system management and monitoring dashboard at `panel.l7v.dev`, enabling the operator to inspect system health, manage systemd services, control power states, monitor network and Bluetooth connectivity, and stream live logs — all from any device with a browser.

### Goals (Phase 1 — MVP)

- Real-time system metrics: CPU, RAM, disk, and network utilisation (read-only polling from the agent)
- Systemd service management: list, filter, start, stop, enable, and disable services on managed hosts
- Power control: shutdown, reboot, and sleep with mandatory confirmation dialogs
- Network and Bluetooth status display and toggle via NetworkManager (D-Bus)
- Grafana metrics integration: embedded Grafana dashboards via authenticated iframe proxy
- Real-time log streaming: journal logs pushed to the browser via Server-Sent Events (SSE)
- Secure transport: HTTPS-only, nginx IP allowlist, no plaintext channels

### Non-Goals (Deferred to Later Phases)

The following capabilities are explicitly out of scope for Phase 1 and must not be implemented:

- **Phase 2:** JWT RS256 authentication and authorisation; SOPS-backed token management; NixOS config rebuild and feature-flag toggling; multi-host management UI
- **Phase 3:** Embedded interactive terminal (xterm.js)
- **Any phase:** Direct database access, file browser, package management from the UI

### Architecture Overview

```
Browser
  └─► HTTPS ──► nginx (panel.l7v.dev, server host)
                  ├─► Next.js frontend  (port 3002, server host)
                  ├─► /api/agent/*      ──► panel-agent (Unix socket, laptop host)
                  └─► /grafana/*        ──► grafana.l7v.dev (iframe embed)
```

The `panel-agent` Go binary runs on each managed host (laptop first), socket-activated by systemd, and communicates with nginx on the server via a secured reverse-proxy tunnel. The Next.js 16 frontend (TypeScript strict, Tailwind CSS, shadcn/ui) is served by the server host.

**Single Repository:** All l7v-panel source code lives inside this NixOS repository under `l7v-panel/`. The NixOS module and Nix derivations reference local paths rather than fetching from a remote repository.

```
nixos/                              ← this repository root
├── l7v-panel/                      ← panel application source
│   ├── apps/
│   │   ├── web/                    ← Next.js 16 frontend
│   │   └── agent/                  ← Go binary source
│   ├── packages/ui/                ← shared shadcn/ui components
│   ├── package.json                ← pnpm workspace root
│   ├── turbo.json
│   └── flake.nix
├── services/panel/default.nix      ← NixOS module
└── platform/pkgs/
    ├── panel-agent/default.nix     ← Go binary Nix derivation (local path)
    └── panel-frontend/default.nix  ← Next.js Nix derivation (local path)
```

---

## Glossary

- **Panel**: The complete l7v-panel system, comprising the frontend application and the agent binary.
- **Frontend**: The Next.js 16 TypeScript application served at `panel.l7v.dev`. Delivers the browser UI and proxies API requests to the Agent.
- **Agent** (`panel-agent`): The Go binary that runs on each Managed_Host. Exposes the REST and SSE API over a Unix socket. Interfaces with systemd, procfs, NetworkManager, and journald.
- **Managed_Host**: A NixOS host (initially the laptop `L7V`) on which the Agent is deployed and running.
- **Control_Plane**: The server host running nginx and the Frontend, which routes browser requests to the correct Agent.
- **Unix_Socket**: The IPC transport path (`/run/panel-agent/panel-agent.sock`) over which nginx and the Agent communicate.
- **SSE**: Server-Sent Events — an HTTP/1.1 streaming mechanism used for real-time log delivery and metric push from the Agent to the Frontend.
- **Systemd_Unit**: A systemd service, socket, timer, mount, or other unit type tracked by the Agent.
- **Journal**: The systemd journal, accessed via `journald` or the `journalctl` command, as the source of log entries streamed by the Agent.
- **NetworkManager**: The network management daemon on the Managed_Host (workstation only), used for WiFi and Bluetooth status and toggle operations.
- **Grafana_Embed**: An iframe rendered in the Frontend that loads dashboards from `grafana.l7v.dev`. Proxied through nginx under `/grafana/`.
- **IP_Allowlist**: The nginx `allow`/`deny` directive list that restricts access to `panel.l7v.dev` to a configurable set of CIDR ranges.
- **NixOS_Module**: The declarative NixOS configuration module (`services/panel/default.nix`) that provisions the Agent on a Managed_Host and the Frontend reverse-proxy on the server host.
- **Nix_Derivation**: A Nix build expression in this repository that fetches source from the Panel_Repository and produces a reproducible binary or package. There are two derivations: `platform/pkgs/panel-agent/default.nix` for the Go binary and `platform/pkgs/panel-frontend/default.nix` for the Next.js application.
- **l7v-panel Repository**: The separate git repository containing the frontend and agent application source code. The NixOS derivations in this nixos repo fetch from this repository by git revision.
- **Panel_Repository**: Shorthand for the l7v-panel Repository.
- **SOPS**: Secrets Operations — the encrypted secrets system used in this repository (sops-nix + age). Used in Phase 2 for auth tokens; referenced here for future-compatibility.
- **Procfs**: The Linux virtual filesystem at `/proc` exposing real-time CPU, memory, and network statistics read by the Agent.
- **D-Bus**: The inter-process communication bus used by NetworkManager for WiFi and Bluetooth control operations.
- **Confirmation_Dialog**: A modal UI element requiring explicit operator acknowledgement before executing destructive or irreversible actions (power control).
- **AFT**: Agentic Framework Template — the Next.js 16 scaffold template located at `templates/aft/` in this repository. AFT is used to initialise new projects from scratch; it is not a parent application and the l7v-panel frontend does not inherit from it.

---

## Requirements

### Requirement 1: System Metrics Dashboard

**User Story:** As an operator, I want a real-time system metrics overview, so that I can assess the health of a Managed_Host at a glance from any browser.

#### Acceptance Criteria

1. WHEN the operator opens the Panel dashboard page, THE Frontend SHALL display current CPU utilisation as a percentage, refreshed every 5 seconds.
2. WHEN the operator opens the Panel dashboard page, THE Frontend SHALL display current RAM utilisation as used/total in mebibytes and as a percentage, refreshed every 5 seconds.
3. WHEN the operator opens the Panel dashboard page, THE Frontend SHALL display per-disk utilisation (used, available, total in gibibytes, percentage) for all mounted filesystems with type `ext4`, `btrfs`, `xfs`, or `vfat`, refreshed every 30 seconds.
4. WHEN the operator opens the Panel dashboard page, THE Frontend SHALL display current network throughput in kilobytes per second (receive and transmit) for each active network interface, refreshed every 5 seconds.
5. WHEN the Agent reads CPU utilisation, THE Agent SHALL compute it from `/proc/stat` as the percentage of non-idle CPU time over a 1-second sampling window.
6. WHEN the Agent reads memory utilisation, THE Agent SHALL derive used memory as `MemTotal - MemAvailable` from `/proc/meminfo`.
7. IF the Agent cannot read `/proc/stat` or `/proc/meminfo`, THEN THE Agent SHALL return HTTP 503 with a JSON error body containing a `"message"` field describing the failure.
8. THE Frontend SHALL display a visual indicator (coloured badge) for each metric: green when below warning threshold, amber when at or above warning threshold, red when at or above critical threshold.
9. WHERE the operator configures custom thresholds in the NixOS_Module, THE Agent SHALL use those values; otherwise THE Agent SHALL apply defaults: CPU warning 70%, CPU critical 90%, RAM warning 80%, RAM critical 95%, disk warning 80%, disk critical 90%.

---

### Requirement 2: Service Management

**User Story:** As an operator, I want to list, filter, and control systemd services, so that I can manage the running state of services on the Managed_Host without needing SSH access.

#### Acceptance Criteria

1. WHEN the operator navigates to the Services page, THE Frontend SHALL fetch and display a list of all Systemd_Units from the Agent within 2 seconds of page load.
2. THE Agent SHALL expose a `GET /api/v1/services` endpoint that returns a JSON array. Each element SHALL include the fields: `name` (string), `description` (string), `load_state` (string), `active_state` (string), `sub_state` (string), and `unit_file_state` (string).
3. WHEN the operator types in the filter input, THE Frontend SHALL filter the displayed service list to entries whose `name` or `description` contains the typed string, evaluated case-insensitively, within 100 milliseconds of the last keystroke.
4. WHEN the operator selects a service and clicks "Start", THE Frontend SHALL send `POST /api/v1/services/{unit}/start` to the Agent and refresh the service entry within 3 seconds.
5. WHEN the operator selects a service and clicks "Stop", THE Frontend SHALL send `POST /api/v1/services/{unit}/stop` to the Agent and refresh the service entry within 3 seconds.
6. WHEN the operator selects a service and clicks "Enable", THE Frontend SHALL send `POST /api/v1/services/{unit}/enable` to the Agent and refresh the unit_file_state within 3 seconds.
7. WHEN the operator selects a service and clicks "Disable", THE Frontend SHALL send `POST /api/v1/services/{unit}/disable` to the Agent and refresh the unit_file_state within 3 seconds.
8. THE Agent SHALL execute service control operations by communicating with systemd over D-Bus (using the `org.freedesktop.systemd1` interface), not by invoking `systemctl` as a subprocess.
9. IF a service control operation fails (e.g. the unit does not exist, or D-Bus returns an error), THEN THE Agent SHALL return HTTP 422 with a JSON body containing `"unit"`, `"operation"`, and `"message"` fields.
10. THE Agent SHALL run as a dedicated system user (`panel-agent`) with only the D-Bus policy permissions required for service start, stop, enable, and disable operations. THE Agent SHALL NOT have write access to the NixOS configuration or the Nix store.
11. THE Frontend SHALL display the `active_state` and `sub_state` of each service as a human-readable coloured badge: `active/running` green, `active/exited` blue, `failed` red, all others grey.

---

### Requirement 3: Power Control

**User Story:** As an operator, I want to initiate shutdown, reboot, or sleep from the browser, so that I can manage the Managed_Host power state remotely without SSH.

#### Acceptance Criteria

1. WHEN the operator clicks "Shutdown", "Reboot", or "Sleep" on the Power Control page, THE Frontend SHALL display a Confirmation_Dialog that names the action and the target Managed_Host before sending any request to the Agent.
2. WHEN the operator confirms the action in the Confirmation_Dialog, THE Frontend SHALL send the corresponding request (`POST /api/v1/power/shutdown`, `POST /api/v1/power/reboot`, or `POST /api/v1/power/sleep`) to the Agent.
3. WHEN the operator cancels the Confirmation_Dialog, THE Frontend SHALL dismiss the dialog and take no further action.
4. WHEN the Agent receives `POST /api/v1/power/shutdown`, THE Agent SHALL invoke `org.freedesktop.login1.Manager.PowerOff` via D-Bus with `interactive = false`.
5. WHEN the Agent receives `POST /api/v1/power/reboot`, THE Agent SHALL invoke `org.freedesktop.login1.Manager.Reboot` via D-Bus with `interactive = false`.
6. WHEN the Agent receives `POST /api/v1/power/sleep`, THE Agent SHALL invoke `org.freedesktop.login1.Manager.Suspend` via D-Bus with `interactive = false`.
7. IF the D-Bus call for any power operation fails, THEN THE Agent SHALL return HTTP 503 with a JSON body containing `"action"` and `"message"` fields before the power state changes.
8. THE Agent SHALL require the `panel-agent` system user to hold the `org.freedesktop.login1.power-off`, `org.freedesktop.login1.reboot`, and `org.freedesktop.login1.suspend` polkit actions, declared in the NixOS_Module via a polkit rule file.
9. WHILE a power action request is in flight, THE Frontend SHALL display a loading indicator and disable all Power Control buttons to prevent duplicate submissions.

---

### Requirement 4: Network and Bluetooth Status

**User Story:** As an operator, I want to view and toggle WiFi and Bluetooth connectivity, so that I can manage wireless interfaces on the Managed_Host remotely.

#### Acceptance Criteria

1. WHEN the operator navigates to the Network page, THE Frontend SHALL display the current WiFi state (enabled/disabled), the connected SSID (if connected), and the received signal strength in dBm, fetched from the Agent.
2. WHEN the operator navigates to the Network page, THE Frontend SHALL display the current Bluetooth adapter state (enabled/disabled) and a list of currently paired devices with their connection state, fetched from the Agent.
3. THE Agent SHALL expose `GET /api/v1/network/wifi` returning a JSON object with fields: `enabled` (bool), `ssid` (string | null), `signal_dbm` (integer | null), `ip_address` (string | null).
4. THE Agent SHALL expose `GET /api/v1/network/bluetooth` returning a JSON object with fields: `enabled` (bool), `devices` (array of objects with `name` (string), `address` (string), `connected` (bool)).
5. WHEN the operator clicks the WiFi toggle, THE Frontend SHALL send `POST /api/v1/network/wifi/toggle` to the Agent and refresh the WiFi status within 2 seconds.
6. WHEN the operator clicks the Bluetooth toggle, THE Frontend SHALL send `POST /api/v1/network/bluetooth/toggle` to the Agent and refresh the Bluetooth status within 2 seconds.
7. THE Agent SHALL implement WiFi and Bluetooth control by calling the NetworkManager D-Bus API (`org.freedesktop.NetworkManager` and `org.freedesktop.NetworkManager.Device.Wireless`) and the BlueZ D-Bus API (`org.bluez.Adapter1`) respectively.
8. IF the Managed_Host does not have a WiFi adapter, THEN THE Agent SHALL return a WiFi status object with `enabled: false` and `ssid: null` and SHALL NOT return an error.
9. IF the Managed_Host does not have a Bluetooth adapter, THEN THE Agent SHALL return a Bluetooth status object with `enabled: false` and `devices: []` and SHALL NOT return an error.
10. IF a toggle operation fails, THEN THE Agent SHALL return HTTP 503 with a JSON body containing `"interface"` and `"message"` fields.

---

### Requirement 5: Log Streaming

**User Story:** As an operator, I want to stream real-time journal logs in the browser, so that I can diagnose issues on the Managed_Host without SSH access.

#### Acceptance Criteria

1. WHEN the operator navigates to the Logs page, THE Frontend SHALL establish an SSE connection to `GET /api/v1/logs/stream` on the Agent and begin displaying journal log entries in real time.
2. THE Agent SHALL implement the log stream endpoint as a Server-Sent Event stream. Each SSE event SHALL carry a JSON-encoded log entry with fields: `timestamp` (ISO 8601 string), `unit` (string), `priority` (integer 0–7, matching journald priority levels), and `message` (string).
3. WHEN the operator enters a unit name in the filter input, THE Frontend SHALL reconnect the SSE stream with the query parameter `unit=<name>`, causing the Agent to filter log entries to those originating from the specified Systemd_Unit.
4. WHEN the operator selects a minimum priority level from the filter dropdown, THE Frontend SHALL reconnect the SSE stream with the query parameter `priority=<level>`, causing the Agent to emit only entries at or above the selected priority.
5. THE Agent SHALL tail the journal using the `journald` native Go binding (or `journalctl --follow --output=json`) and emit each new entry as an SSE event within 500 milliseconds of the entry appearing in the journal.
6. WHEN the SSE connection is dropped (network interruption or browser navigation), THE Frontend SHALL attempt to reconnect automatically using exponential back-off starting at 1 second, capped at 30 seconds, for up to 5 attempts.
7. THE Frontend SHALL buffer a maximum of 1000 log entries in memory and discard the oldest entries when the buffer is full, to prevent unbounded memory growth.
8. IF the Agent cannot open the journal (permission denied or journal unavailable), THEN THE Agent SHALL close the SSE stream and emit a final SSE event of type `"error"` with a JSON body containing a `"message"` field.
9. THE Frontend SHALL colour-code log entries by priority: emergency/alert/critical/error (red), warning (amber), notice/info (green), debug (grey).

---

### Requirement 6: Grafana Monitoring Integration

**User Story:** As an operator, I want to view embedded Grafana dashboards in the Panel, so that I can access infrastructure metrics without opening a separate browser tab.

#### Acceptance Criteria

1. WHEN the operator navigates to the Monitoring page, THE Frontend SHALL render an iframe that loads the Grafana home dashboard from `grafana.l7v.dev` via the nginx proxy path `/grafana/`.
2. THE nginx configuration on the server host SHALL proxy requests to `/grafana/` through to `http://127.0.0.1:3001` (the Grafana service), preserving the `Host` header as `grafana.l7v.dev`.
3. THE Grafana service SHALL be configured with `allow_embedding = true` in its `security` settings block, so that browsers do not reject the iframe due to `X-Frame-Options` or `Content-Security-Policy`.
4. THE Frontend SHALL size the Grafana iframe to fill the full available viewport height of the Monitoring page, minus the Panel navigation header.
5. IF the Grafana service is unreachable when the Monitoring page loads, THE Frontend SHALL display an error banner with the text "Grafana is currently unavailable" and a retry button, rather than showing a blank or broken iframe.
6. WHERE a `prometheusWidget` option is enabled in the NixOS_Module, THE Agent SHALL expose `GET /api/v1/metrics/query` accepting a `query` parameter, forwarding it to Prometheus at `http://127.0.0.1:9090/api/v1/query`, and returning the Prometheus JSON response to the Frontend.

---

### Requirement 7: Agent REST and SSE API Contract

**User Story:** As a developer, I want a well-defined API contract for the Agent, so that the Frontend and Agent can be developed, tested, and evolved independently.

#### Acceptance Criteria

1. THE Agent SHALL implement all API endpoints under the URL prefix `/api/v1/`.
2. THE Agent SHALL respond with `Content-Type: application/json` for all non-SSE endpoints.
3. THE Agent SHALL respond with `Content-Type: text/event-stream` and `Cache-Control: no-cache` for all SSE endpoints.
4. WHEN a request targets an unknown path, THE Agent SHALL return HTTP 404 with a JSON body `{"error": "not_found"}`.
5. WHEN a request uses an unsupported HTTP method on a known path, THE Agent SHALL return HTTP 405 with a JSON body `{"error": "method_not_allowed"}`.
6. THE Agent SHALL include an `X-Request-ID` header in every response, set to the value of the incoming `X-Request-ID` header if present, or to a newly generated UUID v4 if absent.
7. THE Agent SHALL accept and serve only connections via its Unix_Socket path (`/run/panel-agent/panel-agent.sock`). THE Agent SHALL NOT bind to any TCP port.
8. THE Agent SHALL be socket-activated by systemd. WHEN the systemd socket unit receives a connection, THE Agent SHALL start within 500 milliseconds.
9. THE Agent SHALL log all inbound requests at INFO level with fields: method, path, status code, duration (milliseconds), and request ID.
10. THE Agent SHALL expose `GET /api/v1/health` returning HTTP 200 and JSON body `{"status": "ok", "version": "<semver>"}` when the Agent is running and its D-Bus connection is healthy.
11. IF the D-Bus connection to systemd or logind is unavailable, THEN `GET /api/v1/health` SHALL return HTTP 503 with JSON body `{"status": "degraded", "message": "<reason>"}`.
12. THE Agent API SHALL be versioned such that all Phase 1 endpoints remain under `/api/v1/` and Phase 2 additions (auth, multi-host) can be introduced under `/api/v2/` without breaking existing consumers.

---

### Requirement 8: Frontend Application

**User Story:** As an operator, I want a professional, responsive web UI, so that I can use the Panel comfortably on desktop, tablet, and mobile browsers.

#### Acceptance Criteria

1. THE Frontend SHALL be a Next.js 16 application with TypeScript strict mode, Tailwind CSS, and shadcn/ui component library, located in `apps/web/` of the l7v-panel repository.
2. THE Frontend SHALL implement a persistent side-navigation layout with routes for: Dashboard, Services, Power, Network, Logs, and Monitoring.
3. THE Frontend SHALL be fully functional on viewport widths from 375 px (mobile) to 2560 px (wide desktop) without horizontal scrolling.
4. THE Frontend SHALL use Next.js server-side API routes to proxy all requests to the Agent, so that the Agent's Unix_Socket is never exposed directly to browser clients.
5. WHEN an API call to the Agent returns a non-2xx status, THE Frontend SHALL display a non-blocking toast notification containing the HTTP status code and the `message` field from the response body.
6. THE Frontend SHALL implement a host selector component in the navigation header. WHEN the operator selects a Managed_Host from the selector, THE Frontend SHALL route all subsequent API calls to the agent proxy for that host.
7. WHILE an API request is in flight, THE Frontend SHALL display a loading skeleton or spinner in the affected component to communicate progress.
8. THE Frontend SHALL persist the selected Managed_Host in `localStorage` so that the selection survives page refreshes.
9. THE Frontend SHALL support both light and dark colour themes, defaulting to the system preference, with a toggle in the navigation header.
10. THE Frontend SHALL be built as a production Next.js application and served by the Next.js standalone output mode, enabling deployment without `node_modules` on the server.

---

### Requirement 9: NixOS Module and Deployment

**User Story:** As an infrastructure operator, I want to configure and deploy the Panel declaratively through NixOS, so that the Panel is reproducible, version-controlled, and consistent with the l7v infrastructure conventions.

#### Acceptance Criteria

1. THE NixOS_Module SHALL be located at `services/panel/default.nix` in the nixos repository and SHALL follow the module authoring rules of this repository: `lib.mkEnableOption` gate, NixOS `assertions` for hard dependencies, English-language comments.
2. TWO Nix derivations SHALL exist in the nixos repository: `platform/pkgs/panel-agent/default.nix` building the Go binary, and `platform/pkgs/panel-frontend/default.nix` building the Next.js application. Both SHALL fetch source from the l7v-panel Repository by git revision and produce reproducible outputs with `nix build`.
3. WHEN `l7v.services.panel.agent.enable = true` is set on a Managed_Host, THE NixOS_Module SHALL create the systemd socket unit `panel-agent.socket` listening on `/run/panel-agent/panel-agent.sock` and the service unit `panel-agent.service` activated by that socket.
4. WHEN `l7v.services.panel.frontend.enable = true` is set on the server host, THE NixOS_Module SHALL add a nginx virtual host for `panel.l7v.dev` with `forceSSL = true` and `enableACME = true`.
5. THE NixOS_Module SHALL expose the option `l7v.services.panel.frontend.allowedCIDRs` of type `listOf str` (default `[ "127.0.0.1/32" ]`) and SHALL generate nginx `allow`/`deny` directives from this list for the `panel.l7v.dev` virtual host.
6. THE NixOS_Module SHALL expose the option `l7v.services.panel.agent.managedHosts` of type `attrsOf str` (mapping logical names to proxy upstream addresses) so that the Frontend can route requests to multiple Agents.
7. THE NixOS_Module SHALL declare an assertion that `l7v.reverseProxy.enable = true` when `l7v.services.panel.frontend.enable = true`.
8. THE NixOS_Module SHALL create the system user `panel-agent` with `isSystemUser = true` and SHALL assign it to the `systemd-journal` group (for journal read access) and declare the required polkit rules for D-Bus service management and power control.
9. THE Agent service unit SHALL set `RestartSec = 5` and `Restart = on-failure` so that transient failures do not permanently disable the Agent.
10. WHEN `nix build .#panel-agent` and `nix build .#panel-frontend` are executed, THE Nix_Derivation for each SHALL produce a reproducible output. THE builds SHALL pass `./scripts/validate.sh` with no errors.

---

### Requirement 10: Security and Transport

**User Story:** As an infrastructure operator, I want all Panel traffic to be encrypted and access-controlled, so that system management operations are not exposed to untrusted networks.

#### Acceptance Criteria

1. THE nginx virtual host for `panel.l7v.dev` SHALL enforce HTTPS by redirecting all HTTP requests to HTTPS and setting `forceSSL = true` with a TLS certificate obtained via ACME.
2. THE Agent SHALL accept connections only via its Unix_Socket. THE Agent SHALL NOT open any TCP or UDP listening socket.
3. THE nginx configuration for `panel.l7v.dev` SHALL include the `IP_Allowlist` directives generated from `l7v.services.panel.frontend.allowedCIDRs`, with a final `deny all` directive.
4. THE nginx proxy to the Agent SHALL use a Unix socket upstream (`proxy_pass http://unix:/run/panel-agent/panel-agent.sock`) and SHALL set `proxy_read_timeout 60s` for SSE connections.
5. THE nginx virtual host SHALL set the response headers `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
6. THE Agent systemd service unit SHALL set `NoNewPrivileges = true`, `ProtectSystem = strict`, `ProtectHome = true`, `PrivateTmp = true`, and `ReadWritePaths = [ "/run/panel-agent" ]` in its `serviceConfig`.
7. WHILE no authentication is implemented (Phase 1), THE system SHALL rely exclusively on the IP_Allowlist and HTTPS for access control. The NixOS_Module SHALL include an inline comment noting that Phase 2 will add JWT RS256 auth via SOPS-managed keys.
8. THE nginx Grafana proxy at `/grafana/` SHALL be subject to the same IP_Allowlist as `panel.l7v.dev`.

---

### Requirement 11: Performance and Reliability

**User Story:** As an operator, I want the Panel to respond quickly and remain stable under sustained use, so that it is a reliable tool rather than an additional operational burden.

#### Acceptance Criteria

1. THE Agent SHALL respond to all non-streaming REST endpoints within 500 milliseconds under normal operating conditions (no external I/O contention).
2. THE Agent SHALL handle at least 20 concurrent SSE connections without degrading journal tail latency beyond 1 second.
3. THE Frontend SHALL achieve a Lighthouse performance score of 80 or above on desktop when measured against the Dashboard page with a simulated fast 3G network profile.
4. WHEN the Agent process is restarted by systemd, THE Agent SHALL re-establish its D-Bus connections and resume accepting requests within 5 seconds.
5. THE Agent SHALL not leak goroutines: WHEN an SSE client disconnects, THE Agent SHALL cancel the corresponding journal-tail goroutine within 1 second.
6. THE Frontend build output SHALL not exceed 500 kB of initial JavaScript (gzipped) as measured by `next build` bundle analysis.

---

## Non-Functional Requirements

### NFR-1: Maintainability

- THE Panel codebase SHALL be split cleanly into `platform/pkgs/panel-agent/` (Go) and the Next.js frontend application in `apps/web/` of the l7v-panel repository (TypeScript). No business logic SHALL be embedded in nginx configuration.
- THE Agent SHALL expose API documentation as inline OpenAPI 3.1 annotations, processable by `swaggo/swag` or equivalent, so that the API contract can be generated from source.
- THE Nix_Derivation for the Agent SHALL pin Go module dependencies via `go.sum` and reproduce identically across builds (`gomod2nix` or equivalent vendoring approach).

### NFR-2: Observability

- THE Agent SHALL emit structured JSON logs to stdout. THE systemd service unit SHALL set `StandardOutput = journal` so that Agent logs are captured by journald and available to the Log Streaming feature.
- THE Agent SHOULD expose a Prometheus-compatible metrics endpoint at `GET /metrics` (not under `/api/v1/`) reporting: request count per endpoint, request duration histogram, active SSE connection count, and D-Bus error count.

### NFR-3: Testability

- THE Agent SHALL be structured such that D-Bus interactions are behind an interface, enabling unit tests to inject mock D-Bus clients without a running systemd.
- THE Frontend SHALL use the Next.js server API proxy layer in a manner testable with `jest` and `@testing-library/react` without a live Agent.

### NFR-4: Portability

- THE Agent SHALL compile and run on any NixOS host (aarch64-linux and x86_64-linux). Architecture-specific code SHALL be isolated behind build tags.
- THE Frontend SHALL run in all evergreen browsers (Chrome 120+, Firefox 120+, Safari 17+) without polyfills beyond what Next.js provides.

---

## Correctness Properties

The following properties are candidates for property-based testing. Each property targets logic within the Agent or Frontend that varies meaningfully with input and tests code we own (not external services).

### Property 1: API Error Response Schema Invariant

**Pattern:** Invariant
**Target:** Agent error handler
**Property:** For all non-2xx HTTP responses from the Agent, the response body SHALL be valid JSON and SHALL contain at least a `"message"` field of type string. The `Content-Type` header SHALL be `application/json`.
**Rationale:** Any error path omitting `"message"` causes the Frontend toast notification to display an empty string, silently hiding failures.
**Test approach:** Property-based — generate arbitrary invalid request inputs (malformed paths, wrong methods, unknown unit names, oversized bodies) and assert the invariant on every response.

### Property 2: Service List Round-Trip Consistency

**Pattern:** Round-trip
**Target:** Agent `GET /api/v1/services` parser and D-Bus response decoder
**Property:** For all valid D-Bus unit list responses, parsing the D-Bus response into the Agent's internal `Unit` struct and then serialising to JSON SHALL produce a JSON object whose fields match the original D-Bus field values without loss or mutation.
**Rationale:** Off-by-one errors in D-Bus array indexing or field name mapping cause silent data corruption in the service list.
**Test approach:** Property-based with a mock D-Bus client generating arbitrary `UnitStatus` slices; assert field-level equality after the parse → serialise round-trip.

### Property 3: Log Entry SSE Serialisation Round-Trip

**Pattern:** Round-trip
**Target:** Agent log entry serialiser
**Property:** For all `LogEntry` values with arbitrary `timestamp`, `unit`, `priority` (0–7), and `message` fields, serialising to SSE JSON and deserialising back to `LogEntry` SHALL produce a structurally equal value.
**Rationale:** Parsers and serialisers are tricky; a round-trip test catches encoding bugs (escaping, field omission, priority coercion) that example-based tests miss.
**Test approach:** Property-based (Go `testing/quick` or `pgregory.net/rapid`) — generate arbitrary `LogEntry` structs, round-trip through the SSE encoder/decoder, assert equality.

### Property 4: IP Allowlist Generation Monotonicity

**Pattern:** Metamorphic
**Target:** NixOS_Module nginx allowlist generator
**Property:** For all non-empty lists of valid CIDR strings `L`, the generated nginx configuration for `panel.l7v.dev` SHALL contain exactly `len(L)` `allow` directives followed by exactly one `deny all` directive. Adding a CIDR to `L` SHALL increase the count of `allow` directives by exactly 1 and SHALL NOT remove any existing `allow` directive.
**Rationale:** A generator that de-duplicates or reorders CIDRs unexpectedly could silently restrict access.
**Test approach:** Property-based over lists of valid CIDR strings using `nix eval` to render the nginx config and a regex counter to assert directive counts.

### Property 5: Metric Threshold Badge Classification

**Pattern:** Invariant + Confluence
**Target:** Frontend badge classifier
**Property:** For all metric values `v` and threshold pairs `(warn, crit)` where `warn < crit`, the badge colour function SHALL return exactly one of `{green, amber, red}`. The result SHALL be: `green` when `v < warn`, `amber` when `warn ≤ v < crit`, `red` when `v ≥ crit`. The function SHALL be pure (no side effects) and SHALL return the same result regardless of call order.
**Rationale:** Threshold logic with floating-point comparisons is a common source of off-by-epsilon bugs; property testing across the full numeric range catches boundary conditions.
**Test approach:** Property-based (fast-check in TypeScript) — generate arbitrary `(v, warn, crit)` triples and assert classification correctness and mutual exclusivity.

### Property 6: SSE Reconnect Back-Off Bounds

**Pattern:** Invariant
**Target:** Frontend SSE reconnect logic
**Property:** For all reconnect attempt numbers `n` (1 ≤ n ≤ 5), the computed back-off delay SHALL satisfy `1 ≤ delay ≤ 30` (seconds). The delay for attempt `n+1` SHALL be greater than or equal to the delay for attempt `n`.
**Rationale:** An incorrect back-off formula can produce delays of 0 (causing tight reconnect loops) or delays exceeding 30 seconds (violating the specification cap).
**Test approach:** Property-based (fast-check) — generate arbitrary attempt numbers in range and assert both bounds and monotonicity.

### Property 7: Power Control Idempotent UI State

**Pattern:** Idempotence
**Target:** Frontend Power Control button state reducer
**Property:** After any power action is confirmed and the request completes (success or failure), applying the "reset to idle" state transition again SHALL produce the same UI state as applying it once. The loading indicator SHALL not reappear and the buttons SHALL be re-enabled regardless of whether the apply is called once or twice.
**Rationale:** React state reducers with side effects can leave the UI stuck in a loading state if the reset transition is not idempotent; property testing ensures this cannot occur.
**Test approach:** Property-based (fast-check) — generate arbitrary action outcomes (success/failure for each of shutdown/reboot/sleep) and assert state idempotence.
