# Panel Backend Bugs — Bugfix Design

## Overview

Seven confirmed bugs in `panel/apps/agent/` are fixed together. They span four files and one
wiring site in `main.go`. Every change is a surgical diff — no architectural rewrites, no new
packages, no interface changes visible to callers outside the affected package.

Fix summary:

| # | Bug | File(s) | Change type |
|---|-----|---------|-------------|
| 1 | Auth middleware missing | `internal/api/middleware.go`, `internal/api/router.go` | New function, one-line wrap |
| 2 | GetStats stale pointer | `internal/journal/query.go` | Pre-allocate with exact cap |
| 3 | Upload path traversal | `internal/api/files.go` | Validate + reject before use |
| 4 | Hardcoded PIN + brute force | `internal/auth/auth.go` | Remove default, add rate-limit |
| 5 | AppsEngine singleton | `cmd/panel-agent/main.go` | Initialise deps before NewRouter |
| 6 | Metrics 2 s block | `internal/metrics/procfs.go` | Overlap samples in one window |
| 7 | WebSocket origin open | `internal/terminal/ws.go`, `internal/api/containers.go` | Real origin validator |

---

## Glossary

- **Bug_Condition (C)**: The precise input condition that causes defective behaviour.
- **Property (P)**: The observable correct output for any input satisfying C.
- **Preservation**: Existing correct behaviour that must be identical before and after the fix.
- **isBugCondition**: Pseudocode predicate that returns `true` when an input triggers the bug.
- **expectedBehavior**: Pseudocode predicate that returns `true` when the fixed function's output
  is correct for a buggy input.
- **requireAuth**: New HTTP middleware function added in `internal/api/middleware.go`.
- **sessionManager**: Concrete type in `internal/auth/auth.go` that implements `auth.Manager`.
- **attemptTracker**: New per-IP struct tracking failure count and window start.
- **procfsReader**: Concrete type in `internal/metrics/procfs.go` that implements `ProcfsReader`.
- **GetStats**: Method on `journalReader` in `internal/journal/query.go`.
- **NewUpgrader**: New exported constructor in `internal/terminal/ws.go` returning a validated
  `websocket.Upgrader`.

---

## Bug Details

### Bug 1 — Missing Authentication Enforcement

The `withMiddleware` wrapper in `middleware.go` only adds request-IDs and logs; it never checks
identity. `auth.Manager.Verify()` and `extractToken()` exist and work, but nothing calls them
before routing to handlers.

**Formal Specification:**
```
FUNCTION isBugCondition(req)
  INPUT: req of type *http.Request, deps of type Deps
  OUTPUT: boolean

  RETURN deps.Auth != nil
         AND deps.Auth.GetStatus("").AuthEnabled == true
         AND req.URL.Path NOT IN exemptPaths
         AND NOT deps.Auth.Verify(extractToken(req))
END FUNCTION
```

**Examples:**
- `POST /api/v1/power/shutdown` without `Authorization` header → executes shutdown (bug)
- `DELETE /api/v1/containers/abc123` with expired token → deletes container (bug)
- `GET /api/v1/terminal/ws` with no cookie → grants shell access (bug)

---

### Bug 2 — Stale Pointer Corruption in `GetStats`

`GetStats` builds `buckets []LogStatsBucket` starting with zero capacity, then stores
`&buckets[len(buckets)-1]` into `bucketMap` on every iteration. The first `append` that triggers a
reallocation copies the slice to a new backing array; all previously stored map pointers now point
into the abandoned old array. Subsequent writes to those pointers are invisible in the returned
slice.

**Formal Specification:**
```
FUNCTION isBugCondition(since, until, bucketDuration)
  INPUT: time range and bucket size
  OUTPUT: boolean

  exactCount := int((until - since) / bucketDuration) + 1
  RETURN exactCount > 0
         -- true for any non-empty range; the first append always reallocates
         -- because cap starts at 0
END FUNCTION
```

**Examples:**
- 1 h range, 1 min buckets → 61 buckets; first pointer stored at cap=0 is stale after first append
- 24 h range, 5 min buckets → 289 buckets; all but the last written bucket show zero counts

---

### Bug 3 — File Upload Path Traversal

`fsUploadHandler` takes `targetDir` directly from the `path` query param and passes it to
`filepath.Join` without any validation. Only the *filename* component is cleaned.

**Formal Specification:**
```
FUNCTION isBugCondition(targetDir)
  INPUT: targetDir string from query param
  OUTPUT: boolean

  cleaned := filepath.Clean(filepath.FromSlash(targetDir))
  RETURN NOT filepath.IsAbs(cleaned)
         OR strings.Contains(cleaned, "..")
END FUNCTION
```

