package dbus

import (
	"context"
	"fmt"

	"github.com/godbus/dbus/v5"
)

const (
	systemdBus     = "org.freedesktop.systemd1"
	systemdPath    = "/org/freedesktop/systemd1"
	systemdManager = "org.freedesktop.systemd1.Manager"
)

// systemdClient is the concrete SystemdClient implementation.
type systemdClient struct {
	conn *dbus.Conn
}

// NewSystemdClient connects to the system D-Bus and returns a SystemdClient.
func NewSystemdClient() (SystemdClient, error) {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		return nil, fmt.Errorf("connect system D-Bus: %w", err)
	}
	return &systemdClient{conn: conn}, nil
}

// ListUnits calls org.freedesktop.systemd1.Manager.ListUnits and returns all units.
func (s *systemdClient) ListUnits(_ context.Context) ([]ServiceUnit, error) {
	obj := s.conn.Object(systemdBus, dbus.ObjectPath(systemdPath))

	// ListUnits returns an array of structs:
	// (name, description, load_state, active_state, sub_state,
	//  followed_unit, object_path, job_id, job_type, job_object_path)
	var raw []struct {
		Name            string
		Description     string
		LoadState       string
		ActiveState     string
		SubState        string
		FollowedUnit    string
		ObjectPath      dbus.ObjectPath
		JobID           uint32
		JobType         string
		JobObjectPath   dbus.ObjectPath
	}

	err := obj.Call(systemdManager+".ListUnits", 0).Store(&raw)
	if err != nil {
		return nil, fmt.Errorf("ListUnits D-Bus call: %w", err)
	}

	units := make([]ServiceUnit, 0, len(raw))
	for _, r := range raw {
		// Fetch unit file state separately (not in ListUnits result).
		unitFileState := unitFileStateFor(s.conn, r.Name)
		units = append(units, ServiceUnit{
			Name:          r.Name,
			Description:   r.Description,
			LoadState:     r.LoadState,
			ActiveState:   r.ActiveState,
			SubState:      r.SubState,
			UnitFileState: unitFileState,
		})
	}
	return units, nil
}

// unitFileStateFor queries the UnitFileState property for a given unit name.
// Returns an empty string on error — non-fatal, some units have no file state.
func unitFileStateFor(conn *dbus.Conn, name string) string {
	obj := conn.Object(systemdBus, dbus.ObjectPath(systemdPath))
	var paths []dbus.ObjectPath
	err := obj.Call(systemdManager+".LoadUnit", 0, name).Store(&paths)
	if err != nil || len(paths) == 0 {
		return ""
	}
	unitObj := conn.Object(systemdBus, paths[0])
	v, err := unitObj.GetProperty("org.freedesktop.systemd1.Unit.UnitFileState")
	if err != nil {
		return ""
	}
	s, _ := v.Value().(string)
	return s
}

// StartUnit starts the given unit via D-Bus.
func (s *systemdClient) StartUnit(_ context.Context, unit string) error {
	return s.managerCall("StartUnit", unit, "replace")
}

// StopUnit stops the given unit via D-Bus.
func (s *systemdClient) StopUnit(_ context.Context, unit string) error {
	return s.managerCall("StopUnit", unit, "replace")
}

// EnableUnit enables the given unit file.
func (s *systemdClient) EnableUnit(_ context.Context, unit string) error {
	obj := s.conn.Object(systemdBus, dbus.ObjectPath(systemdPath))
	var (
		carries bool
		changes []struct{ Type, Path, Source string }
	)
	err := obj.Call(systemdManager+".EnableUnitFiles", 0,
		[]string{unit}, false, true).Store(&carries, &changes)
	if err != nil {
		return fmt.Errorf("EnableUnitFiles(%q): %w", unit, err)
	}
	return nil
}

// DisableUnit disables the given unit file.
func (s *systemdClient) DisableUnit(_ context.Context, unit string) error {
	obj := s.conn.Object(systemdBus, dbus.ObjectPath(systemdPath))
	var changes []struct{ Type, Path, Source string }
	err := obj.Call(systemdManager+".DisableUnitFiles", 0,
		[]string{unit}, false).Store(&changes)
	if err != nil {
		return fmt.Errorf("DisableUnitFiles(%q): %w", unit, err)
	}
	return nil
}

// HealthCheck verifies the D-Bus connection is alive by fetching the systemd version.
func (s *systemdClient) HealthCheck(_ context.Context) error {
	obj := s.conn.Object(systemdBus, dbus.ObjectPath(systemdPath))
	v, err := obj.GetProperty(systemdManager + ".Version")
	if err != nil {
		return fmt.Errorf("systemd health check: %w", err)
	}
	if v.Value() == nil {
		return fmt.Errorf("systemd health check: nil version")
	}
	return nil
}

// managerCall is a helper for unit control operations that take (name, mode).
func (s *systemdClient) managerCall(method, unit, mode string) error {
	obj := s.conn.Object(systemdBus, dbus.ObjectPath(systemdPath))
	var jobPath dbus.ObjectPath
	err := obj.Call(systemdManager+"."+method, 0, unit, mode).Store(&jobPath)
	if err != nil {
		return fmt.Errorf("%s(%q): %w", method, unit, err)
	}
	return nil
}
