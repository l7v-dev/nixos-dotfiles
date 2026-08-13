package api

import (
	"encoding/json"
	"net/http"
)

// powerHandler handles POST /api/v1/power/{action}.
// action is one of: shutdown, reboot, sleep.
func powerHandler(d Deps, action string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var err error
		switch action {
		case "shutdown":
			err = d.Logind.PowerOff(r.Context())
		case "reboot":
			err = d.Logind.Reboot(r.Context())
		case "sleep":
			err = d.Logind.Suspend(r.Context())
		default:
			writeError(w, http.StatusBadRequest, map[string]string{
				"action":  action,
				"message": "unknown power action: " + action,
			})
			return
		}

		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"action":  action,
				"message": err.Error(),
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{ //nolint:errcheck
			"action": action,
			"status": "initiated",
		})
	}
}
