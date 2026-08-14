package api

import (
	"encoding/json"
	"net/http"
)

// storageRemovableHandler handles GET /api/v1/storage/removable.
func storageRemovableHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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
