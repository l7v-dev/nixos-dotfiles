package dbus

import (
	"github.com/godbus/dbus/v5"
)

// SystemdService represents a systemd unit
type SystemdService struct {
	Name      string
	State     string
	SubState  string
	LoadState string
}

// ListServices returns all systemd services
func ListServices() ([]SystemdService, error) {
	conn, err := dbus.SystemBus()
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	systemd := conn.Object("org.freedesktop.systemd1", "/org/freedesktop/systemd1")

	var units [][]interface{}
	err = systemd.Call("org.freedesktop.systemd1.Manager.ListUnits", 0).Store(&units)
	if err != nil {
		return nil, err
	}

	services := make([]SystemdService, 0, len(units))
	for _, unit := range units {
		services = append(services, SystemdService{
			Name:      unit[0].(string),
			State:     unit[2].(string),
			SubState:  unit[3].(string),
			LoadState: unit[4].(string),
		})
	}

	return services, nil
}

// StartService starts a systemd service
func StartService(name string) error {
	conn, err := dbus.SystemBus()
	if err != nil {
		return err
	}
	defer conn.Close()

	systemd := conn.Object("org.freedesktop.systemd1", "/org/freedesktop/systemd1")
	return systemd.Call("org.freedesktop.systemd1.Manager.StartUnit", 0, name, "fail").Store()
}

// StopService stops a systemd service
func StopService(name string) error {
	conn, err := dbus.SystemBus()
	if err != nil {
		return err
	}
	defer conn.Close()

	systemd := conn.Object("org.freedesktop.systemd1", "/org/freedesktop/systemd1")
	return systemd.Call("org.freedesktop.systemd1.Manager.StopUnit", 0, name, "fail").Store()
}

// RestartService restarts a systemd service
func RestartService(name string) error {
	conn, err := dbus.SystemBus()
	if err != nil {
		return err
	}
	defer conn.Close()

	systemd := conn.Object("org.freedesktop.systemd1", "/org/freedesktop/systemd1")
	return systemd.Call("org.freedesktop.systemd1.Manager.RestartUnit", 0, name, "fail").Store()
}
