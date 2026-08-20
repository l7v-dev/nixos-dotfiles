# Implementation Plan

## Overview

Seven confirmed bugs in `panel/apps/agent/` fixed in criticality order. Each bug follows the
Verify → Detect Gap → Assign → Implement → Validate pattern: write an exploration test that fails
on unfixed code (confirming the bug), write preservation tests, apply the minimal surgical fix,
then verify both test suites pass.

## Task Dependency Graph

```json
{
  "waves": [
    {"wave": 1, "tasks": ["1", "5", "9", "13", "17", "21", "25"]},
    {"wave": 2, "tasks": ["2", "6", "10", "14", "18", "22", "26"]},
    {"wave": 3, "tasks": ["3", "7", "11", "15", "19", "23", "27"]},
    {"wave": 4, "tasks": ["4", "8", "12", "16", "20", "24", "28"]},
    {"wave": 5, "tasks": ["29", "30"]}
  ]
}
```

## Tasks

<!-- Tasks ordered by criticality: security-critical first, then data correctness, then performance -->

---

## Bug 1 — Auth Middleware (CRITICAL: blocks all security)

- [x] 1. Write bug condition exploration test for missing auth enforcement
  - **Property 1: Bug Condition** - Auth Middleware Never Called
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes
  - **GOAL**: Confirm that destructive endpoints execute without any identity check
  - **Scoped PBT Approach**: Scope to concrete case: POST /api/v1/power/shutdown with no token while auth is enabled
  - Bug condition from design: `deps.Auth != nil AND deps.Auth.GetStatus("").AuthEnabled == true AND req.URL.Path NOT IN exemptPaths AND NOT deps.Auth.Verify(extractToken(req))`
  - Create test HTTP server with auth enabled (`PANEL_AUTH_PIN=test-pin` equivalent in `auth.NewManager` mock)
  - Send `POST /api/v1/power/shutdown` with no `Authorization` header, no `X-Panel-Token`, no `panel_session` cookie
  - Assert the downstream handler mock WAS invoked (proving no gate exists)
  - Also test `GET /api/v1/terminal/ws` with no token — assert upgrade would proceed
  - Run on UNFIXED code — expect: handler IS invoked (bug confirmed)
  - Document counterexample: "unauthenticated POST /api/v1/power/shutdown reaches handler — no 401 returned"
  - Mark task complete when test is written, run, and failure documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Write preservation property tests for auth pass-through (BEFORE implementing fix)
  - **Property 2: Preservation** - Exempt Routes and Valid Tokens Always Pass Through
  - **IMPORTANT**: Follow observation-first methodology on UNFIXED code
  - Observe: `GET /api/v1/health` returns 200 with no token on unfixed code
  - Observe: `POST /api/v1/auth/login` accepts credentials with no pre-existing token
  - Observe: `GET /api/v1/auth/status` returns auth config with no token
  - Observe: any route passes through when `deps.Auth == nil` (auth disabled)
  - Observe: valid-token requests get through unchanged
  - Write PBT: for all (method, path) in {exempt routes} × {any token state}, response is not 401
  - Write PBT: for all valid non-expired tokens on non-exempt routes, downstream handler is invoked
  - Write PBT: when `PANEL_AUTH_PIN=""` and `PANEL_AUTH_PASSWORD=""`, all routes pass through
  - Verify these tests PASS on UNFIXED code (baseline)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3. Fix: Auth middleware enforcement
  - **Gap detected**: `withMiddleware` in `internal/api/middleware.go` only adds request-IDs and logging — no identity check
  - **Fix location**: `internal/api/middleware.go` (add `requireAuth`) + `internal/api/router.go` (wire it)

  - [~] 3.1 Add `requireAuth` middleware to `internal/api/middleware.go`
    - Add `requireAuth(d Deps) func(http.Handler) http.Handler` after `withMiddleware`
    - Exempt paths: `"GET /api/v1/health"`, `"POST /api/v1/auth/login"`, `"GET /api/v1/auth/status"`
    - Key is `r.Method + " " + r.URL.Path`; call `d.Auth.Verify(extractToken(r))` for non-exempt paths
    - When `d.Auth == nil`: pass through unconditionally (auth disabled)
    - On verify failure: `writeError(w, http.StatusUnauthorized, map[string]string{"message": "authentication required"})`
    - MUST NOT invoke downstream handler on 401
    - _Bug_Condition: `deps.Auth != nil AND authEnabled AND path NOT exempt AND NOT Verify(token)`_
    - _Expected_Behavior: return HTTP 401 with `{"message":"authentication required"}`, handler not called_
    - _Preservation: auth-disabled pass-through, exempt routes always pass, valid tokens always pass_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [~] 3.2 Wire `requireAuth` in `NewRouter` (`internal/api/router.go`)
    - Change final return from `return withMiddleware(mux, d.Logger)`
    - To `return withMiddleware(requireAuth(d)(mux), d.Logger)`
    - Auth wraps mux; logging wraps auth — 401s are logged with correct status code
    - _Requirements: 2.1, 2.4_

  - [~] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Unauthenticated Requests Blocked With 401
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Run bug condition exploration test from step 1 on FIXED code
    - **EXPECTED OUTCOME**: Test PASSES — handler mock is NOT invoked, HTTP 401 returned
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [~] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Exempt Routes and Valid Tokens Pass Through
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS — no regressions on health, login, status, auth-disabled, valid-token paths

