package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/l7v/panel-agent/internal/auth"
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

// securityAuditHandler handles GET /api/v1/security/audit.
func securityAuditHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		report, err := d.Security.GetAuditReport(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, report)
	}
}

// securitySOPSHandler handles GET /api/v1/security/sops.
func securitySOPSHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		report, err := d.Security.GetAuditReport(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, report.SOPSReport)
	}
}

// securitySOPSVerifyHandler handles POST /api/v1/security/sops/verify.
func securitySOPSVerifyHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		report, err := d.Security.VerifySOPS(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, report)
	}
}

// securityFail2banHandler handles GET /api/v1/security/fail2ban.
func securityFail2banHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		st, err := d.Security.GetFail2ban(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, st)
	}
}

type unbanRequest struct {
	Jail string `json:"jail"`
	IP   string `json:"ip"`
}

// securityFail2banUnbanHandler handles POST /api/v1/security/fail2ban/unban.
func securityFail2banUnbanHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req unbanRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "geçersiz JSON gövdesi"})
			return
		}

		if req.Jail == "" || req.IP == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "jail ve ip parametreleri zorunludur"})
			return
		}

		if err := d.Security.UnbanIP(r.Context(), req.Jail, req.IP); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"status":  "unbanned",
			"jail":    req.Jail,
			"ip":      req.IP,
			"message": "IP adresi jail listesinden başarıyla kaldırıldı",
		})
	}
}

// securitySecretsHandler handles GET /api/v1/security/secrets.
func securitySecretsHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		secrets, err := d.Security.GetSecretsInventory(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"secrets": secrets,
			"total":   len(secrets),
		})
	}
}

type banRequest struct {
	Jail string `json:"jail"`
	IP   string `json:"ip"`
}

// securityFail2banBanHandler handles POST /api/v1/security/fail2ban/ban.
func securityFail2banBanHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req banRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "geçersiz JSON gövdesi"})
			return
		}

		if req.Jail == "" || req.IP == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "jail ve ip parametreleri zorunludur"})
			return
		}

		if err := d.Security.BanIP(r.Context(), req.Jail, req.IP); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"status":  "banned",
			"jail":    req.Jail,
			"ip":      req.IP,
			"message": "IP adresi jail listesine başarıyla eklendi",
		})
	}
}

func extractToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}
	if tok := r.Header.Get("X-Panel-Token"); tok != "" {
		return tok
	}
	if cookie, err := r.Cookie("panel_session"); err == nil {
		return cookie.Value
	}
	return ""
}

// authStatusHandler handles GET /api/v1/auth/status.
func authStatusHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Auth == nil {
			writeJSON(w, http.StatusOK, map[string]any{
				"auth_enabled":   false,
				"active_session": true,
			})
			return
		}
		tok := extractToken(r)
		status := d.Auth.GetStatus(tok)
		writeJSON(w, http.StatusOK, status)
	}
}

type loginRequest struct {
	PIN      string `json:"pin"`
	Password string `json:"password"`
}

// authLoginHandler handles POST /api/v1/auth/login.
func authLoginHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Auth == nil {
			writeJSON(w, http.StatusOK, map[string]any{"token": "no-auth-required"})
			return
		}

		var req loginRequest
		_ = json.NewDecoder(r.Body).Decode(&req)

		clientIP := r.RemoteAddr
		sess, err := d.Auth.Login(req.PIN, req.Password, clientIP)
		if err != nil {
			if errors.Is(err, auth.ErrLockedOut) {
				w.Header().Set("Retry-After", "300")
				writeError(w, http.StatusTooManyRequests, map[string]string{"message": err.Error()})
				return
			}
			writeError(w, http.StatusUnauthorized, map[string]string{"message": err.Error()})
			return
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "panel_session",
			Value:    sess.Token,
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
			Expires:  sess.ExpiresAt,
		})

		writeJSON(w, http.StatusOK, sess)
	}
}

// authLogoutHandler handles POST /api/v1/auth/logout.
func authLogoutHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Auth != nil {
			tok := extractToken(r)
			d.Auth.Logout(tok)
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "panel_session",
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			MaxAge:   -1,
		})

		writeJSON(w, http.StatusOK, map[string]string{"status": "logged_out"})
	}
}

// authVerifyHandler handles POST /api/v1/auth/verify.
func authVerifyHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Auth == nil {
			writeJSON(w, http.StatusOK, map[string]bool{"valid": true})
			return
		}

		tok := extractToken(r)
		valid := d.Auth.Verify(tok)
		if !valid {
			writeError(w, http.StatusUnauthorized, map[string]string{"message": "oturum süresi dolmuş veya geçersiz"})
			return
		}

		writeJSON(w, http.StatusOK, map[string]bool{"valid": true})
	}
}