**Examples:**
- `path=../../etc/cron.d` → resolves to `/etc/cron.d`, writes arbitrary file (bug)
- `path=relative/dir` → resolves relative to process CWD (bug)
- `path=/home/l7v/uploads` → absolute, no `..` → allowed (not a bug)

---

### Bug 4 — Hardcoded Default PIN + No Brute-Force Protection

`NewManager` hard-codes `pin = "1707"` when both env vars are absent. `Login()` has no attempt
counter, no window, and no lockout.

**Formal Specification:**
```
FUNCTION isBugCondition(env, loginHistory)
  INPUT: env vars map, per-IP attempt history
  OUTPUT: boolean

  noEnv  := env["PANEL_AUTH_PIN"] == "" AND env["PANEL_AUTH_PASSWORD"] == ""
  brute  := loginHistory[ip].consecutiveFailures >= 1
             -- any failure is uncounted, so infinite retries are possible

  RETURN noEnv OR brute
END FUNCTION
```

**Examples:**
- No env vars set → PIN is `"1707"`, publicly known default (bug)
- 10 000 rapid POST requests to `/api/v1/auth/login` → no lockout, exhaustive enumeration (bug)

---

### Bug 5 — AppsEngine/AppsController Lazy Init Discards Audit Log

`main.go` omits `AppsEngine` and `AppsController` from the `api.Deps` literal. The
`getAppsEngine` / `getAppsController` helpers create fresh instances per request. Each
`lifecycleController` gets a brand-new `AuditLogger`, so the logger that records an action and
the logger that serves the audit endpoint are never the same object.

**Formal Specification:**
```
FUNCTION isBugCondition(deps)
  INPUT: deps of type api.Deps
  OUTPUT: boolean

  RETURN deps.AppsEngine == nil OR deps.AppsController == nil
END FUNCTION
```

**Examples:**
- `POST /api/v1/apps/caddy/action` → audit record written to throwaway logger → lost (bug)
- `GET /api/v1/apps/audit` returns `[]` immediately after an action (bug)

---

### Bug 6 — Metrics 2-Second Block

`ReadSnapshot` contains two sequential `time.After(time.Second)` waits: first for the CPU delta,
then for the network throughput. Total latency ≈ 2 s per call. Under concurrent polling (≥2 tabs
at 2 s intervals) goroutines accumulate.

**Formal Specification:**
```
FUNCTION isBugCondition(concurrentCallers, pollIntervalMs)
  INPUT: number of concurrent callers, polling interval in ms
  OUTPUT: boolean

  RETURN true   -- every single call takes ≥2000 ms; any caller is affected
END FUNCTION
```

**Examples:**
- 1 caller, any poll interval → 2 000 ms handler latency (bug)
- 3 callers at 2 s interval → goroutines accumulate without bound (bug)

---

### Bug 7 — WebSocket Origin Check Disabled

Both `internal/terminal/ws.go` and `internal/api/containers.go` set
`CheckOrigin: func(*http.Request) bool { return true }`. Any cross-origin page can open a
WebSocket to the terminal or container exec endpoint.

**Formal Specification:**
```
FUNCTION isBugCondition(req)
  INPUT: WebSocket upgrade *http.Request
  OUTPUT: boolean

  origin := req.Header.Get("Origin")
  RETURN origin != ""
         AND origin does not match req.Host
         AND origin does not match localhost variants
         AND origin not in PANEL_ALLOWED_ORIGINS
END FUNCTION
```

**Examples:**
- `evil.example.com` page opens WS to `ws://192.168.1.10:8080/api/v1/terminal/ws` → accepted (bug)
- `Origin: http://attacker.io` on container exec WS → accepted (bug)

---

## Expected Behavior

### Bug 1 — Preservation Requirements

**Unchanged Behaviors:**
- `GET /api/v1/health` returns 200 with no token, always.
- `POST /api/v1/auth/login` accepts credentials without a pre-existing token.
- `GET /api/v1/auth/status` returns auth config without a token.
- All routes pass through unchanged when auth is disabled (both env vars empty).
- Routes with a valid, non-expired token continue to work identically.

### Bug 2 — Preservation Requirements

**Unchanged Behaviors:**
- Zero or negative `bucketDuration` is still clamped to `time.Minute`.
- `since` after `until` is still swapped before processing.
- Empty time ranges still return a slice of zero-count buckets covering the full range.

### Bug 3 — Preservation Requirements

**Unchanged Behaviors:**
- Uploads with a valid absolute `targetDir` (no `..`) still work end-to-end.
- Multiple files in a single multipart upload to a valid `targetDir` are all accepted.
- The response still returns the list of written paths.

### Bug 4 — Preservation Requirements

**Unchanged Behaviors:**
- `PANEL_AUTH_PIN` set → that PIN is still accepted, auth remains enabled.
- `PANEL_AUTH_PASSWORD` set → that password is still accepted, auth remains enabled.
- `Logout()` still invalidates the token immediately.
- A valid session token on a protected endpoint still passes through.

