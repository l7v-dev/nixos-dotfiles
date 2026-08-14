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
	// WoLHosts maps logical host names to their MAC addresses for Wake-on-LAN.
	// Example: {"server": "aa:bb:cc:dd:ee:ff", "builder": "11:22:33:44:55:66"}
	// Populated from PANEL_WOL_HOSTS env var (JSON) or left empty.
	WoLHosts map[string]string
	PrometheusWidget bool
}

// NewRouter wires all API routes and wraps the mux in logging middleware.
func NewRouter(d Deps) http.Handler {
	mux := http.NewServeMux()

	// Catch-all for unknown paths → JSON 404.
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			writeError(w, http.StatusNotFound, map[string]string{"message": "not found"})
			return
		}
		writeError(w, http.StatusNotFound, map[string]string{"message": "not found"})
	})

	// Health
	mux.Handle("GET /api/v1/health", healthHandler(d))

	// Metrics (procfs)
	mux.Handle("GET /api/v1/metrics", metricsHandler(d))

	// Prometheus proxy (conditional on PrometheusWidget)
	if d.PrometheusWidget {
		mux.Handle("GET /api/v1/metrics/query", prometheusProxyHandler("query"))
		mux.Handle("GET /api/v1/metrics/query_range", prometheusProxyHandler("query_range"))
		d.Logger.Info("prometheus proxy enabled",
			"endpoints", []string{"/api/v1/metrics/query", "/api/v1/metrics/query_range"})
	} else {
		d.Logger.Info("prometheus proxy disabled (PANEL_PROMETHEUS_WIDGET != 1)")
	}

	// Service management (D-Bus systemd)
	mux.Handle("GET /api/v1/services", listServicesHandler(d))
	mux.Handle("POST /api/v1/services/{unit}/start", serviceActionHandler(d, "start"))
	mux.Handle("POST /api/v1/services/{unit}/stop", serviceActionHandler(d, "stop"))
	mux.Handle("POST /api/v1/services/{unit}/restart", serviceActionHandler(d, "restart"))
	mux.Handle("POST /api/v1/services/{unit}/enable", serviceActionHandler(d, "enable"))
	mux.Handle("POST /api/v1/services/{unit}/disable", serviceActionHandler(d, "disable"))

	// Power control (D-Bus logind)
	mux.Handle("GET /api/v1/power/capabilities", powerCapabilitiesHandler(d))
	mux.Handle("GET /api/v1/power/status", powerStatusHandler(d))
	mux.Handle("POST /api/v1/power/shutdown", powerHandler(d, "shutdown"))
	mux.Handle("POST /api/v1/power/reboot", powerHandler(d, "reboot"))
	mux.Handle("POST /api/v1/power/sleep", powerHandler(d, "sleep"))
	mux.Handle("POST /api/v1/power/hibernate", powerHandler(d, "hibernate"))
	mux.Handle("POST /api/v1/power/hybrid-sleep", powerHandler(d, "hybrid-sleep"))
	mux.Handle("POST /api/v1/power/wol", wolHandler(d))
	mux.Handle("GET /api/v1/power/wol/hosts", wolHostsHandler(d))
	mux.Handle("GET /api/v1/power/schedule", scheduleStatusHandler(d))
	mux.Handle("POST /api/v1/power/schedule", scheduleShutdownHandler(d))
	mux.Handle("DELETE /api/v1/power/schedule", cancelShutdownHandler(d))

	// Network (D-Bus NetworkManager + BlueZ)
	mux.Handle("GET /api/v1/network/wifi", wifiStatusHandler(d))
	mux.Handle("POST /api/v1/network/wifi/toggle", wifiToggleHandler(d))
	mux.Handle("GET /api/v1/network/wifi/scan", wifiScanHandler(d))
	mux.Handle("POST /api/v1/network/wifi/connect", wifiConnectHandler(d))
	mux.Handle("POST /api/v1/network/wifi/disconnect", wifiDisconnectHandler(d))
	mux.Handle("GET /api/v1/network/wifi/connections", wifiConnectionsHandler(d))
	mux.Handle("GET /api/v1/network/bluetooth", bluetoothStatusHandler(d))
	mux.Handle("POST /api/v1/network/bluetooth/toggle", bluetoothToggleHandler(d))
	mux.Handle("GET /api/v1/network/bluetooth/scan", bluetoothScanHandler(d))
	mux.Handle("POST /api/v1/network/bluetooth/connect/{address}", bluetoothConnectHandler(d))
	mux.Handle("POST /api/v1/network/bluetooth/disconnect/{address}", bluetoothDisconnectHandler(d))
	mux.Handle("DELETE /api/v1/network/bluetooth/device/{address}", bluetoothRemoveHandler(d))

	// Log streaming (SSE)
	mux.Handle("GET /api/v1/logs/stream", logsStreamHandler(d))

	// Prometheus metrics (not under /api/v1/)
	mux.Handle("GET /metrics", prometheusHandler(d))

	return withMiddleware(mux, d.Logger)
}
