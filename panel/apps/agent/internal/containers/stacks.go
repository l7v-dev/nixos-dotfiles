package containers

import (
	"context"
	"sort"
)

// ListStacks groups active and stopped containers by Compose projects and Podman Pods.
func (m *containerManager) ListStacks(ctx context.Context) ([]StackSummary, error) {
	containers, err := m.ListContainers(ctx, true, "")
	if err != nil {
		return nil, err
	}

	stackMap := make(map[string]*StackSummary)

	for _, c := range containers {
		stackName := c.Stack
		stackType := "compose"
		if stackName == "" {
			stackName = "Standalone Containers"
			stackType = "standalone"
		} else if c.Labels["io.kubernetes.pod.name"] != "" {
			stackType = "pod"
		}

		s, exists := stackMap[stackName]
		if !exists {
			s = &StackSummary{
				Name:       stackName,
				Type:       stackType,
				Containers: make([]ContainerSummary, 0),
			}
			stackMap[stackName] = s
		}

		s.ContainerCount++
		if c.State == StateRunning {
			s.RunningCount++
		}
		if s.Created == 0 || c.Created < s.Created {
			s.Created = c.Created
		}
		s.Containers = append(s.Containers, c)
	}

	results := make([]StackSummary, 0, len(stackMap))
	for _, s := range stackMap {
		results = append(results, *s)
	}

	// Sort stacks: Named Compose/Pods first, Standalone last
	sort.Slice(results, func(i, j int) bool {
		if results[i].Type == "standalone" {
			return false
		}
		if results[j].Type == "standalone" {
			return true
		}
		return results[i].Name < results[j].Name
	})

	return results, nil
}