### Bug 5 — Preservation Requirements

**Unchanged Behaviors:**
- `getAppsEngine` and `getAppsController` helpers still fall back to lazy init when deps are nil
  (preserves testability with partial deps).
- `GET /api/v1/apps`, `/apps/summary`, `/apps/{id}` continue to return correct data.

### Bug 6 — Preservation Requirements

**Unchanged Behaviors:**
- The returned `MetricsSnapshot` still contains all five fields: `CPU`, `Memory`, `Disks`,
  `Network`, `Timestamp`.
- Read errors on `/proc/stat` or `/proc/net/dev` still propagate as errors.
- Empty `Network` slice is still returned when no non-loopback interfaces exist.

### Bug 7 — Preservation Requirements

**Unchanged Behaviors:**
- Same-origin WebSocket connections (panel frontend on same host) still upgrade successfully.
- Localhost connections in dev mode still upgrade without extra configuration.
- After upgrade, `input`, `resize`, `ping`, and `signal` message processing is unchanged.

---

## Hypothesized Root Cause

### Bug 1
The auth middleware step was simply never written. `withMiddleware` was the natural place but was
implemented to only add request-IDs and logging. `d.Auth` was wired in `Deps` and `extractToken`
existed in `security.go`, but no one closed the loop.

### Bug 2
The developer used the idiomatic "build slice + store pointer" pattern but did not account for
`append`'s reallocation semantics. The slice and map were created together, but the map holds
raw Go pointers that become invalid as soon as the backing array moves.

### Bug 3
The `filepath.Clean` call was applied only to the user-supplied *filename*, not to `targetDir`.
The asymmetry was likely unintentional.

### Bug 4
Two independent omissions: (a) a placeholder default PIN was set and never removed, and (b) no
rate-limiting was added (typical oversight when auth is "temporary" or "phase 1").

### Bug 5
`api.Deps` had `AppsEngine` and `AppsController` fields added at some point after `main.go` was
written. The wiring step was forgotten.

### Bug 6
CPU and network each independently require a 1-second delta sample. The developer wrote them
sequentially instead of overlapping them. The second wait is redundant — both samples can share the
same 1-second window.

### Bug 7
`CheckOrigin: func(...) bool { return true }` is the standard gorilla/websocket "skip origin
check" pattern, commonly used during development and never tightened before deployment.

---

## Correctness Properties

Property 1: Bug Condition — Auth Middleware Enforces Identity

_For any_ request where `isBugCondition` holds (auth enabled, non-exempt route, absent/invalid
token), the fixed `requireAuth` middleware SHALL return HTTP 401 with body
`{"message":"authentication required"}` and SHALL NOT invoke the downstream handler.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

---

Property 2: Preservation — Authenticated and Auth-Disabled Requests Pass Through

_For any_ request where the bug condition does NOT hold (auth disabled, exempt route, or valid
token), the fixed middleware SHALL produce exactly the same response as the original unguarded
handler, preserving all existing functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

---

Property 3: Bug Condition — GetStats Returns Accurate Bucket Counts

_For any_ call to `GetStats` with a non-empty time range, the fixed implementation SHALL return
a slice where every bucket's `Counts` map and `Total` field accurately reflect the journal entries
that fall within that bucket's window, with no zero-due-to-stale-pointer artifacts.

**Validates: Requirements 2.5, 2.6, 2.7**

---

Property 4: Preservation — GetStats Unchanged for Edge Inputs

_For any_ call to `GetStats` with zero/negative `bucketDuration` or with `since` after `until`,
the fixed implementation SHALL produce the same result as the original (clamped duration, swapped
bounds, empty buckets for empty ranges).

**Validates: Requirements 3.5, 3.6, 3.7**

---

Property 5: Bug Condition — Upload Path Traversal Rejected

_For any_ upload request where `isBugCondition(targetDir)` holds (non-absolute or contains `..`
after clean), the fixed handler SHALL return HTTP 400 with a descriptive error and SHALL NOT write
any bytes to disk.

**Validates: Requirements 2.8, 2.9**

---

Property 6: Preservation — Valid Upload Paths Still Work

_For any_ upload request where `targetDir` is absolute and contains no `..` after clean, the fixed
handler SHALL produce the same file-write and response behaviour as the original.

**Validates: Requirements 2.10, 3.8, 3.9**

---

Property 7: Bug Condition — No Hardcoded Default, Brute Force Blocked

_For any_ call to `NewManager` with both env vars empty, the fixed manager SHALL set
`authDisabled: true` (not install a default PIN). _For any_ sequence of more than `maxAttempts`
failed `Login` calls from the same IP within the window, the fixed `Login` SHALL return an error
and refuse further attempts until `lockoutDuration` expires.