- [~] 4. Checkpoint Bug 1 — Ensure all auth tests pass
  - Run `go test ./internal/api/... -run TestRequireAuth`
  - Confirm `TestAuthMiddlewareE2E` passes if present
  - Ask user if questions arise

---

## Bug 4 — Hardcoded PIN + Brute Force (CRITICAL: security)

- [~] 5. Write bug condition exploration test for hardcoded default PIN and no brute-force protection
  - **Property 1: Bug Condition** - Default PIN 1707 Accepted + Unlimited Login Attempts
  - **CRITICAL**: This test MUST FAIL on unfixed code (i.e., test asserts the FIXED behavior which doesn't exist yet)
  - **GOAL**: Confirm default PIN is `"1707"` and that rapid failed logins are not rate-limited
  - **Scoped PBT Approach**: Scope to two concrete failing cases:
    1. `NewManager()` with no env vars; call `Login("1707", "", "127.0.0.1")` → expect success (proving default exists)
    2. 10 rapid `Login("wrong", "", "127.0.0.1")` calls → all return `ErrInvalidCredentials`, none return lockout error
  - Run on UNFIXED code — expect: both cases confirm the bug
  - Document counterexamples:
    - "NewManager with no env vars: Login('1707','','ip') returns session (default PIN accepted)"
    - "After 10 failed logins: still ErrInvalidCredentials, no ErrLockedOut returned"
  - Mark task complete when test is written, run, and failures documented
  - _Requirements: 1.9, 1.10_

- [~] 6. Write preservation property tests for explicit credentials and session lifecycle (BEFORE fix)
  - **Property 2: Preservation** - Explicit PIN/Password Auth and Session Lifecycle Unchanged
  - **IMPORTANT**: Follow observation-first methodology on UNFIXED code
  - Observe: `PANEL_AUTH_PIN=mysecret` set → `Login("mysecret","","ip")` succeeds
  - Observe: `PANEL_AUTH_PASSWORD=mypass` set → `Login("","mypass","ip")` succeeds
  - Observe: `Logout(token)` immediately invalidates the token
  - Observe: session token from successful login passes `Verify(token)` until expiry
  - Write PBT: for all (explicit-pin, ip) pairs, correct pin login succeeds; wrong pin fails
  - Write PBT: for all fresh tokens, `Verify(token)` is true until expiry
  - Verify these tests PASS on UNFIXED code
  - _Requirements: 3.10, 3.11, 3.12, 3.13_

- [ ] 7. Fix: Remove hardcoded PIN and add per-IP rate limiting
  - **Gap detected**: `internal/auth/auth.go` line ~44: `pin = "1707"` fallback; `Login()` has no attempt counter
  - **Fix location**: `internal/auth/auth.go`

  - [~] 7.1 Add `attemptTracker` struct and extend `sessionManager`
    - Add `attemptTracker struct { count int; windowStart time.Time }`
    - Add fields to `sessionManager`: `authDisabled bool`, `attempts map[string]*attemptTracker`, `maxAttempts int`, `window time.Duration`, `lockoutDuration time.Duration`
    - Add private helpers `envIntAuth(key string, def int) int` and `envDurationAuth(key string, def time.Duration) time.Duration`
    - _Requirements: 2.12, 2.13_

  - [~] 7.2 Update `NewManager` to remove hardcoded default
    - Remove `pin = "1707"` fallback — if both env vars empty, set `authDisabled = true`
    - Read `PANEL_AUTH_MAX_ATTEMPTS` (default 5) and `PANEL_AUTH_LOCKOUT_DURATION` (default 5m) via helpers
    - Initialise `attempts: make(map[string]*attemptTracker)`
    - _Bug_Condition: `env["PANEL_AUTH_PIN"] == "" AND env["PANEL_AUTH_PASSWORD"] == ""`_
    - _Expected_Behavior: `authDisabled = true`; `GetStatus("").AuthEnabled == false`_
    - _Preservation: explicit PIN/password env vars still enable auth and accept correct credentials_
    - _Requirements: 2.11_

  - [~] 7.3 Update `GetStatus` to use `!sm.authDisabled` for `AuthEnabled`
    - Replace `AuthEnabled: sm.expectedPIN != "" || sm.expectedPass != ""`
    - With `AuthEnabled: !sm.authDisabled`
    - _Requirements: 2.11_

  - [~] 7.4 Update `Login` to enforce per-IP rate limiting
    - Under `sm.mu.Lock`: if `sm.authDisabled`, skip credential check and return a session immediately
    - Look up `sm.attempts[clientIP]`; if `count >= maxAttempts` and `time.Since(windowStart) < lockoutDuration` → return `ErrLockedOut`
    - Reset tracker if `time.Since(windowStart) >= window`
    - On credential failure: increment count, set windowStart on first failure, return `ErrInvalidCredentials`
    - On success: `delete(sm.attempts, clientIP)`, create and return session
    - _Requirements: 2.12, 2.13, 2.14_

  - [~] 7.5 Add `ErrLockedOut` sentinel and update `authLoginHandler`
    - Add `ErrLockedOut = authError("çok fazla başarısız giriş denemesi; lütfen daha sonra tekrar deneyin")`
    - In `authLoginHandler` (`internal/api/security.go`): detect `errors.Is(err, auth.ErrLockedOut)` and respond HTTP 429 with `Retry-After` header
    - _Requirements: 2.12, 2.13_

  - [~] 7.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - No Default PIN, Brute Force Blocked
    - **IMPORTANT**: Re-run the SAME test from task 5
    - **EXPECTED OUTCOME**: `Login("1707","","ip")` fails (no default); 6th failed login returns `ErrLockedOut`
    - _Requirements: 2.11, 2.12, 2.13, 2.14_

  - [~] 7.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Explicit Credentials and Session Lifecycle Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 6
    - **EXPECTED OUTCOME**: Tests PASS — explicit PIN/password auth, logout, Verify all work identically

- [~] 8. Checkpoint Bug 4 — Ensure all auth rate-limit tests pass
  - Run `go test ./internal/auth/... -run TestAuth`
  - Confirm `TestAuthManagerNoDefaultPIN`, `TestLoginBruteForceProtection`, `TestLoginLockoutExpiry` pass
  - Ask user if questions arise

---

## Bug 3 — Upload Path Traversal (HIGH: security)

- [~] 9. Write bug condition exploration test for upload path traversal
  - **Property 1: Bug Condition** - Traversal Path Accepted and File Written Outside Target
  - **CRITICAL**: This test MUST FAIL on unfixed code
  - **GOAL**: Confirm `path=../../tmp/evil` writes the file to a traversed location without a 400 error
  - **Scoped PBT Approach**: Scope to concrete failing cases:
    - Case 1: multipart upload with `path=../../tmp/panel-traversal-test` → expect HTTP 400 (asserts fixed behavior, will FAIL on buggy code)
    - Case 2: multipart upload with `path=relative/dir` → expect HTTP 400 (will FAIL on buggy code)
  - Bug condition from design: `!filepath.IsAbs(cleaned) OR strings.Contains(cleaned, "..")`
  - Run on UNFIXED code — expect: HTTP 200, file is written to the traversed path (confirming bug)
  - Document counterexample: "upload with path=../../tmp/evil returned 200 and wrote file outside intended dir"
  - _Requirements: 1.7, 1.8_

- [~] 10. Write preservation property tests for valid upload paths (BEFORE fix)
  - **Property 2: Preservation** - Absolute Paths Without Traversal Still Succeed
  - **IMPORTANT**: Follow observation-first methodology on UNFIXED code
  - Observe: `path=/tmp/safe-upload-dir` → HTTP 200, file written to `/tmp/safe-upload-dir/`
  - Observe: multiple files in one multipart upload → all written, all paths in response
  - Write PBT: for all absolute paths with no `..` component, upload succeeds and file appears at expected location
  - Write PBT: for all valid target dirs, response JSON contains `"uploaded"` list and `"total"` matching file count
  - Verify these tests PASS on UNFIXED code
  - _Requirements: 3.8, 3.9_

- [ ] 11. Fix: Path traversal validation in `fsUploadHandler`
  - **Gap detected**: `internal/api/files.go` `fsUploadHandler` — `targetDir` is used raw from query param; only `fileHeader.Filename` is cleaned, not the directory
  - **Fix location**: `internal/api/files.go`, `fsUploadHandler`

  - [~] 11.1 Add traversal validation after `targetDir` is resolved
    - After the existing three-clause `targetDir` resolution (query → form → default `/`)
    - Add: `targetDir = filepath.Clean(filepath.FromSlash(targetDir))`
    - If `!filepath.IsAbs(targetDir)` → `writeError(w, http.StatusBadRequest, map[string]string{"message": "upload path must be an absolute path"})` + return
    - If `strings.Contains(targetDir, "..")` → `writeError(w, http.StatusBadRequest, map[string]string{"message": "upload path must not contain '..' components"})` + return
    - No new imports needed — `filepath` and `strings` already imported
    - _Bug_Condition: `!filepath.IsAbs(filepath.Clean(targetDir)) OR strings.Contains(cleaned, "..")`_
    - _Expected_Behavior: HTTP 400 returned, no bytes written to disk_
    - _Preservation: valid absolute paths without traversal still work end-to-end_
    - _Requirements: 2.8, 2.9, 2.10_

  - [~] 11.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Traversal Paths Rejected With 400
    - **IMPORTANT**: Re-run the SAME test from task 9
    - **EXPECTED OUTCOME**: `path=../../tmp/evil` → HTTP 400, no file written; `path=relative` → HTTP 400
    - _Requirements: 2.8, 2.9_

  - [~] 11.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Valid Upload Paths Still Work
    - **IMPORTANT**: Re-run the SAME tests from task 10
    - **EXPECTED OUTCOME**: Tests PASS — valid absolute paths still accept uploads correctly

- [~] 12. Checkpoint Bug 3 — Ensure all upload path tests pass
  - Run `go test ./internal/api/... -run TestFsUpload`
  - Ask user if questions arise

---

## Bug 7 — WebSocket Origin Check (HIGH: security)

- [~] 13. Write bug condition exploration test for open WebSocket origin
  - **Property 1: Bug Condition** - Cross-Origin WebSocket Upgrade Accepted
  - **CRITICAL**: This test MUST FAIL on unfixed code
  - **GOAL**: Confirm `CheckOrigin` returns `true` for a clearly-hostile cross-origin request
  - **Scoped PBT Approach**: Concrete failing case: craft `*http.Request` with `Origin: http://evil.example.com`, `Host: 192.168.1.10:8080`; call the package-level `upgrader.CheckOrigin(req)` directly
  - Bug condition from design: `origin != "" AND origin != "http://"+host AND origin != "https://"+host AND not localhost AND not in allowlist`
  - Run on UNFIXED code — expect: `upgrader.CheckOrigin(req) == true` (bug confirmed)
  - Document counterexample: "`upgrader.CheckOrigin` returns true for Origin=http://evil.example.com with Host=192.168.1.10:8080"
  - Also test `containerWSUpgrader.CheckOrigin` in `internal/api/containers.go` — same bug
  - _Requirements: 1.15, 1.16_

- [~] 14. Write preservation property tests for same-origin and localhost WebSocket connections (BEFORE fix)
  - **Property 2: Preservation** - Same-Origin and Localhost Origins Always Accepted
  - **IMPORTANT**: Follow observation-first methodology on UNFIXED code
  - Observe: request with `Origin: http://localhost:8080` and `Host: localhost:8080` → `CheckOrigin` returns `true`
  - Observe: request with no `Origin` header → `CheckOrigin` returns `true`
  - Observe: request with `Origin: http://127.0.0.1:8080` and matching host → `CheckOrigin` returns `true`
  - Write PBT: for all (origin, host) pairs where origin matches host → `CheckOrigin` returns `true`
  - Write PBT: for all localhost origins on any port → `CheckOrigin` returns `true`
  - Verify tests PASS on UNFIXED code (trivially — current impl returns `true` for everything)
  - _Requirements: 3.20, 3.21, 3.22_

- [ ] 15. Fix: WebSocket origin validation
  - **Gap detected**: `internal/terminal/ws.go` package-level `upgrader` has `CheckOrigin: func(...) bool { return true }`; `internal/api/containers.go` `containerWSUpgrader` has the same
  - **Fix location**: `internal/terminal/ws.go` (new `NewUpgrader` + `localhostOrigins`) + `internal/api/containers.go` + `internal/api/router.go` (`AllowedOrigins` field in `Deps`) + `cmd/panel-agent/main.go`

  - [~] 15.1 Add `NewUpgrader` constructor and `localhostOrigins` helper to `internal/terminal/ws.go`
    - Add imports: `"net"`, `"strings"` (alongside existing `"log/slog"`)
    - Remove package-level `var upgrader = websocket.Upgrader{...}`
    - Add `func NewUpgrader(allowedOrigins []string) websocket.Upgrader` with origin allowlist logic (same-host, localhost variants, explicit list)
    - Add `func localhostOrigins(r *http.Request) []string` returning `localhost` and `127.0.0.1` variants on the request port
    - On rejection: `slog.Warn("websocket origin rejected", "origin", origin, "host", host)`; return `false`
    - _Bug_Condition: origin present, not matching host, not localhost, not in allowlist_
    - _Expected_Behavior: HTTP 403 upgrade rejection_
    - _Preservation: same-origin, localhost, configured allowed origins still succeed_
    - _Requirements: 2.21, 2.22, 2.23, 2.24_

  - [~] 15.2 Update `HandleWebSocket` signature to accept `allowedOrigins []string`
    - Change signature: `func HandleWebSocket(w http.ResponseWriter, r *http.Request, session *Session, allowedOrigins []string, logger *slog.Logger)`
    - Replace `upgrader.Upgrade(...)` with `NewUpgrader(allowedOrigins).Upgrade(...)`
    - Update callers in `internal/api/terminal.go` to pass `d.AllowedOrigins`
    - _Requirements: 2.21_

  - [~] 15.3 Add `AllowedOrigins []string` to `api.Deps` in `internal/api/router.go`
    - Add `AllowedOrigins []string` field to the `Deps` struct
    - _Requirements: 2.23, 2.24_

  - [~] 15.4 Replace `containerWSUpgrader` in `internal/api/containers.go`
    - Remove package-level `var containerWSUpgrader = websocket.Upgrader{...}`
    - In `containerExecWSHandler`, replace `containerWSUpgrader.Upgrade(w, r, nil)` with `terminal.NewUpgrader(d.AllowedOrigins).Upgrade(w, r, nil)`
    - Add import `"github.com/l7v/panel-agent/internal/terminal"` if not present
    - _Requirements: 2.21, 2.22_

  - [~] 15.5 Parse `PANEL_ALLOWED_ORIGINS` in `main.go` and populate `AllowedOrigins`
    - Before the `deps` literal: `allowedOrigins := strings.Split(os.Getenv("PANEL_ALLOWED_ORIGINS"), ",")`
    - Add `AllowedOrigins: allowedOrigins` to `api.Deps{...}` literal
    - Add `"strings"` import if not present
    - _Requirements: 2.23, 2.24_

  - [~] 15.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Cross-Origin Requests Rejected With 403
    - **IMPORTANT**: Re-run the SAME test from task 13
    - **EXPECTED OUTCOME**: `NewUpgrader(nil).CheckOrigin(req)` returns `false` for evil.example.com; `containerExecWSHandler` rejects cross-origin upgrades
    - _Requirements: 2.21, 2.22_

  - [~] 15.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Same-Origin and Localhost Connections Accepted
    - **IMPORTANT**: Re-run the SAME tests from task 14
    - **EXPECTED OUTCOME**: Tests PASS — same-origin and localhost still upgrade, message handling unchanged

- [~] 16. Checkpoint Bug 7 — Ensure all WebSocket origin tests pass
  - Run `go test ./internal/terminal/... ./internal/api/... -run TestNewUpgrader`
  - Ask user if questions arise

---

## Bug 5 — AppsEngine Singleton (MEDIUM: data loss)

- [~] 17. Write bug condition exploration test for discarded audit log
  - **Property 1: Bug Condition** - Audit Records Lost Due to Per-Request Controller Creation
  - **CRITICAL**: This test MUST FAIL on unfixed code
  - **GOAL**: Confirm that `GET /api/v1/apps/audit` returns `[]` immediately after a successful action
  - **Scoped PBT Approach**: Concrete failing case:
    - Instantiate `api.Deps{}` with `AppsEngine: nil` and `AppsController: nil`
    - Call `appActionHandler` with a mocked app action
    - Immediately call `appsAuditHandler` on the same deps
    - Assert audit result length > 0 (this FAILS on unfixed code — returns `[]`)
  - Bug condition from design: `deps.AppsEngine == nil OR deps.AppsController == nil`
  - Run on UNFIXED code — expect: audit returns `[]` (bug confirmed)
  - Document counterexample: "after POST /api/v1/apps/x/action succeeds, GET /api/v1/apps/audit returns []"
  - _Requirements: 1.11, 1.12_

- [~] 18. Write preservation property tests for apps lazy init (BEFORE fix)
  - **Property 2: Preservation** - `getAppsEngine`/`getAppsController` Lazy Fallback Still Works
  - **IMPORTANT**: Follow observation-first methodology on UNFIXED code
  - Observe: `getAppsEngine(Deps{})` returns a non-nil engine (lazy init fallback)
  - Observe: `getAppsController(Deps{})` returns a non-nil controller
  - Observe: `GET /api/v1/apps`, `GET /api/v1/apps/summary`, `GET /api/v1/apps/{id}` return correct data
  - Write test: when `deps.AppsEngine != nil`, `getAppsEngine` returns that exact instance (not a new one)
  - Write test: when `deps.AppsController != nil`, `getAppsController` returns that exact instance
  - Verify tests PASS on UNFIXED code
  - _Requirements: 3.14, 3.15, 3.16_

- [ ] 19. Fix: Wire singleton AppsEngine and AppsController in `main.go`
  - **Gap detected**: `cmd/panel-agent/main.go` — `api.Deps{...}` literal omits `AppsEngine` and `AppsController`; lazy init in `apps.go` creates fresh instances per request
  - **Fix location**: `cmd/panel-agent/main.go`

  - [~] 19.1 Instantiate singleton engine and controller before `api.Deps{}`
    - Add `"github.com/l7v/panel-agent/internal/apps"` to imports
    - Add before the `deps` literal: `appsEngine := apps.NewEngine(systemd)` and `appsCtrl := apps.NewController(appsEngine, systemd)`
    - Add to `api.Deps{...}`: `AppsEngine: appsEngine,` and `AppsController: appsCtrl,`
    - No other files change — `getAppsEngine`/`getAppsController` fallback paths remain intact for tests
    - _Bug_Condition: `deps.AppsEngine == nil OR deps.AppsController == nil`_
    - _Expected_Behavior: single `AuditLogger` instance records and serves all audit records_
    - _Preservation: lazy fallback in `apps.go` unchanged; `getAppsEngine`/`getAppsController` still work when deps are nil_
    - _Requirements: 2.15, 2.16, 2.17_

  - [~] 19.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Audit Records Persist Across Requests
    - **IMPORTANT**: Re-run the SAME test from task 17
    - **EXPECTED OUTCOME**: After action, `GET /api/v1/apps/audit` returns ≥1 record with matching `app_id`
    - _Requirements: 2.15, 2.16, 2.17_

  - [~] 19.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Lazy Init Fallback Still Works
    - **IMPORTANT**: Re-run the SAME tests from task 18
    - **EXPECTED OUTCOME**: Tests PASS — lazy fallback paths and apps listing unchanged

- [~] 20. Checkpoint Bug 5 — Ensure all apps singleton tests pass
  - Run `go test ./internal/api/... -run TestApps`
  - Ask user if questions arise

---

## Bug 2 — GetStats Stale Pointer (MEDIUM: data corruption)

- [~] 21. Write bug condition exploration test for stale pointer corruption in `GetStats`
  - **Property 1: Bug Condition** - Stale Pointers Corrupt Bucket Counts
  - **CRITICAL**: This test MUST FAIL on unfixed code
  - **GOAL**: Confirm that bucket `Counts` and `Total` are zeroed due to stale pointers after reallocation
  - **Scoped PBT Approach**: Concrete failing case:
    - Call `GetStats` with a 1-hour range, 1-minute buckets (61 buckets)
    - Pre-seed the journal reader mock/fallback with entries spread across multiple buckets
    - Assert that at least one non-last bucket has `Total > 0` (this FAILS on unfixed code — stale pointers mean most buckets show 0)
  - Bug condition from design: `int((until−since)/bucketDuration)+1 > 0` (i.e., any non-empty range triggers the reallocation)
  - The root cause: `buckets` starts with cap=0; first `append` allocates; all previously stored `bucketMap` pointers point into the abandoned old array
  - Run on UNFIXED code — expect: most buckets have `Total = 0` and empty `Counts` despite journal entries existing
  - Document counterexample: "GetStats 1h range: 60 of 61 buckets show Total=0 with seeded entries, only last bucket correct"
  - _Requirements: 1.5, 1.6_

- [~] 22. Write preservation property tests for `GetStats` edge inputs (BEFORE fix)
  - **Property 2: Preservation** - Zero/Negative Duration and Swapped Bounds Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology on UNFIXED code
  - Observe: `GetStats(ctx, t, t, 0)` → `bucketDuration` clamped to `time.Minute`, returns buckets
  - Observe: `GetStats(ctx, until, since, d)` with `since > until` → bounds swapped, returns buckets
  - Observe: empty journal range → returns slice of zero-count buckets covering the range
  - Write PBT: for random (since, until) with since > until, fixed GetStats result equals result with swapped args
  - Write PBT: for zero/negative duration, result is same as calling with `time.Minute`
  - Verify tests PASS on UNFIXED code
  - _Requirements: 3.5, 3.6, 3.7_

- [ ] 23. Fix: Pre-allocate buckets slice with exact capacity in `GetStats`
  - **Gap detected**: `internal/journal/query.go` `GetStats` — `var buckets []LogStatsBucket` starts with cap=0; first `append` reallocates and invalidates all `bucketMap` pointers
  - **Fix location**: `internal/journal/query.go`, `GetStats` bucket-initialisation block

  - [~] 23.1 Pre-compute exact bucket count and allocate with that capacity
    - Replace `var buckets []LogStatsBucket` with:
      ```go
      exactCount := int(until.Sub(since.Truncate(bucketDuration))/bucketDuration) + 1
      buckets := make([]LogStatsBucket, 0, exactCount)
      bucketMap := make(map[int64]*LogStatsBucket, exactCount)
      ```
    - The formula `int(until.Sub(since.Truncate(bucketDuration))/bucketDuration) + 1` matches the loop iteration count exactly — `append` never reallocates
    - All `*LogStatsBucket` pointers stored in `bucketMap` remain valid for the full function lifetime
    - _Bug_Condition: any non-empty range (cap starts at 0, first append triggers reallocation)_
    - _Expected_Behavior: every bucket's `Counts` and `Total` accurately reflect journal entries in its window_
    - _Preservation: zero/negative duration clamping and bound-swapping logic unchanged_
    - _Requirements: 2.5, 2.6, 2.7_

  - [~] 23.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - All Bucket Counts Accurate
    - **IMPORTANT**: Re-run the SAME test from task 21
    - **EXPECTED OUTCOME**: All seeded buckets show correct `Total` and `Counts` values
    - _Requirements: 2.5, 2.6, 2.7_

  - [~] 23.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Edge Input Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 22
    - **EXPECTED OUTCOME**: Tests PASS — zero-duration clamp, bound-swap, empty-range all behave identically

- [~] 24. Checkpoint Bug 2 — Ensure all GetStats tests pass
  - Run `go test ./internal/journal/... -run TestGetStats`
  - Ask user if questions arise

---

## Bug 6 — Metrics 2s Block (LOW: performance)

- [~] 25. Write bug condition exploration test for sequential 2-second metrics block
  - **Property 1: Bug Condition** - ReadSnapshot Blocks for ≥ 2000ms
  - **CRITICAL**: This test MUST FAIL on unfixed code (test asserts ≤ 1100ms, which unfixed code violates)
  - **GOAL**: Measure actual latency of `ReadSnapshot` on the unfixed code
  - **Scoped PBT Approach**: Single concrete measurement:
    - Call `procfsReader.ReadSnapshot(ctx)` on real or stub `/proc` reader
    - Measure `time.Since(start)`
    - Assert `elapsed <= 1100 * time.Millisecond` (FAILS on unfixed code where elapsed ≥ 2000ms)
  - Bug condition from design: every call — two sequential `time.After(time.Second)` sleeps
  - Run on UNFIXED code — expect: elapsed ≥ 2000ms (bug confirmed)
  - Document counterexample: "ReadSnapshot elapsed=2041ms — two sequential 1s waits confirmed"
  - _Requirements: 1.13, 1.14_

- [~] 26. Write preservation property tests for `ReadSnapshot` output correctness (BEFORE fix)
  - **Property 2: Preservation** - MetricsSnapshot Fields All Present and Errors Propagate
  - **IMPORTANT**: Follow observation-first methodology on UNFIXED code
  - Observe: successful `ReadSnapshot` returns non-zero `CPU.UsagePct`, populated `Memory`, `Disks`, `Network`, `Timestamp`
  - Observe: `/proc/stat` read error → `ReadSnapshot` returns error
  - Observe: no non-loopback interfaces → `Network` is empty slice `[]`, not `nil`, and no error
  - Write PBT: for synthetic valid `/proc` data, all five snapshot fields are non-zero/non-nil
  - Write test: context cancellation after 200ms → `ReadSnapshot` returns before 300ms with `ctx.Err()`
  - Verify tests PASS on UNFIXED code
  - _Requirements: 3.17, 3.18, 3.19_

- [ ] 27. Fix: Concurrent CPU and network sampling in `ReadSnapshot`
  - **Gap detected**: `internal/metrics/procfs.go` `ReadSnapshot` — two sequential `time.After(time.Second)` calls (lines ~30 and ~55); CPU and network samples each wait their own full second
  - **Fix location**: `internal/metrics/procfs.go`, `ReadSnapshot`

  - [~] 27.1 Restructure `ReadSnapshot` to use a single shared 1-second window
    - Take both pre-sleep samples (`cpu1`, `net1`) before any sleep
    - Use a single `select { case <-time.After(time.Second): ... case <-ctx.Done(): ... }` wait
    - Take both post-sleep samples (`cpu2`, `net2`) after the single wait
    - Compute `cpuPct` and `netStats` from their respective before/after pairs
    - Read `mem` and `disks` (no sleep required) after the window
    - Total wall time: ≈ 1 000 ms + negligible `/proc` read time
    - _Bug_Condition: every call (two sequential sleeps totalling ≥ 2000ms)_
    - _Expected_Behavior: `ReadSnapshot` returns within ≤ 1100ms_
    - _Preservation: all five snapshot fields still populated; errors still propagate; ctx cancellation still respected_
    - _Requirements: 2.18, 2.19, 2.20_

  - [~] 27.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - ReadSnapshot Completes in ≤ 1100ms
    - **IMPORTANT**: Re-run the SAME test from task 25
    - **EXPECTED OUTCOME**: `elapsed <= 1100 * time.Millisecond`
    - _Requirements: 2.18, 2.19, 2.20_

  - [~] 27.3 Verify preservation tests still pass
    - **Property 2: Preservation** - MetricsSnapshot Output Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 26
    - **EXPECTED OUTCOME**: Tests PASS — all five fields populated, error propagation and ctx cancellation unchanged

- [~] 28. Checkpoint Bug 6 — Ensure all metrics tests pass
  - Run `go test ./internal/metrics/... -run TestReadSnapshot`
  - Ask user if questions arise

---

## Final Validation

- [~] 29. Full test suite pass
  - Run `go test ./...` from `panel/apps/agent/`
  - Confirm zero failures across all packages
  - Run `go build ./...` to confirm the binary compiles with all changes
  - Ask user if any failures arise

- [~] 30. Build verification
  - Confirm `go vet ./...` passes with no warnings
  - Confirm the panel-agent binary builds correctly: `go build -o /dev/null ./cmd/panel-agent/`
  - All seven bugs patched, all tests green

## Notes

- All fixes are surgical diffs — no architectural rewrites, no new packages, no interface changes visible to callers outside the affected package.
- The config file at `.kiro/specs/panel-backend-bugs/.config.kiro` records `specType: bugfix`.
- Test files live alongside source under `panel/apps/agent/internal/<package>/`.
- Use `go test ./... -count=1` from `panel/apps/agent/` to run the full suite without caching.
- Property-based tests use `pgregory.net/rapid` or `testing/quick` — check `go.mod` for the existing PBT library before adding a new dependency.
