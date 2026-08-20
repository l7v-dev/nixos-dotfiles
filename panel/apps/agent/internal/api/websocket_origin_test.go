package api_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/websocket"
	"github.com/l7v/panel-agent/internal/api"
	"github.com/l7v/panel-agent/internal/terminal"
)

func TestWebSocketOrigin_RejectedForCrossOrigin(t *testing.T) {
	router := api.NewRouter(api.Deps{
		TerminalManager: terminal.NewSessionManager(nil),
		AllowedOrigins:  []string{"https://allowed.local"},
	})

	server := httptest.NewServer(router)
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/v1/terminal/ws"

	// 1. Cross-origin request from hostile origin -> HTTP 403 Forbidden
	dialer := websocket.Dialer{}
	header := http.Header{}
	header.Set("Origin", "http://evil.attacker.com")

	_, resp, err := dialer.Dial(wsURL, header)
	if err == nil {
		t.Fatalf("expected error on cross-origin WebSocket dial, but succeeded")
	}
	if resp != nil && resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected HTTP 403 Forbidden on rejected WebSocket origin, got %d", resp.StatusCode)
	}

	// 2. Allowed origin -> Upgrades or reaches terminal handler without 403
	headerAllowed := http.Header{}
	headerAllowed.Set("Origin", "https://allowed.local")
	_, respAllowed, _ := dialer.Dial(wsURL, headerAllowed)
	if respAllowed != nil && respAllowed.StatusCode == http.StatusForbidden {
		t.Fatalf("expected allowed origin to NOT receive 403 Forbidden")
	}
}