**Validates: Requirements 2.11, 2.12, 2.13, 2.14**

---

Property 8: Preservation — Explicit Credentials and Session Lifecycle Unchanged

_For any_ call to `NewManager` with at least one env var set, the fixed manager SHALL behave
identically to the original (same PIN/password check, same session token lifecycle, same `Logout`
semantics).

**Validates: Requirements 3.10, 3.11, 3.12, 3.13**

---

Property 9: Bug Condition — AppsEngine Singleton Persists Audit Records

_For any_ call to `POST /api/v1/apps/{id}/action` followed by `GET /api/v1/apps/audit`, the fixed
wiring SHALL return the audit record from the same `AuditLogger` instance that recorded the action.

**Validates: Requirements 2.15, 2.16, 2.17**

---

Property 10: Preservation — Apps Lazy Init Still Works

_For any_ test or call path where `deps.AppsEngine` is nil, `getAppsEngine` SHALL still return a
valid engine (lazy init path unchanged).

**Validates: Requirements 3.14, 3.15, 3.16**

---

Property 11: Bug Condition — Metrics Handler Completes in ≤ 1 100 ms

_For any_ call to `ReadSnapshot`, the fixed implementation SHALL return within ≈ 1 000 ms
(+100 ms tolerance) by running CPU and network samples concurrently behind a single shared timer.

**Validates: Requirements 2.18, 2.19, 2.20**

---

Property 12: Preservation — MetricsSnapshot Fields Unchanged

_For any_ successful call to `ReadSnapshot`, the fixed implementation SHALL return a
`MetricsSnapshot` with the same set of populated fields (`CPU`, `Memory`, `Disks`, `Network`,
`Timestamp`) as the original implementation.

**Validates: Requirements 3.17, 3.18, 3.19**

---

Property 13: Bug Condition — Cross-Origin WebSocket Upgrade Rejected

_For any_ WebSocket upgrade request where `isBugCondition(req)` holds (origin is present, not
matching host, not localhost, not in allowlist), the fixed upgrader SHALL reject the upgrade with
HTTP 403 and log the rejected origin at WARN level.

**Validates: Requirements 2.21, 2.22, 2.23, 2.24**

---

Property 14: Preservation — Same-Origin and Localhost WebSocket Connections Accepted

_For any_ WebSocket upgrade request where the origin matches the panel host, localhost, or an
explicitly configured allowed origin, the fixed upgrader SHALL upgrade the connection, and all
subsequent message handling SHALL be identical to the original.

**Validates: Requirements 3.20, 3.21, 3.22**

---

## Fix Implementation

### Bug 1 — `requireAuth` in `internal/api/middleware.go`

Add after the existing `withMiddleware` function. No existing code is removed.

**New function:**
```go
// requireAuth returns middleware that enforces token authentication when auth is enabled.
// Exempt routes: GET /api/v1/health, POST /api/v1/auth/login, GET /api/v1/auth/status.
func requireAuth(d Deps) func(http.Handler) http.Handler {
    exemptPaths := map[string]bool{
        "GET /api/v1/health":      true,
        "POST /api/v1/auth/login": true,
        "GET /api/v1/auth/status": true,
    }
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            if d.Auth == nil {
                next.ServeHTTP(w, r)
                return
            }
            key := r.Method + " " + r.URL.Path
            if exemptPaths[key] {
                next.ServeHTTP(w, r)
                return
            }
            tok := extractToken(r)
            if !d.Auth.Verify(tok) {
                writeError(w, http.StatusUnauthorized,
                    map[string]string{"message": "authentication required"})
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}
```

**Wire in `NewRouter`:** Change the final return statement from:
```go
return withMiddleware(mux, d.Logger)
```
to:
```go
return withMiddleware(requireAuth(d)(mux), d.Logger)
```

This applies auth after path-normalisation (which lives in `withMiddleware`) is **not** needed
before the auth check. Auth wraps the mux, logging wraps auth — so the log entry always records
the final status code including 401s.

---

### Bug 2 — Pre-allocate in `GetStats` (`internal/journal/query.go`)

Replace the existing bucket-initialisation block:

**Before:**
```go
var buckets []LogStatsBucket
bucketMap := make(map[int64]*LogStatsBucket)

for t := since.Truncate(bucketDuration); !t.After(until); t = t.Add(bucketDuration) {
    b := LogStatsBucket{ ... }
    buckets = append(buckets, b)
    bucketMap[t.Unix()] = &buckets[len(buckets)-1]
}
```

