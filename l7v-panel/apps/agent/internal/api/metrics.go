package api

import (
	"encoding/json"
	"net/http"
)

// metricsHandler handles GET /api/v1/metrics.
// Returns a MetricsSnapshot from procfs with threshold values embedded.
func metricsHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		snapshot, err := d.Procfs.ReadSnapshot(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"message": "failed to read system metrics: " + err.Error(),
			})
			return
		}
		// Embed threshold configuration so the frontend badge classifier
		// can use server-configured values without a separate request.
		snapshot.Thresholds = d.Thresholds

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(snapshot) //nolint:errcheck
	}
}
