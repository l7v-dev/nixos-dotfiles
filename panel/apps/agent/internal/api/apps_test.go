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

// Bug 5 — AppsEngine Singleton (Audit Log Persistence)
// Property 1: Bug Condition — Audit Records Persist Across Requests with Singleton Controller
// Validates: Requirements 1.11, 1.12, 2.15, 2.16, 2.17
func TestAppsAuditPersistenceWithSingleton(t *testing.T) {
	mockSys := &mockSystemdApps{
		units: []dbus.ServiceUnit{
			{Name: "forgejo.service", ActiveState: "active", SubState: "running"},
		},
	}
	engine := apps.NewEngine(mockSys)
	ctrl := apps.NewController(engine, mockSys)

	deps := Deps{
		Systemd:        mockSys,
		AppsEngine:     engine,
		AppsController: ctrl,
	}
	router := NewRouter(deps)

	// 1. Perform app action (restart forgejo)
	body := strings.NewReader(`{"action":"restart"}`)
	reqAction := httptest.NewRequest("POST", "/api/v1/apps/forgejo/action", body)
	recAction := httptest.NewRecorder()
	router.ServeHTTP(recAction, reqAction)

	if recAction.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK on action, got %d", recAction.Code)
	}

	// 2. Query audit logs from the same router/deps
	reqAudit := httptest.NewRequest("GET", "/api/v1/apps/audit", nil)
	recAudit := httptest.NewRecorder()
	router.ServeHTTP(recAudit, reqAudit)

	if recAudit.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK on audit, got %d", recAudit.Code)
	}

	var records []apps.AuditRecord
	if err := json.Unmarshal(recAudit.Body.Bytes(), &records); err != nil {
		t.Fatalf("Failed to unmarshal audit records: %v", err)
	}

	if len(records) == 0 {
		t.Fatalf("Expected at least 1 audit record, got 0 (audit log was discarded!)")
	}

	if records[0].AppID != "forgejo" || records[0].Action != "restart" {
		t.Fatalf("Unexpected audit record: %+v", records[0])
	}
}

// Property 2: Preservation — Lazy fallback when AppsEngine/AppsController are nil
// Validates: Requirements 3.14, 3.15, 3.16
func TestAppsPreservation_LazyFallbackAndSingleton(t *testing.T) {
	mockSys := &mockSystemdApps{}

	// Test fallback when nil
	depsNil := Deps{Systemd: mockSys}
	engFallback := getAppsEngine(depsNil)
	if engFallback == nil {
		t.Fatalf("expected non-nil engine from getAppsEngine with nil deps")
	}
	ctrlFallback := getAppsController(depsNil)
	if ctrlFallback == nil {
		t.Fatalf("expected non-nil controller from getAppsController with nil deps")
	}

	// Test singleton preservation when provided
	customEng := apps.NewEngine(mockSys)
	customCtrl := apps.NewController(customEng, mockSys)
	depsProvided := Deps{
		Systemd:        mockSys,
		AppsEngine:     customEng,
		AppsController: customCtrl,
	}

	if getAppsEngine(depsProvided) != customEng {
		t.Fatalf("expected exact customEng instance returned")
	}
	if getAppsController(depsProvided) != customCtrl {
		t.Fatalf("expected exact customCtrl instance returned")
	}
}