**After:**
```go
// Compute exact bucket count first so the backing array is never reallocated.
// If it were reallocated, all *LogStatsBucket pointers stored in bucketMap
// would become dangling references to the abandoned old array.
exactCount := int(until.Sub(since.Truncate(bucketDuration))/bucketDuration) + 1
buckets := make([]LogStatsBucket, 0, exactCount)
bucketMap := make(map[int64]*LogStatsBucket, exactCount)

for t := since.Truncate(bucketDuration); !t.After(until); t = t.Add(bucketDuration) {
    buckets = append(buckets, LogStatsBucket{
        Timestamp: t,
        Counts:    make(map[string]int),
        Total:     0,
    })
    bucketMap[t.Unix()] = &buckets[len(buckets)-1]
}
```

The formula `int(until.Sub(since.Truncate(bucketDuration))/bucketDuration) + 1` matches the loop
iteration count exactly, so `append` never needs to grow the slice.

---

### Bug 3 — Path validation in `fsUploadHandler` (`internal/api/files.go`)

Add `"strings"` to imports (already present in the file — no change needed).

Replace the `targetDir` derivation block:

**Before:**
```go
targetDir := r.URL.Query().Get("path")
if targetDir == "" {
    targetDir = r.FormValue("path")
}
if targetDir == "" {
    targetDir = "/"
}
```

**After:**
```go
targetDir := r.URL.Query().Get("path")
if targetDir == "" {
    targetDir = r.FormValue("path")
}
if targetDir == "" {
    targetDir = "/"
}
// Reject path traversal and relative paths.
targetDir = filepath.Clean(filepath.FromSlash(targetDir))
if !filepath.IsAbs(targetDir) {
    writeError(w, http.StatusBadRequest,
        map[string]string{"message": "upload path must be an absolute path"})
    return
}
if strings.Contains(targetDir, "..") {
    writeError(w, http.StatusBadRequest,
        map[string]string{"message": "upload path must not contain '..' components"})
    return
}
```

`filepath.Clean` resolves `..` sequences, so after it a path that still contains `..` is
impossible in practice — but the belt-and-suspenders check preserves the explicit intent.

---

### Bug 4 — Remove hardcoded PIN, add rate-limiting (`internal/auth/auth.go`)

**Structural changes to `sessionManager`:**

```go
type attemptTracker struct {
    count       int
    windowStart time.Time
}

type sessionManager struct {
    mu              sync.RWMutex
    expectedPIN     string
    expectedPass    string
    authDisabled    bool
    sessions        map[string]*Session
    sessionExpiry   time.Duration
    // rate-limiting
    attempts        map[string]*attemptTracker
    maxAttempts     int
    window          time.Duration
    lockoutDuration time.Duration
}
```

**`NewManager` changes:**
```go
func NewManager() Manager {
    pin  := os.Getenv("PANEL_AUTH_PIN")
    pass := os.Getenv("PANEL_AUTH_PASSWORD")

    authDisabled := pin == "" && pass == ""
    // No fallback to "1707" — if no credentials are configured, auth is off.

    maxAttempts     := envIntAuth("PANEL_AUTH_MAX_ATTEMPTS", 5)
    lockoutDuration := envDurationAuth("PANEL_AUTH_LOCKOUT_DURATION", 5*time.Minute)

    return &sessionManager{
        expectedPIN:     pin,
        expectedPass:    pass,
        authDisabled:    authDisabled,
        sessions:        make(map[string]*Session),
        sessionExpiry:   24 * time.Hour,
        attempts:        make(map[string]*attemptTracker),
        maxAttempts:     maxAttempts,
        window:          time.Minute,
        lockoutDuration: lockoutDuration,
    }
}
```

**`GetStatus` change:** `AuthEnabled` returns `!sm.authDisabled`.

**`Login` changes** (under `sm.mu.Lock`):
1. If `sm.authDisabled` → skip credential check, return a valid token immediately.
2. Look up `sm.attempts[clientIP]`. If `count >= maxAttempts` and `time.Since(windowStart) < lockoutDuration`, return `ErrLockedOut` (new sentinel).
3. Reset tracker if `time.Since(windowStart) >= window`.
4. Verify PIN/password. On failure: increment `count`, update `windowStart` if first failure, return `ErrInvalidCredentials`.
5. On success: delete `sm.attempts[clientIP]`, create and return session.

**New error constant:**
```go
const (
    ErrInvalidCredentials = authError("geçersiz PIN veya parola")
    ErrLockedOut          = authError("çok fazla başarısız giriş denemesi; lütfen daha sonra tekrar deneyin")
)
```

**`authLoginHandler` change** (in `internal/api/security.go`): after `d.Auth.Login` returns
`ErrLockedOut`, respond with HTTP 429 instead of 401, and add a `Retry-After` header. Detect via
`errors.Is(err, auth.ErrLockedOut)`.

**Helper functions** (private to `auth` package):
```go
func envIntAuth(key string, def int) int { ... }
func envDurationAuth(key string, def time.Duration) time.Duration { ... }
```

