package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/l7v/panel-agent/internal/ai"
)

type mockAIClient struct {
	tasks []*ai.AgentTask
}

func (m *mockAIClient) ListTasks(ctx context.Context) ([]*ai.AgentTask, error) {
	return m.tasks, nil
}

func (m *mockAIClient) GetTask(id string) (*ai.AgentTask, bool) {
	for _, t := range m.tasks {
		if t.ID == id {
			return t, true
		}
	}
	return nil, false
}

func (m *mockAIClient) StartTask(ctx context.Context, req ai.StartTaskRequest) (*ai.AgentTask, error) {
	task := &ai.AgentTask{
		ID:          "test-id",
		TaskSlug:    req.TaskSlug,
		Prompt:      req.Prompt,
		AgentEngine: req.AgentEngine,
		Status:      ai.TaskStatusRunning,
	}
	m.tasks = append(m.tasks, task)
	return task, nil
}

func (m *mockAIClient) CancelTask(id string, cleanupWorktree bool) error {
	for _, t := range m.tasks {
		if t.ID == id {
			t.Status = ai.TaskStatusCancelled
			return nil
		}
	}
	return nil
}

func (m *mockAIClient) ListTools(ctx context.Context) ([]ai.AIToolInfo, error) {
	return []ai.AIToolInfo{
		{Name: "Claude Code", BinaryName: "claude", Installed: true},
	}, nil
}

func (m *mockAIClient) GetHostStatus(ctx context.Context) (*ai.MicroVMHostStatus, error) {
	return &ai.MicroVMHostStatus{Supported: true, KVMEnabled: true}, nil
}

func (m *mockAIClient) ListMicroVMs(ctx context.Context) ([]ai.MicroVMInfo, error) {
	return []ai.MicroVMInfo{
		{Name: "coding-agent", Status: "running", VCPU: 4, MemoryMB: 4096},
	}, nil
}

func (m *mockAIClient) StartMicroVM(ctx context.Context, name string) error {
	return nil
}

func (m *mockAIClient) StopMicroVM(ctx context.Context, name string) error {
	return nil
}

func (m *mockAIClient) RestartMicroVM(ctx context.Context, name string) error {
	return nil
}

func TestAIApiHandlers(t *testing.T) {
	mockClient := &mockAIClient{
		tasks: []*ai.AgentTask{
			{ID: "task-1", TaskSlug: "refactor-auth", Status: ai.TaskStatusRunning},
		},
	}
	deps := Deps{AI: mockClient}
	router := NewRouter(deps)

	// 1. GET /api/v1/ai/tasks
	req := httptest.NewRequest("GET", "/api/v1/ai/tasks", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var tasksResp struct {
		Tasks []ai.AgentTask `json:"tasks"`
		Total int            `json:"total"`
	}
	if err := json.NewDecoder(rr.Body).Decode(&tasksResp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(tasksResp.Tasks) != 1 || tasksResp.Tasks[0].TaskSlug != "refactor-auth" {
		t.Fatalf("unexpected tasks payload: %+v", tasksResp)
	}

	// 2. POST /api/v1/ai/tasks
	startBody, _ := json.Marshal(ai.StartTaskRequest{
		TaskSlug:    "add-oauth",
		Prompt:      "Add OAuth login",
		AgentEngine: "claude",
	})
	req = httptest.NewRequest("POST", "/api/v1/ai/tasks", bytes.NewReader(startBody))
	rr = httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d: %s", rr.Code, rr.Body.String())
	}

	// 3. GET /api/v1/ai/tools
	req = httptest.NewRequest("GET", "/api/v1/ai/tools", nil)
	rr = httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	// 4. GET /api/v1/ai/microvms
	req = httptest.NewRequest("GET", "/api/v1/ai/microvms", nil)
	rr = httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	// 5. POST /api/v1/ai/microvms/coding-agent/start
	req = httptest.NewRequest("POST", "/api/v1/ai/microvms/coding-agent/start", nil)
	rr = httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}
}
