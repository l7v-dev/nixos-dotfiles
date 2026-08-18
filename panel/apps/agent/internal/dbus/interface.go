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
	RestartUnit(ctx context.Context, unit string) error
	EnableUnit(ctx context.Context, unit string) error
	DisableUnit(ctx context.Context, unit string) error
	HealthCheck(ctx context.Context) error
}

// LogindClient interacts with org.freedesktop.login1.
type LogindClient interface {
	PowerOff(ctx context.Context) error
	Reboot(ctx context.Context) error
	Suspend(ctx context.Context) error
	Hibernate(ctx context.Context) error
	HybridSleep(ctx context.Context) error
	GetCapabilities(ctx context.Context) (*PowerCapabilities, error)
	// Scheduled shutdown via logind ScheduleShutdown D-Bus method.
	ScheduleShutdown(ctx context.Context, action string, usec uint64) error
	CancelScheduledShutdown(ctx context.Context) error
	GetScheduledShutdown(ctx context.Context) (*ScheduledShutdownInfo, error)
	HealthCheck(ctx context.Context) error
}

// ScheduledShutdownInfo is returned by GetScheduledShutdown.
type ScheduledShutdownInfo struct {
	Scheduled bool   `json:"scheduled"`
	Action    string `json:"action,omitempty"`
	ExecuteAt string `json:"execute_at,omitempty"` // RFC3339
	// RemainingMin is approximate minutes until execution. 0 when not scheduled.
	RemainingMin int `json:"remaining_min,omitempty"`
}

// PowerCapabilities reports which power actions the host supports.
type PowerCapabilities struct {
	CanPowerOff    bool `json:"can_power_off"`
	CanReboot      bool `json:"can_reboot"`
	CanSuspend     bool `json:"can_suspend"`
	CanHibernate   bool `json:"can_hibernate"`
	CanHybridSleep bool `json:"can_hybrid_sleep"`
}

// NetworkClient interacts with org.freedesktop.NetworkManager for WiFi.
type NetworkClient interface {
	GetWifiStatus(ctx context.Context) (*WifiStatus, error)
	ToggleWifi(ctx context.Context) error
	ScanWifi(ctx context.Context) ([]AccessPoint, error)
	ConnectWifi(ctx context.Context, ssid, password string) error
	DisconnectWifi(ctx context.Context) error
	GetSavedConnections(ctx context.Context) ([]SavedConnection, error)
	DeleteSavedConnection(ctx context.Context, uuid string) error
}

// AccessPoint represents a discovered WiFi network.
type AccessPoint struct {
	SSID      string `json:"ssid"`
	BSSID     string `json:"bssid"`
	SignalDBm int32  `json:"signal_dbm"`
	Security  string `json:"security"`  // "open", "wpa2", "wpa3", "wep"
	FreqMHz   uint32 `json:"freq_mhz"`
	Band      string `json:"band"`      // "2.4GHz", "5GHz", "6GHz"
	Active    bool   `json:"active"`    // currently connected to this AP
}

// SavedConnection represents a stored NM connection profile.
type SavedConnection struct {
	ID   string `json:"id"`
	UUID string `json:"uuid"`
	SSID string `json:"ssid"`
}

// BluetoothClient interacts with org.bluez.
type BluetoothClient interface {
	GetBluetoothStatus(ctx context.Context) (*BluetoothStatus, error)
	ToggleBluetooth(ctx context.Context) error
	ScanDevices(ctx context.Context) ([]BTDevice, error)
	PairDevice(ctx context.Context, address string) error
	ConnectDevice(ctx context.Context, address string) error
	DisconnectDevice(ctx context.Context, address string) error
	RemoveDevice(ctx context.Context, address string) error
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
	Enabled    bool    `json:"enabled"`
	SSID       *string `json:"ssid"`
	SignalDBm  *int32  `json:"signal_dbm"`
	IPAddress  *string `json:"ip_address"`
	// Wave 2 additions
	Gateway    *string `json:"gateway,omitempty"`
	DNS        []string `json:"dns,omitempty"`
	FreqMHz    *uint32 `json:"freq_mhz,omitempty"`
	Band       *string `json:"band,omitempty"`
	RxBytes    *uint64 `json:"rx_bytes,omitempty"`
	TxBytes    *uint64 `json:"tx_bytes,omitempty"`
	RxKbps     *float64 `json:"rx_kbps,omitempty"`
	TxKbps     *float64 `json:"tx_kbps,omitempty"`
}

// BluetoothStatus is the JSON-serialisable Bluetooth adapter state.
type BluetoothStatus struct {
	Enabled     bool       `json:"enabled"`
	AdapterName *string    `json:"adapter_name,omitempty"`
	AdapterAddr *string    `json:"adapter_addr,omitempty"`
	Discovering bool       `json:"discovering"`
	Devices     []BTDevice `json:"devices"`
}

// BTDevice represents a single paired Bluetooth device.
type BTDevice struct {
	Name       string  `json:"name"`
	Address    string  `json:"address"`
	Connected  bool    `json:"connected"`
	Paired     bool    `json:"paired"`
	Trusted    bool    `json:"trusted"`
	Icon       string  `json:"icon,omitempty"`    // e.g. "audio-headset", "input-mouse"
	BatteryPct *uint8  `json:"battery_pct,omitempty"`
	RSSI       *int16  `json:"rssi,omitempty"`
}