---

### Bug 5 — Wire singleton in `main.go`

Add two lines immediately before the `deps := api.Deps{...}` literal:

```go
appsEngine := apps.NewEngine(systemd)
appsCtrl   := apps.NewController(appsEngine, systemd)
```

Add the `apps` import if not already present (it is already imported via `internal/api`'s
transitive dependencies but not directly — add
`"github.com/l7v/panel-agent/internal/apps"` to `main.go` imports).

In the `deps` literal, add:
```go
AppsEngine:       appsEngine,
AppsController:   appsCtrl,
```

No other files change.

---

### Bug 6 — Concurrent sampling in `ReadSnapshot` (`internal/metrics/procfs.go`)

**New flow** (replacing the existing sequential two-sleep structure):

```
1. Read cpu1   (fast, no sleep)
2. Read net1   (fast, no sleep)
3. Share one time.After(time.Second) — wait ~1 s
4. Concurrently (goroutines or sequential — both complete in the same 1 s window):
   - Read cpu2
   - Read net2
5. Compute cpuPct and netStats
6. Read mem and disks (no sleep required)
7. Return snapshot
```

Because steps 1–2 and 4 are all just `/proc` reads (microseconds), the total wall time is
dominated by the single 1-second sleep. Step 4 can be done sequentially after the `select` —
no goroutines needed, no synchronisation overhead. The key insight: both CPU and net only need
`t1` before the sleep and `t2` after; they don't need separate sleeps.

**Concrete change:**

```go
func (p *procfsReader) ReadSnapshot(ctx context.Context) (MetricsSnapshot, error) {
    // Take both pre-sleep samples before waiting.
    cpu1, err := readCPUStat()
    if err != nil {
        return MetricsSnapshot{}, fmt.Errorf("read /proc/stat: %w", err)
    }
    net1, err := readNetDev()
    if err != nil {
        return MetricsSnapshot{}, fmt.Errorf("read /proc/net/dev: %w", err)
    }

    // Single shared 1-second window for both CPU and network delta.
    select {
    case <-time.After(time.Second):
    case <-ctx.Done():
        return MetricsSnapshot{}, ctx.Err()
    }

    // Post-sleep samples — both happen after the same wait.
    cpu2, err := readCPUStat()
    if err != nil {
        return MetricsSnapshot{}, fmt.Errorf("read /proc/stat: %w", err)
    }
    net2, err := readNetDev()
    if err != nil {
        return MetricsSnapshot{}, fmt.Errorf("read /proc/net/dev: %w", err)
    }

    cpuPct   := computeCPUPct(cpu1, cpu2)
    netStats := computeNetStats(net1, net2)

    mem, err := readMemInfo()
    if err != nil {
        return MetricsSnapshot{}, fmt.Errorf("read /proc/meminfo: %w", err)
    }
    disks, err := readDiskStats()
    if err != nil {
        return MetricsSnapshot{}, fmt.Errorf("read disk stats: %w", err)
    }

    return MetricsSnapshot{
        CPU:       CPUStats{UsagePct: cpuPct},
        Memory:    mem,
        Disks:     disks,
        Network:   netStats,
        Timestamp: time.Now(),
    }, nil
}
```

The `readMemInfo` and `readDiskStats` calls are moved after the sleep — they are instantaneous and
their values don't depend on the delta window.

---

### Bug 7 — Origin validation in `internal/terminal/ws.go` and `internal/api/containers.go`

**New exported constructor in `internal/terminal/ws.go`:**

```go
// NewUpgrader returns a websocket.Upgrader that validates the Origin header against
// allowedOrigins (exact strings) plus the request's own Host and localhost variants.
func NewUpgrader(allowedOrigins []string) websocket.Upgrader {
    allowed := make(map[string]bool, len(allowedOrigins))
    for _, o := range allowedOrigins {
        o = strings.TrimSpace(o)
        if o != "" {
            allowed[o] = true
        }
    }

    return websocket.Upgrader{
        ReadBufferSize:  8192,
        WriteBufferSize: 8192,
        CheckOrigin: func(r *http.Request) bool {
            origin := r.Header.Get("Origin")
            if origin == "" {
                // No Origin header — same-origin tool or non-browser client; allow.
                return true
            }
            host := r.Host
            // Allow same-origin (http and https variants).
            if origin == "http://"+host || origin == "https://"+host {
                return true
            }
            // Allow localhost development origins.
            for _, local := range localhostOrigins(r) {
                if origin == local {
                    return true
                }
            }
            // Allow explicitly configured origins.
            if allowed[origin] {
                return true
            }
            slog.Warn("websocket origin rejected", "origin", origin, "host", host)
            return false
        },
    }
}

// localhostOrigins returns localhost variants on the same port as the request.
func localhostOrigins(r *http.Request) []string {
    _, port, _ := net.SplitHostPort(r.Host)
    if port == "" {
        return []string{
            "http://localhost", "https://localhost",
            "http://127.0.0.1", "https://127.0.0.1",
        }
    }
    return []string{
        "http://localhost:" + port, "https://localhost:" + port,
        "http://127.0.0.1:" + port, "https://127.0.0.1:" + port,
    }
}
```

