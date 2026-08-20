package api

import (
	"encoding/json"
	"fmt"
	"math"
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
	Name                string   `json:"name"`
	Status              string   `json:"status"` // Charging | Discharging | Full | Not charging | Unknown
	CapacityPct         int      `json:"capacity_pct"`
	EnergyNowUwh        *int64   `json:"energy_now_uwh,omitempty"`        // µWh
	EnergyFullUwh       *int64   `json:"energy_full_uwh,omitempty"`       // µWh
	EnergyFullDesignUwh *int64   `json:"energy_full_design_uwh,omitempty"` // µWh
	PowerNowUw          *int64   `json:"power_now_uw,omitempty"`          // µW
	PowerW              *float64 `json:"power_w,omitempty"`               // Watts (live rate)
	VoltageV            *float64 `json:"voltage_v,omitempty"`             // Volts
	HealthPct           *float64 `json:"health_pct,omitempty"`            // 0–100%
	CycleCount          *int     `json:"cycle_count,omitempty"`
	Technology          string   `json:"technology,omitempty"`            // Li-ion, Li-poly, etc.
	Manufacturer        string   `json:"manufacturer,omitempty"`
	ModelName           string   `json:"model_name,omitempty"`
	// TimeRemainingMin is estimated minutes remaining (discharge or until full).
	TimeRemainingMin    *int64   `json:"time_remaining_min,omitempty"`
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
		case "Mains", "USB", "USB_C":
			// AC adapter or USB-C supply — online == "1" means plugged in.
			if readFile(dir, "online") == "1" {
				ps.ACOnline = true
			}

		case "Battery":
			bat := parseBattery(dir, entry.Name())
			ps.Batteries = append(ps.Batteries, bat)
		}
	}

	return ps, nil
}

func parseBattery(dir, name string) BatteryInfo {
	bat := BatteryInfo{
		Name:         name,
		Status:       strings.TrimSpace(readFile(dir, "status")),
		Technology:   strings.TrimSpace(readFile(dir, "technology")),
		Manufacturer: strings.TrimSpace(readFile(dir, "manufacturer")),
		ModelName:    strings.TrimSpace(readFile(dir, "model_name")),
	}

	if bat.Status == "" {
		bat.Status = "Unknown"
	}

	if v := parseInt(readFile(dir, "capacity")); v != nil {
		bat.CapacityPct = *v
	}
	if v := parseInt(readFile(dir, "cycle_count")); v != nil {
		bat.CycleCount = v
	}

	// 1. Read Voltage (voltage_now or voltage_min_design) in µV
	var voltageUv *int64
	if v := parseInt64(readFile(dir, "voltage_now")); v != nil && *v > 0 {
		voltageUv = v
	} else if v := parseInt64(readFile(dir, "voltage_min_design")); v != nil && *v > 0 {
		voltageUv = v
	}

	if voltageUv != nil {
		vVolts := float64(*voltageUv) / 1e6
		bat.VoltageV = &vVolts
	}

	// 2. Read Energy (µWh) directly or compute from Charge (µAh) * Voltage (µV)
	bat.EnergyNowUwh = parseInt64(readFile(dir, "energy_now"))
	if bat.EnergyNowUwh == nil {
		if chargeNow := parseInt64(readFile(dir, "charge_now")); chargeNow != nil && voltageUv != nil {
			calc := (*chargeNow * *voltageUv) / 1e6
			bat.EnergyNowUwh = &calc
		}
	}

	bat.EnergyFullUwh = parseInt64(readFile(dir, "energy_full"))
	if bat.EnergyFullUwh == nil {
		if chargeFull := parseInt64(readFile(dir, "charge_full")); chargeFull != nil && voltageUv != nil {
			calc := (*chargeFull * *voltageUv) / 1e6
			bat.EnergyFullUwh = &calc
		}
	}

	bat.EnergyFullDesignUwh = parseInt64(readFile(dir, "energy_full_design"))
	if bat.EnergyFullDesignUwh == nil {
		if chargeDesign := parseInt64(readFile(dir, "charge_full_design")); chargeDesign != nil && voltageUv != nil {
			calc := (*chargeDesign * *voltageUv) / 1e6
			bat.EnergyFullDesignUwh = &calc
		}
	}

	// 3. Read Power (µW) directly or compute from Current (µA) * Voltage (µV)
	bat.PowerNowUw = parseInt64(readFile(dir, "power_now"))
	if bat.PowerNowUw == nil {
		if currentNow := parseInt64(readFile(dir, "current_now")); currentNow != nil && voltageUv != nil {
			calc := (*currentNow * *voltageUv) / 1e6
			bat.PowerNowUw = &calc
		}
	}

	if bat.PowerNowUw != nil {
		w := math.Abs(float64(*bat.PowerNowUw) / 1e6)
		bat.PowerW = &w
	}

	// 4. Calculate Health %
	if bat.EnergyFullUwh != nil && bat.EnergyFullDesignUwh != nil && *bat.EnergyFullDesignUwh > 0 {
		h := (float64(*bat.EnergyFullUwh) / float64(*bat.EnergyFullDesignUwh)) * 100.0
		if h > 100.0 {
			h = 100.0
		}
		h = math.Round(h*10) / 10
		bat.HealthPct = &h
	}

	// 5. Estimate Time Remaining (Minutes)
	if bat.PowerNowUw != nil && *bat.PowerNowUw > 0 && bat.EnergyNowUwh != nil && bat.EnergyFullUwh != nil {
		switch bat.Status {
		case "Discharging":
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

	return bat
}

// readFile reads a sysfs attribute file and returns its trimmed content.
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
