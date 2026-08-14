package apps

import (
	"context"
	"strings"
	"sync"

	"github.com/l7v/panel-agent/internal/dbus"
)

// Engine discovers, aggregates and monitors applications on the system.
type Engine interface {
	ListApplications(ctx context.Context) ([]Application, error)
	GetApplication(ctx context.Context, id string) (*Application, error)
	GetSummary(ctx context.Context) (*AppsSummary, error)
	GetDependencyGraph(ctx context.Context) (*DependencyGraph, error)
}

type discoveryEngine struct {
	mu            sync.RWMutex
	systemd       dbus.SystemdClient
	cgroups       *CgroupsReader
	customCatalog []Application
}

// NewEngine creates a new application discovery engine.
func NewEngine(systemd dbus.SystemdClient) Engine {
	cat := GetRegisteredCatalog()
	if manifests, err := LoadManifestsFromDir(DefaultManifestDir); err == nil && len(manifests) > 0 {
		cat = append(cat, manifests...)
	}
	return &discoveryEngine{
		systemd:       systemd,
		cgroups:       NewCgroupsReader(),
		customCatalog: cat,
	}
}

// ListApplications retrieves all registered and dynamically discovered applications with live states.
func (e *discoveryEngine) ListApplications(ctx context.Context) ([]Application, error) {
	e.mu.RLock()
	apps := make([]Application, len(e.customCatalog))
	copy(apps, e.customCatalog)
	e.mu.RUnlock()

	// 1. Fetch systemd units if available
	unitsMap := make(map[string]dbus.ServiceUnit)
	if e.systemd != nil {
		if units, err := e.systemd.ListUnits(ctx); err == nil {
			for _, u := range units {
				unitsMap[u.Name] = u
			}
		}
	}

	// 2. Correlate registered apps with live state and cgroups metrics
	catalogUnitNames := make(map[string]bool)
	for i := range apps {
		app := &apps[i]
		if app.SystemdUnit != "" {
			catalogUnitNames[app.SystemdUnit] = true
			if u, exists := unitsMap[app.SystemdUnit]; exists {
				app.Status = mapSystemdStateToAppStatus(u.ActiveState, u.SubState)
				if app.Status == StatusRunning && e.cgroups != nil {
					app.Metrics = e.cgroups.ReadUnitMetrics(app.SystemdUnit)
				}
			} else {
				// Unit not found in active list
				app.Status = StatusStopped
			}
		}
	}

	// 3. Compute reverse dependents
	appMapByID := make(map[string]*Application)
	appMapByUnit := make(map[string]*Application)
	for i := range apps {
		appMapByID[apps[i].ID] = &apps[i]
		if apps[i].SystemdUnit != "" {
			appMapByUnit[apps[i].SystemdUnit] = &apps[i]
		}
	}

	for _, app := range apps {
		for _, depUnit := range app.Dependencies {
			if targetApp, ok := appMapByUnit[depUnit]; ok {
				if !contains(targetApp.Dependents, app.ID) {
					targetApp.Dependents = append(targetApp.Dependents, app.ID)
				}
			}
		}
	}

	return apps, nil
}

// GetApplication retrieves detailed metadata and live metrics for a single app by ID or Unit name.
func (e *discoveryEngine) GetApplication(ctx context.Context, id string) (*Application, error) {
	apps, err := e.ListApplications(ctx)
	if err != nil {
		return nil, err
	}

	for _, a := range apps {
		if a.ID == id || a.SystemdUnit == id || strings.TrimSuffix(a.SystemdUnit, ".service") == id {
			return &a, nil
		}
	}
	return nil, nil
}

// GetSummary calculates aggregate metrics across all applications.
func (e *discoveryEngine) GetSummary(ctx context.Context) (*AppsSummary, error) {
	apps, err := e.ListApplications(ctx)
	if err != nil {
		return nil, err
	}

	summary := &AppsSummary{
		TotalApps:  len(apps),
		Categories: make([]CategorySummary, 0),
	}

	categoryMap := make(map[AppCategory]*CategorySummary)
	initCat := func(c AppCategory) *CategorySummary {
		if cs, ok := categoryMap[c]; ok {
			return cs
		}
		cs := &CategorySummary{Category: c}
		categoryMap[c] = cs
		return cs
	}

	// Ensure all standard categories exist in summary
	initCat(CategoryIngressNetwork)
	initCat(CategoryCorePlatform)
	initCat(CategoryObservability)
	initCat(CategoryDatabase)
	initCat(CategoryAIWorkload)
	initCat(CategoryCICDAuto)
	initCat(CategoryBackupDR)

	for _, a := range apps {
		cs := initCat(a.Category)
		cs.Total++

		summary.TotalMemoryMB += a.Metrics.MemoryMB
		summary.TotalCPUPercent += a.Metrics.CPUPercent

		switch a.Status {
		case StatusRunning:
			summary.RunningApps++
			cs.Running++
		case StatusStopped:
			summary.StoppedApps++
			cs.Stopped++
		case StatusFailed:
			summary.FailedApps++
			cs.Failed++
		case StatusDegraded:
			summary.DegradedApps++
			cs.Degraded++
		case StatusStandby:
			// Standby counts as ready/stopped
		}
	}

	summary.TotalCPUPercent = mathRound2(summary.TotalCPUPercent)
	for _, cs := range categoryMap {
		summary.Categories = append(summary.Categories, *cs)
	}

	return summary, nil
}

// GetDependencyGraph builds a DAG of all applications and their service dependencies.
func (e *discoveryEngine) GetDependencyGraph(ctx context.Context) (*DependencyGraph, error) {
	apps, err := e.ListApplications(ctx)
	if err != nil {
		return nil, err
	}

	graph := &DependencyGraph{
		Nodes: make([]DependencyNode, 0, len(apps)),
		Edges: make([]DependencyEdge, 0),
	}

	unitToID := make(map[string]string)
	for _, a := range apps {
		graph.Nodes = append(graph.Nodes, DependencyNode{
			ID:          a.ID,
			Name:        a.Name,
			Category:    a.Category,
			Status:      a.Status,
			AccessLevel: a.AccessLevel,
			SystemdUnit: a.SystemdUnit,
		})
		if a.SystemdUnit != "" {
			unitToID[a.SystemdUnit] = a.ID
		}
	}

	for _, a := range apps {
		for _, depUnit := range a.Dependencies {
			providerID := depUnit
			if id, ok := unitToID[depUnit]; ok {
				providerID = id
			}
			graph.Edges = append(graph.Edges, DependencyEdge{
				Source: providerID,
				Target: a.ID,
				Type:   "requires",
			})
		}
	}

	return graph, nil
}

func mapSystemdStateToAppStatus(activeState, subState string) AppStatus {
	if activeState == "failed" || subState == "failed" {
		return StatusFailed
	}
	if activeState == "active" {
		if subState == "running" || subState == "active" {
			return StatusRunning
		}
		if subState == "exited" {
			return StatusStandby
		}
		return StatusRunning
	}
	if activeState == "activating" || activeState == "deactivating" || activeState == "reloading" {
		return StatusDegraded
	}
	return StatusStopped
}

func contains(slice []string, val string) bool {
	for _, s := range slice {
		if s == val {
			return true
		}
	}
	return false
}