**Parse `PANEL_ALLOWED_ORIGINS` once at startup.** The allowlist is passed into `Deps`:

```go
// in Deps struct (router.go):
AllowedOrigins []string
```

In `main.go`, before the `deps` literal:
```go
allowedOrigins := strings.Split(os.Getenv("PANEL_ALLOWED_ORIGINS"), ",")
```

In `deps`:
```go
AllowedOrigins: allowedOrigins,
```

**Replace the package-level `upgrader` var in `ws.go`** with a local call:

```go
// Remove: var upgrader = websocket.Upgrader{ ... }

// HandleWebSocket signature unchanged; upgrader is created per-call from deps.
// The handler receives allowedOrigins via a closure or a new parameter.
```

Since `HandleWebSocket` is called from `terminal.go` in the `api` package, thread `allowedOrigins`
through the call:

```go
// internal/terminal/ws.go
func HandleWebSocket(w http.ResponseWriter, r *http.Request, session *Session,
    allowedOrigins []string, logger *slog.Logger) {
    up := NewUpgrader(allowedOrigins)
    ws, err := up.Upgrade(w, r, nil)
    ...
}
```

Update callers in `internal/api/terminal.go`:
```go
terminal.HandleWebSocket(w, r, session, d.AllowedOrigins, d.Logger)
```

**Replace `containerWSUpgrader` in `internal/api/containers.go`:** Remove the package-level var.
In `containerExecWSHandler`, call `terminal.NewUpgrader(d.AllowedOrigins)` inline:

```go
func containerExecWSHandler(d Deps) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        up := terminal.NewUpgrader(d.AllowedOrigins)
        ws, err := up.Upgrade(w, r, nil)
        ...
    }
}
```

This ensures both WS endpoints share the same origin-validation logic with zero duplication.

**Required new imports in `terminal/ws.go`:** `"log/slog"` (already present), `"net"`,
`"strings"`.

---

## Testing Strategy

### Validation Approach

Two-phase: first run exploratory tests on the unfixed code to confirm root causes, then write fix
and preservation tests that must pass after each fix is applied.

---

### Exploratory Bug Condition Checking

**Goal**: Confirm each bug is reproducible on the unfixed code. Establish the exact failure mode
before writing the fix.

**Bug 1 exploration:**
- Send `POST /api/v1/power/shutdown` with no token to the test server. Expect handler to be called
  (verify via mock). On unfixed code: mock records a call. Fix: no call recorded.

**Bug 2 exploration:**
- Call `GetStats` with a 1-hour range and 1-minute buckets (61 buckets). Print the returned
  `Counts` maps. On unfixed code: most buckets show `Counts = {}` and `Total = 0` even when
  seeded journal data exists. Fix: all buckets show correct counts.

**Bug 3 exploration:**
- Send `POST /api/v1/fs/upload?path=../../tmp/evil` with a small file. Check whether the file
  appears outside the intended directory. On unfixed code: file is written to `../../tmp/evil`.

**Bug 4 exploration:**
- Call `auth.NewManager()` with no env vars; call `Login("1707", "", "127.0.0.1")`. On unfixed
  code: login succeeds with the default PIN. Send 100 rapid `Login` calls with wrong PINs — no
  lockout occurs.

**Bug 5 exploration:**
- Instantiate `api.Deps{}` with no `AppsEngine`/`AppsController`. Call `appActionHandler` then
  `appsAuditHandler`. On unfixed code: audit returns `[]`.

**Bug 6 exploration:**
- Time a call to `procfsReader.ReadSnapshot`. On unfixed code: elapsed time ≥ 2 000 ms.

**Bug 7 exploration:**
- Call `websocket.Upgrader.CheckOrigin` with a request whose `Origin` is `http://evil.example.com`
  and `Host` is `localhost:8080`. On unfixed code: returns `true`.

---

### Fix Checking

**Goal**: Verify that for all inputs where `isBugCondition` holds, the fixed function produces the
expected behavior.

```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedFunction(input)
  ASSERT expectedBehavior(result)
END FOR
```

**Bug 1 fix tests:**
- Auth-enabled server: unauthenticated request → 401, downstream handler not called.
- Auth-enabled server: expired token → 401.
- Auth-disabled server: any request without token → passes through.
- Exempt routes with no token → pass through regardless of auth state.

