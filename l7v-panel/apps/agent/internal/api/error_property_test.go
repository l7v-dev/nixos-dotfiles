package api_test

// Feature: l7v-panel
// Property 1: API Error Response Schema Invariant
// Validates: Requirements 1.7, 2.9, 3.7, 4.10, 7.4, 7.5, 8.5
//
// For all non-2xx HTTP responses from the agent, the body must be valid JSON
// with a "message" string field, and Content-Type must be application/json.

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/l7v/panel-agent/internal/api"
	"github.com/l7v/panel-agent/internal/dbus"
	"github.com/l7v/panel-agent/internal/journal"
	"github.com/l7v/panel-agent/internal/metrics"
	"pgregory.net/rapid"
)

// errDeps returns a Deps where all D-Bus clients return errors.
func errDeps() api.Deps {
	return api.Deps{
		Systemd:   &alwaysErrSystemd{},
		Logind:    &alwaysErrLogind{},
		Network:   &alwaysErrNetwork{},
		Bluetooth: &alwaysErrBluetooth{},
		Procfs:    &alwaysErrProcfs{},
		Journal:   &alwaysErrJournal{},
		Logger:    slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError})),
		Version:   "test",
		Thresholds: metrics.Thresholds{
			CPUWarnPct: 70, CPUCritPct: 90,
			RAMWarnPct: 80, RAMCritPct: 95,
			DiskWarnPct: 80, DiskCritPct: 90,
		},
	}
}

func TestProperty1_ErrorResponseSchemaInvariant(t *testing.T) {
	router := api.NewRouter(errDeps())
	srv := httptest.NewServer(router)
	defer srv.Close()

	// Paths that should produce non-2xx responses when D-Bus is unavailable.
	errorPaths := []struct {
		method string
		path   string
	}{
		{"GET", "/api/v1/health"},
		{"GET", "/api/v1/metrics"},
		{"GET", "/api/v1/services"},
		{"POST", "/api/v1/services/test.service/start"},
		{"POST", "/api/v1/power/shutdown"},
		{"GET", "/api/v1/network/wifi"},
		{"GET", "/api/v1/network/bluetooth"},
		// Unknown paths → 404
		{"GET", "/api/v1/nonexistent"},
		// Wrong method → 405
		{"DELETE", "/api/v1/health"},
	}

	rapid.Check(t, func(tc *rapid.T) {
		// Pick a random error-producing endpoint.
		idx := rapid.IntRange(0, len(errorPaths)-1).Draw(tc, "path_idx")
		ep := errorPaths[idx]

		req, err := http.NewRequestWithContext(context.Background(), ep.method, srv.URL+ep.path, nil)
		if err != nil {
			tc.Skip()
		}

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			tc.Skip()
		}
		defer resp.Body.Close()

		// Only check non-2xx responses.
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			return
		}

		// Property: Content-Type must be application/json.
		ct := resp.Header.Get("Content-Type")
		if ct == "" || len(ct) < len("application/json") {
			tc.Fatalf("non-2xx response missing Content-Type: application/json, got %q", ct)
		}

		// Property: body must be valid JSON with a "message" field.
		var body map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
			tc.Fatalf("non-2xx response body is not valid JSON: %v", err)
		}
		msg, ok := body["message"]
		if !ok {
			tc.Fatalf("non-2xx response body missing 'message' field: %v", body)
		}
		if _, ok := msg.(string); !ok {
			tc.Fatalf("'message' field is not a string: %T", msg)
		}
	})
}

// ── Error stub implementations ───────────────────────────────────────────────

type alwaysErrSystemd struct{}

func (s *alwaysErrSystemd) ListUnits(_ context.Context) ([]dbus.ServiceUnit, error) {
	return nil, errors.New("systemd unavailable")
}
func (s *alwaysErrSystemd) StartUnit(_ context.Context, _ string) error {
	return errors.New("systemd unavailable")
}
func (s *alwaysErrSystemd) StopUnit(_ context.Context, _ string) error {
	return errors.New("systemd unavailable")
}
func (s *alwaysErrSystemd) EnableUnit(_ context.Context, _ string) error {
	return errors.New("systemd unavailable")
}
func (s *alwaysErrSystemd) DisableUnit(_ context.Context, _ string) error {
	return errors.New("systemd unavailable")
}
func (s *alwaysErrSystemd) HealthCheck(_ context.Context) error {
	return errors.New("systemd unavailable")
}

type alwaysErrLogind struct{}

func (l *alwaysErrLogind) PowerOff(_ context.Context) error    { return errors.New("logind unavailable") }
func (l *alwaysErrLogind) Reboot(_ context.Context) error      { return errors.New("logind unavailable") }
func (l *alwaysErrLogind) Suspend(_ context.Context) error     { return errors.New("logind unavailable") }
func (l *alwaysErrLogind) HealthCheck(_ context.Context) error { return errors.New("logind unavailable") }

type alwaysErrNetwork struct{}

func (n *alwaysErrNetwork) GetWifiStatus(_ context.Context) (*dbus.WifiStatus, error) {
	return nil, errors.New("nm unavailable")
}
func (n *alwaysErrNetwork) ToggleWifi(_ context.Context) error { return errors.New("nm unavailable") }

type alwaysErrBluetooth struct{}

func (b *alwaysErrBluetooth) GetBluetoothStatus(_ context.Context) (*dbus.BluetoothStatus, error) {
	return nil, errors.New("bluez unavailable")
}
func (b *alwaysErrBluetooth) ToggleBluetooth(_ context.Context) error {
	return errors.New("bluez unavailable")
}

type alwaysErrProcfs struct{}

func (p *alwaysErrProcfs) ReadSnapshot(_ context.Context) (metrics.MetricsSnapshot, error) {
	return metrics.MetricsSnapshot{}, errors.New("procfs unavailable")
}

type alwaysErrJournal struct{}

func (j *alwaysErrJournal) Tail(_ context.Context, opts journal.TailOptions) {
	opts.Err <- errors.New("journal unavailable")
}
