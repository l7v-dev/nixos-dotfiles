package terminal

import (
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"syscall"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1024 * 1024 // 1MB max frame
)

// NewUpgrader returns a websocket.Upgrader that validates the Origin header against
// allowedOrigins (exact strings) plus the request's own Host and localhost variants.
func NewUpgrader(allowedOrigins []string) websocket.Upgrader {
	allowed := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		o = strings.TrimSpace(o)
		if o != "" {
			allowed[o] = true
		}
	}

	return websocket.Upgrader{
		ReadBufferSize:  8192,
		WriteBufferSize: 8192,
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			if origin == "" {
				// No Origin header — same-origin tool or non-browser client; allow.
				return true
			}
			host := r.Host
			// Allow same-origin (http and https variants).
			if origin == "http://"+host || origin == "https://"+host {
				return true
			}
			// Allow localhost development origins.
			for _, local := range localhostOrigins(r) {
				if origin == local {
					return true
				}
			}
			// Allow explicitly configured origins.
			if allowed[origin] {
				return true
			}
			slog.Warn("websocket origin rejected", "origin", origin, "host", host)
			return false
		},
	}
}

// localhostOrigins returns localhost variants on the same port as the request.
func localhostOrigins(r *http.Request) []string {
	_, port, _ := net.SplitHostPort(r.Host)
	if port == "" {
		return []string{
			"http://localhost", "https://localhost",
			"http://127.0.0.1", "https://127.0.0.1",
		}
	}
	return []string{
		"http://localhost:" + port, "https://localhost:" + port,
		"http://127.0.0.1:" + port, "https://127.0.0.1:" + port,
	}
}

// InboundWSMessage represents messages received from the browser terminal client.
type InboundWSMessage struct {
	Type      string `json:"type"`                // "input", "resize", "ping", "signal"
	Data      string `json:"data,omitempty"`      // terminal raw input characters
	Cols      uint16 `json:"cols,omitempty"`      // cols for resize
	Rows      uint16 `json:"rows,omitempty"`      // rows for resize
	Timestamp int64  `json:"timestamp,omitempty"` // timestamp for ping RTT measurement
	Signal    string `json:"signal,omitempty"`    // "SIGINT", "SIGTERM", etc.
}

// OutboundWSMessage represents messages sent to the browser terminal client.
type OutboundWSMessage struct {
	Type      string `json:"type"`                // "output", "pong", "status", "exit", "error"
	Data      string `json:"data,omitempty"`      // raw ANSI terminal output
	Status    string `json:"status,omitempty"`    // "running", "exited"
	Title     string `json:"title,omitempty"`     // session title
	PID       int    `json:"pid,omitempty"`       // process ID
	ExitCode  int    `json:"exit_code,omitempty"` // exit code
	Timestamp int64  `json:"timestamp,omitempty"` // echoed timestamp for RTT
	Message   string `json:"message,omitempty"`   // error or status message
}

// HandleWebSocket manages a bidirectional WebSocket connection to a terminal session.
func HandleWebSocket(w http.ResponseWriter, r *http.Request, session *Session, allowedOrigins []string, logger *slog.Logger) {
	if logger == nil {
		logger = slog.Default()
	}

	upgrader := NewUpgrader(allowedOrigins)
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("websocket upgrade failed", "err", err)
		return
	}
	defer ws.Close()

	ws.SetReadLimit(maxMessageSize)
	_ = ws.SetReadDeadline(time.Now().Add(pongWait))
	ws.SetPongHandler(func(string) error {
		_ = ws.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	history, outCh, unsubscribe := session.Attach()
	defer unsubscribe()

	// 1. Send initial session status and history replay
	info := session.Info()
	initMsg := OutboundWSMessage{
		Type:   "status",
		Status: "running",
		Title:  info.Title,
		PID:    info.PID,
	}
	if !info.IsAlive {
		initMsg.Status = "exited"
		initMsg.ExitCode = info.ExitCode
	}
	_ = ws.WriteJSON(initMsg)

	// Replay history if available
	if len(history) > 0 {
		historyMsg := OutboundWSMessage{
			Type: "history",
			Data: string(history),
		}
		_ = ws.WriteJSON(historyMsg)
	}

	writeCh := make(chan OutboundWSMessage, 256)
	doneCh := make(chan struct{})

	// Writer pump: sends messages and pings to the browser
	go func() {
		ticker := time.NewTicker(pingPeriod)
		defer func() {
			ticker.Stop()
			_ = ws.Close()
		}()

		for {
			select {
			case <-doneCh:
				return
			case msg, ok := <-writeCh:
				_ = ws.SetWriteDeadline(time.Now().Add(writeWait))
				if !ok {
					_ = ws.WriteMessage(websocket.CloseMessage, []byte{})
					return
				}
				if err := ws.WriteJSON(msg); err != nil {
					return
				}
			case <-ticker.C:
				_ = ws.SetWriteDeadline(time.Now().Add(writeWait))
				if err := ws.WriteMessage(websocket.PingMessage, nil); err != nil {
					return
				}
			}
		}
	}()

	// Output pump: forward live PTY stdout/stderr from session outCh to writeCh
	go func() {
		defer close(doneCh)
		for chunk := range outCh {
			select {
			case <-doneCh:
				return
			case writeCh <- OutboundWSMessage{Type: "output", Data: string(chunk)}:
			}
		}

		// When outCh closes, only notify exit if the underlying process actually terminated
		if session.IsClosed() {
			info := session.Info()
			select {
			case <-doneCh:
			case writeCh <- OutboundWSMessage{
				Type:     "exit",
				Status:   "exited",
				ExitCode: info.ExitCode,
				Message:  "Process terminated",
			}:
			}
		}
	}()

	// Reader pump: processes input and control messages from browser
	for {
		_, messageBytes, err := ws.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				logger.Debug("websocket read closed", "err", err)
			}
			break
		}

		_ = ws.SetReadDeadline(time.Now().Add(pongWait))

		var in InboundWSMessage
		if err := json.Unmarshal(messageBytes, &in); err != nil {
			// If not JSON, treat raw text as direct input
			_, _ = session.Write(messageBytes)
			continue
		}

		switch in.Type {
		case "input":
			if in.Data != "" {
				_, _ = session.Write([]byte(in.Data))
			}
		case "resize":
			if in.Cols > 0 && in.Rows > 0 {
				_ = session.Resize(in.Cols, in.Rows)
			}
		case "ping":
			select {
			case writeCh <- OutboundWSMessage{
				Type:      "pong",
				Timestamp: in.Timestamp,
			}:
			default:
			}
		case "signal":
			var sig syscall.Signal
			switch in.Signal {
			case "SIGINT":
				sig = syscall.SIGINT
			case "SIGTERM":
				sig = syscall.SIGTERM
			case "SIGQUIT":
				sig = syscall.SIGQUIT
			case "SIGKILL":
				sig = syscall.SIGKILL
			default:
				sig = syscall.SIGINT
			}
			_ = session.Signal(sig)
		}
	}
}
