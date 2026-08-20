package api

// Bug 1 — Missing Authentication Enforcement
// Property 1: Bug Condition — Auth Middleware Never Called
// Validates: Requirements 1.1, 1.2, 1.3, 1.4
//
// CRITICAL: This test MUST FAIL on unfixed code — failure confirms the bug exists.
// DO NOT attempt to fix the test or the code when it fails.
//
// Bug condition:
//   deps.Auth != nil
//   AND deps.Auth.GetStatus("").AuthEnabled == true
//   AND req.URL.Path NOT IN exemptPaths
//   AND NOT deps.Auth.Verify(extractToken(req))
//
// On UNFIXED code: destructive endpoints execute without any identity check.
// Expected counterexample: "unauthenticated POST /api/v1/power/shutdown reaches handler — no 401 returned"

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/l7v/panel-agent/internal/auth"
	"github.com/l7v/panel-agent/internal/dbus"
	"github.com/l7v/panel-agent/internal/journal"
	"github.com/l7v/panel-agent/internal/metrics"
	"pgregory.net/rapid"
)

// handlerInvocationRecorder records whether the downstream Logind handler was
// called. If the auth middleware were present and correct, PowerOff would never
// be reached on an unauthenticated request.
type handlerInvocationRecorder struct {
	powerOffCalled bool
}

func (r *handlerInvocationRecorder) PowerOff(_ context.Context) error {
	r.powerOffCalled = true
	return nil // return nil so the handler can write a 200 back
}

func (r *handlerInvocationRecorder) Reboot(_ context.Context) error        { return nil }
func (r *handlerInvocationRecorder) Suspend(_ context.Context) error       { return nil }
func (r *handlerInvocationRecorder) Hibernate(_ context.Context) error     { return nil }
func (r *handlerInvocationRecorder) HybridSleep(_ context.Context) error   { return nil }
func (r *handlerInvocationRecorder) ScheduleShutdown(_ context.Context, _ string, _ uint64) error {
	return nil
}
func (r *handlerInvocationRecorder) CancelScheduledShutdown(_ context.Context) error { return nil }
func (r *handlerInvocationRecorder) GetScheduledShutdown(_ context.Context) (*dbus.ScheduledShutdownInfo, error) {
	return &dbus.ScheduledShutdownInfo{}, nil
}
func (r *handlerInvocationRecorder) GetCapabilities(_ context.Context) (*dbus.PowerCapabilities, error) {
	return &dbus.PowerCapabilities{}, nil
}
func (r *handlerInvocationRecorder) HealthCheck(_ context.Context) error { return nil }

// alwaysErrSystemdAuth is a minimal Systemd stub needed to build Deps in this
// package (auth_middleware_test.go lives in package api, not api_test, so it
// cannot import the stubs defined in error_property_test.go which is package
// api_test).
type alwaysErrSystemdAuth struct{}

func (s *alwaysErrSystemdAuth) ListUnits(_ context.Context) ([]dbus.ServiceUnit, error) {
	return nil, nil
}
func (s *alwaysErrSystemdAuth) StartUnit(_ context.Context, _ string) error   { return nil }
func (s *alwaysErrSystemdAuth) StopUnit(_ context.Context, _ string) error    { return nil }
func (s *alwaysErrSystemdAuth) RestartUnit(_ context.Context, _ string) error { return nil }
func (s *alwaysErrSystemdAuth) EnableUnit(_ context.Context, _ string) error  { return nil }
func (s *alwaysErrSystemdAuth) DisableUnit(_ context.Context, _ string) error { return nil }
func (s *alwaysErrSystemdAuth) HealthCheck(_ context.Context) error           { return nil }

type alwaysErrNetworkAuth struct{}

