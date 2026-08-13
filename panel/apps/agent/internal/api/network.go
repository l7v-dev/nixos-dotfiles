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
