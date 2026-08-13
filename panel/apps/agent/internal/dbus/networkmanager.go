package dbus

import (
	"context"
	"encoding/binary"
	"fmt"
	"net"

	"github.com/godbus/dbus/v5"
)

const (
	nmBus           = "org.freedesktop.NetworkManager"
	nmPath          = "/org/freedesktop/NetworkManager"
	nmInterface     = "org.freedesktop.NetworkManager"
	nmDeviceType    = "org.freedesktop.NetworkManager.Device"
	nmWireless      = "org.freedesktop.NetworkManager.Device.Wireless"
	nmAccessPoint   = "org.freedesktop.NetworkManager.AccessPoint"
	nmIP4Config     = "org.freedesktop.NetworkManager.IP4Config"
	nmDeviceTypeWifi = 2 // NM_DEVICE_TYPE_WIFI
)

// networkClient is the concrete NetworkClient implementation using NetworkManager D-Bus.
type networkClient struct {
	conn *dbus.Conn
}

// NewNetworkClient connects to the system D-Bus and returns a NetworkClient.
func NewNetworkClient() (NetworkClient, error) {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		return nil, fmt.Errorf("connect system D-Bus (NM): %w", err)
	}
	return &networkClient{conn: conn}, nil
}

// GetWifiStatus reads WiFi state from NetworkManager.
// Returns a disabled WifiStatus (not an error) when no WiFi adapter is present.
func (n *networkClient) GetWifiStatus(_ context.Context) (*WifiStatus, error) {
	obj := n.conn.Object(nmBus, dbus.ObjectPath(nmPath))

	// Read WirelessEnabled property.
	v, err := obj.GetProperty(nmInterface + ".WirelessEnabled")
	if err != nil {
		return &WifiStatus{Enabled: false}, nil // NM not available
	}
	enabled, _ := v.Value().(bool)

	// Find the first WiFi device.
	wifiDev, err := n.findWifiDevice()
	if err != nil || wifiDev == "" {
		return &WifiStatus{Enabled: enabled}, nil
	}

	devObj := n.conn.Object(nmBus, wifiDev)

	// Active access point path.
	apv, err := devObj.GetProperty(nmWireless + ".ActiveAccessPoint")
	if err != nil {
		return &WifiStatus{Enabled: enabled}, nil
	}
	apPath, _ := apv.Value().(dbus.ObjectPath)
	if apPath == "" || apPath == "/" {
		return &WifiStatus{Enabled: enabled}, nil
	}

	apObj := n.conn.Object(nmBus, apPath)

	// SSID ([]byte → string).
	ssidV, _ := apObj.GetProperty(nmAccessPoint + ".Ssid")
	var ssidStr *string
	if bs, ok := ssidV.Value().([]byte); ok && len(bs) > 0 {
		s := string(bs)
		ssidStr = &s
	}

	// Signal strength (0–100 mapped to approximate dBm: 0→-100, 100→-50).
	strengthV, _ := apObj.GetProperty(nmAccessPoint + ".Strength")
	var sigDBm *int32
	if strength, ok := strengthV.Value().(uint8); ok {
		dbm := int32(-100) + int32(strength/2)
		sigDBm = &dbm
	}

	// IP address from the active IP4Config.
	ipStr := n.getIP4Address(devObj)

	return &WifiStatus{
		Enabled:   enabled,
		SSID:      ssidStr,
		SignalDBm: sigDBm,
		IPAddress: ipStr,
	}, nil
}

// ToggleWifi flips the WirelessEnabled property on the NetworkManager object.
func (n *networkClient) ToggleWifi(_ context.Context) error {
	obj := n.conn.Object(nmBus, dbus.ObjectPath(nmPath))
	v, err := obj.GetProperty(nmInterface + ".WirelessEnabled")
	if err != nil {
		return fmt.Errorf("get WirelessEnabled: %w", err)
	}
	current, _ := v.Value().(bool)
	err = obj.SetProperty(nmInterface+".WirelessEnabled", dbus.MakeVariant(!current))
	if err != nil {
		return fmt.Errorf("set WirelessEnabled: %w", err)
	}
	return nil
}

// findWifiDevice returns the D-Bus path of the first WiFi device found.
func (n *networkClient) findWifiDevice() (dbus.ObjectPath, error) {
	obj := n.conn.Object(nmBus, dbus.ObjectPath(nmPath))
	var paths []dbus.ObjectPath
	err := obj.Call(nmInterface+".GetDevices", 0).Store(&paths)
	if err != nil {
		return "", err
	}
	for _, p := range paths {
		dev := n.conn.Object(nmBus, p)
		tv, err := dev.GetProperty(nmDeviceType + ".DeviceType")
		if err != nil {
			continue
		}
		if dt, ok := tv.Value().(uint32); ok && dt == nmDeviceTypeWifi {
			return p, nil
		}
	}
	return "", fmt.Errorf("no WiFi device found")
}

// getIP4Address reads the first IPv4 address assigned to a device.
func (n *networkClient) getIP4Address(devObj dbus.BusObject) *string {
	ipv, err := devObj.GetProperty(nmDeviceType + ".Ip4Config")
	if err != nil {
		return nil
	}
	ip4Path, _ := ipv.Value().(dbus.ObjectPath)
	if ip4Path == "" || ip4Path == "/" {
		return nil
	}
	ip4Obj := n.conn.Object(nmBus, ip4Path)
	addrV, err := ip4Obj.GetProperty(nmIP4Config + ".AddressData")
	if err != nil {
		return nil
	}
	// AddressData is []map[string]dbus.Variant{{"address": <str>, "prefix": <uint32>}}
	addrs, ok := addrV.Value().([]map[string]dbus.Variant)
	if !ok || len(addrs) == 0 {
		// Fallback: try legacy Addresses ([][]uint32).
		legV, err := ip4Obj.GetProperty(nmIP4Config + ".Addresses")
		if err != nil {
			return nil
		}
		legacy, ok := legV.Value().([][]uint32)
		if !ok || len(legacy) == 0 || len(legacy[0]) == 0 {
			return nil
		}
		ip := make(net.IP, 4)
		binary.LittleEndian.PutUint32(ip, legacy[0][0])
		s := ip.String()
		return &s
	}
	av, ok := addrs[0]["address"]
	if !ok {
		return nil
	}
	s, _ := av.Value().(string)
	if s == "" {
		return nil
	}
	return &s
}
