package ai

import (
	"context"
	"testing"
	"time"
)

func TestTaskManagerLifecycle(t *testing.T) {
	tm := NewTaskManager()

	ctx := context.Background()

	// Start task
	task, err := tm.StartTask(ctx, StartTaskRequest{
		TaskSlug:      "test-task",
		Prompt:        "Write unit tests",
		MaxIterations: 3,
		AgentEngine:   "claude",
		WorkingDir:    t.TempDir(),
	})
	if err != nil {
		t.Fatalf("failed to start task: %v", err)
	}

	if task.ID == "" {
		t.Fatal("expected non-empty task ID")
	}
	if task.TaskSlug != "test-task" {
		t.Fatalf("expected slug 'test-task', got '%s'", task.TaskSlug)
	}

	// Retrieve task
	fetched, ok := tm.GetTask(task.ID)
	if !ok {
		t.Fatalf("task %s not found in manager", task.ID)
	}
	if fetched.TaskSlug != "test-task" {
		t.Fatalf("mismatched task slug: %s", fetched.TaskSlug)
	}

	// List tasks
	list, err := tm.ListTasks(ctx)
	if err != nil {
		t.Fatalf("failed to list tasks: %v", err)
	}
	if len(list) == 0 {
		t.Fatal("expected at least 1 task in list")
	}

	// Test subscription
	managed, ok := tm.GetManagedTask(task.ID)
	if !ok {
		t.Fatalf("managed task not found for %s", task.ID)
	}

	ch, unsub := managed.Subscribe()
	defer unsub()

	managed.AppendLog("[INFO] Test log line")

	foundLog := false
	for i := 0; i < 10; i++ {
		select {
		case line := <-ch:
			if line == "[INFO] Test log line" {
				foundLog = true
				break
			}
		case <-time.After(500 * time.Millisecond):
			break
		}
		if foundLog {
			break
		}
	}

	if !foundLog {
		t.Fatal("expected to receive '[INFO] Test log line' on subscriber channel")
	}

	// Cancel task
	err = tm.CancelTask(task.ID, false)
	if err != nil {
		t.Fatalf("failed to cancel task: %v", err)
	}

	cancelled, _ := tm.GetTask(task.ID)
	if cancelled.Status != TaskStatusCancelled && cancelled.Status != TaskStatusCompleted {
		t.Fatalf("expected status cancelled or completed, got %s", cancelled.Status)
	}
}
