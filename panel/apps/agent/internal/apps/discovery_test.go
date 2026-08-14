package apps

import (
	"context"
	"testing"

	"github.com/l7v/panel-agent/internal/dbus"
)

type mockSystemd struct {
	units []dbus.ServiceUnit
}

func (m *mockSystemd) ListUnits(ctx context.Context) ([]dbus.ServiceUnit, error) {
	return m.units, nil
}
func (m *mockSystemd) StartUnit(ctx context.Context, unit string) error   { return nil }
func (m *mockSystemd) StopUnit(ctx context.Context, unit string) error    { return nil }
func (m *mockSystemd) RestartUnit(ctx context.Context, unit string) error { return nil }
func (m *mockSystemd) EnableUnit(ctx context.Context, unit string) error  { return nil }
func (m *mockSystemd) DisableUnit(ctx context.Context, unit string) error { return nil }
func (m *mockSystemd) HealthCheck(ctx context.Context) error              { return nil }

func TestDiscoveryEngine(t *testing.T) {
	mockSys := &mockSystemd{
		units: []dbus.ServiceUnit{
			{
				Name:        "forgejo.service",
				Description: "Forgejo Git",
				ActiveState: "active",
				SubState:    "running",
			},
			{
				Name:        "postgresql.service",
				Description: "PostgreSQL",
				ActiveState: "active",
				SubState:    "running",
			},
			{
				Name:        "vaultwarden.service",
				Description: "Vaultwarden",
				ActiveState: "failed",
				SubState:    "failed",
			},
		},
	}

	engine := NewEngine(mockSys)
	ctx := context.Background()

	apps, err := engine.ListApplications(ctx)
	if err != nil {
		t.Fatalf("ListApplications failed: %v", err)
	}
	if len(apps) == 0 {
		t.Fatalf("Expected non-empty apps list")
	}

	// Verify forgejo is running
	forgejo, err := engine.GetApplication(ctx, "forgejo")
	if err != nil || forgejo == nil {
		t.Fatalf("GetApplication(forgejo) failed: %v", err)
	}
	if forgejo.Status != StatusRunning {
		t.Errorf("Expected forgejo status running, got %s", forgejo.Status)
	}

	// Verify postgresql has forgejo in dependents
	pg, err := engine.GetApplication(ctx, "postgresql")
	if err != nil || pg == nil {
		t.Fatalf("GetApplication(postgresql) failed: %v", err)
	}
	if !contains(pg.Dependents, "forgejo") {
		t.Errorf("Expected postgresql dependents to contain forgejo, got: %v", pg.Dependents)
	}

	// Test Summary
	summary, err := engine.GetSummary(ctx)
	if err != nil {
		t.Fatalf("GetSummary failed: %v", err)
	}
	if summary.RunningApps < 2 {
		t.Errorf("Expected at least 2 running apps, got %d", summary.RunningApps)
	}
	if summary.FailedApps < 1 {
		t.Errorf("Expected at least 1 failed app (vaultwarden), got %d", summary.FailedApps)
	}

	// Test Dependency Graph
	graph, err := engine.GetDependencyGraph(ctx)
	if err != nil {
		t.Fatalf("GetDependencyGraph failed: %v", err)
	}
	if len(graph.Nodes) == 0 || len(graph.Edges) == 0 {
		t.Errorf("Expected populated DAG, got %d nodes and %d edges", len(graph.Nodes), len(graph.Edges))
	}
}

func TestLifecycleControllerSafety(t *testing.T) {
	mockSys := &mockSystemd{
		units: []dbus.ServiceUnit{
			{Name: "forgejo.service", ActiveState: "active", SubState: "running"},
			{Name: "postgresql.service", ActiveState: "active", SubState: "running"},
		},
	}
	engine := NewEngine(mockSys)
	controller := NewController(engine, mockSys)
	ctx := context.Background()

	// Stopping PostgreSQL while Forgejo is running should be rejected without Force
	res, err := controller.PerformAction(ctx, "postgresql", AppActionRequest{Action: "stop", Force: false}, "127.0.0.1")
	if err != ErrDependencyWarning {
		t.Errorf("Expected ErrDependencyWarning, got %v (res: %+v)", err, res)
	}
	if res.Status != "rejected" {
		t.Errorf("Expected status rejected, got %s", res.Status)
	}

	// With Force=true, it should proceed
	resForce, errForce := controller.PerformAction(ctx, "postgresql", AppActionRequest{Action: "stop", Force: true}, "127.0.0.1")
	if errForce != nil {
		t.Errorf("Expected success with force=true, got %v", errForce)
	}
	if resForce.Status != "success" {
		t.Errorf("Expected status success, got %s", resForce.Status)
	}

	// Verify audit logs
	logs := controller.GetAuditLogger().GetRecent(10)
	if len(logs) < 2 {
		t.Errorf("Expected at least 2 audit log records, got %d", len(logs))
	}
}
