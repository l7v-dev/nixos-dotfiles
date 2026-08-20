package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/l7v/panel-agent/internal/apps"
	"github.com/l7v/panel-agent/internal/containers"
	"github.com/l7v/panel-agent/internal/terminal"
)

func getContainerManager(d Deps) containers.Manager {
	if d.ContainerManager != nil {
		return d.ContainerManager
	}
	return containers.NewManager("", d.Logger)
}

// listContainersHandler handles GET /api/v1/containers
func listContainersHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		all := r.URL.Query().Get("all") == "1" || r.URL.Query().Get("all") == "true"
		stackFilter := r.URL.Query().Get("stack")

		list, err := mgr.ListContainers(r.Context(), all, stackFilter)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": "failed to list containers: " + err.Error(),
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"containers": list,
			"total":      len(list),
			"engine":     mgr.Engine(),
			"available":  mgr.IsAvailable(),
		})
	}
}

// containerOverviewHandler handles GET /api/v1/containers/summary
func containerOverviewHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		summary, err := mgr.GetOverview(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": "failed to get container overview: " + err.Error(),
			})
			return
		}

		writeJSON(w, http.StatusOK, summary)
	}
}

// getContainerHandler handles GET /api/v1/containers/{id}
func getContainerHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		id := r.PathValue("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "container id is required"})
			return
		}

		detail, err := mgr.GetContainer(r.Context(), id)
		if err != nil {
			writeError(w, http.StatusNotFound, map[string]string{
				"message": fmt.Sprintf("container %s not found: %s", id, err.Error()),
			})
			return
		}

		writeJSON(w, http.StatusOK, detail)
	}
}

func logContainerAudit(d Deps, record apps.AuditRecord) {
	if ctrl := getAppsController(d); ctrl != nil && ctrl.GetAuditLogger() != nil {
		ctrl.GetAuditLogger().Log(record)
	}
}

// createContainerHandler handles POST /api/v1/containers
func createContainerHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)

		var req containers.CreateContainerRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{
				"message": "invalid create container payload: " + err.Error(),
			})
			return
		}

		id, err := mgr.CreateContainer(r.Context(), req)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": "failed to create container: " + err.Error(),
			})
			return
		}

		logContainerAudit(d, apps.AuditRecord{
			AppID:    req.Name,
			Action:   "container_create",
			Status:   "success",
			Message:  fmt.Sprintf("Created container %s (%s)", req.Name, req.Image),
			CallerIP: r.RemoteAddr,
		})

		writeJSON(w, http.StatusCreated, map[string]string{
			"id":      id,
			"message": "container created successfully",
		})
	}
}

// containerActionHandler handles POST /api/v1/containers/{id}/{action}
func containerActionHandler(d Deps, action string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		id := r.PathValue("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "container id is required"})
			return
		}

		var err error
		timeout := 10
		if tStr := r.URL.Query().Get("t"); tStr != "" {
			if tInt, parseErr := strconv.Atoi(tStr); parseErr == nil && tInt > 0 {
				timeout = tInt
			}
		}

		switch strings.ToLower(action) {
		case "start":
			err = mgr.StartContainer(r.Context(), id)
		case "stop":
			err = mgr.StopContainer(r.Context(), id, timeout)
		case "restart":
			err = mgr.RestartContainer(r.Context(), id, timeout)
		case "pause":
			err = mgr.PauseContainer(r.Context(), id)
		case "unpause":
			err = mgr.UnpauseContainer(r.Context(), id)
		case "kill":
			signal := r.URL.Query().Get("signal")
			err = mgr.KillContainer(r.Context(), id, signal)
		default:
			writeError(w, http.StatusBadRequest, map[string]string{
				"message": "unknown action: " + action,
			})
			return
		}

		if err != nil {
			logContainerAudit(d, apps.AuditRecord{
				AppID:    id,
				Action:   "container_" + action,
				Status:   "failed",
				Message:  fmt.Sprintf("Action %s failed on container %s: %s", action, id, err.Error()),
				CallerIP: r.RemoteAddr,
			})
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": fmt.Sprintf("failed to %s container %s: %s", action, id, err.Error()),
			})
			return
		}

		logContainerAudit(d, apps.AuditRecord{
			AppID:    id,
			Action:   "container_" + action,
			Status:   "success",
			Message:  fmt.Sprintf("Action %s performed on container %s", action, id),
			CallerIP: r.RemoteAddr,
		})

		writeJSON(w, http.StatusOK, map[string]string{
			"id":      id,
			"action":  action,
			"message": fmt.Sprintf("container %s %sed successfully", id, action),
		})
	}
}

