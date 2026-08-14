package containers

import (
	"context"
	"fmt"
	"net/url"
)

// ListNetworks retrieves all software-defined networks from the container engine.
func (m *containerManager) ListNetworks(ctx context.Context) ([]NetworkSummary, error) {
	path := "/networks"

	var rawList []struct {
		ID         string `json:"Id"`
		Name       string `json:"Name"`
		Created    string `json:"Created"`
		Scope      string `json:"Scope"`
		Driver     string `json:"Driver"`
		EnableIPv6 bool   `json:"EnableIPv6"`
		Internal   bool   `json:"Internal"`
		Attachable bool   `json:"Attachable"`
		IPAM       struct {
			Driver string `json:"Driver"`
			Config []struct {
				Subnet  string `json:"Subnet"`
				Gateway string `json:"Gateway"`
			} `json:"Config"`
		} `json:"IPAM"`
		Containers map[string]struct {
			Name        string `json:"Name"`
			EndpointID  string `json:"EndpointID"`
			MacAddress  string `json:"MacAddress"`
			IPv4Address string `json:"IPv4Address"`
			IPv6Address string `json:"IPv6Address"`
		} `json:"Containers"`
		Labels map[string]string `json:"Labels"`
	}

	if err := m.client.DoJSON(ctx, "GET", path, nil, &rawList); err != nil {
		return nil, fmt.Errorf("list networks: %w", err)
	}

	result := make([]NetworkSummary, 0, len(rawList))
	for _, n := range rawList {
		configs := make([]IPAMConfig, len(n.IPAM.Config))
		for i, c := range n.IPAM.Config {
			configs[i] = IPAMConfig{
				Subnet:  c.Subnet,
				Gateway: c.Gateway,
			}
		}

		containers := make(map[string]EndpointResource)
		for cid, ep := range n.Containers {
			containers[cid] = EndpointResource{
				Name:        ep.Name,
				EndpointID:  ep.EndpointID,
				MacAddress:  ep.MacAddress,
				IPv4Address: ep.IPv4Address,
				IPv6Address: ep.IPv6Address,
			}
		}

		result = append(result, NetworkSummary{
			ID:         n.ID,
			Name:       n.Name,
			Created:    n.Created,
			Scope:      n.Scope,
			Driver:     n.Driver,
			EnableIPv6: n.EnableIPv6,
			Internal:   n.Internal,
			Attachable: n.Attachable,
			Labels:     n.Labels,
			IPAM: NetworkIPAM{
				Driver: n.IPAM.Driver,
				Config: configs,
			},
			Containers: containers,
		})
	}

	return result, nil
}

// CreateNetwork creates a new custom network.
func (m *containerManager) CreateNetwork(ctx context.Context, name, driver, subnet, gateway string, internal bool) (*NetworkSummary, error) {
	if driver == "" {
		driver = "bridge"
	}

	payload := map[string]interface{}{
		"Name":       name,
		"Driver":     driver,
		"Internal":   internal,
		"Attachable": true,
	}

	if subnet != "" || gateway != "" {
		payload["IPAM"] = map[string]interface{}{
			"Driver": "default",
			"Config": []map[string]string{
				{
					"Subnet":  subnet,
					"Gateway": gateway,
				},
			},
		}
	}

	path := "/networks/create"
	var resp struct {
		ID      string `json:"Id"`
		Warning string `json:"Warning"`
	}

	if err := m.client.DoJSON(ctx, "POST", path, payload, &resp); err != nil {
		return nil, fmt.Errorf("create network: %w", err)
	}

	return &NetworkSummary{
		ID:         resp.ID,
		Name:       name,
		Driver:     driver,
		Internal:   internal,
		Attachable: true,
	}, nil
}

// RemoveNetwork deletes a network.
func (m *containerManager) RemoveNetwork(ctx context.Context, id string) error {
	path := fmt.Sprintf("/networks/%s", url.PathEscape(id))
	return m.client.DoJSON(ctx, "DELETE", path, nil, nil)
}

// ConnectNetwork attaches a container to a network.
func (m *containerManager) ConnectNetwork(ctx context.Context, networkID, containerID string) error {
	path := fmt.Sprintf("/networks/%s/connect", url.PathEscape(networkID))
	payload := map[string]string{
		"Container": containerID,
	}
	return m.client.DoJSON(ctx, "POST", path, payload, nil)
}

// DisconnectNetwork detaches a container from a network.
func (m *containerManager) DisconnectNetwork(ctx context.Context, networkID, containerID string, force bool) error {
	path := fmt.Sprintf("/networks/%s/disconnect", url.PathEscape(networkID))
	payload := map[string]interface{}{
		"Container": containerID,
		"Force":     force,
	}
	return m.client.DoJSON(ctx, "POST", path, payload, nil)
}
