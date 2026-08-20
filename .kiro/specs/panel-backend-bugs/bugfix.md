# Bugfix Requirements Document

## Introduction

This document captures seven confirmed bugs discovered during a comprehensive backend audit of the
`panel-agent` Go REST/SSE API (`panel/apps/agent/`). The bugs span three categories:

- **Critical security** — unauthenticated access to destructive endpoints, path traversal, hardcoded
  credentials, unvalidated WebSocket origins
- **Data correctness** — stale pointer corruption in journal statistics aggregation, discarded audit
  log due to singleton mis-wiring
- **Performance / availability** — sequential 2-second sleeps in the metrics hot path that saturate
  the HTTP goroutine pool under realistic polling loads

All seven bugs must be fixed together because the security issues collectively reduce the effective
security posture to zero; fixing one while leaving others open provides no meaningful protection.

---

## Bug Analysis

### Current Behavior (Defect)

<!-- Bug 1 — Missing Authentication Enforcement (CRITICAL SECURITY) -->
<!-- Location: internal/api/router.go + internal/api/middleware.go -->
<!-- C(X): Request to any non-exempt route where auth is enabled, with absent/invalid token -->

**Bug 1 — Missing Authentication Enforcement on All Routes**

The `withMiddleware` wrapper logs every request but never verifies the caller's identity before
forwarding to the handler. `auth.Manager`, `auth.Manager.Verify()`, and `extractToken()` are all
wired and functional, but no route in `NewRouter` calls them before executing its handler.

1.1 WHEN a caller sends a request to any destructive endpoint (`POST /api/v1/power/shutdown`,
    `POST /api/v1/nixos/rebuild`, `POST /api/v1/fs/delete`, `DELETE /api/v1/containers/{id}`,
    `POST /api/v1/security/fail2ban/ban`, etc.) without an `Authorization` header, `X-Panel-Token`
    header, or `panel_session` cookie THEN the system executes the requested action without any
    identity check.

1.2 WHEN a caller sends a request to any state-mutating or sensitive read endpoint while
    authentication is enabled (`PANEL_AUTH_PIN` or `PANEL_AUTH_PASSWORD` is set) with an expired,
    forged, or absent session token THEN the system executes the requested action as if the token
    were valid.

1.3 WHEN a caller sends a request to `GET /api/v1/terminal/ws/{id}` or
    `GET /api/v1/terminal/ws` without a valid session token THEN the system upgrades the WebSocket
    connection and grants full interactive terminal access to the host.

1.4 WHEN a caller sends a request to `GET /api/v1/fs/read`, `GET /api/v1/fs/download`, or
    `GET /api/v1/fs/search` without a valid session token THEN the system returns the requested
    filesystem content from the host without authentication.

<!-- Bug 2 — Stale Pointer Corruption in journal.GetStats (DATA CORRUPTION) -->
<!-- Location: internal/journal/query.go lines 179–260 -->
<!-- C(X): int((until−since)/bucketDuration)+1 > initial_cap (true for any non-empty range) -->

**Bug 2 — Stale Pointer Corruption in `journal.GetStats`**

`GetStats` builds a `[]LogStatsBucket` slice and stores `*LogStatsBucket` pointers into a
`map[int64]*LogStatsBucket`. When `append` triggers a reallocation, all existing map pointers
become dangling references. Writes through stale pointers (`b.Counts[level]++`, `b.Total++`)
silently corrupt or discard data.

1.5 WHEN `GetStats` is called with a time range whose bucket count exceeds the initial
    zero-capacity slice length — true for any non-empty range — THEN the system writes log counts
    through stale pointers after the first `append`-triggered reallocation, producing `Counts` and
    `Total` values that do not reflect the actual journal entries.

1.6 WHEN `GET /api/v1/logs/stats` is called with a time range spanning any non-trivial window
    THEN the system returns `LogStatsBucket` objects whose `Counts` maps and `Total` fields are
    either zeroed or contain arbitrary memory values, without returning an error to the caller.