// removeContainerHandler handles DELETE /api/v1/containers/{id}
func removeContainerHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		id := r.PathValue("id")
		force := r.URL.Query().Get("force") == "1" || r.URL.Query().Get("force") == "true"
		vols := r.URL.Query().Get("volumes") == "1" || r.URL.Query().Get("volumes") == "true"

		if err := mgr.RemoveContainer(r.Context(), id, force, vols); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": fmt.Sprintf("failed to remove container %s: %s", id, err.Error()),
			})
			return
		}

		logContainerAudit(d, apps.AuditRecord{
			AppID:    id,
			Action:   "container_remove",
			Status:   "success",
			Message:  fmt.Sprintf("Removed container %s (force=%t)", id, force),
			CallerIP: r.RemoteAddr,
		})

		writeJSON(w, http.StatusOK, map[string]string{
			"id":      id,
			"message": "container removed successfully",
		})
	}
}

// bulkContainerActionHandler handles POST /api/v1/containers/bulk-action
func bulkContainerActionHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)

		var req containers.BulkActionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{
				"message": "invalid bulk action payload: " + err.Error(),
			})
			return
		}

		result, err := mgr.BulkAction(r.Context(), req)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": "bulk action error: " + err.Error(),
			})
			return
		}

		writeJSON(w, http.StatusOK, result)
	}
}

// containerStatsStreamHandler handles GET /api/v1/containers/{id}/stats (SSE)
func containerStatsStreamHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		id := r.PathValue("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "container id is required"})
			return
		}

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no")

		statsChan := make(chan containers.ContainerStats, 16)
		ctx := r.Context()

		go func() {
			_ = mgr.StreamStats(ctx, id, statsChan)
			close(statsChan)
		}()

		for {
			select {
			case <-ctx.Done():
				return
			case stats, ok := <-statsChan:
				if !ok {
					return
				}
				data, err := json.Marshal(stats)
				if err == nil {
					fmt.Fprintf(w, "data: %s\n\n", data)
					flusher.Flush()
				}
			}
		}
	}
}

// containerLogsStreamHandler handles GET /api/v1/containers/{id}/logs (SSE)
func containerLogsStreamHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		id := r.PathValue("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "container id is required"})
			return
		}

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
			return
		}

		follow := r.URL.Query().Get("follow") != "0" && r.URL.Query().Get("follow") != "false"
		tail := r.URL.Query().Get("tail")
		if tail == "" {
			tail = "200"
		}
		timestamps := r.URL.Query().Get("timestamps") == "1" || r.URL.Query().Get("timestamps") == "true"

		opts := containers.LogStreamOptions{
			Follow:     follow,
			Tail:       tail,
			Timestamps: timestamps,
			Stdout:     true,
			Stderr:     true,
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no")

		logsChan := make(chan containers.LogLine, 64)
		ctx := r.Context()

		go func() {
			_ = mgr.StreamLogs(ctx, id, opts, logsChan)
			close(logsChan)
		}()

		for {
			select {
			case <-ctx.Done():
				return
			case logEntry, ok := <-logsChan:
				if !ok {
					return
				}
				data, err := json.Marshal(logEntry)
				if err == nil {
					fmt.Fprintf(w, "data: %s\n\n", data)
					flusher.Flush()
				}
			}
		}
	}
}

