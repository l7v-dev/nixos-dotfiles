package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// PowerStatus represents the host's current power supply state.
type PowerStatus struct {
	// ACOnline is true when the AC adapter is plugged in.
	ACOnline bool `json:"ac_online"`
	// Batteries lists all detected battery supplies. Empty on AC-only servers.
	Batteries []BatteryInfo `json:"batteries"`
}

// BatteryInfo holds the state of a single battery.
type BatteryInfo struct {
	Name       string  `json:"name"`
	Status     string  `json:"status"`      // Charging | Discharging | Full | Unknown
	CapacityPct int    `json:"capacity_pct"` // 0–100 from /capacity
	EnergyNowUwh  *int64 `json:"energy_now_uwh,omitempty"`  // µWh
	EnergyFullUwh *int64 `json:"energy_full_uwh,omitempty"` // µWh
	PowerNowUw    *int64 `json:"power_now_uw,omitempty"`    // µW (current draw/charge rate)
	// TimeRemainingMin is estimated minutes remaining (discharge or until full).
	// nil when the estimate is not possible (e.g. power_now == 0).
	TimeRemainingMin *int64 `json:"time_remaining_min,omitempty"`
}

const powerSupplyBase = "/sys/class/power_supply"

// powerStatusHandler handles GET /api/v1/power/status.
func powerStatusHandler(_ Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		status, err := readPowerStatus()
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"message": err.Error(),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(status) //nolint:errcheck
	}
}

// readPowerStatus scans /sys/class/power_supply and returns current power state.
func readPowerStatus() (*PowerStatus, error) {
	entries, err := os.ReadDir(powerSupplyBase)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", powerSupplyBase, err)
	}

	ps := &PowerStatus{
		Batteries: []BatteryInfo{},
	}

	for _, entry := range entries {
		dir := filepath.Join(powerSupplyBase, entry.Name())
		supplyType := strings.TrimSpace(readFile(dir, "type"))

		switch supplyType {
		case "Mains":
			// AC adapter — online == "1" means plugged in.
			ps.ACOnline = readFile(dir, "online") == "1"

		case "Battery":
			bat := BatteryInfo{
				Name:   entry.Name(),
				Status: strings.TrimSpace(readFile(dir, "status")),
			}

			if v := parseInt(readFile(dir, "capacity")); v != nil {
				bat.CapacityPct = int(*v)
			}
			bat.EnergyNowUwh  = parseInt64(readFile(dir, "energy_now"))
			bat.EnergyFullUwh = parseInt64(readFile(dir, "energy_full"))
			bat.PowerNowUw    = parseInt64(readFile(dir, "power_now"))

			// Estimate time remaining.
			if bat.PowerNowUw != nil && *bat.PowerNowUw > 0 &&
				bat.EnergyNowUwh != nil && bat.EnergyFullUwh != nil {
				switch bat.Status {
				case "Discharging":
					// time_remaining = energy_now / power_now (hours) → minutes
					mins := int64(*bat.EnergyNowUwh * 60 / *bat.PowerNowUw)
					bat.TimeRemainingMin = &mins
				case "Charging":
					remaining := *bat.EnergyFullUwh - *bat.EnergyNowUwh
					if remaining > 0 {
						mins := int64(remaining * 60 / *bat.PowerNowUw)
						bat.TimeRemainingMin = &mins
					}
				}
			}

			ps.Batteries = append(ps.Batteries, bat)
		}
	}

	return ps, nil
}

// readFile reads a sysfs attribute file and returns its trimmed content.
// Returns "" on any error (missing file, permission denied, etc.).
func readFile(dir, attr string) string {
	data, err := os.ReadFile(filepath.Join(dir, attr))
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}

func parseInt(s string) *int {
	if s == "" {
		return nil
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return nil
	}
	return &v
}

func parseInt64(s string) *int64 {
	if s == "" {
		return nil
	}
	v, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return nil
	}
	return &v
}
