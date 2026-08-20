package containers

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"
)

// ListContainers retrieves all containers from the OCI engine and annotates them.
func (m *containerManager) ListContainers(ctx context.Context, all bool, stackFilter string) ([]ContainerSummary, error) {
	path := "/containers/json"
	if all {
		path += "?all=1"
	}

	var rawList []struct {
		ID      string            `json:"Id"`
		Names   []string          `json:"Names"`
		Image   string            `json:"Image"`
		ImageID string            `json:"ImageID"`
		Command string            `json:"Command"`
		Created int64             `json:"Created"`
		State   string            `json:"State"`
		Status  string            `json:"Status"`
		Ports   []struct {
			IP          string `json:"IP"`
			PrivatePort uint16 `json:"PrivatePort"`
			PublicPort  uint16 `json:"PublicPort"`
			Type        string `json:"Type"`
		} `json:"Ports"`
		Labels map[string]string `json:"Labels"`
		Mounts []struct {
			Type        string `json:"Type"`
			Name        string `json:"Name"`
			Source      string `json:"Source"`
			Destination string `json:"Destination"`
			Driver      string `json:"Driver"`
			Mode        string `json:"Mode"`
			RW          bool   `json:"RW"`
			Propagation string `json:"Propagation"`
		} `json:"Mounts"`
	}

	if err := m.client.DoJSON(ctx, "GET", path, nil, &rawList); err != nil {
		return nil, fmt.Errorf("list containers: %w", err)
	}

	result := make([]ContainerSummary, 0, len(rawList))
	for _, c := range rawList {
		// Clean leading slashes from names
		names := make([]string, len(c.Names))
		for i, n := range c.Names {
			names[i] = strings.TrimPrefix(n, "/")
		}

		ports := make([]PortMapping, len(c.Ports))
		for i, p := range c.Ports {
			ports[i] = PortMapping{
				IP:          p.IP,
				PrivatePort: p.PrivatePort,
				PublicPort:  p.PublicPort,
				Type:        p.Type,
			}
		}

		mounts := make([]MountPoint, len(c.Mounts))
		for i, mt := range c.Mounts {
			mounts[i] = MountPoint{
				Type:        mt.Type,
				Name:        mt.Name,
				Source:      mt.Source,
				Destination: mt.Destination,
				Driver:      mt.Driver,
				Mode:        mt.Mode,
				RW:          mt.RW,
				Propagation: mt.Propagation,
			}
		}

		// Detect Compose Project or Podman Pod
		stack := c.Labels["com.docker.compose.project"]
		if stack == "" {
			stack = c.Labels["io.podman.compose.project"]
		}
		if stack == "" {
			stack = c.Labels["io.kubernetes.pod.name"]
		}

		if stackFilter != "" && stack != stackFilter {
			continue
		}

		// Check NixOS declarative indicator
		isNixOS := isDeclarativeNixOS(c.Labels, names)

		summary := ContainerSummary{
			ID:          c.ID,
			Names:       names,
			Image:       c.Image,
			ImageID:     c.ImageID,
			Command:     c.Command,
			Created:     c.Created,
			State:       ContainerState(strings.ToLower(c.State)),
			Status:      c.Status,
			Ports:       ports,
			Labels:      c.Labels,
			Mounts:      mounts,
			Stack:       stack,
			IsNixOS:     isNixOS,
			Engine:      m.client.Engine(),
		}
		result = append(result, summary)
	}

	return result, nil
}