// createContainerExecHandler handles POST /api/v1/containers/{id}/exec
func createContainerExecHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		id := r.PathValue("id")

		var opts containers.ExecOptions
		if err := json.NewDecoder(r.Body).Decode(&opts); err != nil {
			opts = containers.ExecOptions{
				Cmd:          []string{"/bin/sh"},
				Tty:          true,
				AttachStdin:  true,
				AttachStdout: true,
				AttachStderr: true,
			}
		}

		if len(opts.Cmd) == 0 {
			opts.Cmd = []string{"/bin/sh"}
		}
		opts.Tty = true
		opts.AttachStdin = true
		opts.AttachStdout = true
		opts.AttachStderr = true

		execID, err := mgr.CreateExec(r.Context(), id, opts)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": "failed to create exec: " + err.Error(),
			})
			return
		}

		logContainerAudit(d, apps.AuditRecord{
			AppID:    id,
			Action:   "container_exec_start",
			Status:   "success",
			Message:  fmt.Sprintf("Started exec session on container %s (cmd=%v)", id, opts.Cmd),
			CallerIP: r.RemoteAddr,
		})

		writeJSON(w, http.StatusOK, map[string]string{
			"execId": execID,
		})
	}
}

// containerExecWSHandler handles GET /api/v1/containers/exec/{execId}/ws (WebSocket)
func containerExecWSHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		execID := r.PathValue("execId")
		if execID == "" {
			http.Error(w, "execId required", http.StatusBadRequest)
			return
		}

		upgrader := terminal.NewUpgrader(d.AllowedOrigins)
		ws, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			d.Logger.Error("container exec ws upgrade failed", "err", err)
			return
		}

		if err := mgr.StartExecWS(r.Context(), execID, ws); err != nil {
			d.Logger.Warn("container exec session finished", "execId", execID, "err", err)
		}
	}
}

// listImagesHandler handles GET /api/v1/containers/images
func listImagesHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		images, err := mgr.ListImages(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": "failed to list images: " + err.Error(),
			})
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"images": images,
			"total":  len(images),
		})
	}
}

// pullImageHandler handles POST /api/v1/containers/images/pull (SSE)
func pullImageHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		image := r.URL.Query().Get("image")
		if image == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "image query param is required"})
			return
		}

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		progChan := make(chan containers.PullImageProgress, 32)
		ctx := r.Context()

		go func() {
			_ = mgr.PullImage(ctx, image, progChan)
			close(progChan)
		}()

		for {
			select {
			case <-ctx.Done():
				return
			case prog, ok := <-progChan:
				if !ok {
					return
				}
				data, _ := json.Marshal(prog)
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()
			}
		}
	}
}

// removeImageHandler handles DELETE /api/v1/containers/images/{id}
func removeImageHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		id := r.PathValue("id")
		force := r.URL.Query().Get("force") == "1" || r.URL.Query().Get("force") == "true"

		if err := mgr.RemoveImage(r.Context(), id, force); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": fmt.Sprintf("failed to remove image %s: %s", id, err.Error()),
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{
			"id":      id,
			"message": "image removed successfully",
		})
	}
}

// pruneImagesHandler handles POST /api/v1/containers/images/prune
func pruneImagesHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		danglingOnly := r.URL.Query().Get("dangling") != "0" && r.URL.Query().Get("dangling") != "false"

		reclaimed, deleted, err := mgr.PruneImages(r.Context(), danglingOnly)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": "failed to prune images: " + err.Error(),
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"spaceReclaimed": reclaimed,
			"imagesDeleted":  deleted,
		})
	}
}

// listVolumesHandler handles GET /api/v1/containers/volumes
func listVolumesHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		volumes, err := mgr.ListVolumes(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": "failed to list volumes: " + err.Error(),
			})
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"volumes": volumes,
			"total":   len(volumes),
		})
	}
}

