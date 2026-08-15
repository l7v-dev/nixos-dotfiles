package ai

import (
	"context"
)

type aiClient struct {
	tasks   *TaskManager
	tools   *ToolsCatalog
	microvm *MicroVMManager
}

// NewClient creates a new unified AI and sandbox management client.
func NewClient() Client {
	return &aiClient{
		tasks:   NewTaskManager(),
		tools:   NewToolsCatalog(),
		microvm: NewMicroVMManager(),
	}
}

// Tasks
func (c *aiClient) ListTasks(ctx context.Context) ([]*AgentTask, error) {
	return c.tasks.ListTasks(ctx)
}

func (c *aiClient) GetTask(id string) (*AgentTask, bool) {
	return c.tasks.GetTask(id)
}

func (c *aiClient) StartTask(ctx context.Context, req StartTaskRequest) (*AgentTask, error) {
	return c.tasks.StartTask(ctx, req)
}

func (c *aiClient) CancelTask(id string, cleanupWorktree bool) error {
	return c.tasks.CancelTask(id, cleanupWorktree)
}

// Tools
func (c *aiClient) ListTools(ctx context.Context) ([]AIToolInfo, error) {
	return c.tools.ListTools(ctx)
}

// MicroVM
func (c *aiClient) GetHostStatus(ctx context.Context) (*MicroVMHostStatus, error) {
	return c.microvm.GetHostStatus(ctx)
}

func (c *aiClient) ListMicroVMs(ctx context.Context) ([]MicroVMInfo, error) {
	return c.microvm.ListMicroVMs(ctx)
}

func (c *aiClient) StartMicroVM(ctx context.Context, name string) error {
	return c.microvm.StartMicroVM(ctx, name)
}

func (c *aiClient) StopMicroVM(ctx context.Context, name string) error {
	return c.microvm.StopMicroVM(ctx, name)
}

func (c *aiClient) RestartMicroVM(ctx context.Context, name string) error {
	return c.microvm.RestartMicroVM(ctx, name)
}

// GetManagedTask allows API layer to access ManagedTask for SSE streams.
func (c *aiClient) GetManagedTask(id string) (*ManagedTask, bool) {
	return c.tasks.GetManagedTask(id)
}