<!-- Bug 3 — File Upload Path Traversal (SECURITY) -->
<!-- Location: internal/api/files.go fsUploadHandler lines 129–195 -->
<!-- C(X): path query param contains .. components or is a relative path -->

**Bug 3 — File Upload Path Traversal**

`fsUploadHandler` reads `targetDir` directly from the `path` query parameter without sanitization.
The destination is assembled as `filepath.Join(targetDir, filepath.Clean(fileHeader.Filename))`.
While `filepath.Clean` normalises the filename, `targetDir` itself is never validated, so an
attacker can inject `..` sequences to write files anywhere on the host filesystem.

1.7 WHEN a multipart upload request is submitted with `path=../../etc/cron.d` (or any `..`-
    containing path) THEN the system resolves the destination outside the intended upload directory
    and writes the uploaded file to the traversed location without returning an error.

1.8 WHEN a multipart upload request is submitted with a relative `path` parameter (no leading `/`)
    THEN the system resolves it relative to the process working directory, potentially writing
    outside any intended base directory.

<!-- Bug 4 — Hardcoded Default PIN 1707 with No Brute-Force Protection (SECURITY) -->
<!-- Location: internal/auth/auth.go lines 42–45 -->
<!-- C(X): Neither PANEL_AUTH_PIN nor PANEL_AUTH_PASSWORD is set; or rapid failed logins -->

**Bug 4 — Hardcoded Default PIN `1707` with No Brute-Force Protection**

`auth.NewManager` sets `pin = "1707"` when neither `PANEL_AUTH_PIN` nor `PANEL_AUTH_PASSWORD` is
present in the environment. `Login()` records no attempt counts, implements no per-IP rate
limiting, and applies no lockout policy.

1.9 WHEN neither `PANEL_AUTH_PIN` nor `PANEL_AUTH_PASSWORD` environment variables are set at
    startup THEN the system initialises with the well-known, publicly-disclosed default PIN `1707`,
    meaning any caller who knows this default gains immediate authenticated access.

1.10 WHEN an attacker sends repeated `POST /api/v1/auth/login` requests with different PIN values
     from the same IP address THEN the system processes each attempt identically with no delay,
     counter increment, or lockout, allowing exhaustive enumeration of all 10,000 four-digit PINs
     in seconds.

<!-- Bug 5 — AppsEngine/AppsController Lazy Init Discards Audit Log (LOGIC ERROR) -->
<!-- Location: internal/api/apps.go getAppsEngine/getAppsController lines 15–30 -->
<!-- C(X): deps.AppsEngine == nil OR deps.AppsController == nil at request time -->

**Bug 5 — `AppsEngine` / `AppsController` Lazy Init Discards Audit Log**

`main.go` initialises `api.Deps` without assigning `AppsEngine` or `AppsController`. The lazy-init
helpers create a new `lifecycleController` instance — with a freshly-allocated `AuditLogger` — on
every handler invocation. The `AuditLogger` that records an action is never the same instance that
the audit endpoint queries.

1.11 WHEN `POST /api/v1/apps/{id}/action` is called and the action succeeds or fails THEN the
     system writes the audit record to a throwaway `lifecycleController` that is immediately
     garbage-collected; no record is persisted.

1.12 WHEN `GET /api/v1/apps/audit` is called immediately after one or more successful app lifecycle
     actions THEN the system returns an empty array `[]` because each request creates a fresh
     `lifecycleController` with an empty `AuditLogger`.

<!-- Bug 6 — GET /api/v1/metrics Blocks HTTP Thread for 2 Full Seconds (PERFORMANCE) -->
<!-- Location: internal/metrics/procfs.go ReadSnapshot() lines 24–77 -->
<!-- C(X): Concurrent GET /api/v1/metrics requests with poll interval < 2 seconds -->

**Bug 6 — `GET /api/v1/metrics` Blocks HTTP Goroutine for 2 Full Seconds**

`ReadSnapshot` contains two sequential `time.After(time.Second)` sleeps: one for CPU delta
sampling and one for network throughput. Every call holds a goroutine for at least 2 seconds.
Under typical dashboard polling (≥2 browser tabs at 2-second intervals), concurrently-blocked
goroutines accumulate without bound.

