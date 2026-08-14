package api

import (
	"encoding/json"
	"net/http"
)

// hardwareStatusHandler handles GET /api/v1/hardware/thermals (or /api/v1/hardware/status).
func hardwareStatusHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		status, err := d.Hardware.GetStatus(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, status)
	}
}

// hardwarePowerProfileHandler handles POST /api/v1/hardware/power-profile.
func hardwarePowerProfileHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Profile string `json:"profile"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "invalid json"})
			return
		}
		if err := d.Hardware.SetPowerProfile(r.Context(), req.Profile); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "profile": req.Profile})
	}
}
