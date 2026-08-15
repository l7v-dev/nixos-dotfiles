package ai

import (
	"context"
	"time"
)

// SandboxTier describes the isolation level according to AGENTS.md directives.
type SandboxTier int

const (
	SandboxTierNone      SandboxTier = 0 // Direct host execution
	SandboxTierClaudebox SandboxTier = 1 // Claudebox / Bubblewrap sandbox
	SandboxTierMicroVM   SandboxTier = 2 // Ephemeral MicroVM sandbox
	SandboxTierWorktree  SandboxTier = 3 // Git Worktree Autonomous Loop
)

// AgentTaskStatus represents the state of an autonomous agent task.
type AgentTaskStatus string

const (
	TaskStatusQueued    AgentTaskStatus = "queued"
	TaskStatusRunning   AgentTaskStatus = "running"
	TaskStatusCompleted AgentTaskStatus = "completed"
	TaskStatusFailed    AgentTaskStatus = "failed"
	TaskStatusCancelled AgentTaskStatus = "cancelled"
)

// AgentTask represents a running or finished autonomous AI agent loop execution.
type AgentTask struct {
	ID               string          `json:"id"`
	TaskSlug         string          `json:"task_slug"`
	Prompt           string          `json:"prompt"`
	AgentEngine      string          `json:"agent_engine"` // "claude", "codex", "gemini", "opencode", "aider", "claudebox"
	MaxIterations    int             `json:"max_iterations"`
	CurrentIteration int             `json:"current_iteration"`
	Status           AgentTaskStatus `json:"status"`
	WorkingDir       string          `json:"working_dir"`
	WorktreePath     string          `json:"worktree_path,omitempty"`
	Branch           string          `json:"branch,omitempty"`
	SessionName      string          `json:"session_name,omitempty"` // tmux session name
	PID              int             `json:"pid,omitempty"`
	CPUPercent       float64         `json:"cpu_percent"`
	MemoryMB         uint64          `json:"memory_mb"`
	StartTime        time.Time       `json:"start_time"`
	EndTime          *time.Time      `json:"end_time,omitempty"`
	DurationMs       int64           `json:"duration_ms"`
	ExitCode         int             `json:"exit_code"`
	Logs             []string        `json:"logs"`
	IsExternal       bool            `json:"is_external"` // Discovered outside panel (e.g. CLI tmux)
}

// StartTaskRequest holds the parameters for launching an autonomous agent loop.
type StartTaskRequest struct {
	TaskSlug      string      `json:"task_slug"`      // e.g. "add-oauth", "fix-perf"
	Prompt        string      `json:"prompt"`         // instructions for the agent
	MaxIterations int         `json:"max_iterations"` // default 5
	AgentEngine   string      `json:"agent_engine"`   // "claude", "codex", "gemini", "opencode", "aider", "claudebox"
	WorkingDir    string      `json:"working_dir"`    // repository root or project path
	SandboxTier   SandboxTier `json:"sandbox_tier"`   // Tier 1, 2, or 3
}

// AIToolCategory classifies declarative AI tools in the system.
type AIToolCategory string

const (
	CategoryCodingAgent AIToolCategory = "coding_agent"
	CategoryAssistant   AIToolCategory = "assistant"
	CategoryCodeReview  AIToolCategory = "code_review"
	CategoryMemoryIntel AIToolCategory = "memory_intelligence"
	CategoryWorkflow    AIToolCategory = "workflow_management"
	CategorySandboxing  AIToolCategory = "sandboxing_isolation"
)

// AIToolInfo represents a declarative AI CLI tool in the NixOS environment.
type AIToolInfo struct {
	Name        string         `json:"name"`
	BinaryName  string         `json:"binary_name"`
	Description string         `json:"description"`
	Category    AIToolCategory `json:"category"`
	SandboxTier SandboxTier    `json:"sandbox_tier"`
	Installed   bool           `json:"installed"`
	Version     string         `json:"version,omitempty"`
	Source      string         `json:"source"` // "nixpkgs", "llm-agents.nix", "pkgs/qoder-cli"
	Path        string         `json:"path,omitempty"`
}

// VirtioShare describes a virtiofs directory share mounted into a MicroVM.
type VirtioShare struct {
	Tag        string `json:"tag"`
	Source     string `json:"source"`
	MountPoint string `json:"mount_point"`
	Proto      string `json:"proto"` // "virtiofs"
}

// MicroVMInfo represents an ephemeral or persistent MicroVM sandbox.
type MicroVMInfo struct {
	Name          string        `json:"name"`
	Status        string        `json:"status"` // "running", "stopped", "failed", "unknown"
	VCPU          int           `json:"vcpu"`
	MemoryMB      int           `json:"memory_mb"`
	Shares        []VirtioShare `json:"shares"`
	SSHCommand    string        `json:"ssh_command"`
	SocketPath    string        `json:"socket_path,omitempty"`
	SystemdUnit   string        `json:"systemd_unit"`
	UptimeSeconds uint64        `json:"uptime_seconds"`
}

// MicroVMHostStatus describes the virtualization host status on this node.
type MicroVMHostStatus struct {
	Supported        bool     `json:"supported"`
	KVMEnabled       bool     `json:"kvm_enabled"`
	VirtiofsdRunning bool     `json:"virtiofsd_running"`
	AvailableVMs     []string `json:"available_vms"`
	Hypervisor       string   `json:"hypervisor"` // "kvm/qemu", "cloud-hypervisor"
}

// Client defines the interface for AI agent tasks and MicroVM sandbox operations.
type Client interface {
	// Tasks
	ListTasks(ctx context.Context) ([]*AgentTask, error)
	GetTask(id string) (*AgentTask, bool)
	StartTask(ctx context.Context, req StartTaskRequest) (*AgentTask, error)
	CancelTask(id string, cleanupWorktree bool) error

	// Tools
	ListTools(ctx context.Context) ([]AIToolInfo, error)

	// MicroVM
	GetHostStatus(ctx context.Context) (*MicroVMHostStatus, error)
	ListMicroVMs(ctx context.Context) ([]MicroVMInfo, error)
	StartMicroVM(ctx context.Context, name string) error
	StopMicroVM(ctx context.Context, name string) error
	RestartMicroVM(ctx context.Context, name string) error
}
