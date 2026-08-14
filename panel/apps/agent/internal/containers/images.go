package containers

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
)

// ListImages returns all images available locally.
func (m *containerManager) ListImages(ctx context.Context) ([]ImageSummary, error) {
	path := "/images/json"

	var rawList []struct {
		ID          string            `json:"Id"`
		ParentID    string            `json:"ParentId"`
		RepoTags    []string          `json:"RepoTags"`
		RepoDigests []string          `json:"RepoDigests"`
		Created     int64             `json:"Created"`
		Size        int64             `json:"Size"`
		SharedSize  int64             `json:"SharedSize"`
		VirtualSize int64             `json:"VirtualSize"`
		Labels      map[string]string `json:"Labels"`
		Containers  int               `json:"Containers"`
	}

	if err := m.client.DoJSON(ctx, "GET", path, nil, &rawList); err != nil {
		return nil, fmt.Errorf("list images: %w", err)
	}

	result := make([]ImageSummary, 0, len(rawList))
	for _, img := range rawList {
		// Clean image ID
		cleanID := strings.TrimPrefix(img.ID, "sha256:")
		if len(cleanID) > 12 {
			cleanID = cleanID[:12]
		}

		tags := img.RepoTags
		if len(tags) == 0 {
			tags = []string{"<none>:<none>"}
		}

		result = append(result, ImageSummary{
			ID:          cleanID,
			ParentID:    img.ParentID,
			RepoTags:    tags,
			RepoDigests: img.RepoDigests,
			Created:     img.Created,
			Size:        img.Size,
			SharedSize:  img.SharedSize,
			VirtualSize: img.VirtualSize,
			Labels:      img.Labels,
			Containers:  img.Containers,
			InUse:       img.Containers > 0,
		})
	}

	return result, nil
}

// InspectImage returns full inspect metadata for an image.
func (m *containerManager) InspectImage(ctx context.Context, id string) (map[string]interface{}, error) {
	path := fmt.Sprintf("/images/%s/json", url.PathEscape(id))
	var inspect map[string]interface{}
	if err := m.client.DoJSON(ctx, "GET", path, nil, &inspect); err != nil {
		return nil, fmt.Errorf("inspect image %s: %w", id, err)
	}
	return inspect, nil
}

// PullImage pulls an image from a registry, streaming progress updates.
func (m *containerManager) PullImage(ctx context.Context, image string, out chan<- PullImageProgress) error {
	path := fmt.Sprintf("/images/create?fromImage=%s", url.QueryEscape(image))

	resp, err := m.client.DoRequest(ctx, "POST", path, nil)
	if err != nil {
		return fmt.Errorf("pull image request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("engine returned status %d for pull", resp.StatusCode)
	}

	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		line := scanner.Text()
		var frame struct {
			Status          string `json:"status"`
			Progress        string `json:"progress"`
			ProgressDetail  struct {
				Current int64 `json:"current"`
				Total   int64 `json:"total"`
			} `json:"progressDetail"`
			ID    string `json:"id"`
			Error string `json:"error"`
		}

		if err := json.Unmarshal([]byte(line), &frame); err == nil {
			prog := PullImageProgress{
				Status:   frame.Status,
				Progress: frame.Progress,
				Current:  frame.ProgressDetail.Current,
				Total:    frame.ProgressDetail.Total,
				ID:       frame.ID,
				Error:    frame.Error,
			}
			select {
			case out <- prog:
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}

	return scanner.Err()
}

// RemoveImage removes an image by ID or name.
func (m *containerManager) RemoveImage(ctx context.Context, id string, force bool) error {
	path := fmt.Sprintf("/images/%s?force=%t", url.PathEscape(id), force)
	return m.client.DoJSON(ctx, "DELETE", path, nil, nil)
}

// PruneImages cleans unused or dangling images.
func (m *containerManager) PruneImages(ctx context.Context, danglingOnly bool) (int64, []string, error) {
	filterVal := "true"
	if !danglingOnly {
		filterVal = "false"
	}
	path := fmt.Sprintf("/images/prune?filters=%s", url.QueryEscape(fmt.Sprintf(`{"dangling":["%s"]}`, filterVal)))

	var resp struct {
		ImagesDeleted []struct {
			Untagged string `json:"Untagged"`
			Deleted  string `json:"Deleted"`
		} `json:"ImagesDeleted"`
		SpaceReclaimed int64 `json:"SpaceReclaimed"`
	}

	if err := m.client.DoJSON(ctx, "POST", path, nil, &resp); err != nil {
		return 0, nil, fmt.Errorf("prune images: %w", err)
	}

	deleted := make([]string, 0, len(resp.ImagesDeleted))
	for _, img := range resp.ImagesDeleted {
		if img.Deleted != "" {
			deleted = append(deleted, img.Deleted)
		} else if img.Untagged != "" {
			deleted = append(deleted, img.Untagged)
		}
	}

	return resp.SpaceReclaimed, deleted, nil
}
