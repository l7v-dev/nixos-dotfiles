package api

import (
	"encoding/json"
	"net/http"
)

// displayStatusHandler handles GET /api/v1/display/status.
func displayStatusHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		status, err := d.Display.GetStatus(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, status)
	}
}

// displayBrightnessHandler handles POST /api/v1/display/brightness.
func displayBrightnessHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Percent int `json:"percent"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "invalid json"})
			return
		}
		if err := d.Display.SetBrightness(r.Context(), req.Percent); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "brightness_pct": req.Percent})
	}
}

// displayNightLightHandler handles POST /api/v1/display/nightlight.
func displayNightLightHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Enabled     bool `json:"enabled"`
			Temperature int  `json:"temperature"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "invalid json"})
			return
		}
		if err := d.Display.SetNightLight(r.Context(), req.Enabled, req.Temperature); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "enabled": req.Enabled, "temperature": req.Temperature})
	}
}

// displayLockHandler handles POST /api/v1/display/lock.
func displayLockHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := d.Display.LockSession(r.Context()); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "locked"})
	}
}
