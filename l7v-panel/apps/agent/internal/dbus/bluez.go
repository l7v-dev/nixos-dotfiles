package dbus

import (
	"context"
	"fmt"
	"strings"

	"github.com/godbus/dbus/v5"
)

const (
	bluezBus      = "org.bluez"
	bluezAdapter1 = "org.bluez.Adapter1"
	bluezDevice1  = "org.bluez.Device1"
	objManager    = "org.freedesktop.DBus.ObjectManager"
)

// bluetoothClient is the concrete BluetoothClient implementation using BlueZ D-Bus.
type bluetoothClient struct {
	conn *dbus.Conn
}

// NewBluetoothClient connects to the system D-Bus and returns a BluetoothClient.
func NewBluetoothClient() (BluetoothClient, error) {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		return nil, fmt.Errorf("connect system D-Bus (BlueZ): %w", err)
	}
	return &bluetoothClient{conn: conn}, nil
}

// GetBluetoothStatus reads adapter and device state from BlueZ.
// Returns disabled status (not an error) when no adapter is present.
func (b *bluetoothClient) GetBluetoothStatus(_ context.Context) (*BluetoothStatus, error) {
	adapter, err := b.findAdapter()
	if err != nil {
		// No adapter — return disabled state gracefully.
		return &BluetoothStatus{Enabled: false, Devices: []BTDevice{}}, nil
	}

	adapterObj := b.conn.Object(bluezBus, adapter)
	poweredV, err := adapterObj.GetProperty(bluezAdapter1 + ".Powered")
	if err != nil {
		return &BluetoothStatus{Enabled: false, Devices: []BTDevice{}}, nil
	}
	powered, _ := poweredV.Value().(bool)

	devices, err := b.getDevices()
	if err != nil {
		devices = []BTDevice{}
	}

	return &BluetoothStatus{
		Enabled: powered,
		Devices: devices,
	}, nil
}

// ToggleBluetooth flips the Powered property on the first Bluetooth adapter.
func (b *bluetoothClient) ToggleBluetooth(_ context.Context) error {
	adapter, err := b.findAdapter()
	if err != nil {
		return fmt.Errorf("no Bluetooth adapter: %w", err)
	}
	adapterObj := b.conn.Object(bluezBus, adapter)
	v, err := adapterObj.GetProperty(bluezAdapter1 + ".Powered")
	if err != nil {
		return fmt.Errorf("get Powered: %w", err)
	}
	current, _ := v.Value().(bool)
	err = adapterObj.SetProperty(bluezAdapter1+".Powered", dbus.MakeVariant(!current))
	if err != nil {
		return fmt.Errorf("set Powered: %w", err)
	}
	return nil
}

// findAdapter returns the D-Bus path of the first BlueZ adapter.
func (b *bluetoothClient) findAdapter() (dbus.ObjectPath, error) {
	obj := b.conn.Object(bluezBus, "/")
	var managed map[dbus.ObjectPath]map[string]map[string]dbus.Variant
	err := obj.Call(objManager+".GetManagedObjects", 0).Store(&managed)
	if err != nil {
		return "", fmt.Errorf("GetManagedObjects: %w", err)
	}
	for path, ifaces := range managed {
		if _, ok := ifaces[bluezAdapter1]; ok {
			return path, nil
		}
	}
	return "", fmt.Errorf("no Bluetooth adapter found")
}

// getDevices returns all paired BlueZ devices.
func (b *bluetoothClient) getDevices() ([]BTDevice, error) {
	obj := b.conn.Object(bluezBus, "/")
	var managed map[dbus.ObjectPath]map[string]map[string]dbus.Variant
	err := obj.Call(objManager+".GetManagedObjects", 0).Store(&managed)
	if err != nil {
		return nil, fmt.Errorf("GetManagedObjects: %w", err)
	}

	var devices []BTDevice
	for path, ifaces := range managed {
		dev, ok := ifaces[bluezDevice1]
		if !ok {
			continue
		}
		// Only include paired devices.
		pairedV, ok := dev["Paired"]
		if !ok {
			continue
		}
		paired, _ := pairedV.Value().(bool)
		if !paired {
			continue
		}

		name := ""
		if nv, ok := dev["Name"]; ok {
			name, _ = nv.Value().(string)
		}
		if name == "" {
			// Fallback to Alias.
			if av, ok := dev["Alias"]; ok {
				name, _ = av.Value().(string)
			}
		}

		addr := ""
		if av, ok := dev["Address"]; ok {
			addr, _ = av.Value().(string)
		}

		connected := false
		if cv, ok := dev["Connected"]; ok {
			connected, _ = cv.Value().(bool)
		}

		_ = path // path is not used directly, but needed for the range
		devices = append(devices, BTDevice{
			Name:      name,
			Address:   addr,
			Connected: connected,
		})
	}

	// Drop devices with empty address — they are incomplete entries.
	filtered := devices[:0]
	for _, d := range devices {
		if strings.TrimSpace(d.Address) != "" {
			filtered = append(filtered, d)
		}
	}
	if filtered == nil {
		filtered = []BTDevice{}
	}
	return filtered, nil
}
