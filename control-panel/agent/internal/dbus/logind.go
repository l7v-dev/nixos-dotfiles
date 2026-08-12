package dbus

import (
	"github.com/godbus/dbus/v5"
)

// PowerState represents system power state
type PowerState struct {
	CanShutdown bool
	CanReboot   bool
	CanSuspend  bool
	CanHibernate bool
}

// GetPowerState returns available power actions
func GetPowerState() (*PowerState, error) {
	conn, err := dbus.SystemBus()
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	logind := conn.Object("org.freedesktop.login1", "/org/freedesktop/login1")

	var canShutdown, canReboot, canSuspend, canHibernate string
	err = logind.Call("org.freedesktop.login1.Manager.CanPowerOff", 0).Store(&canShutdown)
	if err != nil {
		canShutdown = "no"
	}
	err = logind.Call("org.freedesktop.login1.Manager.CanReboot", 0).Store(&canReboot)
	if err != nil {
		canReboot = "no"
	}
	err = logind.Call("org.freedesktop.login1.Manager.CanSuspend", 0).Store(&canSuspend)
	if err != nil {
		canSuspend = "no"
	}
	err = logind.Call("org.freedesktop.login1.Manager.CanHibernate", 0).Store(&canHibernate)
	if err != nil {
		canHibernate = "no"
	}

	return &PowerState{
		CanShutdown:  canShutdown == "yes",
		CanReboot:    canReboot == "yes",
		CanSuspend:   canSuspend == "yes",
		CanHibernate: canHibernate == "yes",
	}, nil
}

// Shutdown initiates system shutdown
func Shutdown() error {
	conn, err := dbus.SystemBus()
	if err != nil {
		return err
	}
	defer conn.Close()

	logind := conn.Object("org.freedesktop.login1", "/org/freedesktop/login1")
	return logind.Call("org.freedesktop.login1.Manager.PowerOff", 0, true).Store()
}

// Reboot initiates system reboot
func Reboot() error {
	conn, err := dbus.SystemBus()
	if err != nil {
		return err
	}
	defer conn.Close()

	logind := conn.Object("org.freedesktop.login1", "/org/freedesktop/login1")
	return logind.Call("org.freedesktop.login1.Manager.Reboot", 0, true).Store()
}

// Sleep initiates system suspend
func Sleep() error {
	conn, err := dbus.SystemBus()
	if err != nil {
		return err
	}
	defer conn.Close()

	logind := conn.Object("org.freedesktop.login1", "/org/freedesktop/login1")
	return logind.Call("org.freedesktop.login1.Manager.Suspend", 0, true).Store()
}
