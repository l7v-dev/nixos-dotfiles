package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/l7v/panel-agent/internal/storage"
)

// storageRemovableHandler handles GET /api/v1/storage/removable.
func storageRemovableHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Storage == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "storage service unavailable"})
			return
		}
		drives, err := d.Storage.GetRemovableDrives(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, drives)
	}
}

// storageUnmountHandler handles POST /api/v1/storage/unmount.
func storageUnmountHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Storage == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "storage service unavailable"})
			return
		}
		var req struct {
			Device string `json:"device"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Device == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "device parameter required"})
			return
		}
		if err := d.Storage.Unmount(r.Context(), req.Device); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "unmounted", "device": req.Device})
	}
}

// storageSnapshotsHandler handles GET /api/v1/storage/snapshots.
func storageSnapshotsHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Storage == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "storage service unavailable"})
			return
		}

		config := r.URL.Query().Get("config")
		if config == "" {
			config = "root"
		}

		configs, _ := d.Storage.ListSnapperConfigs(r.Context())
		snapshots, err := d.Storage.ListSnapperSnapshots(r.Context(), config)
		if err != nil {
			// Return empty list with error status message
			writeJSON(w, http.StatusOK, map[string]interface{}{
				"config":    config,
				"configs":   configs,
				"snapshots": []storage.SnapperSnapshot{},
				"error":     err.Error(),
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"config":    config,
			"configs":   configs,
			"snapshots": snapshots,
			"total":     len(snapshots),
		})
	}
}

// storageCreateSnapshotHandler handles POST /api/v1/storage/snapshots.
func storageCreateSnapshotHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Storage == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "storage service unavailable"})
			return
		}

		var req storage.CreateSnapshotRequest
		if r.Body != nil {
			_ = json.NewDecoder(r.Body).Decode(&req)
		}

		snapshot, err := d.Storage.CreateSnapperSnapshot(r.Context(), req)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusCreated, snapshot)
	}
}

// storageDeleteSnapshotHandler handles DELETE /api/v1/storage/snapshots/{config}/{id}.
func storageDeleteSnapshotHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Storage == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "storage service unavailable"})
			return
		}

		config := r.PathValue("config")
		if config == "" {
			config = "root"
		}
		idStr := r.PathValue("id")
		id, err := strconv.Atoi(idStr)
		if err != nil || id < 1 {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "valid positive snapshot id required"})
			return
		}

		if err := d.Storage.DeleteSnapperSnapshot(r.Context(), config, id); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"status": "deleted",
			"config": config,
			"id":     id,
		})
	}
}

// storageResticStatusHandler handles GET /api/v1/storage/restic/status.
func storageResticStatusHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Storage == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "storage service unavailable"})
			return
		}

		status, err := d.Storage.GetResticStatus(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, status)
	}
}

// storageResticSnapshotsHandler handles GET /api/v1/storage/restic/snapshots.
func storageResticSnapshotsHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Storage == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "storage service unavailable"})
			return
		}

		snapshots, err := d.Storage.ListResticSnapshots(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"snapshots": snapshots,
			"total":     len(snapshots),
		})
	}
}

// storageResticBackupHandler handles POST /api/v1/storage/restic/backup.
func storageResticBackupHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Storage == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "storage service unavailable"})
			return
		}

		if err := d.Storage.TriggerResticBackup(r.Context()); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusAccepted, map[string]string{
			"status":  "triggered",
			"service": "restic-backups-l7v.service",
		})
	}
}
