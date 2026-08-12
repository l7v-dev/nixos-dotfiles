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

// --- Bluetooth stub ---

type stubBluetooth struct{}

func (s *stubBluetooth) GetBluetoothStatus(_ context.Context) (*dbus.BluetoothStatus, error) {
	return &dbus.BluetoothStatus{Enabled: false, Devices: []dbus.BTDevice{}}, nil
}
func (s *stubBluetooth) ToggleBluetooth(_ context.Context) error {
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
