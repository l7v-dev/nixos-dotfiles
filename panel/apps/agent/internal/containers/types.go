package containers

import "time"

// EngineType indicates whether the detected container runtime is Podman or Docker.
type EngineType string

const (
	EnginePodman  EngineType = "podman"
	EngineDocker  EngineType = "docker"
	EngineUnknown EngineType = "unknown"
)

// ContainerState represents the lifecycle status of a container.
type ContainerState string

const (
	StateRunning    ContainerState = "running"
	StatePaused     ContainerState = "paused"
	StateExited     ContainerState = "exited"
	StateRestarting ContainerState = "restarting"
	StateDead       ContainerState = "dead"
	StateCreated    ContainerState = "created"
)

// PortMapping represents an exposed port and its host binding.
type PortMapping struct {
	IP          string `json:"ip,omitempty"`
	PrivatePort uint16 `json:"privatePort"`
	PublicPort  uint16 `json:"publicPort,omitempty"`
	Type        string `json:"type"` // tcp, udp, sctp
}

// MountPoint represents a volume or bind mount attached to a container.
type MountPoint struct {
	Type        string `json:"type"` // bind, volume, tmpfs
	Name        string `json:"name,omitempty"`
	Source      string `json:"source"`
	Destination string `json:"destination"`
	Driver      string `json:"driver,omitempty"`
	Mode        string `json:"mode,omitempty"`
	RW          bool   `json:"rw"`
	Propagation string `json:"propagation,omitempty"`
}

// ContainerSummary provides high-level information for container listing.
type ContainerSummary struct {
	ID           string            `json:"id"`
	Names        []string          `json:"names"`
	Image        string            `json:"image"`
	ImageID      string            `json:"imageId"`
	Command      string            `json:"command"`
	Created      int64             `json:"created"`
	State        ContainerState    `json:"state"`
	Status       string            `json:"status"`
	Ports        []PortMapping     `json:"ports"`
	Labels       map[string]string `json:"labels"`
	Mounts       []MountPoint      `json:"mounts"`
	Stack        string            `json:"stack,omitempty"` // Compose project or Pod name
	IsNixOS      bool              `json:"isNixos"`         // Declarative NixOS-managed container
	Engine       EngineType        `json:"engine"`
	CPUPct       float64           `json:"cpuPct,omitempty"`
	MemoryUsage  uint64            `json:"memoryUsage,omitempty"`
	MemoryLimit  uint64            `json:"memoryLimit,omitempty"`
	MemoryPct    float64           `json:"memoryPct,omitempty"`
}

// ContainerDetail provides comprehensive inspect data.
type ContainerDetail struct {
	ID              string                 `json:"id"`
	Created         time.Time              `json:"created"`
	Path            string                 `json:"path"`
	Args            []string               `json:"args"`
	State           ContainerStateInfo     `json:"state"`
	Image           string                 `json:"image"`
	ImageID         string                 `json:"imageId"`
	Name            string                 `json:"name"`
	RestartCount    int                    `json:"restartCount"`
	Driver          string                 `json:"driver"`
	Platform        string                 `json:"platform"`
	Mounts          []MountPoint           `json:"mounts"`
	Config          ContainerConfig        `json:"config"`
	NetworkSettings NetworkSettings        `json:"networkSettings"`
	HostConfig      HostConfig             `json:"hostConfig"`
	IsNixOS         bool                   `json:"isNixos"`
	Stack           string                 `json:"stack,omitempty"`
	Engine          EngineType             `json:"engine"`
	RawInspect      map[string]interface{} `json:"rawInspect,omitempty"`
}

// ContainerStateInfo holds detailed container state fields.
type ContainerStateInfo struct {
	Status     string    `json:"status"`
	Running    bool      `json:"running"`
	Paused     bool      `json:"paused"`
	Restarting bool      `json:"restarting"`
	OOMKilled  bool      `json:"oomKilled"`
	Dead       bool      `json:"dead"`
	Pid        int       `json:"pid"`
	ExitCode   int       `json:"exitCode"`
	Error      string    `json:"error"`
	StartedAt  time.Time `json:"startedAt"`
	FinishedAt time.Time `json:"finishedAt"`
	Health     *Health   `json:"health,omitempty"`
}

// Health describes container healthcheck status.
type Health struct {
	Status        string `json:"status"` // healthy, unhealthy, starting
	FailingStreak int    `json:"failingStreak"`
}

