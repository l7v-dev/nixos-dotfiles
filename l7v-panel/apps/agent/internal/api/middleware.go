package api

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
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

// writeError writes a JSON error response with the given status and fields.
// All non-2xx responses from the agent must go through this function.
func writeError(w http.ResponseWriter, status int, fields map[string]string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(fields) //nolint:errcheck
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