// GetContainer returns detailed inspect data for a single container.
func (m *containerManager) GetContainer(ctx context.Context, id string) (*ContainerDetail, error) {
	path := fmt.Sprintf("/containers/%s/json", url.PathEscape(id))

	var raw struct {
		ID      string `json:"Id"`
		Created string `json:"Created"`
		Path    string `json:"Path"`
		Args    []string `json:"Args"`
		State   struct {
			Status     string `json:"Status"`
			Running    bool   `json:"Running"`
			Paused     bool   `json:"Paused"`
			Restarting bool   `json:"Restarting"`
			OOMKilled  bool   `json:"OOMKilled"`
			Dead       bool   `json:"Dead"`
			Pid        int    `json:"Pid"`
			ExitCode   int    `json:"ExitCode"`
			Error      string `json:"Error"`
			StartedAt  string `json:"StartedAt"`
			FinishedAt string `json:"FinishedAt"`
			Health     *struct {
				Status        string `json:"Status"`
				FailingStreak int    `json:"FailingStreak"`
			} `json:"Health"`
		} `json:"State"`
		Image           string `json:"Image"`
		ImageID         string `json:"ImageID"`
		Name            string `json:"Name"`
		RestartCount    int    `json:"RestartCount"`
		Driver          string `json:"Driver"`
		Platform        string `json:"Platform"`
		Mounts          []struct {
			Type        string `json:"Type"`
			Name        string `json:"Name"`
			Source      string `json:"Source"`
			Destination string `json:"Destination"`
			Driver      string `json:"Driver"`
			Mode        string `json:"Mode"`
			RW          bool   `json:"RW"`
			Propagation string `json:"Propagation"`
		} `json:"Mounts"`
		Config struct {
			Hostname     string              `json:"Hostname"`
			Domainname   string              `json:"Domainname"`
			User         string              `json:"User"`
			Env          []string            `json:"Env"`
			Cmd          []string            `json:"Cmd"`
			Entrypoint   []string            `json:"Entrypoint"`
			Image        string              `json:"Image"`
			WorkingDir   string              `json:"WorkingDir"`
			Labels       map[string]string   `json:"Labels"`
			ExposedPorts map[string]struct{} `json:"ExposedPorts"`
		} `json:"Config"`
		NetworkSettings struct {
			IPAddress   string `json:"IPAddress"`
			Gateway     string `json:"Gateway"`
			MacAddress  string `json:"MacAddress"`
			Bridge      string `json:"Bridge"`
			Ports       map[string][]struct {
				HostIP   string `json:"HostIp"`
				HostPort string `json:"HostPort"`
			} `json:"Ports"`
			Networks map[string]struct {
				NetworkID  string `json:"NetworkID"`
				IPAddress  string `json:"IPAddress"`
				Gateway    string `json:"Gateway"`
				MacAddress string `json:"MacAddress"`
			} `json:"Networks"`
		} `json:"NetworkSettings"`
		HostConfig struct {
			Memory        int64  `json:"Memory"`
			NanoCPUs      int64  `json:"NanoCpus"`
			CPUShares     int64  `json:"CpuShares"`
			AutoRemove    bool   `json:"AutoRemove"`
			NetworkMode   string `json:"NetworkMode"`
			PortBindings  map[string][]struct {
				HostIP   string `json:"HostIp"`
				HostPort string `json:"HostPort"`
			} `json:"PortBindings"`
			RestartPolicy struct {
				Name              string `json:"Name"`
				MaximumRetryCount int    `json:"MaximumRetryCount"`
			} `json:"RestartPolicy"`
			Privileged     bool `json:"Privileged"`
			ReadonlyRootfs bool `json:"ReadonlyRootfs"`
		} `json:"HostConfig"`
	}

	if err := m.client.DoJSON(ctx, "GET", path, nil, &raw); err != nil {
		return nil, fmt.Errorf("inspect container %s: %w", id, err)
	}

	createdAt, _ := time.Parse(time.RFC3339Nano, raw.Created)
	startedAt, _ := time.Parse(time.RFC3339Nano, raw.State.StartedAt)
	finishedAt, _ := time.Parse(time.RFC3339Nano, raw.State.FinishedAt)

	mounts := make([]MountPoint, len(raw.Mounts))
	for i, mt := range raw.Mounts {
		mounts[i] = MountPoint{
			Type:        mt.Type,
			Name:        mt.Name,
			Source:      mt.Source,
			Destination: mt.Destination,
			Driver:      mt.Driver,
			Mode:        mt.Mode,
			RW:          mt.RW,
			Propagation: mt.Propagation,
		}
	}

	ports := make(map[string][]PortBinding)
	for p, bindings := range raw.NetworkSettings.Ports {
		pbList := make([]PortBinding, len(bindings))
		for i, b := range bindings {
			pbList[i] = PortBinding{HostIP: b.HostIP, HostPort: b.HostPort}
		}
		ports[p] = pbList
	}

	hostPortBindings := make(map[string][]PortBinding)
	for p, bindings := range raw.HostConfig.PortBindings {
		pbList := make([]PortBinding, len(bindings))
		for i, b := range bindings {
			pbList[i] = PortBinding{HostIP: b.HostIP, HostPort: b.HostPort}
		}
		hostPortBindings[p] = pbList
	}

	networks := make(map[string]ContainerNetwork)
	for nName, netData := range raw.NetworkSettings.Networks {
		networks[nName] = ContainerNetwork{
			NetworkID:  netData.NetworkID,
			IPAddress:  netData.IPAddress,
			Gateway:    netData.Gateway,
			MacAddress: netData.MacAddress,
		}
	}

	stack := raw.Config.Labels["com.docker.compose.project"]
	if stack == "" {
		stack = raw.Config.Labels["io.podman.compose.project"]
	}

	cleanName := strings.TrimPrefix(raw.Name, "/")
	isNixOS := isDeclarativeNixOS(raw.Config.Labels, []string{cleanName})

	var health *Health
	if raw.State.Health != nil {
		health = &Health{
			Status:        raw.State.Health.Status,
			FailingStreak: raw.State.Health.FailingStreak,
		}
	}

	detail := &ContainerDetail{
		ID:           raw.ID,
		Created:      createdAt,
		Path:         raw.Path,
		Args:         raw.Args,
		Image:        raw.Image,
		ImageID:      raw.ImageID,
		Name:         cleanName,
		RestartCount: raw.RestartCount,
		Driver:       raw.Driver,
		Platform:     raw.Platform,
		Mounts:       mounts,
		IsNixOS:      isNixOS,
		Stack:        stack,
		Engine:       m.client.Engine(),
		State: ContainerStateInfo{
			Status:     raw.State.Status,
			Running:    raw.State.Running,
			Paused:     raw.State.Paused,
			Restarting: raw.State.Restarting,
			OOMKilled:  raw.State.OOMKilled,
			Dead:       raw.State.Dead,
			Pid:        raw.State.Pid,
			ExitCode:   raw.State.ExitCode,
			Error:      raw.State.Error,
			StartedAt:  startedAt,
			FinishedAt: finishedAt,
			Health:     health,
		},
		Config: ContainerConfig{
			Hostname:     raw.Config.Hostname,
			Domainname:   raw.Config.Domainname,
			User:         raw.Config.User,
			Env:          raw.Config.Env,
			Cmd:          raw.Config.Cmd,
			Entrypoint:   raw.Config.Entrypoint,
			Image:        raw.Config.Image,
			WorkingDir:   raw.Config.WorkingDir,
			Labels:       raw.Config.Labels,
			ExposedPorts: raw.Config.ExposedPorts,
		},
		NetworkSettings: NetworkSettings{
			IPAddress:  raw.NetworkSettings.IPAddress,
			Gateway:    raw.NetworkSettings.Gateway,
			MacAddress: raw.NetworkSettings.MacAddress,
			Bridge:     raw.NetworkSettings.Bridge,
			Ports:      ports,
			Networks:   networks,
		},
		HostConfig: HostConfig{
			Memory:        raw.HostConfig.Memory,
			NanoCPUs:      raw.HostConfig.NanoCPUs,
			CPUShares:     raw.HostConfig.CPUShares,
			AutoRemove:    raw.HostConfig.AutoRemove,
			NetworkMode:   raw.HostConfig.NetworkMode,
			PortBindings:  hostPortBindings,
			Privileged:    raw.HostConfig.Privileged,
			ReadonlyRootfs: raw.HostConfig.ReadonlyRootfs,
			RestartPolicy: RestartPolicy{
				Name:              raw.HostConfig.RestartPolicy.Name,
				MaximumRetryCount: raw.HostConfig.RestartPolicy.MaximumRetryCount,
			},
		},
	}

	return detail, nil
}

