package fleet

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// ColmenaDeployRequest defines the parameters for a Colmena deployment.
type ColmenaDeployRequest struct {
	Target        string `json:"target"`                   // "@production", "server", "builder", "backup", "all"
	Action        string `json:"action"`                   // "apply" (default), "build", "test", "upload"
	BuildOnTarget bool   `json:"build_on_target"`          // default false
	FlakePath     string `json:"flake_path,omitempty"`     // default /home/l7v/dev/projects/company/active/nixos
	Verbose       bool   `json:"verbose,omitempty"`
}

// ColmenaDeployJob represents a Colmena deployment run.
type ColmenaDeployJob struct {
	ID         string     `json:"id"`
	Target     string     `json:"target"`
	Action     string     `json:"action"`
	Status     string     `json:"status"` // "running", "completed", "failed", "cancelled"
	Command    string     `json:"command"`
	StartTime  time.Time  `json:"start_time"`
	EndTime    *time.Time `json:"end_time,omitempty"`
	DurationMs int64      `json:"duration_ms"`
	ExitCode   int        `json:"exit_code"`
	Logs       []string   `json:"logs"`

	mu          sync.RWMutex
	cancelFunc  context.CancelFunc
	subscribers map[chan string]struct{}
}

// ColmenaManager manages Colmena deployment processes and live SSE log streams.
type ColmenaManager struct {
	mu   sync.RWMutex
	jobs map[string]*ColmenaDeployJob
	list []*ColmenaDeployJob
}

// NewColmenaManager creates a new ColmenaManager.
func NewColmenaManager() *ColmenaManager {
	return &ColmenaManager{
		jobs: make(map[string]*ColmenaDeployJob),
		list: make([]*ColmenaDeployJob, 0),
	}
}

// GetJob returns a job by ID.
func (m *ColmenaManager) GetJob(id string) (*ColmenaDeployJob, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	j, ok := m.jobs[id]
	return j, ok
}

// ListJobs returns the list of recent jobs (max 20).
func (m *ColmenaManager) ListJobs() []*ColmenaDeployJob {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*ColmenaDeployJob, len(m.list))
	copy(res, m.list)
	return res
}

// CancelJob terminates an active deployment job.
func (m *ColmenaManager) CancelJob(id string) error {
	m.mu.RLock()
	job, ok := m.jobs[id]
	m.mu.RUnlock()

	if !ok {
		return fmt.Errorf("colmena job %s not found", id)
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
func (j *ColmenaDeployJob) Subscribe() (<-chan string, func()) {
	j.mu.Lock()
	defer j.mu.Unlock()

	ch := make(chan string, 128)
	j.subscribers[ch] = struct{}{}

	// Send existing backlog
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

func (j *ColmenaDeployJob) appendAndBroadcast(line string) {
	j.mu.Lock()
	defer j.mu.Unlock()

	j.Logs = append(j.Logs, line)
	for ch := range j.subscribers {
		select {
		case ch <- line:
		default:
		}
	}
}

// TriggerDeploy launches a colmena deployment command in the background.
func (m *ColmenaManager) TriggerDeploy(ctx context.Context, req ColmenaDeployRequest) (*ColmenaDeployJob, error) {
	if req.Action == "" {
		req.Action = "apply"
	}
	if req.FlakePath == "" {
		req.FlakePath = "/home/l7v/dev/projects/company/active/nixos"
	}

	cmdArgs := []string{req.Action}

	// Target filter
	if req.Target != "" && req.Target != "all" {
		if strings.HasPrefix(req.Target, "@") {
			cmdArgs = append(cmdArgs, "--on", req.Target)
		} else {
			cmdArgs = append(cmdArgs, "--on", req.Target)
		}
	}

	if req.BuildOnTarget {
		cmdArgs = append(cmdArgs, "--build-on-target")
	}
	if req.Verbose {
		cmdArgs = append(cmdArgs, "--verbose")
	}

	jobCtx, cancel := context.WithCancel(context.Background())
	jobID := uuid.New().String()

	fullCmdStr := "colmena " + strings.Join(cmdArgs, " ")

	job := &ColmenaDeployJob{
		ID:          jobID,
		Target:      req.Target,
		Action:      req.Action,
		Status:      "running",
		Command:     fullCmdStr,
		StartTime:   time.Now(),
		Logs:        make([]string, 0, 256),
		cancelFunc:  cancel,
		subscribers: make(map[chan string]struct{}),
	}

	m.mu.Lock()
	m.jobs[jobID] = job
	m.list = append([]*ColmenaDeployJob{job}, m.list...)
	if len(m.list) > 20 {
		m.list = m.list[:20]
	}
	m.mu.Unlock()

	// Launch in background
	go func() {
		defer cancel()

		cmd := exec.CommandContext(jobCtx, "colmena", cmdArgs...)
		cmd.Dir = req.FlakePath

		r, w := io.Pipe()
		cmd.Stdout = w
		cmd.Stderr = w

		job.appendAndBroadcast(fmt.Sprintf("[INFO] Colmena deployment started: %s (Dir: %s)", fullCmdStr, req.FlakePath))

		if err := cmd.Start(); err != nil {
			job.mu.Lock()
			job.Status = "failed"
			now := time.Now()
			job.EndTime = &now
			job.DurationMs = time.Since(job.StartTime).Milliseconds()
			job.ExitCode = 1
			job.mu.Unlock()
			job.appendAndBroadcast(fmt.Sprintf("[ERROR] Failed to start colmena: %v", err))
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
			job.appendAndBroadcast(fmt.Sprintf("[ERROR] Deployment exited with error: %v", waitErr))
		} else {
			job.Status = "completed"
			job.ExitCode = 0
			job.appendAndBroadcast("[SUCCESS] Colmena deployment completed successfully.")
		}
		job.mu.Unlock()
	}()

	return job, nil
}
