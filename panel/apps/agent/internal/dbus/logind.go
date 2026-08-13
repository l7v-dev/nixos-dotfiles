package dbus

import (
	"context"
	"fmt"

	"github.com/godbus/dbus/v5"
)

const (
	logindBus     = "org.freedesktop.login1"
	logindPath    = "/org/freedesktop/login1"
	logindManager = "org.freedesktop.login1.Manager"
)

// logindClient is the concrete LogindClient implementation.
type logindClient struct {
	conn *dbus.Conn
}

// NewLogindClient connects to the system D-Bus and returns a LogindClient.
func NewLogindClient() (LogindClient, error) {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		return nil, fmt.Errorf("connect system D-Bus (logind): %w", err)
	}
	return &logindClient{conn: conn}, nil
}

// PowerOff invokes org.freedesktop.login1.Manager.PowerOff with interactive=false.
func (l *logindClient) PowerOff(_ context.Context) error {
	return l.call("PowerOff")
}

// Reboot invokes org.freedesktop.login1.Manager.Reboot with interactive=false.
func (l *logindClient) Reboot(_ context.Context) error {
	return l.call("Reboot")
}

// Suspend invokes org.freedesktop.login1.Manager.Suspend with interactive=false.
func (l *logindClient) Suspend(_ context.Context) error {
	return l.call("Suspend")
}

// HealthCheck verifies the logind D-Bus object is reachable.
func (l *logindClient) HealthCheck(_ context.Context) error {
	obj := l.conn.Object(logindBus, dbus.ObjectPath(logindPath))
	_, err := obj.GetProperty(logindManager + ".NAutoVTs")
	if err != nil {
		return fmt.Errorf("logind health check: %w", err)
	}
	return nil
}

// call invokes a logind Manager method with interactive=false.
func (l *logindClient) call(method string) error {
	obj := l.conn.Object(logindBus, dbus.ObjectPath(logindPath))
	err := obj.Call(logindManager+"."+method, 0, false).Err
	if err != nil {
		return fmt.Errorf("%s: %w", method, err)
	}
	return nil
}
