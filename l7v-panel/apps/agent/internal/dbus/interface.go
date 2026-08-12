// Package dbus provides interfaces and implementations for D-Bus system services.
// All concrete implementations are in separate files; the interfaces here enable
// unit tests to inject mocks without a running systemd/NetworkManager/BlueZ.
package dbus

import "context"

// SystemdClient interacts with org.freedesktop.systemd1.
type SystemdClient interface {
	ListUnits(ctx context.Context) ([]ServiceUnit, error)
	StartUnit(ctx context.Context, unit string) error
	StopUnit(ctx context.Context, unit string) error
	EnableUnit(ctx context.Context, unit string) error
	DisableUnit(ctx context.Context, unit string) error
	HealthCheck(ctx context.Context) error
}

// LogindClient interacts with org.freedesktop.login1.
type LogindClient interface {
	PowerOff(ctx context.Context) error
	Reboot(ctx context.Context) error
	Suspend(ctx context.Context) error
	HealthCheck(ctx context.Context) error
}

// NetworkClient interacts with org.freedesktop.NetworkManager for WiFi.
type NetworkClient interface {
	GetWifiStatus(ctx context.Context) (*WifiStatus, error)
	ToggleWifi(ctx context.Context) error
}

// BluetoothClient interacts with org.bluez.
type BluetoothClient interface {
	GetBluetoothStatus(ctx context.Context) (*BluetoothStatus, error)
	ToggleBluetooth(ctx context.Context) error
}

// ServiceUnit is the JSON-serialisable representation of a systemd unit.
type ServiceUnit struct {
	Name          string `json:"name"`
	Description   string `json:"description"`
	LoadState     string `json:"load_state"`
	ActiveState   string `json:"active_state"`
	SubState      string `json:"sub_state"`
	UnitFileState string `json:"unit_file_state"`
}

// WifiStatus is the JSON-serialisable WiFi state.
type WifiStatus struct {
	Enabled   bool    `json:"enabled"`
	SSID      *string `json:"ssid"`
	SignalDBm *int32  `json:"signal_dbm"`
	IPAddress *string `json:"ip_address"`
}

// BluetoothStatus is the JSON-serialisable Bluetooth adapter state.
type BluetoothStatus struct {
	Enabled bool       `json:"enabled"`
	Devices []BTDevice `json:"devices"`
}

// BTDevice represents a single paired Bluetooth device.
type BTDevice struct {
	Name      string `json:"name"`
	Address   string `json:"address"`
	Connected bool   `json:"connected"`
}
