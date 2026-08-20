package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/l7v/panel-agent/internal/auth"
	"github.com/l7v/panel-agent/internal/security"
)

type mockSecurityClient struct {
	status  *security.Status
	audit   *security.SecurityAuditReport
	secrets []security.SecretMetadata
}

func (m *mockSecurityClient) GetStatus(ctx context.Context) (*security.Status, error) {
	return m.status, nil
}

func (m *mockSecurityClient) ToggleVPN(ctx context.Context) error {
	m.status.VPN.Active = !m.status.VPN.Active
	return nil
}

func (m *mockSecurityClient) GetAuditReport(ctx context.Context) (*security.SecurityAuditReport, error) {
	return m.audit, nil
}

func (m *mockSecurityClient) VerifySOPS(ctx context.Context) (*security.SOPSAuditReport, error) {
	return &m.audit.SOPSReport, nil
}

func (m *mockSecurityClient) GetSecretsInventory(ctx context.Context) ([]security.SecretMetadata, error) {
	return m.secrets, nil
}

func (m *mockSecurityClient) GetFail2ban(ctx context.Context) (*security.Fail2banStatus, error) {
	return &m.audit.Fail2ban, nil
}

func (m *mockSecurityClient) UnbanIP(ctx context.Context, jail string, ip string) error {
	return nil
}

func (m *mockSecurityClient) BanIP(ctx context.Context, jail string, ip string) error {
	return nil
}

func TestSecurityAndAuthEndpoints(t *testing.T) {
	t.Setenv("PANEL_AUTH_PIN", "1707")
	t.Setenv("PANEL_AUTH_PASSWORD", "")

	mockSec := &mockSecurityClient{
		status: &security.Status{
			VPN: security.VPNTunnel{
				Type:   "tailscale",
				Active: true,
				Status: "connected",
			},
			OpenPorts:  []security.OpenPort{{Port: 22, Protocol: "tcp"}},
			FirewallOn: true,
		},
		audit: &security.SecurityAuditReport{
			Score:          95,
			Grade:          "A+",
			FirewallActive: true,
			VPNActive:      true,
			SOPSReport: security.SOPSAuditReport{
				KeyFileExists:    true,
				RegisteredInSops: true,
				DecryptionOk:     true,
				LastTestedAt:     time.Now(),
			},
			Fail2ban: security.Fail2banStatus{
				Enabled:     true,
				ActiveJails: 1,
				Jails: []security.Fail2banJailInfo{
					{Name: "sshd", CurrentlyBanned: 1, BannedIPs: []string{"192.168.1.50"}},
				},
			},
			OpenPorts: []security.PortAuditItem{
				{Port: 22, Exposure: security.ExposureLocalhost, Protocol: "tcp"},
			},
		},
		secrets: []security.SecretMetadata{
			{Key: "backup/restic_password", Category: "backup", AssociatedApp: "restic", Encrypted: true},
			{Key: "forgejo/admin_password", Category: "forgejo", AssociatedApp: "forgejo", Encrypted: true},
		},
	}

	authMgr := auth.NewManager()

	router := NewRouter(Deps{
		Security: mockSec,
		Auth:     authMgr,
	})

	// 1. GET /api/v1/auth/status (exempt)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/auth/status", nil)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on auth status, got %d", rec.Code)
	}

	// 2. POST /api/v1/auth/login (exempt)
	loginPayload, _ := json.Marshal(map[string]string{"pin": "1707"})
	rec = httptest.NewRecorder()
	req = httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(loginPayload))
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on login, got %d", rec.Code)
	}
	var sess auth.Session
	_ = json.Unmarshal(rec.Body.Bytes(), &sess)
	if sess.Token == "" {
		t.Fatal("expected token on login response")
	}

	// 3. POST /api/v1/auth/verify (with token)
	rec = httptest.NewRecorder()
	req = httptest.NewRequest("POST", "/api/v1/auth/verify", nil)
	req.Header.Set("Authorization", "Bearer "+sess.Token)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on auth verify, got %d", rec.Code)
	}

	// 4. GET /api/v1/security/status (protected)
	rec = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/api/v1/security/status", nil)
	req.Header.Set("Authorization", "Bearer "+sess.Token)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	// 5. GET /api/v1/security/audit (protected)
	rec = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/api/v1/security/audit", nil)
	req.Header.Set("Authorization", "Bearer "+sess.Token)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var auditRep security.SecurityAuditReport
	_ = json.Unmarshal(rec.Body.Bytes(), &auditRep)
	if auditRep.Score != 95 || auditRep.Grade != "A+" {
		t.Fatalf("unexpected audit report: %+v", auditRep)
	}

	// 6. GET /api/v1/security/secrets (protected)
	rec = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/api/v1/security/secrets", nil)
	req.Header.Set("Authorization", "Bearer "+sess.Token)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on secrets, got %d", rec.Code)
	}
	var secResp struct {
		Secrets []security.SecretMetadata `json:"secrets"`
		Total   int                       `json:"total"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &secResp)
	if secResp.Total != 2 || len(secResp.Secrets) != 2 {
		t.Fatalf("expected 2 secrets, got %+v", secResp)
	}

	// 7. POST /api/v1/security/fail2ban/ban (protected)
	banPayload, _ := json.Marshal(map[string]string{"jail": "sshd", "ip": "10.0.0.99"})
	rec = httptest.NewRecorder()
	req = httptest.NewRequest("POST", "/api/v1/security/fail2ban/ban", bytes.NewReader(banPayload))
	req.Header.Set("Authorization", "Bearer "+sess.Token)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on ban, got %d", rec.Code)
	}

	// 8. POST /api/v1/security/fail2ban/unban (protected)
	unbanPayload, _ := json.Marshal(map[string]string{"jail": "sshd", "ip": "192.168.1.50"})
	rec = httptest.NewRecorder()
	req = httptest.NewRequest("POST", "/api/v1/security/fail2ban/unban", bytes.NewReader(unbanPayload))
	req.Header.Set("Authorization", "Bearer "+sess.Token)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on unban, got %d", rec.Code)
	}
}

func TestAuthLoginRateLimit_429LockedOut(t *testing.T) {
	t.Setenv("PANEL_AUTH_PIN", "mypass123")
	t.Setenv("PANEL_AUTH_MAX_ATTEMPTS", "3")
	t.Setenv("PANEL_AUTH_LOCKOUT_DURATION", "5m")

	authMgr := auth.NewManager()
	router := NewRouter(Deps{Auth: authMgr})

	wrongPayload, _ := json.Marshal(map[string]string{"pin": "wrong"})

	// 3 failed logins from same client IP
	for i := 1; i <= 3; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(wrongPayload))
		req.RemoteAddr = "10.10.10.10:12345"
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("attempt %d: expected 401 Unauthorized, got %d", i, rec.Code)
		}
	}

	// 4th login attempt must return HTTP 429 Too Many Requests and Retry-After header
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(wrongPayload))
	req.RemoteAddr = "10.10.10.10:12345"
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429 Too Many Requests on lockout, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	if rec.Header().Get("Retry-After") == "" {
		t.Fatalf("expected non-empty Retry-After header on 429 response")
	}
}
