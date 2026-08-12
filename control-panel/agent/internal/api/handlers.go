package api

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"panel-agent/internal/dbus"
	"panel-agent/internal/journal"
	"panel-agent/internal/metrics"
)

// NewRouter creates the HTTP router
func NewRouter() *mux.Router {
	r := mux.NewRouter()

	// Metrics endpoint
	r.HandleFunc("/api/v1/metrics", handleMetrics).Methods("GET")

	// Services endpoint
	r.HandleFunc("/api/v1/services", handleServices).Methods("GET")
	r.HandleFunc("/api/v1/services/{name}/{action}", handleServiceAction).Methods("POST")

	// Power endpoint
	r.HandleFunc("/api/v1/power/shutdown", handleShutdown).Methods("POST")
	r.HandleFunc("/api/v1/power/reboot", handleReboot).Methods("POST")
	r.HandleFunc("/api/v1/power/sleep", handleSleep).Methods("POST")

	// Network endpoint
	r.HandleFunc("/api/v1/network/status", handleNetworkStatus).Methods("GET")

	// Logs endpoint (SSE)
	r.HandleFunc("/api/v1/logs/stream", handleLogsStream).Methods("GET")

	return r
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func handleMetrics(w http.ResponseWriter, r *http.Request) {
	metrics, err := metrics.GetSystemMetrics()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, metrics)
}

func handleServices(w http.ResponseWriter, r *http.Request) {
	services, err := dbus.ListServices()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"services": services})
}

func handleServiceAction(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	name := vars["name"]
	action := vars["action"]

	var err error
	switch action {
	case "start":
		err = dbus.StartService(name)
	case "stop":
		err = dbus.StopService(name)
	case "restart":
		err = dbus.RestartService(name)
	default:
		http.Error(w, "Invalid action", http.StatusBadRequest)
		return
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func handleShutdown(w http.ResponseWriter, r *http.Request) {
	if err := dbus.Shutdown(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "shutting down"})
}

func handleReboot(w http.ResponseWriter, r *http.Request) {
	if err := dbus.Reboot(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "rebooting"})
}

func handleSleep(w http.ResponseWriter, r *http.Request) {
	if err := dbus.Sleep(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "suspending"})
}

func handleNetworkStatus(w http.ResponseWriter, r *http.Request) {
	status, err := dbus.GetNetworkStatus()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, status)
}

func handleLogsStream(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	follow := r.URL.Query().Get("follow") == "true"
	if err := journal.StreamLogs(w, follow); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
