package dbus

import (
	"context"
	"encoding/binary"
	"fmt"
	"math"
	"net"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/godbus/dbus/v5"
)

// rxTxSnapshot holds a single reading of rx/tx bytes for rate calculation.
type rxTxSnapshot struct {
	rx   uint64
	tx   uint64
	time time.Time
}

var (
	rxTxMu   sync.Mutex
	rxTxPrev = map[string]rxTxSnapshot{}
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

	v, err := obj.GetProperty(nmInterface + ".WirelessEnabled")
	if err != nil {
		return &WifiStatus{Enabled: false}, nil
	}
	enabled, _ := v.Value().(bool)

	wifiDev, err := n.findWifiDevice()
	if err != nil || wifiDev == "" {
		return &WifiStatus{Enabled: enabled}, nil
	}

	devObj := n.conn.Object(nmBus, wifiDev)

	apv, err := devObj.GetProperty(nmWireless + ".ActiveAccessPoint")
	if err != nil {
		return &WifiStatus{Enabled: enabled}, nil
	}
	apPath, _ := apv.Value().(dbus.ObjectPath)
	if apPath == "" || apPath == "/" {
		return &WifiStatus{Enabled: enabled}, nil
	}

	apObj := n.conn.Object(nmBus, apPath)

	ssidV, _ := apObj.GetProperty(nmAccessPoint + ".Ssid")
	var ssidStr *string
	if bs, ok := ssidV.Value().([]byte); ok && len(bs) > 0 {
		s := string(bs)
		ssidStr = &s
	}

	strengthV, _ := apObj.GetProperty(nmAccessPoint + ".Strength")
	var sigDBm *int32
	if strength, ok := strengthV.Value().(uint8); ok {
		dbm := int32(-100) + int32(strength/2)
		sigDBm = &dbm
	}

	// Frequency + band
	freqV, _ := apObj.GetProperty(nmAccessPoint + ".Frequency")
	var freqPtr *uint32
	var bandPtr *string
	if freq, ok := freqV.Value().(uint32); ok && freq > 0 {
		freqPtr = &freq
		band := classifyBand(freq)
		bandPtr = &band
	}

	ipStr := n.getIP4Address(devObj)
	gateway, dns := n.getGatewayAndDNS(devObj)

	// Rx/Tx stats from /proc/net/dev
	iface := n.getIfaceName(devObj)
	rx, tx, rxKbps, txKbps := readIfaceStats(iface)

	return &WifiStatus{
		Enabled:   enabled,
		SSID:      ssidStr,
		SignalDBm: sigDBm,
		IPAddress: ipStr,
		FreqMHz:   freqPtr,
		Band:      bandPtr,
		Gateway:   gateway,
		DNS:       dns,
		RxBytes:   rx,
		TxBytes:   tx,
		RxKbps:    rxKbps,
		TxKbps:    txKbps,
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

// ScanWifi triggers a WiFi scan and returns all visible access points.
func (n *networkClient) ScanWifi(_ context.Context) ([]AccessPoint, error) {
	wifiDev, err := n.findWifiDevice()
	if err != nil {
		return nil, fmt.Errorf("no WiFi device: %w", err)
	}
	devObj := n.conn.Object(nmBus, wifiDev)

	// Request a fresh scan (fire and forget — NM scans async).
	_ = devObj.Call(nmWireless+".RequestScan", 0, map[string]dbus.Variant{}).Err

	// Get active AP path for marking which one is active.
	activeAPPath := dbus.ObjectPath("/")
	if apv, err := devObj.GetProperty(nmWireless + ".ActiveAccessPoint"); err == nil {
		activeAPPath, _ = apv.Value().(dbus.ObjectPath)
	}

	// List all access points.
	var apPaths []dbus.ObjectPath
	if err := devObj.Call(nmWireless+".GetAllAccessPoints", 0).Store(&apPaths); err != nil {
		return nil, fmt.Errorf("GetAllAccessPoints: %w", err)
	}

	seen := map[string]AccessPoint{}
	for _, apPath := range apPaths {
		apObj := n.conn.Object(nmBus, apPath)

		ssidV, _ := apObj.GetProperty(nmAccessPoint + ".Ssid")
		bs, _ := ssidV.Value().([]byte)
		ssid := string(bs)
		if ssid == "" {
			continue
		}

		bssidV, _ := apObj.GetProperty(nmAccessPoint + ".HwAddress")
		bssid, _ := bssidV.Value().(string)

		strengthV, _ := apObj.GetProperty(nmAccessPoint + ".Strength")
		strength, _ := strengthV.Value().(uint8)
		dbm := int32(-100) + int32(strength/2)

		freqV, _ := apObj.GetProperty(nmAccessPoint + ".Frequency")
		freq, _ := freqV.Value().(uint32)

		flagsV, _ := apObj.GetProperty(nmAccessPoint + ".Flags")
		flags, _ := flagsV.Value().(uint32)
		wpaFlagsV, _ := apObj.GetProperty(nmAccessPoint + ".WpaFlags")
		wpaFlags, _ := wpaFlagsV.Value().(uint32)
		rsnFlagsV, _ := apObj.GetProperty(nmAccessPoint + ".RsnFlags")
		rsnFlags, _ := rsnFlagsV.Value().(uint32)

		security := classifySecurity(flags, wpaFlags, rsnFlags)
		band := classifyBand(freq)

		ap := AccessPoint{
			SSID:      ssid,
			BSSID:     bssid,
			SignalDBm: dbm,
			Security:  security,
			FreqMHz:   freq,
			Band:      band,
			Active:    apPath == activeAPPath,
		}

		// Keep the strongest signal per SSID (handles mesh networks and dual-band APs).
		if existing, dup := seen[ssid]; !dup || dbm > existing.SignalDBm {
			seen[ssid] = ap
		}
	}

	var aps []AccessPoint
	for _, ap := range seen {
		aps = append(aps, ap)
	}
	return aps, nil
}

// ConnectWifi connects to a WiFi network by SSID and optional password.
// If a saved connection for this SSID exists it is reactivated; otherwise a new one is created.
func (n *networkClient) ConnectWifi(_ context.Context, ssid, password string) error {
	wifiDev, err := n.findWifiDevice()
	if err != nil {
		return fmt.Errorf("no WiFi device: %w", err)
	}

	// Build connection settings.
	settings := map[string]map[string]dbus.Variant{
		"connection": {
			"type": dbus.MakeVariant("802-11-wireless"),
			"id":   dbus.MakeVariant(ssid),
		},
		"802-11-wireless": {
			"ssid": dbus.MakeVariant([]byte(ssid)),
			"mode": dbus.MakeVariant("infrastructure"),
		},
	}
	if password != "" {
		settings["802-11-wireless-security"] = map[string]dbus.Variant{
			"key-mgmt": dbus.MakeVariant("wpa-psk"),
			"psk":      dbus.MakeVariant(password),
		}
	}

	nmObj := n.conn.Object(nmBus, dbus.ObjectPath(nmPath))
	var connPath, activePath dbus.ObjectPath
	err = nmObj.Call(
		nmInterface+".AddAndActivateConnection", 0,
		settings,
		wifiDev,
		dbus.ObjectPath("/"),
	).Store(&connPath, &activePath)
	if err != nil {
		return fmt.Errorf("AddAndActivateConnection: %w", err)
	}
	return nil
}

// DisconnectWifi deactivates the active WiFi connection.
func (n *networkClient) DisconnectWifi(_ context.Context) error {
	wifiDev, err := n.findWifiDevice()
	if err != nil {
		return fmt.Errorf("no WiFi device: %w", err)
	}
	devObj := n.conn.Object(nmBus, wifiDev)
	return devObj.Call(nmDeviceType+".Disconnect", 0).Err
}

// GetSavedConnections returns all saved NM WiFi connection profiles.
func (n *networkClient) GetSavedConnections(_ context.Context) ([]SavedConnection, error) {
	settingsObj := n.conn.Object(nmBus, "/org/freedesktop/NetworkManager/Settings")
	var connPaths []dbus.ObjectPath
	if err := settingsObj.Call("org.freedesktop.NetworkManager.Settings.ListConnections", 0).Store(&connPaths); err != nil {
		return nil, fmt.Errorf("ListConnections: %w", err)
	}

	var conns []SavedConnection
	for _, cp := range connPaths {
		connObj := n.conn.Object(nmBus, cp)
		var settings map[string]map[string]dbus.Variant
		if err := connObj.Call("org.freedesktop.NetworkManager.Settings.Connection.GetSettings", 0).Store(&settings); err != nil {
			continue
		}
		connSec, ok := settings["connection"]
		if !ok {
			continue
		}
		connType, _ := connSec["type"].Value().(string)
		if connType != "802-11-wireless" {
			continue
		}
		id, _ := connSec["id"].Value().(string)
		uuid, _ := connSec["uuid"].Value().(string)

		wifiSec := settings["802-11-wireless"]
		ssidBytes, _ := wifiSec["ssid"].Value().([]byte)
		ssid := string(ssidBytes)

		conns = append(conns, SavedConnection{ID: id, UUID: uuid, SSID: ssid})
	}
	return conns, nil
}

// DeleteSavedConnection deletes a saved NM WiFi connection profile by UUID.
func (n *networkClient) DeleteSavedConnection(_ context.Context, uuid string) error {
	settingsObj := n.conn.Object(nmBus, "/org/freedesktop/NetworkManager/Settings")
	var connPath dbus.ObjectPath
	err := settingsObj.Call("org.freedesktop.NetworkManager.Settings.GetConnectionByUuid", 0, uuid).Store(&connPath)
	if err != nil {
		return fmt.Errorf("GetConnectionByUuid: %w", err)
	}
	connObj := n.conn.Object(nmBus, connPath)
	if err := connObj.Call("org.freedesktop.NetworkManager.Settings.Connection.Delete", 0).Err; err != nil {
		return fmt.Errorf("delete connection: %w", err)
	}
	return nil
}

// classifySecurity determines security type from NM AP flags.
// NM_802_11_AP_FLAGS_PRIVACY = 0x1, WPA/RSN flags non-zero → encrypted.
func classifySecurity(flags, wpaFlags, rsnFlags uint32) string {
	if rsnFlags != 0 {
		// Check for SAE (WPA3).
		if rsnFlags&0x400 != 0 {
			return "wpa3"
		}
		return "wpa2"
	}
	if wpaFlags != 0 {
		return "wpa2"
	}
	if flags&0x1 != 0 {
		return "wep"
	}
	return "open"
}

// classifyBand maps frequency (MHz) to band label.
func classifyBand(freq uint32) string {
	switch {
	case freq >= 5925:
		return "6GHz"
	case freq >= 5000:
		return "5GHz"
	default:
		return "2.4GHz"
	}
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

// getGatewayAndDNS reads gateway and DNS from the device's IP4Config.
func (n *networkClient) getGatewayAndDNS(devObj dbus.BusObject) (*string, []string) {
	ipv, err := devObj.GetProperty(nmDeviceType + ".Ip4Config")
	if err != nil {
		return nil, nil
	}
	ip4Path, _ := ipv.Value().(dbus.ObjectPath)
	if ip4Path == "" || ip4Path == "/" {
		return nil, nil
	}
	ip4Obj := n.conn.Object(nmBus, ip4Path)

	// Gateway
	var gateway *string
	gwV, err := ip4Obj.GetProperty(nmIP4Config + ".Gateway")
	if err == nil {
		if gw, ok := gwV.Value().(string); ok && gw != "" {
			gateway = &gw
		}
	}

	// DNS (NameserverData: []map[string]dbus.Variant{{"address": "x.x.x.x"}})
	var dns []string
	nsV, err := ip4Obj.GetProperty(nmIP4Config + ".NameserverData")
	if err == nil {
		if nsList, ok := nsV.Value().([]map[string]dbus.Variant); ok {
			for _, ns := range nsList {
				if av, ok := ns["address"]; ok {
					if addr, ok := av.Value().(string); ok && addr != "" {
						dns = append(dns, addr)
					}
				}
			}
		}
	}

	return gateway, dns
}

// getIfaceName reads the kernel interface name for a NM device.
func (n *networkClient) getIfaceName(devObj dbus.BusObject) string {
	v, err := devObj.GetProperty(nmDeviceType + ".Interface")
	if err != nil {
		return ""
	}
	iface, _ := v.Value().(string)
	return iface
}

// readIfaceStats reads Rx/Tx bytes from /proc/net/dev and computes kbps rates.
func readIfaceStats(iface string) (rxBytes, txBytes *uint64, rxKbps, txKbps *float64) {
	if iface == "" {
		return
	}
	data, err := os.ReadFile("/proc/net/dev")
	if err != nil {
		return
	}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, iface+":") {
			continue
		}
		fields := strings.Fields(strings.TrimPrefix(line, iface+":"))
		if len(fields) < 9 {
			break
		}
		rx, err1 := strconv.ParseUint(fields[0], 10, 64)
		tx, err2 := strconv.ParseUint(fields[8], 10, 64)
		if err1 != nil || err2 != nil {
			break
		}
		rxBytes = &rx
		txBytes = &tx

		// Compute rate vs last snapshot.
		now := time.Now()
		rxTxMu.Lock()
		prev, ok := rxTxPrev[iface]
		rxTxPrev[iface] = rxTxSnapshot{rx: rx, tx: tx, time: now}
		rxTxMu.Unlock()

		if ok && now.Sub(prev.time) > 0 {
			dt := now.Sub(prev.time).Seconds()
			rxRate := math.Max(0, float64(rx-prev.rx)/dt/128) // bytes/s → kbps (/128 = *8/1024)
			txRate := math.Max(0, float64(tx-prev.tx)/dt/128)
			rxKbps = &rxRate
			txKbps = &txRate
		}
		break
	}
	return
}