// StartContainer sends a start command.
func (m *containerManager) StartContainer(ctx context.Context, id string) error {
	path := fmt.Sprintf("/containers/%s/start", url.PathEscape(id))
	return m.client.DoJSON(ctx, "POST", path, nil, nil)
}

// StopContainer stops a container with graceful timeout.
func (m *containerManager) StopContainer(ctx context.Context, id string, timeoutSeconds int) error {
	if timeoutSeconds <= 0 {
		timeoutSeconds = 10
	}
	path := fmt.Sprintf("/containers/%s/stop?t=%d", url.PathEscape(id), timeoutSeconds)
	return m.client.DoJSON(ctx, "POST", path, nil, nil)
}

// RestartContainer restarts a container.
func (m *containerManager) RestartContainer(ctx context.Context, id string, timeoutSeconds int) error {
	if timeoutSeconds <= 0 {
		timeoutSeconds = 10
	}
	path := fmt.Sprintf("/containers/%s/restart?t=%d", url.PathEscape(id), timeoutSeconds)
	return m.client.DoJSON(ctx, "POST", path, nil, nil)
}

// PauseContainer pauses processes in container.
func (m *containerManager) PauseContainer(ctx context.Context, id string) error {
	path := fmt.Sprintf("/containers/%s/pause", url.PathEscape(id))
	return m.client.DoJSON(ctx, "POST", path, nil, nil)
}