**Bug 2 fix tests:**
- `GetStats` with 61-bucket range and synthetic journal entries → all buckets have correct
  `Counts` and `Total`.
- `GetStats` with 1-bucket range (since == until) → single bucket with correct counts.

**Bug 3 fix tests:**
- `path=../../etc/cron.d` → 400, no file written.
- `path=relative` → 400, no file written.
- `path=/tmp/safe` → 200, file written to `/tmp/safe/`.

**Bug 4 fix tests:**
- `NewManager()` with no env vars → `GetStatus("").AuthEnabled == false`.
- 6 failed `Login` calls from same IP within 1 min → 6th returns `ErrLockedOut`.
- After lockout expires, correct credentials succeed.
- `PANEL_AUTH_PIN=secret` set → `Login("secret", "", ip)` succeeds; `Login("1707", "", ip)` fails.

**Bug 5 fix tests:**
- Start server with fix applied. `POST /api/v1/apps/x/action` → `GET /api/v1/apps/audit` returns
  1 record with matching `app_id`.

**Bug 6 fix tests:**
- Time `ReadSnapshot` → elapsed ≤ 1 100 ms.
- Cancel context after 200 ms → `ReadSnapshot` returns within 300 ms.

**Bug 7 fix tests:**
- `NewUpgrader(nil).CheckOrigin(req)` where `Origin: http://evil.example.com`, `Host: panel:8080`
  → `false`.
- Same-origin → `true`. Localhost → `true`. Configured allowed origin → `true`.

---

### Preservation Checking

**Goal**: Verify that for all inputs where `¬isBugCondition` holds, fixed and original produce
identical results.

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT original(input) == fixed(input)
END FOR
```

Property-based testing is the right tool here because the input space (token strings, time ranges,
file paths, IP addresses, origin strings) is large and adversarial.

**Bug 1 preservation PBT:**
- Generate random valid tokens; assert all requests pass through with the same response code as
  before the fix.
- Generate random paths for exempt routes; assert they always return 200 (health) or accept the
  request (login, status).

**Bug 2 preservation PBT:**
- Generate random `(since, until, bucketDuration)` triples including edge cases (zero duration,
  swapped bounds); assert bucket counts returned by fixed `GetStats` equal those from a reference
  implementation that uses index-based access instead of pointers.

**Bug 3 preservation PBT:**
- Generate random valid absolute paths with no `..`; assert all are accepted and uploaded files
  appear at the expected location.

**Bug 4 preservation PBT:**
- Generate random (correct PIN, IP) pairs; assert successful login returns a token.
- Generate random (wrong PIN, IP) pairs below threshold; assert only `ErrInvalidCredentials`
  (not `ErrLockedOut`).

**Bug 6 preservation PBT:**
- Generate synthetic `/proc/stat` and `/proc/net/dev` inputs; assert `computeCPUPct` and
  `computeNetStats` output is identical before and after the ordering change.

**Bug 7 preservation PBT:**
- Generate random `(origin, host)` pairs that should be allowed (same-origin, localhost variants,
  configured list); assert `CheckOrigin` returns `true` for all of them.

---

### Unit Tests

- **Bug 1**: `TestRequireAuthMiddleware` — table-driven: enabled/disabled, exempt/non-exempt,
  valid/expired/absent token.
- **Bug 2**: `TestGetStatsNoBucketCorruption` — call `GetStats` with a known journal and assert
  counts; also assert `cap(buckets) == len(buckets)` after construction.
- **Bug 3**: `TestFsUploadPathValidation` — table-driven traversal attempts and valid paths.
- **Bug 4**: `TestAuthManagerNoDefaultPIN`, `TestLoginBruteForceProtection`,
  `TestLoginLockoutExpiry`.
- **Bug 5**: `TestAppsSingletonAudit` — integration-style test with real
  `lifecycleController` mock.
- **Bug 6**: `TestReadSnapshotLatency` — assert `time.Since(start) < 1100*time.Millisecond`.
- **Bug 7**: `TestNewUpgraderOriginCheck` — table-driven with allowed and rejected origins.

### Property-Based Tests

- `TestGetStatsBucketCountsMatchJournal` — generate random time ranges + synthetic entries;
  assert sum of all `Total` fields equals injected entry count.
- `TestAuthRateLimitPreservation` — generate IPs and attempt counts below threshold; assert no
  false lockouts.
- `TestOriginValidatorPreservation` — generate random same-host origins; assert always allowed.

### Integration Tests

- `TestAuthMiddlewareE2E` — real HTTP server, auth enabled, fire requests with/without tokens
  across representative endpoint set.
- `TestMetricsHandlerConcurrent` — 5 concurrent `/api/v1/metrics` calls; assert all complete
  within 1 500 ms total wall time.
- `TestAppsAuditRoundTrip` — create action, retrieve audit; assert record present with correct
  fields.
