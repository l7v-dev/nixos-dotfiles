package api

import (
	"encoding/json"
	"net/http"
)

// healthHandler handles GET /api/v1/health.
// Returns 200 {"status":"ok","version":"<ver>"} when D-Bus connections are healthy,
// 503 {"status":"degraded","message":"..."} otherwise.
func healthHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		if err := d.Systemd.HealthCheck(ctx); err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"status":  "degraded",
				"message": "systemd D-Bus unavailable: " + err.Error(),
			})
			return
		}

		if err := d.Logind.HealthCheck(ctx); err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"status":  "degraded",
				"message": "logind D-Bus unavailable: " + err.Error(),
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{ //nolint:errcheck
			"status":  "ok",
			"version": d.Version,
		})
	}
}