// UnpauseContainer resumes processes in container.
func (m *containerManager) UnpauseContainer(ctx context.Context, id string) error {
	path := fmt.Sprintf("/containers/%s/unpause", url.PathEscape(id))
	return m.client.DoJSON(ctx, "POST", path, nil, nil)
}

// KillContainer sends a termination signal to container.
func (m *containerManager) KillContainer(ctx context.Context, id string, signal string) error {
	if signal == "" {
		signal = "SIGKILL"
	}
	path := fmt.Sprintf("/containers/%s/kill?signal=%s", url.PathEscape(id), url.QueryEscape(signal))
	return m.client.DoJSON(ctx, "POST", path, nil, nil)
}

// RemoveContainer deletes a container.
func (m *containerManager) RemoveContainer(ctx context.Context, id string, force, removeVolumes bool) error {
	path := fmt.Sprintf("/containers/%s?v=%t&force=%t", url.PathEscape(id), removeVolumes, force)
	return m.client.DoJSON(ctx, "DELETE", path, nil, nil)
}

// CreateContainer creates and optionally starts a new container.
func (m *containerManager) CreateContainer(ctx context.Context, req CreateContainerRequest) (string, error) {
	if req.Image == "" {
		return "", fmt.Errorf("container image is required")
	}

	createPayload := map[string]interface{}{
		"Image": req.Image,
		"Env":   req.Env,
	}
	if len(req.Cmd) > 0 {
		createPayload["Cmd"] = req.Cmd
	}
	if len(req.Entrypoint) > 0 {
		createPayload["Entrypoint"] = req.Entrypoint
	}
	if len(req.Labels) > 0 {
		createPayload["Labels"] = req.Labels
	}

	// Exposed Ports & Port Bindings
	exposedPorts := make(map[string]struct{})
	portBindings := make(map[string][]map[string]string)
	for _, p := range req.Ports {
		proto := strings.ToLower(p.Type)
		if proto == "" {
			proto = "tcp"
		}
		portKey := fmt.Sprintf("%d/%s", p.PrivatePort, proto)
		exposedPorts[portKey] = struct{}{}
		if p.PublicPort > 0 {
			portBindings[portKey] = []map[string]string{
				{
					"HostIp":   p.IP,
					"HostPort": fmt.Sprintf("%d", p.PublicPort),
				},
			}
		}
	}
	createPayload["ExposedPorts"] = exposedPorts

	// HostConfig
	hostConfig := map[string]interface{}{
		"PortBindings": portBindings,
		"Privileged":   req.Privileged,
	}

	if req.MemoryMB > 0 {
		hostConfig["Memory"] = req.MemoryMB * 1024 * 1024
	}
	if req.CPUs > 0 {
		hostConfig["NanoCpus"] = int64(req.CPUs * 1e9)
	}

	if req.RestartPolicy != "" {
		hostConfig["RestartPolicy"] = map[string]string{
			"Name": req.RestartPolicy,
		}
	}

	if req.Network != "" {
		hostConfig["NetworkMode"] = req.Network
	}

	// Mounts / Binds
	var binds []string
	for _, mt := range req.Mounts {
		mode := "rw"
		if !mt.RW {
			mode = "ro"
		}
		binds = append(binds, fmt.Sprintf("%s:%s:%s", mt.Source, mt.Destination, mode))
	}
	if len(binds) > 0 {
		hostConfig["Binds"] = binds
	}

	createPayload["HostConfig"] = hostConfig

	path := "/containers/create"
	if req.Name != "" {
		path += "?name=" + url.QueryEscape(req.Name)
	}

	var resp struct {
		ID       string   `json:"Id"`
		Warnings []string `json:"Warnings"`
	}

	if err := m.client.DoJSON(ctx, "POST", path, createPayload, &resp); err != nil {
		return "", fmt.Errorf("create container: %w", err)
	}

	if req.AutoStart {
		if err := m.StartContainer(ctx, resp.ID); err != nil {
			return resp.ID, fmt.Errorf("container created (%s) but failed to start: %w", resp.ID[:12], err)
		}
	}

	return resp.ID, nil
}

