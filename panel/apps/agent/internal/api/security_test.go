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
	status *security.Status
	audit  *security.SecurityAuditReport
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

func (m *mockSecurityClient) GetFail2ban(ctx context.Context) (*security.Fail2banStatus, error) {
	return &m.audit.Fail2ban, nil
}

func (m *mockSecurityClient) UnbanIP(ctx context.Context, jail string, ip string) error {
	return nil
}

func TestSecurityAndAuthEndpoints(t *testing.T) {
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
	}

	authMgr := auth.NewManager()

	router := NewRouter(Deps{
		Security: mockSec,
		Auth:     authMgr,
	})

	// 1. GET /api/v1/security/status
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/security/status", nil)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	// 2. GET /api/v1/security/audit
	rec = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/api/v1/security/audit", nil)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var auditRep security.SecurityAuditReport
	_ = json.Unmarshal(rec.Body.Bytes(), &auditRep)
	if auditRep.Score != 95 || auditRep.Grade != "A+" {
		t.Fatalf("unexpected audit report: %+v", auditRep)
	}

	// 3. POST /api/v1/security/fail2ban/unban
	unbanPayload, _ := json.Marshal(map[string]string{"jail": "sshd", "ip": "192.168.1.50"})
	rec = httptest.NewRecorder()
	req = httptest.NewRequest("POST", "/api/v1/security/fail2ban/unban", bytes.NewReader(unbanPayload))
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on unban, got %d", rec.Code)
	}

	// 4. GET /api/v1/auth/status
	rec = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/api/v1/auth/status", nil)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on auth status, got %d", rec.Code)
	}

	// 5. POST /api/v1/auth/login
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

	// 6. POST /api/v1/auth/verify
	rec = httptest.NewRecorder()
	req = httptest.NewRequest("POST", "/api/v1/auth/verify", nil)
	req.Header.Set("Authorization", "Bearer "+sess.Token)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on auth verify, got %d", rec.Code)
	}
}
