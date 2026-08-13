package dbus

import (
	"context"
	"fmt"
	"time"

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

// Hibernate invokes org.freedesktop.login1.Manager.Hibernate with interactive=false.
func (l *logindClient) Hibernate(_ context.Context) error {
	return l.call("Hibernate")
}

// HybridSleep invokes org.freedesktop.login1.Manager.HybridSleep with interactive=false.
func (l *logindClient) HybridSleep(_ context.Context) error {
	return l.call("HybridSleep")
}

// GetCapabilities queries logind for which power actions are supported on this host.
// logind returns "yes", "no", "challenge", or "na" — we map anything other than "yes" to false.
func (l *logindClient) GetCapabilities(_ context.Context) (*PowerCapabilities, error) {
	obj := l.conn.Object(logindBus, dbus.ObjectPath(logindPath))

	can := func(method string) bool {
		var result string
		err := obj.Call(logindManager+"."+method, 0).Store(&result)
		if err != nil {
			return false
		}
		return result == "yes"
	}

	return &PowerCapabilities{
		CanPowerOff:    can("CanPowerOff"),
		CanReboot:      can("CanReboot"),
		CanSuspend:     can("CanSuspend"),
		CanHibernate:   can("CanHibernate"),
		CanHybridSleep: can("CanHybridSleep"),
	}, nil
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

// ScheduleShutdown calls org.freedesktop.login1.Manager.ScheduleShutdown.
// action is one of "poweroff", "reboot", "halt" (logind uses "poweroff" not "shutdown").
// usec is microseconds since Unix epoch.
func (l *logindClient) ScheduleShutdown(_ context.Context, action string, usec uint64) error {
	// logind uses "poweroff" not "shutdown"
	if action == "shutdown" {
		action = "poweroff"
	}
	obj := l.conn.Object(logindBus, dbus.ObjectPath(logindPath))
	err := obj.Call(logindManager+".ScheduleShutdown", 0, action, usec).Err
	if err != nil {
		return fmt.Errorf("ScheduleShutdown(%s): %w", action, err)
	}
	return nil
}

// CancelScheduledShutdown calls org.freedesktop.login1.Manager.CancelScheduledShutdown.
func (l *logindClient) CancelScheduledShutdown(_ context.Context) error {
	obj := l.conn.Object(logindBus, dbus.ObjectPath(logindPath))
	err := obj.Call(logindManager+".CancelScheduledShutdown", 0).Err
	if err != nil {
		return fmt.Errorf("CancelScheduledShutdown: %w", err)
	}
	return nil
}

// GetScheduledShutdown reads the ScheduledShutdown property from logind.
// Returns a ScheduledShutdownInfo with Scheduled=false when nothing is scheduled.
func (l *logindClient) GetScheduledShutdown(_ context.Context) (*ScheduledShutdownInfo, error) {
	obj := l.conn.Object(logindBus, dbus.ObjectPath(logindPath))
	v, err := obj.GetProperty(logindManager + ".ScheduledShutdown")
	if err != nil {
		return &ScheduledShutdownInfo{Scheduled: false}, nil
	}

	// Property type is (sa{sv}) — struct{action string, params map[string]variant}
	// We only care about the action string and the usec timestamp.
	val := v.Value()
	type shutdownStruct struct {
		Action string
		Usec   uint64
	}

	s, ok := val.([]interface{})
	if !ok || len(s) < 2 {
		return &ScheduledShutdownInfo{Scheduled: false}, nil
	}

	action, _ := s[0].(string)
	usec, _ := s[1].(uint64)

	if action == "" || usec == 0 {
		return &ScheduledShutdownInfo{Scheduled: false}, nil
	}

	executeAt := time.UnixMicro(int64(usec)).UTC() //nolint:gosec
	remaining := int(time.Until(executeAt).Minutes())
	if remaining < 0 {
		remaining = 0
	}

	return &ScheduledShutdownInfo{
		Scheduled:    true,
		Action:       action,
		ExecuteAt:    executeAt.Format(time.RFC3339),
		RemainingMin: remaining,
	}, nil
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
