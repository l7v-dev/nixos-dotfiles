package api

import (
	"encoding/json"
	"net/http"
)

// wifiStatusHandler handles GET /api/v1/network/wifi.
func wifiStatusHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		status, err := d.Network.GetWifiStatus(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"interface": "wifi",
				"message":   err.Error(),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(status) //nolint:errcheck
	}
}

// wifiToggleHandler handles POST /api/v1/network/wifi/toggle.
func wifiToggleHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := d.Network.ToggleWifi(r.Context()); err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"interface": "wifi",
				"message":   err.Error(),
			})
			return
		}
		// Return updated status after toggling.
		status, err := d.Network.GetWifiStatus(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"interface": "wifi",
				"message":   "toggle succeeded but failed to read updated status: " + err.Error(),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(status) //nolint:errcheck
	}
}

// bluetoothStatusHandler handles GET /api/v1/network/bluetooth.
func bluetoothStatusHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		status, err := d.Bluetooth.GetBluetoothStatus(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"interface": "bluetooth",
				"message":   err.Error(),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(status) //nolint:errcheck
	}
}

// bluetoothToggleHandler handles POST /api/v1/network/bluetooth/toggle.
func bluetoothToggleHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := d.Bluetooth.ToggleBluetooth(r.Context()); err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"interface": "bluetooth",
				"message":   err.Error(),
			})
			return
		}
		status, err := d.Bluetooth.GetBluetoothStatus(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"interface": "bluetooth",
				"message":   "toggle succeeded but failed to read updated status: " + err.Error(),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(status) //nolint:errcheck
	}
}

// wifiScanHandler handles GET /api/v1/network/wifi/scan.
func wifiScanHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		aps, err := d.Network.ScanWifi(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"interface": "wifi",
				"message":   err.Error(),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(aps) //nolint:errcheck
	}
}

// wifiConnectHandler handles POST /api/v1/network/wifi/connect.
func wifiConnectHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			SSID     string `json:"ssid"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "invalid JSON: " + err.Error()})
			return
		}
		if req.SSID == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "ssid is required"})
			return
		}
		if err := d.Network.ConnectWifi(r.Context(), req.SSID, req.Password); err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"interface": "wifi",
				"message":   err.Error(),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"ssid": req.SSID, "status": "connecting"}) //nolint:errcheck
	}
}

// wifiDisconnectHandler handles POST /api/v1/network/wifi/disconnect.
func wifiDisconnectHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := d.Network.DisconnectWifi(r.Context()); err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"interface": "wifi",
				"message":   err.Error(),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "disconnected"}) //nolint:errcheck
	}
}

// wifiConnectionsHandler handles GET /api/v1/network/wifi/connections.
func wifiConnectionsHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conns, err := d.Network.GetSavedConnections(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"interface": "wifi",
				"message":   err.Error(),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(conns) //nolint:errcheck
	}
}

// wifiDeleteConnectionHandler handles DELETE /api/v1/network/wifi/connections/{uuid}.
func wifiDeleteConnectionHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uuid := r.PathValue("uuid")
		if uuid == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "uuid is required"})
			return
		}
		if err := d.Network.DeleteSavedConnection(r.Context(), uuid); err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"uuid":    uuid,
				"message": err.Error(),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"uuid": uuid, "status": "deleted"}) //nolint:errcheck
	}
}

// bluetoothScanHandler handles GET /api/v1/network/bluetooth/scan.
func bluetoothScanHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		devices, err := d.Bluetooth.ScanDevices(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"interface": "bluetooth",
				"message":   err.Error(),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(devices) //nolint:errcheck
	}
}

// bluetoothConnectHandler handles POST /api/v1/network/bluetooth/connect/{address}.
func bluetoothConnectHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		address := r.PathValue("address")
		if address == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "address is required"})
			return
		}
		if err := d.Bluetooth.ConnectDevice(r.Context(), address); err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"address": address,
				"message": err.Error(),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"address": address, "status": "connecting"}) //nolint:errcheck
	}
}

// bluetoothDisconnectHandler handles POST /api/v1/network/bluetooth/disconnect/{address}.
func bluetoothDisconnectHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		address := r.PathValue("address")
		if address == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "address is required"})
			return
		}
		if err := d.Bluetooth.DisconnectDevice(r.Context(), address); err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"address": address,
				"message": err.Error(),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"address": address, "status": "disconnected"}) //nolint:errcheck
	}
}

// bluetoothRemoveHandler handles DELETE /api/v1/network/bluetooth/device/{address}.
func bluetoothRemoveHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		address := r.PathValue("address")
		if address == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "address is required"})
			return
		}
		if err := d.Bluetooth.RemoveDevice(r.Context(), address); err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"address": address,
				"message": err.Error(),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"address": address, "status": "removed"}) //nolint:errcheck
	}
}
