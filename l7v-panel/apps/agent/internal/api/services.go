package api

import (
	"encoding/json"
	"net/http"
)

// listServicesHandler handles GET /api/v1/services.
// Returns all systemd units as a JSON array.
func listServicesHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		units, err := d.Systemd.ListUnits(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"message": "failed to list units: " + err.Error(),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(units) //nolint:errcheck
	}
}

// serviceActionHandler handles POST /api/v1/services/{unit}/{action}.
// action is one of: start, stop, enable, disable.
func serviceActionHandler(d Deps, action string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		unit := r.PathValue("unit")
		if unit == "" {
			writeError(w, http.StatusBadRequest, map[string]string{
				"message":   "missing unit name",
				"operation": action,
			})
			return
		}

		var err error
		switch action {
		case "start":
			err = d.Systemd.StartUnit(r.Context(), unit)
		case "stop":
			err = d.Systemd.StopUnit(r.Context(), unit)
		case "enable":
			err = d.Systemd.EnableUnit(r.Context(), unit)
		case "disable":
			err = d.Systemd.DisableUnit(r.Context(), unit)
		default:
			writeError(w, http.StatusBadRequest, map[string]string{
				"message":   "unknown action: " + action,
				"operation": action,
				"unit":      unit,
			})
			return
		}

		if err != nil {
			writeError(w, http.StatusUnprocessableEntity, map[string]string{
				"message":   err.Error(),
				"operation": action,
				"unit":      unit,
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{ //nolint:errcheck
			"unit":   unit,
			"status": action + "ed",
		})
	}
}