func (n *alwaysErrNetworkAuth) GetWifiStatus(_ context.Context) (*dbus.WifiStatus, error) {
	return nil, nil
}
func (n *alwaysErrNetworkAuth) ToggleWifi(_ context.Context) error            { return nil }
func (n *alwaysErrNetworkAuth) ScanWifi(_ context.Context) ([]dbus.AccessPoint, error) {
	return nil, nil
}
func (n *alwaysErrNetworkAuth) ConnectWifi(_ context.Context, _, _ string) error { return nil }
func (n *alwaysErrNetworkAuth) DisconnectWifi(_ context.Context) error            { return nil }
func (n *alwaysErrNetworkAuth) GetSavedConnections(_ context.Context) ([]dbus.SavedConnection, error) {
	return nil, nil
}
func (n *alwaysErrNetworkAuth) DeleteSavedConnection(_ context.Context, _ string) error { return nil }

type alwaysErrBluetoothAuth struct{}

func (b *alwaysErrBluetoothAuth) GetBluetoothStatus(_ context.Context) (*dbus.BluetoothStatus, error) {
	return nil, nil
}
func (b *alwaysErrBluetoothAuth) ToggleBluetooth(_ context.Context) error { return nil }
func (b *alwaysErrBluetoothAuth) ScanDevices(_ context.Context) ([]dbus.BTDevice, error) {
	return nil, nil
}
func (b *alwaysErrBluetoothAuth) PairDevice(_ context.Context, _ string) error       { return nil }
func (b *alwaysErrBluetoothAuth) ConnectDevice(_ context.Context, _ string) error    { return nil }
func (b *alwaysErrBluetoothAuth) DisconnectDevice(_ context.Context, _ string) error { return nil }
func (b *alwaysErrBluetoothAuth) RemoveDevice(_ context.Context, _ string) error     { return nil }

type alwaysErrProcfsAuth struct{}

func (p *alwaysErrProcfsAuth) ReadSnapshot(_ context.Context) (metrics.MetricsSnapshot, error) {
	return metrics.MetricsSnapshot{}, nil
}

type alwaysErrJournalAuth struct{}

func (j *alwaysErrJournalAuth) Tail(_ context.Context, opts journal.TailOptions) {
	// No entries to emit; close both channels so callers don't block.
	if opts.Out != nil {
		close(opts.Out)
	}
}
func (j *alwaysErrJournalAuth) Query(_ context.Context, _ journal.QueryOptions) (journal.QueryResult, error) {
	return journal.QueryResult{}, nil
}
func (j *alwaysErrJournalAuth) ListUnits(_ context.Context) ([]string, error) {
	return nil, nil
}
func (j *alwaysErrJournalAuth) GetStats(_ context.Context, _, _ time.Time, _ time.Duration) ([]journal.LogStatsBucket, error) {
	return nil, nil
}

// authEnabledDeps builds a Deps with a real auth.Manager that has auth ENABLED
// (PANEL_AUTH_PIN is set to "test-pin" via env), a recording Logind stub, and
// silent stubs for everything else.
func authEnabledDeps(logind dbus.LogindClient) Deps {
	// Ensure a non-empty PIN so GetStatus("").AuthEnabled == true.
	os.Setenv("PANEL_AUTH_PIN", "test-pin") //nolint:errcheck
	mgr := auth.NewManager()
	os.Unsetenv("PANEL_AUTH_PIN") //nolint:errcheck

	return Deps{
		Auth:      mgr,
		Logind:    logind,
		Systemd:   &alwaysErrSystemdAuth{},
		Network:   &alwaysErrNetworkAuth{},
		Bluetooth: &alwaysErrBluetoothAuth{},
		Procfs:    &alwaysErrProcfsAuth{},
		Journal:   &alwaysErrJournalAuth{},
		Logger:    slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError})),
		Version:   "test",
		Thresholds: metrics.Thresholds{
			CPUWarnPct: 70, CPUCritPct: 90,
			RAMWarnPct: 80, RAMCritPct: 95,
			DiskWarnPct: 80, DiskCritPct: 90,
		},
	}
}