1.13 WHEN `GET /api/v1/metrics` is called THEN the system blocks the handling goroutine for
     approximately 2,000 ms (two sequential 1-second waits) before returning a response.

1.14 WHEN multiple clients poll `GET /api/v1/metrics` concurrently at an interval shorter than
     2 seconds THEN the number of simultaneously-blocked goroutines grows without bound, causing
     request queuing and increased latency across all other API endpoints.

<!-- Bug 7 — WebSocket Origin Check Disabled (CSRF / SECURITY) -->
<!-- Location: internal/terminal/ws.go lines 20–25 -->
<!-- C(X): WebSocket upgrade request with Origin header not matching panel host or localhost -->

**Bug 7 — WebSocket Origin Check Disabled**

The WebSocket upgrader in `internal/terminal/ws.go` has `CheckOrigin: func(r *http.Request) bool { return true }`.
Any web page served from any domain can open a WebSocket to the terminal endpoint and inject
commands into the host shell.

1.15 WHEN a browser navigates to a malicious third-party website while the panel agent is
     reachable on the same network, and that website opens a WebSocket to
     `ws://<panel-host>/api/v1/terminal/ws` THEN the system upgrades the connection and grants
     the attacker's page full bidirectional terminal access to the host.

1.16 WHEN a WebSocket upgrade request arrives with an `Origin` header that does not match the
     panel agent's host THEN the system accepts the connection without logging or rejecting the
     cross-origin request.

---

### Expected Behavior (Correct)

**Bug 1 — Authentication Enforcement Fix**

2.1 WHEN a caller sends a request to any endpoint other than `GET /api/v1/health`,
    `POST /api/v1/auth/login`, and `GET /api/v1/auth/status` while authentication is enabled
    THEN the system SHALL extract the token via `extractToken(r)`, call `d.Auth.Verify(token)`,
    and return HTTP 401 with a JSON error body if the token is absent or invalid, before executing
    any handler logic.

2.2 WHEN authentication is disabled (neither `PANEL_AUTH_PIN` nor `PANEL_AUTH_PASSWORD` is set)
    THEN the system SHALL allow all requests to proceed without a token check, preserving the
    current no-auth-required behaviour.

2.3 WHEN a caller provides a valid, non-expired session token on any protected endpoint THEN the
    system SHALL allow the request to proceed to its handler unchanged.

2.4 WHEN the `requireAuth` middleware returns HTTP 401 THEN the system SHALL NOT execute any
    portion of the downstream route handler (power, filesystem, terminal, etc.).

**Bug 2 — `GetStats` Stale Pointer Fix**

2.5 WHEN `GetStats` is called with any valid time range and bucket duration THEN the system SHALL
    pre-allocate `buckets` with exact capacity `int((until−since)/bucketDuration) + 1` before the
    bucket-building loop, eliminating all reallocation and ensuring every map pointer remains valid
    for the full lifetime of the function.

2.6 WHEN `GetStats` is called and a journal entry falls within a bucket's time window THEN the
    system SHALL correctly increment `Counts[level]` and `Total` on the corresponding bucket, and
    these increments SHALL be reflected in the slice returned to the caller.

2.7 WHEN `GET /api/v1/logs/stats` is called with a valid time range THEN the system SHALL return
    `LogStatsBucket` objects whose `Counts` and `Total` fields accurately represent the number of
    journal entries at each log level within each bucket's time window.

**Bug 3 — Path Traversal Fix**

2.8 WHEN a multipart upload request is received THEN the system SHALL pass `targetDir` through
    `filepath.Clean(filepath.FromSlash(targetDir))` and SHALL reject the request with HTTP 400 if
    the cleaned path is not absolute (does not start with `/`).

2.9 WHEN the cleaned `targetDir` still contains a `..` component after `filepath.Clean` THEN the
    system SHALL reject the request with HTTP 400 and return a descriptive error body.

