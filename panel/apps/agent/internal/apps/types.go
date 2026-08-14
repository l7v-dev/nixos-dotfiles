package apps

import "time"

// AppCategory classifies applications and workloads.
type AppCategory string

const (
	CategoryCoreService AppCategory = "core_service"
	CategoryAIAgent     AppCategory = "ai_agent"
	CategoryMicroVM     AppCategory = "microvm"
	CategoryDevTool     AppCategory = "dev_tool"
	CategoryDesktopCap  AppCategory = "desktop_capability"
)

// AppStatus describes the runtime health and activity of an application.
type AppStatus string

const (
	StatusRunning  AppStatus = "running"
	StatusStopped  AppStatus = "stopped"
	StatusFailed   AppStatus = "failed"
	StatusDegraded AppStatus = "degraded"
	StatusStandby  AppStatus = "standby"
)

// SandboxTier describes the isolation level according to AGENTS.md governance directives.
type SandboxTier int

const (
	SandboxTierNone      SandboxTier = 0 // Host native execution
	SandboxTierClaudebox SandboxTier = 1 // Bubblewrap / Claudebox sandbox
	SandboxTierMicroVM   SandboxTier = 2 // Ephemeral MicroVM sandbox
	SandboxTierWorktree  SandboxTier = 3 // Git Worktree Autonomous Loop
)

// AppEndpoint represents a network or web interface exposed by the application.
type AppEndpoint struct {
	Type     string `json:"type"`               // "http", "https", "tcp", "unix"
	URL      string `json:"url,omitempty"`      // e.g. "https://git.l7v.dev"
	Port     int    `json:"port,omitempty"`     // e.g. 3000
	Internal bool   `json:"internal,omitempty"` // true if internal/local only
}

// AppMetrics holds runtime cgroup v2 resource telemetry.
type AppMetrics struct {
	CPUPercent    float64 `json:"cpu_percent"`
	MemoryMB      uint64  `json:"memory_mb"`
	MemoryLimitMB uint64  `json:"memory_limit_mb,omitempty"`
	TasksCurrent  uint64  `json:"tasks_current"`
	RestartsTotal uint32  `json:"restarts_total,omitempty"`
	UptimeSeconds uint64  `json:"uptime_seconds"`
}

// NixProvenance tracks declarative NixOS & Flake origins for the application.
type NixProvenance struct {
	DeclaredIn  string   `json:"declared_in,omitempty"`  // e.g. "modules/services/forgejo/default.nix"
	PackageName string   `json:"package_name,omitempty"` // e.g. "forgejo"
	Version     string   `json:"version,omitempty"`      // e.g. "1.21.0"
	StorePath   string   `json:"store_path,omitempty"`   // e.g. "/nix/store/..."
	FlakeInput  string   `json:"flake_input,omitempty"`  // e.g. "nixpkgs" | "llm-agents"
	SecretKeys  []string `json:"secret_keys,omitempty"`  // e.g. ["forgejo/admin_password"]
}

// Application represents an enterprise managed software, service or AI agent.
type Application struct {
	ID           string        `json:"id"`
	Name         string        `json:"name"`
	Description  string        `json:"description"`
	Category     AppCategory   `json:"category"`
	Status       AppStatus     `json:"status"`
	SystemdUnit  string        `json:"systemd_unit,omitempty"`
	BinaryName   string        `json:"binary_name,omitempty"`
	SandboxTier  SandboxTier   `json:"sandbox_tier"`
	Endpoints    []AppEndpoint `json:"endpoints,omitempty"`
	Dependencies []string      `json:"dependencies,omitempty"`
	Dependents   []string      `json:"dependents,omitempty"`
	Metrics      AppMetrics    `json:"metrics"`
	Provenance   NixProvenance `json:"provenance"`
	Tags         []string      `json:"tags,omitempty"`
	LastStarted  *time.Time    `json:"last_started,omitempty"`
}

// CategorySummary provides aggregate counts for a specific category.
type CategorySummary struct {
	Category AppCategory `json:"category"`
	Total    int         `json:"total"`
	Running  int         `json:"running"`
	Stopped  int         `json:"stopped"`
	Failed   int         `json:"failed"`
	Degraded int         `json:"degraded"`
}

// AppsSummary represents high-level metrics across all applications.
type AppsSummary struct {
	TotalApps       int               `json:"total_apps"`
	RunningApps     int               `json:"running_apps"`
	StoppedApps     int               `json:"stopped_apps"`
	FailedApps      int               `json:"failed_apps"`
	DegradedApps    int               `json:"degraded_apps"`
	TotalMemoryMB   uint64            `json:"total_memory_mb"`
	TotalCPUPercent float64           `json:"total_cpu_percent"`
	Categories      []CategorySummary `json:"categories"`
}

// AppActionRequest is sent to POST /api/v1/apps/{id}/action
type AppActionRequest struct {
	Action string `json:"action"` // "start", "stop", "restart", "reload"
	Force  bool   `json:"force,omitempty"`
}

// AppActionResponse is returned by POST /api/v1/apps/{id}/action
type AppActionResponse struct {
	AppID     string    `json:"app_id"`
	Action    string    `json:"action"`
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
	Message   string    `json:"message,omitempty"`
	Affected  []string  `json:"affected,omitempty"`
}

// DependencyNode represents a node in the dependency topology DAG.
type DependencyNode struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Category    AppCategory `json:"category"`
	Status      AppStatus   `json:"status"`
	SystemdUnit string      `json:"systemd_unit,omitempty"`
}

// DependencyEdge represents a dependency relation between two nodes.
type DependencyEdge struct {
	Source string `json:"source"` // Provider ID (e.g. "postgresql")
	Target string `json:"target"` // Consumer ID (e.g. "forgejo")
	Type   string `json:"type"`   // "requires", "wants", "proxies"
}

// DependencyGraph provides the topology of all managed applications.
type DependencyGraph struct {
	Nodes []DependencyNode `json:"nodes"`
	Edges []DependencyEdge `json:"edges"`
}
