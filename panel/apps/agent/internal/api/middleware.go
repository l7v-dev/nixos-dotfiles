package api

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

type ctxKey string

const ctxKeyReqID ctxKey = "request_id"

// responseWriter wraps http.ResponseWriter to capture the status code.
type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(status int) {
	rw.status = status
	rw.ResponseWriter.WriteHeader(status)
}

func (rw *responseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	if hj, ok := rw.ResponseWriter.(http.Hijacker); ok {
		return hj.Hijack()
	}
	return nil, nil, errors.New("http.Hijacker not implemented by underlying ResponseWriter")
}

func (rw *responseWriter) Flush() {
	if fl, ok := rw.ResponseWriter.(http.Flusher); ok {
		fl.Flush()
	}
}

// writeError writes a JSON error response with the given status and fields.
// All non-2xx responses from the agent must go through this function.
func writeError(w http.ResponseWriter, status int, fields map[string]string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(fields) //nolint:errcheck
}

// writeJSON writes a JSON response with the given status code and arbitrary data.
func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data) //nolint:errcheck
}

// withMiddleware wraps a handler with request-ID propagation and structured logging.
func withMiddleware(next http.Handler, logger *slog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := r.Header.Get("X-Request-ID")
		if reqID == "" {
			reqID = uuid.NewString()
		}

		rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}
		w.Header().Set("X-Request-ID", reqID)

		// Normalize paths: if path starts with /{host}/api/v1/..., strip /{host} prefix so both direct and proxied calls work
		p := r.URL.Path
		if strings.HasPrefix(p, "/") {
			parts := strings.Split(strings.TrimPrefix(p, "/"), "/")
			if len(parts) >= 3 && parts[1] == "api" && parts[2] == "v1" {
				r.URL.Path = "/" + strings.Join(parts[1:], "/")
			}
		}

		ctx := context.WithValue(r.Context(), ctxKeyReqID, reqID)
		r = r.WithContext(ctx)

		start := time.Now()
		next.ServeHTTP(rw, r)

		logger.InfoContext(ctx, "request",
			"method",      r.Method,
			"path",        r.URL.Path,
			"status",      rw.status,
			"duration_ms", time.Since(start).Milliseconds(),
			"request_id",  reqID,
		)
	})
}
