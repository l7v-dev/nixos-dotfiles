package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/l7v/panel-agent/internal/dbus"
)

type mockBluetooth struct {
	status         *dbus.BluetoothStatus
	scanDevices    []dbus.BTDevice
	toggleErr      error
	pairErr        error
	connectErr     error
	disconnectErr  error
	removeErr      error
	lastPaired     string
	lastConnected  string
	lastDisconnect string
	lastRemoved    string
}

func (m *mockBluetooth) GetBluetoothStatus(_ context.Context) (*dbus.BluetoothStatus, error) {
	if m.status == nil {
		return &dbus.BluetoothStatus{
			Enabled:     true,
			Discovering: false,
			Devices:     []dbus.BTDevice{},
		}, nil
	}
	return m.status, nil
}

func (m *mockBluetooth) ToggleBluetooth(_ context.Context) error {
	if m.toggleErr != nil {
		return m.toggleErr
	}
	if m.status != nil {
		m.status.Enabled = !m.status.Enabled
	}
	return nil
}

func (m *mockBluetooth) ScanDevices(_ context.Context) ([]dbus.BTDevice, error) {
	return m.scanDevices, nil
}

func (m *mockBluetooth) PairDevice(_ context.Context, address string) error {
	if m.pairErr != nil {
		return m.pairErr
	}
	m.lastPaired = address
	return nil
}

func (m *mockBluetooth) ConnectDevice(_ context.Context, address string) error {
	if m.connectErr != nil {
		return m.connectErr
	}
	m.lastConnected = address
	return nil
}

func (m *mockBluetooth) DisconnectDevice(_ context.Context, address string) error {
	if m.disconnectErr != nil {
		return m.disconnectErr
	}
	m.lastDisconnect = address
	return nil
}

func (m *mockBluetooth) RemoveDevice(_ context.Context, address string) error {
	if m.removeErr != nil {
		return m.removeErr
	}
	m.lastRemoved = address
	return nil
}

func TestBluetoothEndpoints(t *testing.T) {
	adapterName := "Intel Wireless BT"
	adapterAddr := "00:1A:7D:DA:71:13"
	batt := uint8(85)
	rssi := int16(-62)

	mock := &mockBluetooth{
		status: &dbus.BluetoothStatus{
			Enabled:     true,
			AdapterName: &adapterName,
			AdapterAddr: &adapterAddr,
			Discovering: false,
			Devices: []dbus.BTDevice{
				{
					Name:       "Sony WH-1000XM4",
					Address:    "AA:BB:CC:DD:EE:FF",
					Connected:  true,
					Paired:     true,
					Trusted:    true,
					Icon:       "audio-headset",
					BatteryPct: &batt,
					RSSI:       &rssi,
				},
			},
		},
		scanDevices: []dbus.BTDevice{
			{
				Name:      "MX Master 3S",
				Address:   "11:22:33:44:55:66",
				Connected: false,
				Paired:    false,
				Trusted:   false,
				Icon:      "input-mouse",
			},
		},
	}

	router := NewRouter(Deps{
		Bluetooth: mock,
	})
	srv := httptest.NewServer(router)
	defer srv.Close()

	// 1. GET Status
	t.Run("GetStatus", func(t *testing.T) {
		resp, err := http.Get(srv.URL + "/api/v1/network/bluetooth")
		if err != nil {
			t.Fatalf("Get status failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
		}

		var st dbus.BluetoothStatus
		if err := json.NewDecoder(resp.Body).Decode(&st); err != nil {
			t.Fatalf("decode response failed: %v", err)
		}

		if !st.Enabled || len(st.Devices) != 1 {
			t.Fatalf("unexpected status: %+v", st)
		}
		if st.Devices[0].BatteryPct == nil || *st.Devices[0].BatteryPct != 85 {
			t.Fatalf("expected battery 85%%, got %+v", st.Devices[0].BatteryPct)
		}
	})

	// 2. POST Toggle
	t.Run("Toggle", func(t *testing.T) {
		resp, err := http.Post(srv.URL+"/api/v1/network/bluetooth/toggle", "application/json", nil)
		if err != nil {
			t.Fatalf("Toggle failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
		}

		var st dbus.BluetoothStatus
		if err := json.NewDecoder(resp.Body).Decode(&st); err != nil {
			t.Fatalf("decode failed: %v", err)
		}
		if st.Enabled != false {
			t.Fatalf("expected Enabled=false after toggle, got %v", st.Enabled)
		}
	})

	// 3. GET Scan
	t.Run("Scan", func(t *testing.T) {
		resp, err := http.Get(srv.URL + "/api/v1/network/bluetooth/scan")
		if err != nil {
			t.Fatalf("Scan failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
		}

		var devs []dbus.BTDevice
		if err := json.NewDecoder(resp.Body).Decode(&devs); err != nil {
			t.Fatalf("decode failed: %v", err)
		}
		if len(devs) != 1 || devs[0].Address != "11:22:33:44:55:66" {
			t.Fatalf("unexpected scan results: %+v", devs)
		}
	})

	// 4. POST Pair
	t.Run("Pair", func(t *testing.T) {
		resp, err := http.Post(srv.URL+"/api/v1/network/bluetooth/pair/11:22:33:44:55:66", "application/json", nil)
		if err != nil {
			t.Fatalf("Pair failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
		}
		if mock.lastPaired != "11:22:33:44:55:66" {
			t.Fatalf("expected paired addr 11:22:33:44:55:66, got %s", mock.lastPaired)
		}
	})

	// 5. POST Connect
	t.Run("Connect", func(t *testing.T) {
		resp, err := http.Post(srv.URL+"/api/v1/network/bluetooth/connect/AA:BB:CC:DD:EE:FF", "application/json", nil)
		if err != nil {
			t.Fatalf("Connect failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
		}
		if mock.lastConnected != "AA:BB:CC:DD:EE:FF" {
			t.Fatalf("expected connected addr AA:BB:CC:DD:EE:FF, got %s", mock.lastConnected)
		}
	})

	// 6. POST Disconnect
	t.Run("Disconnect", func(t *testing.T) {
		resp, err := http.Post(srv.URL+"/api/v1/network/bluetooth/disconnect/AA:BB:CC:DD:EE:FF", "application/json", nil)
		if err != nil {
			t.Fatalf("Disconnect failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
		}
		if mock.lastDisconnect != "AA:BB:CC:DD:EE:FF" {
			t.Fatalf("expected disconnect addr AA:BB:CC:DD:EE:FF, got %s", mock.lastDisconnect)
		}
	})

	// 7. DELETE Remove
	t.Run("Remove", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodDelete, srv.URL+"/api/v1/network/bluetooth/device/AA:BB:CC:DD:EE:FF", nil)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("Remove failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
		}
		if mock.lastRemoved != "AA:BB:CC:DD:EE:FF" {
			t.Fatalf("expected remove addr AA:BB:CC:DD:EE:FF, got %s", mock.lastRemoved)
		}
	})

	// 8. Error handling
	t.Run("Errors", func(t *testing.T) {
		mock.pairErr = errors.New("pairing timeout")
		resp, err := http.Post(srv.URL+"/api/v1/network/bluetooth/pair/99:99:99:99:99:99", "application/json", nil)
		if err != nil {
			t.Fatalf("Pair err request failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusServiceUnavailable {
			t.Fatalf("expected 503 Service Unavailable, got %d", resp.StatusCode)
		}
	})
}