// TestBugCondition_AuthMiddlewareNeverCalled is a bug condition exploration
// test. It encodes the CORRECT expected behavior (unauthenticated requests to
// protected endpoints MUST be rejected with HTTP 401).
//
// On UNFIXED code this test FAILS because:
//   - POST /api/v1/power/shutdown reaches PowerOff (handler IS invoked)
//   - The response is 200, not 401
//   - The downstream mock records that it was called
//
// When the fix is applied (task 3), this test PASSES.
func TestBugCondition_AuthMiddlewareNeverCalled(t *testing.T) {
	// ── Case 1: POST /api/v1/power/shutdown with no token ──────────────────

	logindRec := &handlerInvocationRecorder{}
	router := NewRouter(authEnabledDeps(logindRec))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/power/shutdown", nil)
	// No Authorization header, no X-Panel-Token, no panel_session cookie.
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	// On FIXED code: auth middleware blocks with 401, PowerOff is never called.
	// On UNFIXED code: handler IS invoked → test fails here because:
	//   - rec.Code is 200 (not 401), AND
	//   - logindRec.powerOffCalled is true
	if rec.Code != http.StatusUnauthorized {
		t.Errorf(
			"BUG CONFIRMED — POST /api/v1/power/shutdown without token: "+
				"expected HTTP 401 (authentication required), got HTTP %d. "+
				"Counterexample: unauthenticated POST /api/v1/power/shutdown reaches handler — no 401 returned. "+
				"Handler invoked: %v",
			rec.Code, logindRec.powerOffCalled,
		)
	}

	if logindRec.powerOffCalled {
		t.Errorf(
			"BUG CONFIRMED — downstream PowerOff handler was called on an unauthenticated request. "+
				"The auth middleware must block the request before any handler logic executes.",
		)
	}

	// ── Case 2: GET /api/v1/terminal/ws with no token ──────────────────────
	// The terminal WS handler will 400/426 when called outside a real WS
	// upgrade, but the key check is that we do NOT get 404 (route exists) and
	// we DO get 401 if the middleware is working.  On unfixed code we'll get
	// something other than 401.

	router2 := NewRouter(authEnabledDeps(&handlerInvocationRecorder{}))

	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/terminal/ws", nil)
	// No token headers at all.
	rec2 := httptest.NewRecorder()
	router2.ServeHTTP(rec2, req2)

	if rec2.Code != http.StatusUnauthorized {
		t.Errorf(
			"BUG CONFIRMED — GET /api/v1/terminal/ws without token: "+
				"expected HTTP 401 (authentication required), got HTTP %d. "+
				"Counterexample: unauthenticated GET /api/v1/terminal/ws proceeds without identity check.",
			rec2.Code,
		)
	}
}

// TestBugCondition_AuthEnabled_VerifiesStatus confirms that the auth.Manager
// used in the exploration test actually has auth enabled. If this sub-test
// fails the exploration test setup is broken, not the production code.
func TestBugCondition_AuthEnabled_VerifiesStatus(t *testing.T) {
	os.Setenv("PANEL_AUTH_PIN", "test-pin") //nolint:errcheck
	mgr := auth.NewManager()
	os.Unsetenv("PANEL_AUTH_PIN") //nolint:errcheck

	status := mgr.GetStatus("")
	if !status.AuthEnabled {
		t.Fatal("test setup error: auth.Manager must report AuthEnabled=true when PANEL_AUTH_PIN is set")
	}

	// An empty/missing token must NOT verify.
	if mgr.Verify("") {
		t.Fatal("test setup error: auth.Manager.Verify('') must return false for an empty token")
	}
}

// ── Preservation Property Tests (Task 2) ──────────────────────────────

type exemptRoute struct {
	method string
	path   string
}

var exemptRoutes = []exemptRoute{
	{method: http.MethodGet, path: "/api/v1/health"},
	{method: http.MethodPost, path: "/api/v1/auth/login"},
	{method: http.MethodGet, path: "/api/v1/auth/status"},
}

