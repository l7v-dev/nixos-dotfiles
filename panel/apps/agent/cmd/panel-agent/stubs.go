package main

import (
	"context"
	"errors"

	"github.com/l7v/panel-agent/internal/dbus"
	"github.com/l7v/panel-agent/internal/journal"
	"github.com/l7v/panel-agent/internal/metrics"
)

// --- Systemd stub ---

type stubSystemd struct{}

func (s *stubSystemd) ListUnits(_ context.Context) ([]dbus.ServiceUnit, error) {
	return nil, errors.New("stub: systemd not implemented")
}
func (s *stubSystemd) StartUnit(_ context.Context, _ string) error {
	return errors.New("stub: systemd not implemented")
}
func (s *stubSystemd) StopUnit(_ context.Context, _ string) error {
	return errors.New("stub: systemd not implemented")
}
func (s *stubSystemd) RestartUnit(_ context.Context, _ string) error {
	return errors.New("stub: systemd not implemented")
}
func (s *stubSystemd) EnableUnit(_ context.Context, _ string) error {
	return errors.New("stub: systemd not implemented")
}
func (s *stubSystemd) DisableUnit(_ context.Context, _ string) error {
	return errors.New("stub: systemd not implemented")
}
func (s *stubSystemd) HealthCheck(_ context.Context) error {
	return errors.New("stub: systemd not implemented")
}

// --- Logind stub ---

type stubLogind struct{}

func (s *stubLogind) PowerOff(_ context.Context) error    { return errors.New("stub: logind not implemented") }
func (s *stubLogind) Reboot(_ context.Context) error      { return errors.New("stub: logind not implemented") }
func (s *stubLogind) Suspend(_ context.Context) error     { return errors.New("stub: logind not implemented") }
func (s *stubLogind) Hibernate(_ context.Context) error   { return errors.New("stub: logind not implemented") }
func (s *stubLogind) HybridSleep(_ context.Context) error { return errors.New("stub: logind not implemented") }
func (s *stubLogind) GetCapabilities(_ context.Context) (*dbus.PowerCapabilities, error) {
	return &dbus.PowerCapabilities{
		CanPowerOff:    true,
		CanReboot:      true,
		CanSuspend:     true,
		CanHibernate:   false,
		CanHybridSleep: false,
	}, nil
}
func (s *stubLogind) ScheduleShutdown(_ context.Context, _ string, _ uint64) error {
	return nil
}
func (s *stubLogind) CancelScheduledShutdown(_ context.Context) error {
	return nil
}
func (s *stubLogind) GetScheduledShutdown(_ context.Context) (*dbus.ScheduledShutdownInfo, error) {
	return &dbus.ScheduledShutdownInfo{Scheduled: false}, nil
}
func (s *stubLogind) HealthCheck(_ context.Context) error { return errors.New("stub: logind not implemented") }

// --- Network stub ---

type stubNetwork struct{}

func (s *stubNetwork) GetWifiStatus(_ context.Context) (*dbus.WifiStatus, error) {
	disabled := false
	return &dbus.WifiStatus{Enabled: disabled}, nil
}
func (s *stubNetwork) ToggleWifi(_ context.Context) error {
	return errors.New("stub: network not implemented")
}
func (s *stubNetwork) ScanWifi(_ context.Context) ([]dbus.AccessPoint, error) {
	return []dbus.AccessPoint{}, nil
}
func (s *stubNetwork) ConnectWifi(_ context.Context, _, _ string) error {
	return errors.New("stub: network not implemented")
}
func (s *stubNetwork) DisconnectWifi(_ context.Context) error {
	return errors.New("stub: network not implemented")
}
func (s *stubNetwork) GetSavedConnections(_ context.Context) ([]dbus.SavedConnection, error) {
	return []dbus.SavedConnection{}, nil
}
func (s *stubNetwork) DeleteSavedConnection(_ context.Context, _ string) error {
	return errors.New("stub: network not implemented")
}

// --- Bluetooth stub ---

type stubBluetooth struct{}

func (s *stubBluetooth) GetBluetoothStatus(_ context.Context) (*dbus.BluetoothStatus, error) {
	return &dbus.BluetoothStatus{Enabled: false, Devices: []dbus.BTDevice{}}, nil
}
func (s *stubBluetooth) ToggleBluetooth(_ context.Context) error {
	return errors.New("stub: bluetooth not implemented")
}
func (s *stubBluetooth) ScanDevices(_ context.Context) ([]dbus.BTDevice, error) {
	return []dbus.BTDevice{}, nil
}
func (s *stubBluetooth) PairDevice(_ context.Context, _ string) error {
	return errors.New("stub: bluetooth not implemented")
}
func (s *stubBluetooth) ConnectDevice(_ context.Context, _ string) error {
	return errors.New("stub: bluetooth not implemented")
}
func (s *stubBluetooth) DisconnectDevice(_ context.Context, _ string) error {
	return errors.New("stub: bluetooth not implemented")
}
func (s *stubBluetooth) RemoveDevice(_ context.Context, _ string) error {
	return errors.New("stub: bluetooth not implemented")
}

// --- Procfs stub ---

type stubProcfs struct{}

func (s *stubProcfs) ReadSnapshot(_ context.Context) (metrics.MetricsSnapshot, error) {
	return metrics.MetricsSnapshot{}, errors.New("stub: procfs not implemented")
}

// --- Journal stub ---

type stubJournal struct{}

func (s *stubJournal) Tail(_ context.Context, opts journal.TailOptions) {
	opts.Err <- errors.New("stub: journal not implemented")
}