// BulkAction executes start/stop/restart/remove on multiple containers.
func (m *containerManager) BulkAction(ctx context.Context, req BulkActionRequest) (BulkActionResult, error) {
	result := BulkActionResult{
		Success: make([]string, 0),
		Failed:  make(map[string]string),
	}

	for _, id := range req.IDs {
		var err error
		switch strings.ToLower(req.Action) {
		case "start":
			err = m.StartContainer(ctx, id)
		case "stop":
			err = m.StopContainer(ctx, id, 10)
		case "restart":
			err = m.RestartContainer(ctx, id, 10)
		case "pause":
			err = m.PauseContainer(ctx, id)
		case "unpause":
			err = m.UnpauseContainer(ctx, id)
		case "remove", "delete":
			err = m.RemoveContainer(ctx, id, req.Force, false)
		default:
			err = fmt.Errorf("unsupported action: %s", req.Action)
		}

		if err != nil {
			result.Failed[id] = err.Error()
		} else {
			result.Success = append(result.Success, id)
		}
	}

	return result, nil
}

// GetOverview aggregates count and metrics across the container runtime.
func (m *containerManager) GetOverview(ctx context.Context) (*ContainersOverview, error) {
	containers, err := m.ListContainers(ctx, true, "")
	if err != nil {
		return nil, err
	}

	overview := &ContainersOverview{
		TotalContainers: len(containers),
		Engine:          m.client.Engine(),
	}

	engineType, ver, apiVer, _ := m.client.Ping(ctx)
	overview.Engine = engineType
	overview.EngineVersion = ver
	overview.EngineAPIVersion = apiVer

	for _, c := range containers {
		switch c.State {
		case StateRunning:
			overview.RunningContainers++
		case StatePaused:
			overview.PausedContainers++
		default:
			overview.StoppedContainers++
		}
	}

	// Fetch image, volume, and network counts
	if images, err := m.ListImages(ctx); err == nil {
		overview.TotalImages = len(images)
	}
	if volumes, err := m.ListVolumes(ctx); err == nil {
		overview.TotalVolumes = len(volumes)
	}
	if networks, err := m.ListNetworks(ctx); err == nil {
		overview.TotalNetworks = len(networks)
	}

	return overview, nil
}

// isDeclarativeNixOS returns true if the container is managed declaratively by NixOS.
func isDeclarativeNixOS(labels map[string]string, names []string) bool {
	if labels != nil {
		if labels["nixos.declarative"] == "true" ||
			labels["io.nixos.managed"] == "true" ||
			labels["io.nixos.systemd.unit"] != "" {
			return true
		}
	}
	for _, n := range names {
		if strings.HasPrefix(n, "podman-") || strings.HasPrefix(n, "docker-") {
			return true
		}
	}
	return false
}