// createVolumeHandler handles POST /api/v1/containers/volumes
func createVolumeHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)

		var req struct {
			Name   string            `json:"name"`
			Driver string            `json:"driver"`
			Labels map[string]string `json:"labels"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "invalid volume payload"})
			return
		}

		vol, err := mgr.CreateVolume(r.Context(), req.Name, req.Driver, req.Labels)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": "failed to create volume: " + err.Error(),
			})
			return
		}

		writeJSON(w, http.StatusCreated, vol)
	}
}

// removeVolumeHandler handles DELETE /api/v1/containers/volumes/{name}
func removeVolumeHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		name := r.PathValue("name")
		force := r.URL.Query().Get("force") == "1"

		if err := mgr.RemoveVolume(r.Context(), name, force); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": fmt.Sprintf("failed to remove volume %s: %s", name, err.Error()),
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{
			"name":    name,
			"message": "volume removed successfully",
		})
	}
}

// pruneVolumesHandler handles POST /api/v1/containers/volumes/prune
func pruneVolumesHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		reclaimed, deleted, err := mgr.PruneVolumes(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": "failed to prune volumes: " + err.Error(),
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"spaceReclaimed": reclaimed,
			"volumesDeleted": deleted,
		})
	}
}

// listNetworksHandler handles GET /api/v1/containers/networks
func listNetworksHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		networks, err := mgr.ListNetworks(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": "failed to list networks: " + err.Error(),
			})
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"networks": networks,
			"total":    len(networks),
		})
	}
}

// createNetworkHandler handles POST /api/v1/containers/networks
func createNetworkHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)

		var req struct {
			Name     string `json:"name"`
			Driver   string `json:"driver"`
			Subnet   string `json:"subnet"`
			Gateway  string `json:"gateway"`
			Internal bool   `json:"internal"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "invalid network payload"})
			return
		}

		netSummary, err := mgr.CreateNetwork(r.Context(), req.Name, req.Driver, req.Subnet, req.Gateway, req.Internal)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": "failed to create network: " + err.Error(),
			})
			return
		}

		writeJSON(w, http.StatusCreated, netSummary)
	}
}

// removeNetworkHandler handles DELETE /api/v1/containers/networks/{id}
func removeNetworkHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		id := r.PathValue("id")

		if err := mgr.RemoveNetwork(r.Context(), id); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": fmt.Sprintf("failed to remove network %s: %s", id, err.Error()),
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{
			"id":      id,
			"message": "network removed successfully",
		})
	}
}

// connectNetworkHandler handles POST /api/v1/containers/networks/{id}/connect
func connectNetworkHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		netID := r.PathValue("id")

		var req struct {
			ContainerID string `json:"containerId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ContainerID == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "containerId is required"})
			return
		}

		if err := mgr.ConnectNetwork(r.Context(), netID, req.ContainerID); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": fmt.Sprintf("failed to connect container %s: %s", req.ContainerID, err.Error()),
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"message": "connected successfully"})
	}
}

// disconnectNetworkHandler handles POST /api/v1/containers/networks/{id}/disconnect
func disconnectNetworkHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		netID := r.PathValue("id")

		var req struct {
			ContainerID string `json:"containerId"`
			Force       bool   `json:"force"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ContainerID == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "containerId is required"})
			return
		}

		if err := mgr.DisconnectNetwork(r.Context(), netID, req.ContainerID, req.Force); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": fmt.Sprintf("failed to disconnect container %s: %s", req.ContainerID, err.Error()),
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"message": "disconnected successfully"})
	}
}

// listStacksHandler handles GET /api/v1/containers/stacks
func listStacksHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr := getContainerManager(d)
		stacks, err := mgr.ListStacks(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": "failed to list stacks: " + err.Error(),
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"stacks": stacks,
			"total":  len(stacks),
		})
	}
}