// ContainerConfig holds container configuration metadata.
type ContainerConfig struct {
	Hostname     string              `json:"hostname"`
	Domainname   string              `json:"domainname"`
	User         string              `json:"user"`
	Env          []string            `json:"env"`
	Cmd          []string            `json:"cmd"`
	Entrypoint   []string            `json:"entrypoint"`
	Image        string              `json:"image"`
	WorkingDir   string              `json:"workingDir"`
	Labels       map[string]string   `json:"labels"`
	ExposedPorts map[string]struct{} `json:"exposedPorts,omitempty"`
}

// NetworkSettings holds container network and IP allocations.
type NetworkSettings struct {
	IPAddress   string                      `json:"ipAddress"`
	Gateway     string                      `json:"gateway"`
	MacAddress  string                      `json:"macAddress"`
	Bridge      string                      `json:"bridge"`
	Ports       map[string][]PortBinding    `json:"ports"`
	Networks    map[string]ContainerNetwork `json:"networks"`
}

// PortBinding represents a host-side port binding.
type PortBinding struct {
	HostIP   string `json:"hostIp"`
	HostPort string `json:"hostPort"`
}

// ContainerNetwork describes network settings per attached network.
type ContainerNetwork struct {
	NetworkID string `json:"networkId"`
	IPAddress string `json:"ipAddress"`
	Gateway   string `json:"gateway"`
	MacAddress string `json:"macAddress"`
}

// HostConfig holds host-level resource and isolation configurations.
type HostConfig struct {
	Memory        int64             `json:"memory"`
	NanoCPUs      int64             `json:"nanoCpus"`
	CPUShares     int64             `json:"cpuShares"`
	AutoRemove    bool              `json:"autoRemove"`
	NetworkMode   string            `json:"networkMode"`
	PortBindings  map[string][]PortBinding `json:"portBindings"`
	RestartPolicy RestartPolicy     `json:"restartPolicy"`
	Privileged    bool              `json:"privileged"`
	ReadonlyRootfs bool             `json:"readonlyRootfs"`
}

// RestartPolicy describes container restart behavior.
type RestartPolicy struct {
	Name              string `json:"name"`
	MaximumRetryCount int    `json:"maximumRetryCount"`
}

// ContainersOverview provides aggregated metrics across all containers.
type ContainersOverview struct {
	TotalContainers   int        `json:"totalContainers"`
	RunningContainers int        `json:"runningContainers"`
	PausedContainers  int        `json:"pausedContainers"`
	StoppedContainers int        `json:"stoppedContainers"`
	TotalImages       int        `json:"totalImages"`
	TotalVolumes      int        `json:"totalVolumes"`
	TotalNetworks     int        `json:"totalNetworks"`
	Engine            EngineType `json:"engine"`
	EngineVersion     string     `json:"engineVersion"`
	EngineAPIVersion  string     `json:"engineApiVersion"`
	TotalCPUPct       float64    `json:"totalCpuPct"`
	TotalMemoryBytes  uint64     `json:"totalMemoryBytes"`
	TotalMemoryLimit  uint64     `json:"totalMemoryLimit"`
}

// ContainerStats represents real-time telemetry from cgroups / engine stats.
type ContainerStats struct {
	ID             string    `json:"id"`
	Timestamp      time.Time `json:"timestamp"`
	CPUPct         float64   `json:"cpuPct"`
	MemoryUsage    uint64    `json:"memoryUsage"`
	MemoryLimit    uint64    `json:"memoryLimit"`
	MemoryPct      float64   `json:"memoryPct"`
	NetworkRxBytes uint64    `json:"networkRxBytes"`
	NetworkTxBytes uint64    `json:"networkTxBytes"`
	BlockReadBytes uint64    `json:"blockReadBytes"`
	BlockWriteBytes uint64   `json:"blockWriteBytes"`
	PIDs           uint64    `json:"pids"`
}

// ImageSummary represents an OCI / Docker image.
type ImageSummary struct {
	ID          string            `json:"id"`
	ParentID    string            `json:"parentId,omitempty"`
	RepoTags    []string          `json:"repoTags"`
	RepoDigests []string          `json:"repoDigests"`
	Created     int64             `json:"created"`
	Size        int64             `json:"size"`
	SharedSize  int64             `json:"sharedSize"`
	VirtualSize int64             `json:"virtualSize"`
	Labels      map[string]string `json:"labels"`
	Containers  int               `json:"containers"`
	InUse       bool              `json:"inUse"`
}

