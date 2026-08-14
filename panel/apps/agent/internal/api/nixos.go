package api

import (
	"encoding/json"
	"net/http"
)

// nixosStatusHandler handles GET /api/v1/nixos/status.
func nixosStatusHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		status, err := d.NixOS.GetStatus(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, status)
	}
}

// nixosGCHandler handles POST /api/v1/nixos/gc.
func nixosGCHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			DeleteOlderThan string `json:"delete_older_than"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)

		res, err := d.NixOS.RunGarbageCollect(r.Context(), req.DeleteOlderThan)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error(), "output": res.Output})
			return
		}
		writeJSON(w, http.StatusOK, res)
	}
}

// nixosOptimiseHandler handles POST /api/v1/nixos/optimise.
func nixosOptimiseHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		res, err := d.NixOS.RunStoreOptimise(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error(), "output": res.Output})
			return
		}
		writeJSON(w, http.StatusOK, res)
	}
}