2.10 WHEN a valid, sanitized `targetDir` is provided and the upload succeeds THEN the system SHALL
     write the file only within `targetDir` and SHALL return the resolved absolute destination path
     in the response.

**Bug 4 — Hardcoded PIN and Brute-Force Fix**

2.11 WHEN neither `PANEL_AUTH_PIN` nor `PANEL_AUTH_PASSWORD` is set THEN the system SHALL NOT
     fall back to a hardcoded credential; instead it SHALL treat authentication as disabled
     (`auth_enabled: false`) so all routes pass through without requiring a token.

2.12 WHEN `Login()` is called and credentials are incorrect THEN the system SHALL increment a
     per-source-IP failure counter and, after `N` consecutive failures within a configurable time
     window `W`, SHALL return HTTP 429 and refuse further login attempts from that IP until the
     lockout duration expires.

2.13 WHEN a source IP is locked out THEN the system SHALL return HTTP 429 with a `Retry-After`
     header indicating when the lockout expires, without revealing whether the credentials were
     correct.

2.14 WHEN a source IP has not exceeded the failure threshold and provides correct credentials
     THEN the system SHALL reset the failure counter for that IP and return a valid session token.

**Bug 5 — Singleton AppsController Fix**

2.15 WHEN `main.go` initialises `api.Deps` THEN the system SHALL create exactly one `apps.Engine`
     instance (via `apps.NewEngine(systemd)`) and exactly one `apps.LifecycleController` instance
     (via `apps.NewController(engine, systemd)`) and SHALL assign them to `deps.AppsEngine` and
     `deps.AppsController` respectively, before `api.NewRouter(deps)` is called.

2.16 WHEN `POST /api/v1/apps/{id}/action` is called and the action completes THEN the system SHALL
     write the audit record to the singleton `AuditLogger` on the shared `AppsController`.

2.17 WHEN `GET /api/v1/apps/audit` is called THEN the system SHALL return all audit records written
     by the singleton `AppsController` since the process started, in reverse-chronological order,
     up to the requested `limit`.

**Bug 6 — Concurrent Metrics Sampling Fix**

2.18 WHEN `GET /api/v1/metrics` is called THEN the system SHALL return a complete `MetricsSnapshot`
     with total handler latency of no more than 1,100 ms, by running both the CPU-delta sample and
     the network-throughput sample concurrently behind a single shared `time.After(time.Second)`
     ticker.

2.19 WHEN the context passed to `ReadSnapshot` is cancelled before the 1-second sample window
     elapses THEN the system SHALL return `ctx.Err()` immediately without waiting for the remaining
     sample window to expire.

2.20 WHEN `GET /api/v1/metrics` is called concurrently by N clients THEN each goroutine SHALL
     block for at most ~1 second, halving the goroutine-pool pressure compared to the sequential
     implementation.

**Bug 7 — WebSocket Origin Validation Fix**

2.21 WHEN a WebSocket upgrade request arrives THEN the system SHALL extract the `Origin` header
     and validate it against an allowlist comprising: (a) the request's own `Host` header
     (same-origin), (b) `localhost` and `127.0.0.1` on any port (local development), and (c) any
     additional origins listed in the `PANEL_ALLOWED_ORIGINS` environment variable
     (comma-separated).

2.22 WHEN the `Origin` header is absent or does not match any entry in the allowlist THEN the
     system SHALL reject the WebSocket upgrade with HTTP 403 and log the rejected origin at
     `WARN` level.

2.23 WHEN the `PANEL_ALLOWED_ORIGINS` environment variable is set THEN the system SHALL parse it
     as a comma-separated list of exact origin strings and include them in the allowlist at startup.

2.24 WHEN `PANEL_ALLOWED_ORIGINS` is not set THEN the system SHALL default to allowing only
     same-host and localhost origins.

---

### Unchanged Behavior (Regression Prevention)

**Bug 1 — Auth Regression Prevention**

3.1 WHEN authentication is disabled and a caller requests `GET /api/v1/health` THEN the system
    SHALL CONTINUE TO return HTTP 200 without requiring a token.