// VolumeSummary represents a persistent container volume.
type VolumeSummary struct {
	Name       string            `json:"name"`
	Driver     string            `json:"driver"`
	Mountpoint string            `json:"mountpoint"`
	CreatedAt  string            `json:"createdAt,omitempty"`
	Labels     map[string]string `json:"labels"`
	Scope      string            `json:"scope"`
	InUse      bool              `json:"inUse"`
	Containers []string          `json:"containers,omitempty"`
	SizeBytes  int64             `json:"sizeBytes,omitempty"`
}

// NetworkSummary represents an OCI network.
type NetworkSummary struct {
	ID         string                 `json:"id"`
	Name       string                 `json:"name"`
	Created    string                 `json:"created,omitempty"`
	Scope      string                 `json:"scope"`
	Driver     string                 `json:"driver"`
	EnableIPv6 bool                   `json:"enableIPv6"`
	Internal   bool                   `json:"internal"`
	Attachable bool                   `json:"attachable"`
	IPAM       NetworkIPAM            `json:"ipam"`
	Containers map[string]EndpointResource `json:"containers,omitempty"`
	Labels     map[string]string      `json:"labels"`
}

// NetworkIPAM holds network IP address management settings.
type NetworkIPAM struct {
	Driver string      `json:"driver"`
	Config []IPAMConfig `json:"config"`
}

// IPAMConfig describes a subnet and gateway configuration.
type IPAMConfig struct {
	Subnet  string `json:"subnet,omitempty"`
	Gateway string `json:"gateway,omitempty"`
}

// EndpointResource holds container attachment metadata on a network.
type EndpointResource struct {
	Name        string `json:"name"`
	EndpointID  string `json:"endpointId"`
	MacAddress  string `json:"macAddress"`
	IPv4Address string `json:"ipv4Address"`
	IPv6Address string `json:"ipv6Address"`
}

// StackSummary represents a Compose project or Podman Pod grouping.
type StackSummary struct {
	Name            string             `json:"name"`
	Type            string             `json:"type"` // compose, pod, standalone
	ContainerCount  int                `json:"containerCount"`
	RunningCount    int                `json:"runningCount"`
	Containers      []ContainerSummary `json:"containers"`
	Created         int64              `json:"created"`
	ConfigFiles     []string           `json:"configFiles,omitempty"`
}

// CreateContainerRequest defines payload for running a new container.
type CreateContainerRequest struct {
	Name          string            `json:"name"`
	Image         string            `json:"image"`
	Cmd           []string          `json:"cmd,omitempty"`
	Entrypoint    []string          `json:"entrypoint,omitempty"`
	Env           []string          `json:"env,omitempty"`
	Ports         []PortMapping     `json:"ports,omitempty"`
	Mounts        []MountPoint      `json:"mounts,omitempty"`
	Network       string            `json:"network,omitempty"`
	RestartPolicy string            `json:"restartPolicy,omitempty"`
	MemoryMB      int64             `json:"memoryMB,omitempty"`
	CPUs          float64           `json:"cpus,omitempty"`
	Privileged    bool              `json:"privileged,omitempty"`
	Labels        map[string]string `json:"labels,omitempty"`
	AutoStart     bool              `json:"autoStart"`
}

// BulkActionRequest defines multi-container action.
type BulkActionRequest struct {
	Action string   `json:"action"` // start, stop, restart, remove
	IDs    []string `json:"ids"`
	Force  bool     `json:"force,omitempty"`
}

// BulkActionResult holds the outcome for a bulk operation.
type BulkActionResult struct {
	Success []string          `json:"success"`
	Failed  map[string]string `json:"failed"` // ID -> error message
}

// ExecOptions specifies options to create an interactive exec session.
type ExecOptions struct {
	Cmd          []string `json:"cmd"`
	User         string   `json:"user,omitempty"`
	WorkingDir   string   `json:"workingDir,omitempty"`
	Privileged   bool     `json:"privileged,omitempty"`
	Tty          bool     `json:"tty"`
	AttachStdin  bool     `json:"attachStdin"`
	AttachStdout bool     `json:"attachStdout"`
	AttachStderr bool     `json:"attachStderr"`
	Env          []string `json:"env,omitempty"`
}

// ExecResizeOptions defines terminal resize parameters.
type ExecResizeOptions struct {
	Height int `json:"h"`
	Width  int `json:"w"`
}

// PullImageProgress represents image pull status frames.
type PullImageProgress struct {
	Status         string `json:"status"`
	Progress       string `json:"progress,omitempty"`
	Current        int64  `json:"current,omitempty"`
	Total          int64  `json:"total,omitempty"`
	ID             string `json:"id,omitempty"`
	Error          string `json:"error,omitempty"`
}
