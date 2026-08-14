package containers

import (
	"context"
	"log/slog"

	"github.com/gorilla/websocket"
)

// Manager is the unified interface for managing containers, images, volumes, networks, and telemetry.
type Manager interface {
	IsAvailable() bool
	Engine() EngineType
	GetOverview(ctx context.Context) (*ContainersOverview, error)

	// Container Lifecycle
	ListContainers(ctx context.Context, all bool, stackFilter string) ([]ContainerSummary, error)
	GetContainer(ctx context.Context, id string) (*ContainerDetail, error)
	StartContainer(ctx context.Context, id string) error
	StopContainer(ctx context.Context, id string, timeoutSeconds int) error
	RestartContainer(ctx context.Context, id string, timeoutSeconds int) error
	PauseContainer(ctx context.Context, id string) error
	UnpauseContainer(ctx context.Context, id string) error
	KillContainer(ctx context.Context, id string, signal string) error
	RemoveContainer(ctx context.Context, id string, force, removeVolumes bool) error
	CreateContainer(ctx context.Context, req CreateContainerRequest) (string, error)
	BulkAction(ctx context.Context, req BulkActionRequest) (BulkActionResult, error)

	// Observability
	StreamStats(ctx context.Context, id string, out chan<- ContainerStats) error
	StreamLogs(ctx context.Context, id string, opts LogStreamOptions, out chan<- LogLine) error

	// Interactive Shell
	CreateExec(ctx context.Context, id string, opts ExecOptions) (string, error)
	ResizeExec(ctx context.Context, execID string, resize ExecResizeOptions) error
	StartExecWS(ctx context.Context, execID string, ws *websocket.Conn) error

	// Images
	ListImages(ctx context.Context) ([]ImageSummary, error)
	InspectImage(ctx context.Context, id string) (map[string]interface{}, error)
	PullImage(ctx context.Context, image string, out chan<- PullImageProgress) error
	RemoveImage(ctx context.Context, id string, force bool) error
	PruneImages(ctx context.Context, danglingOnly bool) (int64, []string, error)

	// Volumes
	ListVolumes(ctx context.Context) ([]VolumeSummary, error)
	CreateVolume(ctx context.Context, name, driver string, labels map[string]string) (*VolumeSummary, error)
	RemoveVolume(ctx context.Context, name string, force bool) error
	PruneVolumes(ctx context.Context) (int64, []string, error)

	// Networks
	ListNetworks(ctx context.Context) ([]NetworkSummary, error)
	CreateNetwork(ctx context.Context, name, driver, subnet, gateway string, internal bool) (*NetworkSummary, error)
	RemoveNetwork(ctx context.Context, id string) error
	ConnectNetwork(ctx context.Context, networkID, containerID string) error
	DisconnectNetwork(ctx context.Context, networkID, containerID string, force bool) error

	// Stacks / Pods
	ListStacks(ctx context.Context) ([]StackSummary, error)
}

type containerManager struct {
	client EngineClient
	logger *slog.Logger
}

// NewManager creates a new container manager instance.
func NewManager(customSocket string, logger *slog.Logger) Manager {
	if logger == nil {
		logger = slog.Default()
	}
	client := NewEngineClient(customSocket, logger)
	return &containerManager{
		client: client,
		logger: logger,
	}
}

// NewManagerWithClient creates a manager with an explicit engine client (for testing).
func NewManagerWithClient(client EngineClient, logger *slog.Logger) Manager {
	if logger == nil {
		logger = slog.Default()
	}
	return &containerManager{
		client: client,
		logger: logger,
	}
}

func (m *containerManager) IsAvailable() bool {
	return m.client != nil && m.client.IsAvailable()
}

func (m *containerManager) Engine() EngineType {
	if m.client == nil {
		return EngineUnknown
	}
	return m.client.Engine()
}
