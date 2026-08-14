package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/l7v/panel-agent/internal/apps"
	"github.com/l7v/panel-agent/internal/dbus"
)

type mockSystemdApps struct {
	units []dbus.ServiceUnit
}

func (m *mockSystemdApps) ListUnits(ctx context.Context) ([]dbus.ServiceUnit, error) {
	return m.units, nil
}
func (m *mockSystemdApps) StartUnit(ctx context.Context, unit string) error   { return nil }
func (m *mockSystemdApps) StopUnit(ctx context.Context, unit string) error    { return nil }
func (m *mockSystemdApps) RestartUnit(ctx context.Context, unit string) error { return nil }
func (m *mockSystemdApps) EnableUnit(ctx context.Context, unit string) error  { return nil }
func (m *mockSystemdApps) DisableUnit(ctx context.Context, unit string) error { return nil }
func (m *mockSystemdApps) HealthCheck(ctx context.Context) error              { return nil }

func setupAppsRouter() http.Handler {
	mockSys := &mockSystemdApps{
		units: []dbus.ServiceUnit{
			{Name: "forgejo.service", ActiveState: "active", SubState: "running"},
			{Name: "postgresql.service", ActiveState: "active", SubState: "running"},
		},
	}
	engine := apps.NewEngine(mockSys)
	ctrl := apps.NewController(engine, mockSys)
	deps := Deps{
		Systemd:        mockSys,
		AppsEngine:     engine,
		AppsController: ctrl,
	}
	return NewRouter(deps)
}

func TestListAppsEndpoint(t *testing.T) {
	router := setupAppsRouter()

	req := httptest.NewRequest("GET", "/api/v1/apps", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	var list []apps.Application
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil {
		t.Fatalf("Failed to unmarshal apps list: %v", err)
	}

	if len(list) == 0 {
		t.Fatalf("Expected non-empty apps list")
	}

	// Test category filter
	reqFilter := httptest.NewRequest("GET", "/api/v1/apps?category=core_platform", nil)
	recFilter := httptest.NewRecorder()
	router.ServeHTTP(recFilter, reqFilter)

	var filtered []apps.Application
	json.Unmarshal(recFilter.Body.Bytes(), &filtered)
	for _, a := range filtered {
		if a.Category != apps.CategoryCorePlatform {
			t.Errorf("Expected all to be core_platform, got %s", a.Category)
		}
	}
}

func TestAppsSummaryEndpoint(t *testing.T) {
	router := setupAppsRouter()

	req := httptest.NewRequest("GET", "/api/v1/apps/summary", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", rec.Code)
	}

	var summary apps.AppsSummary
	if err := json.Unmarshal(rec.Body.Bytes(), &summary); err != nil {
		t.Fatalf("Failed to unmarshal summary: %v", err)
	}

	if summary.TotalApps == 0 {
		t.Errorf("Expected non-zero total apps")
	}
}

func TestGetAppEndpoint(t *testing.T) {
	router := setupAppsRouter()

	// Existing app
	req := httptest.NewRequest("GET", "/api/v1/apps/forgejo", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for forgejo, got %d", rec.Code)
	}

	var app apps.Application
	if err := json.Unmarshal(rec.Body.Bytes(), &app); err != nil {
		t.Fatalf("Failed to unmarshal app: %v", err)
	}
	if app.ID != "forgejo" {
		t.Errorf("Expected ID forgejo, got %s", app.ID)
	}

	// Non-existent app
	req404 := httptest.NewRequest("GET", "/api/v1/apps/nonexistent-app-xyz", nil)
	rec404 := httptest.NewRecorder()
	router.ServeHTTP(rec404, req404)
	if rec404.Code != http.StatusNotFound {
		t.Errorf("Expected 404 Not Found, got %d", rec404.Code)
	}
}

func TestAppActionEndpoint(t *testing.T) {
	router := setupAppsRouter()

	// Safe restart action on Forgejo
	body := strings.NewReader(`{"action":"restart"}`)
	req := httptest.NewRequest("POST", "/api/v1/apps/forgejo/action", body)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	var res apps.AppActionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatalf("Failed to unmarshal action response: %v", err)
	}
	if res.Status != "success" {
		t.Errorf("Expected success status, got %s", res.Status)
	}
}

func TestAppsDependenciesEndpoint(t *testing.T) {
	router := setupAppsRouter()

	req := httptest.NewRequest("GET", "/api/v1/apps/dependencies", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", rec.Code)
	}

	var graph apps.DependencyGraph
	if err := json.Unmarshal(rec.Body.Bytes(), &graph); err != nil {
		t.Fatalf("Failed to unmarshal dependency graph: %v", err)
	}
	if len(graph.Nodes) == 0 {
		t.Errorf("Expected nodes in dependency graph")
	}
}
