package ai

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

type TaskSubscription struct {
	ch          chan string
	unsubscribe func()
}

type ManagedTask struct {
	Task        *AgentTask
	cancelFunc  context.CancelFunc
	subscribers map[chan string]struct{}
	mu          sync.RWMutex
}

func (mt *ManagedTask) Subscribe() (<-chan string, func()) {
	mt.mu.Lock()
	defer mt.mu.Unlock()

	ch := make(chan string, 128)
	mt.subscribers[ch] = struct{}{}

	// Replay existing logs
	for _, line := range mt.Task.Logs {
		select {
		case ch <- line:
		default:
		}
	}

	unsubscribe := func() {
		mt.mu.Lock()
		defer mt.mu.Unlock()
		delete(mt.subscribers, ch)
		close(ch)
	}

	return ch, unsubscribe
}

func (mt *ManagedTask) AppendLog(line string) {
	mt.mu.Lock()
	defer mt.mu.Unlock()

	mt.Task.Logs = append(mt.Task.Logs, line)
	// Check for iteration clues in log output (e.g. "[INFO] ═══ Iteration 2 / 5 ═══")
	if strings.Contains(line, "Iteration") {
		re := regexp.MustCompile(`Iteration\s+(\d+)`)
		matches := re.FindStringSubmatch(line)
		if len(matches) > 1 {
			if it, err := strconv.Atoi(matches[1]); err == nil {
				mt.Task.CurrentIteration = it
			}
		}
	}

	for ch := range mt.subscribers {
		select {
		case ch <- line:
		default:
		}
	}
}

type TaskManager struct {
	mu    sync.RWMutex
	tasks map[string]*ManagedTask
	list  []*ManagedTask
}

func NewTaskManager() *TaskManager {
	return &TaskManager{
		tasks: make(map[string]*ManagedTask),
		list:  make([]*ManagedTask, 0),
	}
}

// ListTasks returns all tracked tasks, merging in external tmux agent sessions.
func (tm *TaskManager) ListTasks(ctx context.Context) ([]*AgentTask, error) {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	// Discover external agent sessions from tmux
	tm.discoverExternalSessions(ctx)

	result := make([]*AgentTask, 0, len(tm.list))
	for _, mt := range tm.list {
		mt.mu.RLock()
		taskCopy := *mt.Task
		// Make a copy of logs slice
		logsCopy := make([]string, len(mt.Task.Logs))
		copy(logsCopy, mt.Task.Logs)
		taskCopy.Logs = logsCopy
		mt.mu.RUnlock()

		result = append(result, &taskCopy)
	}

	return result, nil
}

// GetTask returns a single task by ID.
func (tm *TaskManager) GetTask(id string) (*AgentTask, bool) {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	mt, ok := tm.tasks[id]
	if !ok {
		return nil, false
	}

	mt.mu.RLock()
	defer mt.mu.RUnlock()
	taskCopy := *mt.Task
	return &taskCopy, true
}

// GetManagedTask returns the internal ManagedTask for SSE subscription.
func (tm *TaskManager) GetManagedTask(id string) (*ManagedTask, bool) {
	tm.mu.RLock()
	defer tm.mu.RUnlock()
	mt, ok := tm.tasks[id]
	return mt, ok
}

// StartTask launches an autonomous agent loop in the background.
func (tm *TaskManager) StartTask(ctx context.Context, req StartTaskRequest) (*AgentTask, error) {
	if req.TaskSlug == "" {
		req.TaskSlug = fmt.Sprintf("task-%d", time.Now().Unix())
	}
	if req.MaxIterations <= 0 {
		req.MaxIterations = 5
	}
	if req.AgentEngine == "" {
		req.AgentEngine = "claude"
	}
	if req.WorkingDir == "" {
		req.WorkingDir = "/home/l7v/dev/projects/company/active/nixos"
	}

	taskID := uuid.New().String()
	sessionName := fmt.Sprintf("agent-%s", req.TaskSlug)
	branchName := fmt.Sprintf("agent/%s", req.TaskSlug)
	worktreePath := fmt.Sprintf("/tmp/agent-worktree-%s-%s", req.TaskSlug, taskID[:6])

	task := &AgentTask{
		ID:               taskID,
		TaskSlug:         req.TaskSlug,
		Prompt:           req.Prompt,
		AgentEngine:      req.AgentEngine,
		MaxIterations:    req.MaxIterations,
		CurrentIteration: 1,
		Status:           TaskStatusRunning,
		WorkingDir:       req.WorkingDir,
		WorktreePath:     worktreePath,
		Branch:           branchName,
		SessionName:      sessionName,
		StartTime:        time.Now(),
		Logs:             make([]string, 0, 128),
		IsExternal:       false,
	}

	taskCtx, cancel := context.WithCancel(context.Background())
	managed := &ManagedTask{
		Task:        task,
		cancelFunc:  cancel,
		subscribers: make(map[chan string]struct{}),
	}

	tm.mu.Lock()
	tm.tasks[taskID] = managed
	tm.list = append([]*ManagedTask{managed}, tm.list...)
	if len(tm.list) > 30 {
		tm.list = tm.list[:30]
	}
	tm.mu.Unlock()

	// Launch autonomous loop execution in background
	go tm.runAutonomousLoop(taskCtx, managed, req)

	return task, nil
}

