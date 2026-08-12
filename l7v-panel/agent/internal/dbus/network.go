package dbus

import (
	"github.com/godbus/dbus/v5"
)

// NetworkStatus represents WiFi and Bluetooth status
type NetworkStatus struct {
	WiFi      *WiFiInfo      `json:"wifi,omitempty"`
	Bluetooth *BluetoothInfo `json:"bluetooth"`
}

// WiFiInfo contains WiFi connection details
type WiFiInfo struct {
	SSID     string `json:"ssid"`
	Strength int    `json:"strength"`
}

// BluetoothInfo contains Bluetooth status
type BluetoothInfo struct {
	Enabled   bool     `json:"enabled"`
	Connected []string `json:"connected"`
}

// GetNetworkStatus returns current network status
func GetNetworkStatus() (*NetworkStatus, error) {
	conn, err := dbus.SystemBus()
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	status := &NetworkStatus{
		Bluetooth: &BluetoothInfo{
			Enabled:   false,
			Connected: []string{},
		},
	}

	// Check NetworkManager for WiFi
	nm := conn.Object("org.freedesktop.NetworkManager", "/org/freedesktop/NetworkManager")
	var nmState uint32
	err = nm.Call("org.freedesktop.NetworkManager.State", 0).Store(&nmState)
	if err == nil && nmState == 70 { // NM_STATE_CONNECTED_GLOBAL
		// Get active connection SSID
		// Simplified - in production would need to traverse APs
		status.WiFi = &WiFiInfo{
			SSID:     "connected",
			Strength: 80,
		}
	}

	// Check BlueZ for Bluetooth
	btAdapter := conn.Object("org.bluez", "/org/bluez/hci0")
	var btPowered bool
	err = btAdapter.GetProperty("org.bluez.Adapter1.Powered").Store(&btPowered)
	if err == nil {
		status.Bluetooth.Enabled = btPowered
		if btPowered {
			// Get connected devices (simplified)
			status.Bluetooth.Connected = []string{}
		}
	}

	return status, nil
}
