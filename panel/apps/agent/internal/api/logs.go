package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/l7v/panel-agent/internal/journal"
)

// logsStreamHandler handles GET /api/v1/logs/stream.
// Streams journal entries as Server-Sent Events (SSE).
//
// Query params:
//   unit     — filter to a specific systemd unit (optional)
//   priority — minimum priority level 0–7 (optional, default 0 = all)
//
// Each SSE event:
//   data: {"timestamp":"...","unit":"...","priority":6,"message":"..."}
//
// On journal open failure, a final SSE event of type "error" is emitted.
// The goroutine spawned by Tail is cancelled via ctx when the client disconnects.
func logsStreamHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		unit := r.URL.Query().Get("unit")

		minPriority := 0
		if pStr := r.URL.Query().Get("priority"); pStr != "" {
			if p, err := strconv.Atoi(pStr); err == nil && p >= 0 && p <= 7 {
				minPriority = p
			}
		}

		// SSE headers — must be set before WriteHeader.
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		// Disable nginx buffering so events reach the browser immediately.
		w.Header().Set("X-Accel-Buffering", "no")
		// Remove Content-Length so Go uses chunked transfer encoding (required for SSE).
		w.Header().Del("Content-Length")
		w.WriteHeader(http.StatusOK)

		flusher, ok := w.(http.Flusher)
		if !ok {
			return
		}

		// Write an SSE comment immediately to establish chunked encoding
		// and prevent Go from sending Content-Length: 0.
		fmt.Fprint(w, ": connected\n\n")
		flusher.Flush()

		entries := make(chan journal.LogEntry, 64)
		errCh := make(chan error, 1)

		// Tail runs in its own goroutine. It will exit when r.Context() is cancelled
		// (i.e. when the client disconnects), preventing goroutine leaks.
		go d.Journal.Tail(r.Context(), journal.TailOptions{
			Unit:        unit,
			MinPriority: minPriority,
			Out:         entries,
			Err:         errCh,
		})

		for {
			select {
			case <-r.Context().Done():
				return

			case err := <-errCh:
				msg, _ := json.Marshal(map[string]string{"message": err.Error()})
				fmt.Fprintf(w, "event: error\ndata: %s\n\n", msg)
				flusher.Flush()
				return

			case entry := <-entries:
				data, err := json.Marshal(entry)
				if err != nil {
					continue
				}
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()
			}
		}
	}
}