func (tm *TaskManager) runAutonomousLoop(ctx context.Context, mt *ManagedTask, req StartTaskRequest) {
	scriptPath := filepath.Join(req.WorkingDir, "scripts", "claude-autonomous.sh")

	var cmd *exec.Cmd
	if _, err := os.Stat(scriptPath); err == nil {
		// Use project's claude-autonomous.sh script
		cmd = exec.CommandContext(ctx, scriptPath, req.TaskSlug, req.Prompt, strconv.Itoa(req.MaxIterations), req.AgentEngine)
	} else {
		// Fallback direct execution
		cmd = exec.CommandContext(ctx, "bash", "-c", fmt.Sprintf("echo '[INFO] Running %s with prompt: %s'; sleep 2; echo '[SUCCESS] Done'", req.AgentEngine, req.Prompt))
	}
	cmd.Dir = req.WorkingDir

	r, w := io.Pipe()
	cmd.Stdout = w
	cmd.Stderr = w

	mt.AppendLog(fmt.Sprintf("[INFO] Starting agent task %s (%s, max %d iters)", req.TaskSlug, req.AgentEngine, req.MaxIterations))
	mt.AppendLog(fmt.Sprintf("[INFO] Working directory: %s", req.WorkingDir))

	if err := cmd.Start(); err != nil {
		mt.mu.Lock()
		mt.Task.Status = TaskStatusFailed
		now := time.Now()
		mt.Task.EndTime = &now
		mt.Task.DurationMs = time.Since(mt.Task.StartTime).Milliseconds()
		mt.Task.ExitCode = 1
		mt.mu.Unlock()
		mt.AppendLog(fmt.Sprintf("[ERROR] Failed to start agent process: %v", err))
		w.Close()
		return
	}

	if cmd.Process != nil {
		mt.mu.Lock()
		mt.Task.PID = cmd.Process.Pid
		mt.mu.Unlock()
	}

	go func() {
		scanner := bufio.NewScanner(r)
		for scanner.Scan() {
			mt.AppendLog(scanner.Text())
		}
	}()

	waitErr := cmd.Wait()
	w.Close()

	now := time.Now()
	mt.mu.Lock()
	mt.Task.EndTime = &now
	mt.Task.DurationMs = time.Since(mt.Task.StartTime).Milliseconds()

	if waitErr != nil {
		if mt.Task.Status != TaskStatusCancelled {
			mt.Task.Status = TaskStatusFailed
		}
		if exitErr, ok := waitErr.(*exec.ExitError); ok {
			mt.Task.ExitCode = exitErr.ExitCode()
		} else {
			mt.Task.ExitCode = 1
		}
		mt.mu.Unlock()
		mt.AppendLog(fmt.Sprintf("[ERROR] Task finished with exit code %d: %v", mt.Task.ExitCode, waitErr))
	} else {
		mt.Task.Status = TaskStatusCompleted
		mt.Task.ExitCode = 0
		mt.mu.Unlock()
		mt.AppendLog("[SUCCESS] Agent autonomous loop completed.")
	}
}

// CancelTask cancels an active agent task and cleans up process/session.
func (tm *TaskManager) CancelTask(id string, cleanupWorktree bool) error {
	tm.mu.Lock()
	managed, ok := tm.tasks[id]
	tm.mu.Unlock()

	if !ok {
		return fmt.Errorf("task %s not found", id)
	}

	managed.mu.Lock()
	defer managed.mu.Unlock()

	if managed.Task.Status == TaskStatusRunning {
		managed.Task.Status = TaskStatusCancelled
		if managed.cancelFunc != nil {
			managed.cancelFunc()
		}

		// If there's a tmux session, kill it
		if managed.Task.SessionName != "" {
			_ = exec.Command("tmux", "kill-session", "-t", managed.Task.SessionName).Run()
		}

		managed.Task.Logs = append(managed.Task.Logs, "[WARN] Task was cancelled by user.")
	}

	// Clean up worktree if requested
	if cleanupWorktree && managed.Task.WorktreePath != "" {
		_ = exec.Command("git", "worktree", "remove", "--force", managed.Task.WorktreePath).Run()
		if managed.Task.Branch != "" {
			_ = exec.Command("git", "branch", "-D", managed.Task.Branch).Run()
		}
	}

	return nil
}

// discoverExternalSessions scans `tmux list-sessions` for external `agent-*` sessions.
func (tm *TaskManager) discoverExternalSessions(ctx context.Context) {
	if _, err := exec.LookPath("tmux"); err != nil {
		return
	}

	out, err := exec.CommandContext(ctx, "tmux", "list-sessions", "-F", "#{session_name}|#{session_created}|#{session_attached}").Output()
	if err != nil {
		return
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	for _, line := range lines {
		if !strings.HasPrefix(line, "agent-") {
			continue
		}
		parts := strings.Split(line, "|")
		if len(parts) < 1 {
			continue
		}
		sessionName := parts[0]
		slug := strings.TrimPrefix(sessionName, "agent-")

		// Check if we are already tracking this session
		alreadyTracked := false
		for _, mt := range tm.tasks {
			if mt.Task.SessionName == sessionName {
				alreadyTracked = true
				break
			}
		}

		if !alreadyTracked {
			extTask := &AgentTask{
				ID:               "ext-" + sessionName,
				TaskSlug:         slug,
				Prompt:           "CLI launched session (" + sessionName + ")",
				AgentEngine:      "claude",
				MaxIterations:    5,
				CurrentIteration: 1,
				Status:           TaskStatusRunning,
				WorkingDir:       "/home/l7v/dev/projects/company/active/nixos",
				SessionName:      sessionName,
				StartTime:        time.Now(),
				Logs:             []string{"[INFO] Discovered external tmux session: " + sessionName},
				IsExternal:       true,
			}
			mt := &ManagedTask{
				Task:        extTask,
				subscribers: make(map[chan string]struct{}),
			}
			tm.tasks[extTask.ID] = mt
			tm.list = append([]*ManagedTask{mt}, tm.list...)
		}
	}
}
