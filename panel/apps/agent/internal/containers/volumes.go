package containers

import (
	"context"
	"fmt"
	"net/url"
)

// ListVolumes retrieves all volumes from the container runtime.
func (m *containerManager) ListVolumes(ctx context.Context) ([]VolumeSummary, error) {
	path := "/volumes"

	var resp struct {
		Volumes []struct {
			Name       string            `json:"Name"`
			Driver     string            `json:"Driver"`
			Mountpoint string            `json:"Mountpoint"`
			CreatedAt  string            `json:"CreatedAt"`
			Labels     map[string]string `json:"Labels"`
			Scope      string            `json:"Scope"`
			UsageData  *struct {
				Size     int64 `json:"Size"`
				RefCount int   `json:"RefCount"`
			} `json:"UsageData"`
		} `json:"Volumes"`
		Warnings []string `json:"Warnings"`
	}

	if err := m.client.DoJSON(ctx, "GET", path, nil, &resp); err != nil {
		return nil, fmt.Errorf("list volumes: %w", err)
	}

	// Fetch containers to cross-reference volume in-use status
	containers, _ := m.ListContainers(ctx, true, "")
	volContainerMap := make(map[string][]string)
	for _, c := range containers {
		for _, mt := range c.Mounts {
			if mt.Type == "volume" && mt.Name != "" {
				name := c.ID[:12]
				if len(c.Names) > 0 {
					name = c.Names[0]
				}
				volContainerMap[mt.Name] = append(volContainerMap[mt.Name], name)
			}
		}
	}

	result := make([]VolumeSummary, 0, len(resp.Volumes))
	for _, v := range resp.Volumes {
		attachedContainers := volContainerMap[v.Name]
		var size int64
		if v.UsageData != nil {
			size = v.UsageData.Size
		}

		result = append(result, VolumeSummary{
			Name:       v.Name,
			Driver:     v.Driver,
			Mountpoint: v.Mountpoint,
			CreatedAt:  v.CreatedAt,
			Labels:     v.Labels,
			Scope:      v.Scope,
			InUse:      len(attachedContainers) > 0,
			Containers: attachedContainers,
			SizeBytes:  size,
		})
	}

	return result, nil
}

// CreateVolume creates a new persistent volume.
func (m *containerManager) CreateVolume(ctx context.Context, name, driver string, labels map[string]string) (*VolumeSummary, error) {
	payload := map[string]interface{}{
		"Name":   name,
		"Driver": driver,
		"Labels": labels,
	}
	if driver == "" {
		payload["Driver"] = "local"
	}

	path := "/volumes/create"
	var resp struct {
		Name       string            `json:"Name"`
		Driver     string            `json:"Driver"`
		Mountpoint string            `json:"Mountpoint"`
		CreatedAt  string            `json:"CreatedAt"`
		Labels     map[string]string `json:"Labels"`
		Scope      string            `json:"Scope"`
	}

	if err := m.client.DoJSON(ctx, "POST", path, payload, &resp); err != nil {
		return nil, fmt.Errorf("create volume: %w", err)
	}

	return &VolumeSummary{
		Name:       resp.Name,
		Driver:     resp.Driver,
		Mountpoint: resp.Mountpoint,
		CreatedAt:  resp.CreatedAt,
		Labels:     resp.Labels,
		Scope:      resp.Scope,
		InUse:      false,
	}, nil
}

// RemoveVolume removes a volume by name.
func (m *containerManager) RemoveVolume(ctx context.Context, name string, force bool) error {
	path := fmt.Sprintf("/volumes/%s?force=%t", url.PathEscape(name), force)
	return m.client.DoJSON(ctx, "DELETE", path, nil, nil)
}

// PruneVolumes removes all unused local volumes.
func (m *containerManager) PruneVolumes(ctx context.Context) (int64, []string, error) {
	path := "/volumes/prune"

	var resp struct {
		VolumesDeleted []string `json:"VolumesDeleted"`
		SpaceReclaimed int64    `json:"SpaceReclaimed"`
	}

	if err := m.client.DoJSON(ctx, "POST", path, nil, &resp); err != nil {
		return 0, nil, fmt.Errorf("prune volumes: %w", err)
	}

	return resp.SpaceReclaimed, resp.VolumesDeleted, nil
}
