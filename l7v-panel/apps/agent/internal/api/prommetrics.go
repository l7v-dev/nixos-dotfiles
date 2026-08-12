package api

import (
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Prometheus metrics registered at startup.
// promauto registers them with the default registry automatically.
var (
	requestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "panel_agent_requests_total",
			Help: "Total number of HTTP requests by endpoint and status.",
		},
		[]string{"method", "path", "status"},
	)

	requestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "panel_agent_request_duration_seconds",
			Help:    "HTTP request duration in seconds.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)

	// ActiveSSEConns tracks live SSE log-stream connections.
	// Incremented in logsStreamHandler on connect, decremented on disconnect.
	ActiveSSEConns = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "panel_agent_sse_connections_active",
		Help: "Number of currently active SSE log-stream connections.",
	})

	dbusErrorsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "panel_agent_dbus_errors_total",
			Help: "Total D-Bus errors by subsystem.",
		},
		[]string{"subsystem"},
	)
)

// prometheusHandler exposes the Prometheus metrics endpoint at GET /metrics.
// This endpoint is intentionally NOT under /api/v1/ so it can be scraped by
// the existing Prometheus instance without conflicting with the API namespace.
func prometheusHandler(_ Deps) http.HandlerFunc {
	h := promhttp.Handler()
	return func(w http.ResponseWriter, r *http.Request) {
		h.ServeHTTP(w, r)
	}
}

// RecordDBusError increments the D-Bus error counter for the given subsystem.
// Call this in each D-Bus handler when an error is returned.
func RecordDBusError(subsystem string) {
	dbusErrorsTotal.WithLabelValues(subsystem).Inc()
}
