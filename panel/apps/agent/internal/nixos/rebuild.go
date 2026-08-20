package nixos

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// RebuildAction defines the supported rebuild operations.
type RebuildAction string

const (
	ActionSwitch      RebuildAction = "switch"
	ActionBoot        RebuildAction = "boot"
	ActionTest        RebuildAction = "test"
	ActionDryActivate RebuildAction = "dry-activate"
	ActionUpdate      RebuildAction = "update"
)

// RebuildRequest defines the parameters for triggering a rebuild.
type RebuildRequest struct {
	Action       RebuildAction `json:"action"`                  // "switch", "boot", "test", "dry-activate", "update"
	FlakePath    string        `json:"flake_path,omitempty"`    // root directory of the flake
	Host         string        `json:"host,omitempty"`          // e.g. "L7V"
	MaxJobs      int           `json:"max_jobs,omitempty"`      // default 3
	Cores        int           `json:"cores,omitempty"`         // default 3
	UpdateInputs []string      `json:"update_inputs,omitempty"` // specific flake inputs to update
}

// RebuildJob represents a running or finished rebuild execution.
type RebuildJob struct {
	ID         string        `json:"id"`
	Action     RebuildAction `json:"action"`
	Status     string        `json:"status"` // "running", "completed", "failed", "cancelled"
	Command    string        `json:"command"`
	StartTime  time.Time     `json:"start_time"`
	EndTime    *time.Time    `json:"end_time,omitempty"`
	DurationMs int64         `json:"duration_ms"`
	ExitCode   int           `json:"exit_code"`
	Logs       []string      `json:"logs"`

	mu          sync.RWMutex
	cancelFunc  context.CancelFunc
	subscribers map[chan string]struct{}
}

// RebuildManager manages asynchronous rebuild executions and SSE live streaming.
type RebuildManager struct {
	mu   sync.RWMutex
	jobs map[string]*RebuildJob
	list []*RebuildJob
}

// NewRebuildManager creates a new RebuildManager.
func NewRebuildManager() *RebuildManager {
	return &RebuildManager{
		jobs: make(map[string]*RebuildJob),
		list: make([]*RebuildJob, 0),
	}
}

// GetJob returns a job by ID.
func (m *RebuildManager) GetJob(id string) (*RebuildJob, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	j, ok := m.jobs[id]
	return j, ok
}

// ListJobs returns a list of recent rebuild jobs (max 20).
func (m *RebuildManager) ListJobs() []*RebuildJob {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*RebuildJob, len(m.list))
	copy(res, m.list)
	return res
}

// CancelJob terminates an active rebuild job.
func (m *RebuildManager) CancelJob(id string) error {
	m.mu.RLock()
	job, ok := m.jobs[id]
	m.mu.RUnlock()

	if !ok {
		return fmt.Errorf("job %s not found", id)
	}

	job.mu.Lock()
	defer job.mu.Unlock()

	if job.Status != "running" {
		return fmt.Errorf("job %s is not running (status: %s)", id, job.Status)
	}

	if job.cancelFunc != nil {
		job.cancelFunc()
		job.Status = "cancelled"
	}
	return nil
}

// Subscribe returns a channel receiving new log lines and an unsubscribe function.
func (j *RebuildJob) Subscribe() (<-chan string, func()) {
	j.mu.Lock()
	defer j.mu.Unlock()

	ch := make(chan string, 128)
	j.subscribers[ch] = struct{}{}

	// Send existing backlog immediately
	for _, l := range j.Logs {
		select {
		case ch <- l:
		default:
		}
	}

	unsubscribe := func() {
		j.mu.Lock()
		defer j.mu.Unlock()
		delete(j.subscribers, ch)
		close(ch)
	}

	return ch, unsubscribe
}

func (j *RebuildJob) appendAndBroadcast(line string) {
	j.mu.Lock()
	defer j.mu.Unlock()

	j.Logs = append(j.Logs, line)
	for ch := range j.subscribers {
		select {
		case ch <- line:
		default:
			// avoid blocking if client buffer is full
		}
	}
}

