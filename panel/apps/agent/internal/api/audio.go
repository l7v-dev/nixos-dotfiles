package api

import (
	"encoding/json"
	"net/http"
)

// audioStatusHandler handles GET /api/v1/audio/status.
func audioStatusHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		status, err := d.Audio.GetStatus(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, status)
	}
}

// audioVolumeHandler handles POST /api/v1/audio/volume.
func audioVolumeHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Target string `json:"target"` // "sink" or "source"
			Volume int    `json:"volume"` // 0-150
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "invalid json"})
			return
		}
		if err := d.Audio.SetVolume(r.Context(), req.Target, req.Volume); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "volume": req.Volume})
	}
}

// audioMuteHandler handles POST /api/v1/audio/mute.
func audioMuteHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Target string `json:"target"` // "sink" or "source"
			Muted  bool   `json:"muted"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "invalid json"})
			return
		}
		if err := d.Audio.SetMute(r.Context(), req.Target, req.Muted); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "muted": req.Muted})
	}
}

// audioDefaultDeviceHandler handles POST /api/v1/audio/default.
func audioDefaultDeviceHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Target string `json:"target"` // "sink" or "source"
			ID     string `json:"id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "invalid json"})
			return
		}
		if err := d.Audio.SetDefault(r.Context(), req.Target, req.ID); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "default_id": req.ID})
	}
}