3.2 WHEN a caller submits correct credentials to `POST /api/v1/auth/login` THEN the system SHALL
    CONTINUE TO return a valid session token and set the `panel_session` cookie.

3.3 WHEN a valid session token is provided on any previously-accessible endpoint THEN the system
    SHALL CONTINUE TO return the same responses as before the fix.

3.4 WHEN `GET /api/v1/auth/status` is called without a token THEN the system SHALL CONTINUE TO
    return the current auth configuration (enabled/disabled, method) without requiring a token.

**Bug 2 — `GetStats` Regression Prevention**

3.5 WHEN `GetStats` is called with a zero or negative `bucketDuration` THEN the system SHALL
    CONTINUE TO default `bucketDuration` to `time.Minute`.

3.6 WHEN `GetStats` is called with `since` after `until` THEN the system SHALL CONTINUE TO swap
    them before processing.

3.7 WHEN the journal contains no entries in the requested time range THEN the system SHALL
    CONTINUE TO return a slice of empty (zero-count) buckets covering the full range.

**Bug 3 — Upload Regression Prevention**

3.8 WHEN a multipart upload request is submitted with a valid absolute `path`
    (e.g., `/home/l7v/uploads`) THEN the system SHALL CONTINUE TO create the destination directory
    if it does not exist and write each uploaded file to it.

3.9 WHEN multiple files are included in a single multipart upload to a valid `targetDir` THEN the
    system SHALL CONTINUE TO process all files and return the full list of written paths in the
    response.

**Bug 4 — Auth Credential Regression Prevention**

3.10 WHEN `PANEL_AUTH_PIN` is explicitly set in the environment THEN the system SHALL CONTINUE TO
     use that value as the expected PIN and enable authentication.

3.11 WHEN `PANEL_AUTH_PASSWORD` is explicitly set in the environment THEN the system SHALL
     CONTINUE TO use that value as the expected password and enable authentication.

3.12 WHEN a valid session token obtained after a successful login is presented to a protected
     endpoint THEN the system SHALL CONTINUE TO allow the request.

3.13 WHEN `Logout()` is called with a valid token THEN the system SHALL CONTINUE TO invalidate
     that token immediately.

**Bug 5 — Apps Singleton Regression Prevention**

3.14 WHEN `deps.AppsEngine` is non-nil at router creation time THEN the system SHALL CONTINUE TO
     use the provided engine instance without creating a new one.

3.15 WHEN `deps.AppsController` is non-nil at router creation time THEN the system SHALL CONTINUE
     TO use the provided controller instance without creating a new one.

3.16 WHEN `GET /api/v1/apps`, `GET /api/v1/apps/summary`, and `GET /api/v1/apps/{id}` are called
     THEN the system SHALL CONTINUE TO return correct application listings using the shared engine.

**Bug 6 — Metrics Regression Prevention**

3.17 WHEN `ReadSnapshot` completes successfully THEN the system SHALL CONTINUE TO return a
     `MetricsSnapshot` containing `CPU.UsagePct`, `Memory`, `Disks`, `Network`, and `Timestamp`
     fields populated from live `/proc` data.

3.18 WHEN the CPU or network sample encounters a read error on `/proc/stat` or `/proc/net/dev`
     THEN the system SHALL CONTINUE TO return an error to the caller.

3.19 WHEN `GET /api/v1/metrics` is called on a system with no non-loopback network interfaces
     THEN the system SHALL CONTINUE TO return an empty `Network` slice rather than an error.

**Bug 7 — WebSocket Regression Prevention**

3.20 WHEN a WebSocket connection is established from the same host as the panel agent (same-origin
     request from the panel web frontend) THEN the system SHALL CONTINUE TO upgrade the connection
     and provide full terminal functionality.

3.21 WHEN a WebSocket connection is established from `localhost` in development mode THEN the
     system SHALL CONTINUE TO upgrade the connection without requiring additional configuration.

3.22 WHEN an established terminal WebSocket session receives `input`, `resize`, `ping`, and
     `signal` messages THEN the system SHALL CONTINUE TO process them correctly.
