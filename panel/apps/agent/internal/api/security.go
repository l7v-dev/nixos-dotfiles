package api

import (
	"net/http"
)

// securityStatusHandler handles GET /api/v1/security/status.
func securityStatusHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		status, err := d.Security.GetStatus(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, status)
	}
}

// securityVPNToggleHandler handles POST /api/v1/security/vpn/toggle.
func securityVPNToggleHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := d.Security.ToggleVPN(r.Context()); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "toggled"})
	}
}
