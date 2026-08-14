package containers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// CreateExec creates an exec instance inside a running container.
func (m *containerManager) CreateExec(ctx context.Context, id string, opts ExecOptions) (string, error) {
	if len(opts.Cmd) == 0 {
		opts.Cmd = []string{"/bin/sh"}
	}

	payload := map[string]interface{}{
		"AttachStdin":  opts.AttachStdin,
		"AttachStdout": opts.AttachStdout,
		"AttachStderr": opts.AttachStderr,
		"Tty":          opts.Tty,
		"Cmd":          opts.Cmd,
	}
	if opts.User != "" {
		payload["User"] = opts.User
	}
	if opts.WorkingDir != "" {
		payload["WorkingDir"] = opts.WorkingDir
	}
	if len(opts.Env) > 0 {
		payload["Env"] = opts.Env
	}
	if opts.Privileged {
		payload["Privileged"] = true
	}

	path := fmt.Sprintf("/containers/%s/exec", url.PathEscape(id))
	var resp struct {
		ID string `json:"Id"`
	}

	if err := m.client.DoJSON(ctx, "POST", path, payload, &resp); err != nil {
		return "", fmt.Errorf("create exec instance: %w", err)
	}

	return resp.ID, nil
}

// ResizeExec resizes the PTY of an exec session.
func (m *containerManager) ResizeExec(ctx context.Context, execID string, resize ExecResizeOptions) error {
	path := fmt.Sprintf("/exec/%s/resize?h=%d&w=%d", url.PathEscape(execID), resize.Height, resize.Width)
	return m.client.DoJSON(ctx, "POST", path, nil, nil)
}

// ExecWSMessage represents incoming messages from the frontend terminal WebSocket.
type ExecWSMessage struct {
	Type string `json:"type"` // "input", "resize", "ping"
	Data string `json:"data,omitempty"`
	Cols int    `json:"cols,omitempty"`
	Rows int    `json:"rows,omitempty"`
}

// StartExecWS bridges an exec instance to a WebSocket client.
func (m *containerManager) StartExecWS(ctx context.Context, execID string, ws *websocket.Conn) error {
	execStartPayload := map[string]interface{}{
		"Detach": false,
		"Tty":    true,
	}
	bodyBytes, _ := json.Marshal(execStartPayload)

	path := fmt.Sprintf("/exec/%s/start", url.PathEscape(execID))
	conn, bufReader, err := m.client.Hijack(ctx, "POST", path, bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("hijack exec stream: %w", err)
	}
	defer conn.Close()

	var once sync.Once
	closeWS := func() {
		once.Do(func() {
			ws.WriteControl(websocket.CloseMessage,
				websocket.FormatCloseMessage(websocket.CloseNormalClosure, "session ended"),
				time.Now().Add(time.Second))
			ws.Close()
		})
	}
	defer closeWS()

	errChan := make(chan error, 2)

	// Goroutine 1: Container PTY stdout -> WebSocket
	go func() {
		buf := make([]byte, 4096)
		for {
			var n int
			var rErr error

			if bufReader.Buffered() > 0 {
				n, rErr = bufReader.Read(buf)
			} else {
				n, rErr = conn.Read(buf)
			}

			if n > 0 {
				if wErr := ws.WriteMessage(websocket.BinaryMessage, buf[:n]); wErr != nil {
					errChan <- wErr
					return
				}
			}

			if rErr != nil {
				if rErr != io.EOF {
					errChan <- rErr
				} else {
					errChan <- nil
				}
				return
			}
		}
	}()

	// Goroutine 2: WebSocket -> Container PTY stdin & resize handler
	go func() {
		for {
			msgType, p, rErr := ws.ReadMessage()
			if rErr != nil {
				errChan <- rErr
				return
			}

			if msgType == websocket.BinaryMessage {
				if _, wErr := conn.Write(p); wErr != nil {
					errChan <- wErr
					return
				}
				continue
			}

			if msgType == websocket.TextMessage {
				var msg ExecWSMessage
				if jsonErr := json.Unmarshal(p, &msg); jsonErr == nil && msg.Type != "" {
					switch msg.Type {
					case "input":
						if _, wErr := conn.Write([]byte(msg.Data)); wErr != nil {
							errChan <- wErr
							return
						}
					case "resize":
						if msg.Cols > 0 && msg.Rows > 0 {
							_ = m.ResizeExec(ctx, execID, ExecResizeOptions{
								Width:  msg.Cols,
								Height: msg.Rows,
							})
						}
					case "ping":
						_ = ws.WriteMessage(websocket.TextMessage, []byte(`{"type":"pong"}`))
					}
				} else {
					// Raw text input fallback
					if _, wErr := conn.Write(p); wErr != nil {
						errChan <- wErr
						return
					}
				}
			}
		}
	}()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case err := <-errChan:
		return err
	}
}
