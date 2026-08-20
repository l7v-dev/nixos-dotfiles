package terminal_test

import (
	"net/http/httptest"
	"testing"

	"github.com/l7v/panel-agent/internal/terminal"
	"pgregory.net/rapid"
)

// Bug 7 — WebSocket Origin Validation
// Property 1: Bug Condition & Expected Behavior — Cross-Origin Requests Rejected
// Validates: Requirements 1.15, 1.16, 2.21, 2.22
func TestNewUpgrader_CrossHostOriginRejected(t *testing.T) {
	upgrader := terminal.NewUpgrader(nil)

	req := httptest.NewRequest("GET", "/api/v1/terminal/ws", nil)
	req.Host = "192.168.1.10:8080"
	req.Header.Set("Origin", "http://evil.example.com")

	if upgrader.CheckOrigin(req) {
		t.Fatalf("expected cross-origin request from evil.example.com to be rejected, but CheckOrigin returned true")
	}
}

func TestNewUpgrader_DifferentPortSameHostRejectedWhenNotConfigured(t *testing.T) {
	upgrader := terminal.NewUpgrader(nil)

	req := httptest.NewRequest("GET", "/api/v1/terminal/ws", nil)
	req.Host = "myhost.lan:8080"
	req.Header.Set("Origin", "http://myhost.lan:9000")

	if upgrader.CheckOrigin(req) {
		t.Fatalf("expected origin with mismatching port to be rejected")
	}
}

// Property 2: Preservation — Same-Origin, Localhost, Empty Origin, Configured Allowed Origins
// Validates: Requirements 3.20, 3.21, 3.22, 2.23, 2.24
func TestNewUpgrader_Preservation_AllowedOrigins(t *testing.T) {
	tests := []struct {
		name           string
		allowedOrigins []string
		host           string
		origin         string
		expected       bool
	}{
		{
			name:     "No origin header (curl/native client)",
			host:     "localhost:8080",
			origin:   "",
			expected: true,
		},
		{
			name:     "Same-origin http",
			host:     "localhost:8080",
			origin:   "http://localhost:8080",
			expected: true,
		},
		{
			name:     "Same-origin https",
			host:     "panel.local:8443",
			origin:   "https://panel.local:8443",
			expected: true,
		},
		{
			name:     "Localhost variant on request port (http://localhost:8080 to http://127.0.0.1:8080)",
			host:     "127.0.0.1:8080",
			origin:   "http://localhost:8080",
			expected: true,
		},
		{
			name:     "127.0.0.1 variant on request port (http://127.0.0.1:8080 to http://localhost:8080)",
			host:     "localhost:8080",
			origin:   "http://127.0.0.1:8080",
			expected: true,
		},
		{
			name:           "Explicitly configured allowed origin",
			allowedOrigins: []string{"https://app.company.internal"},
			host:           "10.0.0.5:8080",
			origin:         "https://app.company.internal",
			expected:       true,
		},
		{
			name:           "Unconfigured origin with allowlist active",
			allowedOrigins: []string{"https://app.company.internal"},
			host:           "10.0.0.5:8080",
			origin:         "https://attacker.com",
			expected:       false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			upgrader := terminal.NewUpgrader(tc.allowedOrigins)
			req := httptest.NewRequest("GET", "/ws", nil)
			req.Host = tc.host
			if tc.origin != "" {
				req.Header.Set("Origin", tc.origin)
			}

			actual := upgrader.CheckOrigin(req)
			if actual != tc.expected {
				t.Fatalf("origin %q on host %q: expected %v, got %v", tc.origin, tc.host, tc.expected, actual)
			}
		})
	}
}

func TestProperty_NewUpgraderSameOriginAlwaysAccepted(t *testing.T) {
	rapid.Check(t, func(tc *rapid.T) {
		hostName := rapid.StringMatching(`^[a-z0-9\-]{1,15}(\.[a-z0-9\-]{1,10})*:[0-9]{2,5}$`).Draw(tc, "host")
		scheme := rapid.SampledFrom([]string{"http", "https"}).Draw(tc, "scheme")

		upgrader := terminal.NewUpgrader(nil)
		req := httptest.NewRequest("GET", "/ws", nil)
		req.Host = hostName
		req.Header.Set("Origin", scheme+"://"+hostName)

		if !upgrader.CheckOrigin(req) {
			tc.Fatalf("exact same-origin %s://%s was rejected", scheme, hostName)
		}
	})
}