// TestPreservation_ExemptRoutesNeverBlocked verifies that exempt endpoints
// (health, auth login with credentials, auth status) are always reachable
// and return HTTP 200 without being blocked by authentication middleware,
// regardless of token header/cookie state.
func TestPreservation_ExemptRoutesNeverBlocked(t *testing.T) {
	rapid.Check(t, func(tc *rapid.T) {
		route := rapid.SampledFrom(exemptRoutes).Draw(tc, "exempt_route")
		tokenStrategy := rapid.IntRange(0, 3).Draw(tc, "token_strategy")
		randomToken := rapid.StringMatching(`[a-zA-Z0-9_-]{0,64}`).Draw(tc, "random_token")

		logindRec := &handlerInvocationRecorder{}
		router := NewRouter(authEnabledDeps(logindRec))

		var body io.Reader
		if route.method == http.MethodPost && route.path == "/api/v1/auth/login" {
			body = strings.NewReader(`{"pin":"test-pin"}`)
		}

		req := httptest.NewRequest(route.method, route.path, body)
		switch tokenStrategy {
		case 0:
			// No token provided
		case 1:
			req.Header.Set("Authorization", "Bearer "+randomToken)
		case 2:
			req.Header.Set("X-Panel-Token", randomToken)
		case 3:
			req.AddCookie(&http.Cookie{Name: "panel_session", Value: randomToken})
		}

		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			tc.Fatalf("exempt route %s %s returned %d for token strategy %d: %s",
				route.method, route.path, rec.Code, tokenStrategy, rec.Body.String())
		}
	})
}

// TestPreservation_ValidTokenAllowsAccess verifies that any request with a valid,
// active session token passes through to downstream handlers on protected endpoints.
func TestPreservation_ValidTokenAllowsAccess(t *testing.T) {
	rapid.Check(t, func(tc *rapid.T) {
		tokenDelivery := rapid.SampledFrom([]string{"bearer", "header", "cookie"}).Draw(tc, "token_delivery")

		os.Setenv("PANEL_AUTH_PIN", "valid-test-pin") //nolint:errcheck
		mgr := auth.NewManager()
		os.Unsetenv("PANEL_AUTH_PIN") //nolint:errcheck

		sess, err := mgr.Login("valid-test-pin", "", "127.0.0.1")
		if err != nil {
			tc.Fatalf("failed to create valid session: %v", err)
		}

		logindRec := &handlerInvocationRecorder{}
		deps := authEnabledDeps(logindRec)
		deps.Auth = mgr

		router := NewRouter(deps)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/power/shutdown", nil)
		switch tokenDelivery {
		case "bearer":
			req.Header.Set("Authorization", "Bearer "+sess.Token)
		case "header":
			req.Header.Set("X-Panel-Token", sess.Token)
		case "cookie":
			req.AddCookie(&http.Cookie{Name: "panel_session", Value: sess.Token})
		}

		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			tc.Fatalf("expected 200 OK for valid token via %s, got %d: %s",
				tokenDelivery, rec.Code, rec.Body.String())
		}
		if !logindRec.powerOffCalled {
			tc.Fatalf("expected downstream PowerOff handler to be called when valid token is provided via %s",
				tokenDelivery)
		}
	})
}

// TestPreservation_AuthDisabledAllowsAllRoutes verifies that when auth is disabled
// (deps.Auth == nil), requests to any route pass through without authentication.
func TestPreservation_AuthDisabledAllowsAllRoutes(t *testing.T) {
	logindRec := &handlerInvocationRecorder{}
	deps := authEnabledDeps(logindRec)
	deps.Auth = nil // Auth disabled

	router := NewRouter(deps)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/power/shutdown", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK when auth is disabled, got %d: %s", rec.Code, rec.Body.String())
	}
	if !logindRec.powerOffCalled {
		t.Fatal("expected downstream PowerOff handler to be called when auth is disabled")
	}
}

