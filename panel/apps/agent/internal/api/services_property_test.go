package api_test

// Feature: l7v-panel
// Property 2: Service List D-Bus Round-Trip Consistency
// Validates: Requirements 2.2
//
// For all valid D-Bus unit list responses, parsing → JSON serialisation must
// produce identical field values — no mutation, no data loss.

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/l7v/panel-agent/internal/api"
	"github.com/l7v/panel-agent/internal/dbus"
	"github.com/l7v/panel-agent/internal/metrics"
	"pgregory.net/rapid"
)

// mockSystemd returns exactly the units provided, with no errors.
type mockSystemd struct {
	units []dbus.ServiceUnit
}

func (m *mockSystemd) ListUnits(_ context.Context) ([]dbus.ServiceUnit, error) { return m.units, nil }
func (m *mockSystemd) StartUnit(_ context.Context, _ string) error              { return nil }
func (m *mockSystemd) StopUnit(_ context.Context, _ string) error               { return nil }
func (m *mockSystemd) RestartUnit(_ context.Context, _ string) error            { return nil }
func (m *mockSystemd) EnableUnit(_ context.Context, _ string) error             { return nil }
func (m *mockSystemd) DisableUnit(_ context.Context, _ string) error            { return nil }
func (m *mockSystemd) HealthCheck(_ context.Context) error                      { return nil }

func TestProperty2_ServiceListRoundTrip(t *testing.T) {
	rapid.Check(t, func(tc *rapid.T) {
		// Generate an arbitrary slice of ServiceUnit values.
		n := rapid.IntRange(0, 20).Draw(tc, "n_units")
		units := make([]dbus.ServiceUnit, n)
		for i := range units {
			units[i] = dbus.ServiceUnit{
				Name:          rapid.StringN(1, 64, -1).Draw(tc, "name"),
				Description:   rapid.StringN(0, 128, -1).Draw(tc, "desc"),
				LoadState:     rapid.SampledFrom([]string{"loaded", "not-found", "error"}).Draw(tc, "load"),
				ActiveState:   rapid.SampledFrom([]string{"active", "inactive", "failed", "activating"}).Draw(tc, "active"),
				SubState:      rapid.StringN(0, 32, -1).Draw(tc, "sub"),
				UnitFileState: rapid.SampledFrom([]string{"enabled", "disabled", "static", ""}).Draw(tc, "uf"),
			}
		}

		deps := api.Deps{
			Systemd:   &mockSystemd{units: units},
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

		router := api.NewRouter(deps)
		req := httptest.NewRequest(http.MethodGet, "/api/v1/services", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			tc.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
		}

		var got []dbus.ServiceUnit
		if err := json.NewDecoder(w.Body).Decode(&got); err != nil {
			tc.Fatalf("response is not valid JSON: %v", err)
		}

		// Property: round-trip preserves all fields exactly.
		if len(got) != len(units) {
			tc.Fatalf("length mismatch: want %d, got %d", len(units), len(got))
		}
		for i := range units {
			want := units[i]
			have := got[i]
			if have.Name != want.Name {
				tc.Fatalf("[%d] Name: want %q, got %q", i, want.Name, have.Name)
			}
			if have.Description != want.Description {
				tc.Fatalf("[%d] Description: want %q, got %q", i, want.Description, have.Description)
			}
			if have.LoadState != want.LoadState {
				tc.Fatalf("[%d] LoadState: want %q, got %q", i, want.LoadState, have.LoadState)
			}
			if have.ActiveState != want.ActiveState {
				tc.Fatalf("[%d] ActiveState: want %q, got %q", i, want.ActiveState, have.ActiveState)
			}
			if have.SubState != want.SubState {
				tc.Fatalf("[%d] SubState: want %q, got %q", i, want.SubState, have.SubState)
			}
			if have.UnitFileState != want.UnitFileState {
				tc.Fatalf("[%d] UnitFileState: want %q, got %q", i, want.UnitFileState, have.UnitFileState)
			}
		}
	})
}
