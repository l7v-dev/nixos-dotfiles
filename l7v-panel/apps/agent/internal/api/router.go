package api

import (
	"log/slog"
	"net/http"

	"github.com/l7v/panel-agent/internal/dbus"
	"github.com/l7v/panel-agent/internal/journal"
	"github.com/l7v/panel-agent/internal/metrics"
)

// Deps holds all dependencies injected into API handlers.
// D-Bus clients are behind interfaces so unit tests can inject mocks.
type Deps struct {
	Systemd    dbus.SystemdClient
	Logind     dbus.LogindClient
	Network    dbus.NetworkClient
	Bluetooth  dbus.BluetoothClient
	Procfs     metrics.ProcfsReader
	Journal    journal.Reader
	Logger     *slog.Logger
	Version    string
	Thresholds metrics.Thresholds
}

// NewRouter wires all API routes and wraps the mux in logging middleware.
func NewRouter(d Deps) http.Handler {
	mux := http.NewServeMux()

	// Health
	mux.Handle("GET /api/v1/health", healthHandler(d))

	// Metrics (procfs)
	mux.Handle("GET /api/v1/metrics", metricsHandler(d))

	// Service management (D-Bus systemd)
	mux.Handle("GET /api/v1/services", listServicesHandler(d))
	mux.Handle("POST /api/v1/services/{unit}/start", serviceActionHandler(d, "start"))
	mux.Handle("POST /api/v1/services/{unit}/stop", serviceActionHandler(d, "stop"))
	mux.Handle("POST /api/v1/services/{unit}/enable", serviceActionHandler(d, "enable"))
	mux.Handle("POST /api/v1/services/{unit}/disable", serviceActionHandler(d, "disable"))

	// Power control (D-Bus logind)
	mux.Handle("POST /api/v1/power/shutdown", powerHandler(d, "shutdown"))
	mux.Handle("POST /api/v1/power/reboot", powerHandler(d, "reboot"))
	mux.Handle("POST /api/v1/power/sleep", powerHandler(d, "sleep"))

	// Network (D-Bus NetworkManager + BlueZ)
	mux.Handle("GET /api/v1/network/wifi", wifiStatusHandler(d))
	mux.Handle("POST /api/v1/network/wifi/toggle", wifiToggleHandler(d))
	mux.Handle("GET /api/v1/network/bluetooth", bluetoothStatusHandler(d))
	mux.Handle("POST /api/v1/network/bluetooth/toggle", bluetoothToggleHandler(d))

	// Log streaming (SSE)
	mux.Handle("GET /api/v1/logs/stream", logsStreamHandler(d))

	// Prometheus metrics (not under /api/v1/)
	mux.Handle("GET /metrics", prometheusHandler(d))

	return withMiddleware(mux, d.Logger)
}
