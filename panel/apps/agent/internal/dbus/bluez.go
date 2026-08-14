package dbus

import (
	"context"
	"fmt"
	"strings"
	"time"

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
func (b *bluetoothClient) GetBluetoothStatus(_ context.Context) (*BluetoothStatus, error) {
	adapter, err := b.findAdapter()
	if err != nil {
		return &BluetoothStatus{Enabled: false, Devices: []BTDevice{}}, nil
	}
	adapterObj := b.conn.Object(bluezBus, adapter)
	poweredV, err := adapterObj.GetProperty(bluezAdapter1 + ".Powered")
	if err != nil {
		return &BluetoothStatus{Enabled: false, Devices: []BTDevice{}}, nil
	}
	powered, _ := poweredV.Value().(bool)

	devices, err := b.getAllDevices()
	if err != nil {
		devices = []BTDevice{}
	}
	// Filter to only paired devices for status view.
	var paired []BTDevice
	for _, d := range devices {
		if d.Paired {
			paired = append(paired, d)
		}
	}
	if paired == nil {
		paired = []BTDevice{}
	}
	return &BluetoothStatus{Enabled: powered, Devices: paired}, nil
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

// scanTimeout is how long we let BlueZ discover before stopping and reading results.
const scanTimeout = 5 * time.Second

// ScanDevices starts discovery, waits for results, stops discovery, then returns
// all visible + paired devices. Using a short sleep is the pragmatic approach
// because BlueZ discovery is asynchronous and emits results via PropertiesChanged
// signals rather than a synchronous return value.
func (b *bluetoothClient) ScanDevices(ctx context.Context) ([]BTDevice, error) {
	adapter, err := b.findAdapter()
	if err != nil {
		return nil, fmt.Errorf("no Bluetooth adapter: %w", err)
	}
	adapterObj := b.conn.Object(bluezBus, adapter)

	if err := adapterObj.Call(bluezAdapter1+".StartDiscovery", 0).Err; err != nil {
		// "Already discovering" is not a real error — continue to the wait.
		if !strings.Contains(err.Error(), "Already") {
			return nil, fmt.Errorf("StartDiscovery: %w", err)
		}
	}

	// Wait up to scanTimeout, but respect context cancellation.
	select {
	case <-ctx.Done():
	case <-time.After(scanTimeout):
	}

	// Always attempt to stop discovery, even on context cancellation.
	_ = adapterObj.Call(bluezAdapter1+".StopDiscovery", 0).Err

	return b.getAllDevices()
}

// ConnectDevice connects to a paired Bluetooth device by address.
func (b *bluetoothClient) ConnectDevice(_ context.Context, address string) error {
	devPath, err := b.findDevice(address)
	if err != nil {
		return err
	}
	return b.conn.Object(bluezBus, devPath).Call(bluezDevice1+".Connect", 0).Err
}

// DisconnectDevice disconnects a connected Bluetooth device.
func (b *bluetoothClient) DisconnectDevice(_ context.Context, address string) error {
	devPath, err := b.findDevice(address)
	if err != nil {
		return err
	}
	return b.conn.Object(bluezBus, devPath).Call(bluezDevice1+".Disconnect", 0).Err
}

// RemoveDevice removes the pairing of a Bluetooth device.
func (b *bluetoothClient) RemoveDevice(_ context.Context, address string) error {
	adapter, err := b.findAdapter()
	if err != nil {
		return fmt.Errorf("no Bluetooth adapter: %w", err)
	}
	devPath, err := b.findDevice(address)
	if err != nil {
		return err
	}
	return b.conn.Object(bluezBus, adapter).Call(bluezAdapter1+".RemoveDevice", 0, devPath).Err
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

// findDevice returns the D-Bus path of a device by MAC address.
func (b *bluetoothClient) findDevice(address string) (dbus.ObjectPath, error) {
	obj := b.conn.Object(bluezBus, "/")
	var managed map[dbus.ObjectPath]map[string]map[string]dbus.Variant
	if err := obj.Call(objManager+".GetManagedObjects", 0).Store(&managed); err != nil {
		return "", fmt.Errorf("GetManagedObjects: %w", err)
	}
	for path, ifaces := range managed {
		dev, ok := ifaces[bluezDevice1]
		if !ok {
			continue
		}
		if av, ok := dev["Address"]; ok {
			if addr, ok := av.Value().(string); ok && strings.EqualFold(addr, address) {
				return path, nil
			}
		}
	}
	return "", fmt.Errorf("device not found: %s", address)
}

// getAllDevices returns all known BlueZ devices (paired and discovered).
func (b *bluetoothClient) getAllDevices() ([]BTDevice, error) {
	obj := b.conn.Object(bluezBus, "/")
	var managed map[dbus.ObjectPath]map[string]map[string]dbus.Variant
	if err := obj.Call(objManager+".GetManagedObjects", 0).Store(&managed); err != nil {
		return nil, fmt.Errorf("GetManagedObjects: %w", err)
	}
	var devices []BTDevice
	for _, ifaces := range managed {
		dev, ok := ifaces[bluezDevice1]
		if !ok {
			continue
		}
		addr := ""
		if av, ok := dev["Address"]; ok {
			addr, _ = av.Value().(string)
		}
		if strings.TrimSpace(addr) == "" {
			continue
		}
		name := ""
		if nv, ok := dev["Name"]; ok {
			name, _ = nv.Value().(string)
		}
		if name == "" {
			if av, ok := dev["Alias"]; ok {
				name, _ = av.Value().(string)
			}
		}
		connected := false
		if cv, ok := dev["Connected"]; ok {
			connected, _ = cv.Value().(bool)
		}
		paired := false
		if pv, ok := dev["Paired"]; ok {
			paired, _ = pv.Value().(bool)
		}
		trusted := false
		if tv, ok := dev["Trusted"]; ok {
			trusted, _ = tv.Value().(bool)
		}
		icon := ""
		if iv, ok := dev["Icon"]; ok {
			icon, _ = iv.Value().(string)
		}
		var battPct *uint8
		if bv, ok := dev["Battery"]; ok {
			if bm, ok := bv.Value().(map[string]dbus.Variant); ok {
				if pv, ok := bm["Percentage"]; ok {
					if p, ok := pv.Value().(uint8); ok {
						battPct = &p
					}
				}
			}
		}
		var rssi *int16
		if rv, ok := dev["RSSI"]; ok {
			if r, ok := rv.Value().(int16); ok {
				rssi = &r
			}
		}
		devices = append(devices, BTDevice{
			Name:       name,
			Address:    addr,
			Connected:  connected,
			Paired:     paired,
			Trusted:    trusted,
			Icon:       icon,
			BatteryPct: battPct,
			RSSI:       rssi,
		})
	}
	return devices, nil
}