// TriggerRebuild starts a rebuild/update job in the background.
func (c *systemNixOSClient) TriggerRebuild(ctx context.Context, req RebuildRequest) (*RebuildJob, error) {
	if req.Action == "" {
		req.Action = ActionSwitch
	}
	if req.MaxJobs <= 0 {
		req.MaxJobs = 3
	}
	if req.Cores <= 0 {
		req.Cores = 3
	}
	if req.FlakePath == "" {
		req.FlakePath = "/home/l7v/dev/projects/company/active/nixos"
	}
	if req.Host == "" {
		if envHost := os.Getenv("PANEL_HOST"); envHost != "" {
			req.Host = envHost
		} else if hostname, err := os.Hostname(); err == nil && hostname != "" {
			req.Host = hostname
		} else {
			req.Host = "L7V"
		}
	}

	// Prepare command arguments based on action
	var cmdName string
	var cmdArgs []string

	switch req.Action {
	case ActionUpdate:
		scriptPath := filepath.Join(req.FlakePath, "scripts", "update.sh")
		cmdName = scriptPath
		cmdArgs = []string{req.Host}

	case ActionSwitch:
		cmdName = "nh"
		cmdArgs = []string{
			"os", "switch", req.FlakePath,
			"--",
			"--max-jobs", fmt.Sprintf("%d", req.MaxJobs),
			"--cores", fmt.Sprintf("%d", req.Cores),
		}

	case ActionBoot:
		cmdName = "nh"
		cmdArgs = []string{
			"os", "boot", req.FlakePath,
			"--",
			"--max-jobs", fmt.Sprintf("%d", req.MaxJobs),
			"--cores", fmt.Sprintf("%d", req.Cores),
		}

	case ActionTest:
		cmdName = "sudo"
		cmdArgs = []string{
			"nixos-rebuild", "test",
			"--flake", fmt.Sprintf("%s#%s", req.FlakePath, req.Host),
			"--max-jobs", fmt.Sprintf("%d", req.MaxJobs),
			"--cores", fmt.Sprintf("%d", req.Cores),
		}

	case ActionDryActivate:
		cmdName = "sudo"
		cmdArgs = []string{
			"nixos-rebuild", "dry-activate",
			"--flake", fmt.Sprintf("%s#%s", req.FlakePath, req.Host),
		}

	default:
		return nil, fmt.Errorf("unsupported rebuild action: %s", req.Action)
	}

	jobCtx, cancel := context.WithCancel(context.Background())
	jobID := uuid.New().String()

	fullCmdStr := cmdName + " " + strings.Join(cmdArgs, " ")

	job := &RebuildJob{
		ID:          jobID,
		Action:      req.Action,
		Status:      "running",
		Command:     fullCmdStr,
		StartTime:   time.Now(),
		Logs:        make([]string, 0, 256),
		cancelFunc:  cancel,
		subscribers: make(map[chan string]struct{}),
	}

	c.rebuildMgr.mu.Lock()
	c.rebuildMgr.jobs[jobID] = job
	// Keep last 20 jobs
	c.rebuildMgr.list = append([]*RebuildJob{job}, c.rebuildMgr.list...)
	if len(c.rebuildMgr.list) > 20 {
		c.rebuildMgr.list = c.rebuildMgr.list[:20]
	}
	c.rebuildMgr.mu.Unlock()

	// Launch execution in background goroutine
	go func() {
		defer cancel()

		cmd := exec.CommandContext(jobCtx, cmdName, cmdArgs...)
		cmd.Dir = req.FlakePath

		// Merge stdout and stderr
		r, w := io.Pipe()
		cmd.Stdout = w
		cmd.Stderr = w

		job.appendAndBroadcast(fmt.Sprintf("[INFO] Starting %s: %s", req.Action, fullCmdStr))

		if err := cmd.Start(); err != nil {
			job.mu.Lock()
			job.Status = "failed"
			now := time.Now()
			job.EndTime = &now
			job.DurationMs = time.Since(job.StartTime).Milliseconds()
			job.ExitCode = 1
			job.mu.Unlock()
			job.appendAndBroadcast(fmt.Sprintf("[ERROR] Failed to start command: %v", err))
			w.Close()
			return
		}

		go func() {
			scanner := bufio.NewScanner(r)
			for scanner.Scan() {
				job.appendAndBroadcast(scanner.Text())
			}
		}()

		waitErr := cmd.Wait()
		w.Close()

		now := time.Now()
		job.mu.Lock()
		job.EndTime = &now
		job.DurationMs = time.Since(job.StartTime).Milliseconds()

		if waitErr != nil {
			if job.Status != "cancelled" {
				job.Status = "failed"
			}
			if exitErr, ok := waitErr.(*exec.ExitError); ok {
				job.ExitCode = exitErr.ExitCode()
			} else {
				job.ExitCode = 1
			}
			job.appendAndBroadcast(fmt.Sprintf("[ERROR] Process exited with error: %v", waitErr))
		} else {
			job.Status = "completed"
			job.ExitCode = 0
			job.appendAndBroadcast("[SUCCESS] Rebuild completed successfully.")
		}
		job.mu.Unlock()
	}()

	return job, nil
}

// GetRebuildJob returns a job by ID from the manager.
func (c *systemNixOSClient) GetRebuildJob(id string) (*RebuildJob, bool) {
	return c.rebuildMgr.GetJob(id)
}

// ListRebuildJobs returns recent jobs.
func (c *systemNixOSClient) ListRebuildJobs() []*RebuildJob {
	return c.rebuildMgr.ListJobs()
}

// CancelRebuildJob cancels a running rebuild.
func (c *systemNixOSClient) CancelRebuildJob(id string) error {
	return c.rebuildMgr.CancelJob(id)
}
