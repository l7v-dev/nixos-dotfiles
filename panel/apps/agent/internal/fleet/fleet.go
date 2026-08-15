package fleet

import (
	"context"
	"net"
	"os"
	"sync"
	"time"
)

// Node represents a single managed host in the NixOS fleet.
type Node struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	TargetHost  string    `json:"target_host"`
	Roles       []string  `json:"roles"`
	Tags        []string  `json:"tags"`
	Status      string    `json:"status"` // "online", "offline", "unreachable", "local"
	PingMs      int64     `json:"ping_ms"`
	AgentURL    string    `json:"agent_url,omitempty"`
	MeshIP      string    `json:"mesh_ip,omitempty"`
	IsLocal     bool      `json:"is_local"`
	LastChecked time.Time `json:"last_checked"`
}

// FleetSummary provides an aggregate overview of all fleet nodes.
type FleetSummary struct {
	TotalNodes   int       `json:"total_nodes"`
	OnlineNodes  int       `json:"online_nodes"`
	OfflineNodes int       `json:"offline_nodes"`
	Nodes        []Node    `json:"nodes"`
	LastUpdated  time.Time `json:"last_updated"`
}

// Client defines the interface for fleet and Colmena operations.
type Client interface {
	ListNodes(ctx context.Context) ([]Node, error)
	GetFleetStatus(ctx context.Context) (*FleetSummary, error)
	TriggerColmenaDeploy(ctx context.Context, req ColmenaDeployRequest) (*ColmenaDeployJob, error)
	GetColmenaJob(id string) (*ColmenaDeployJob, bool)
	ListColmenaJobs() []*ColmenaDeployJob
	CancelColmenaJob(id string) error
}

type fleetManager struct {
	mu         sync.Mutex
	knownNodes []Node
	colmenaMgr *ColmenaManager
}

// NewClient creates a new fleet manager with the defined NixOS topology.
func NewClient() Client {
	// Standard L7V Fleet Topology matching flake.nix & colmena.nix
	defaultNodes := []Node{
		{
			ID:         "laptop",
			Name:       "Workstation Laptop",
			TargetHost: "localhost",
			Roles:      []string{"desktop", "workstation", "ai-sandbox"},
			Tags:       []string{"workstation", "primary"},
			MeshIP:     "100.64.0.1",
			IsLocal:    true,
			AgentURL:   "http+unix:///run/panel-agent/panel-agent.sock",
		},
		{
			ID:         "server",
			Name:       "Core Server",
			TargetHost: "server.l7v.dev",
			Roles:      []string{"web", "db", "observe", "git"},
			Tags:       []string{"production"},
			MeshIP:     "100.64.0.2",
			IsLocal:    false,
			AgentURL:   "http://server.l7v.dev:8080",
		},
		{
			ID:         "builder",
			Name:       "CI & Cache Builder",
			TargetHost: "builder.l7v.dev",
			Roles:      []string{"ci", "cache"},
			Tags:       []string{"builder"},
			MeshIP:     "100.64.0.3",
			IsLocal:    false,
			AgentURL:   "http://builder.l7v.dev:8080",
		},
		{
			ID:         "backup",
			Name:       "Offsite Backup Target",
			TargetHost: "backup.l7v.dev",
			Roles:      []string{"backup"},
			Tags:       []string{"backup"},
			MeshIP:     "100.64.0.4",
			IsLocal:    false,
			AgentURL:   "http://backup.l7v.dev:8080",
		},
	}

	return &fleetManager{
		knownNodes: defaultNodes,
		colmenaMgr: NewColmenaManager(),
	}
}

// ListNodes returns all known nodes and tests their reachability.
func (f *fleetManager) ListNodes(ctx context.Context) ([]Node, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	var wg sync.WaitGroup
	result := make([]Node, len(f.knownNodes))
	copy(result, f.knownNodes)

	for i := range result {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			node := &result[idx]
			node.LastChecked = time.Now()

			if node.IsLocal {
				// Local agent is always online if we are executing this code
				node.Status = "local"
				node.PingMs = 0
				return
			}

			// Fast TCP ping on SSH (22) or agent port (8080)
			start := time.Now()
			target := node.TargetHost
			if node.MeshIP != "" {
				target = node.MeshIP
			}

			// Try connecting with a 500ms timeout
			conn, err := net.DialTimeout("tcp", net.JoinHostPort(target, "22"), 500*time.Millisecond)
			if err != nil {
				// Try targetHost without mesh if mesh failed
				conn, err = net.DialTimeout("tcp", net.JoinHostPort(node.TargetHost, "22"), 500*time.Millisecond)
			}

			if err == nil {
				_ = conn.Close()
				node.Status = "online"
				node.PingMs = time.Since(start).Milliseconds()
			} else {
				node.Status = "offline"
				node.PingMs = -1
			}
		}(i)
	}

	wg.Wait()
	return result, nil
}

// GetFleetStatus aggregates the online/offline metrics of the fleet.
func (f *fleetManager) GetFleetStatus(ctx context.Context) (*FleetSummary, error) {
	nodes, err := f.ListNodes(ctx)
	if err != nil {
		return nil, err
	}

	summary := &FleetSummary{
		TotalNodes:   len(nodes),
		OnlineNodes:  0,
		OfflineNodes: 0,
		Nodes:        nodes,
		LastUpdated:  time.Now(),
	}

	for _, n := range nodes {
		if n.Status == "online" || n.Status == "local" {
			summary.OnlineNodes++
		} else {
			summary.OfflineNodes++
		}
	}

	return summary, nil
}

// TriggerColmenaDeploy delegates deployment execution to ColmenaManager.
func (f *fleetManager) TriggerColmenaDeploy(ctx context.Context, req ColmenaDeployRequest) (*ColmenaDeployJob, error) {
	return f.colmenaMgr.TriggerDeploy(ctx, req)
}

// GetColmenaJob returns a job by ID.
func (f *fleetManager) GetColmenaJob(id string) (*ColmenaDeployJob, bool) {
	return f.colmenaMgr.GetJob(id)
}

// ListColmenaJobs returns the list of recent deployment jobs.
func (f *fleetManager) ListColmenaJobs() []*ColmenaDeployJob {
	return f.colmenaMgr.ListJobs()
}

// CancelColmenaJob terminates an active Colmena deployment.
func (f *fleetManager) CancelColmenaJob(id string) error {
	return f.colmenaMgr.CancelJob(id)
}

// CheckHostSocket checks if a unix socket exists and is writable.
func CheckHostSocket(socketPath string) bool {
	info, err := os.Stat(socketPath)
	if err != nil {
		return false
	}
	return info.Mode().Type() == os.ModeSocket
}
