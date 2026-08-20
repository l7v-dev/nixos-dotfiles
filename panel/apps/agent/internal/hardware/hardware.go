package hardware

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
)

// ThermalSensor represents a temperature reading in Celsius.
type ThermalSensor struct {
	Name     string  `json:"name"`
	TempC    float64 `json:"temp_c"`
	Critical float64 `json:"critical,omitempty"`
}

// FanSensor represents a fan speed reading in RPM.
type FanSensor struct {
	Name string `json:"name"`
	RPM  int    `json:"rpm"`
}

// Status holds complete hardware thermal and power profile information.
type Status struct {
	CPUTempC          float64         `json:"cpu_temp_c"`
	GPUTempC          *float64        `json:"gpu_temp_c,omitempty"`
	Sensors           []ThermalSensor `json:"sensors"`
	Fans              []FanSensor     `json:"fans"`
	PowerProfile      string          `json:"power_profile"`                 // "performance", "balanced", "powersave", "auto"
	CPUGovernor       string          `json:"cpu_governor"`                  // e.g. "powersave", "performance", "schedutil"
	PlatformProfile   *string         `json:"platform_profile,omitempty"`    // e.g. "performance", "balanced", "low-power"
	EPP               *string         `json:"epp,omitempty"`                 // energy_performance_preference
	AvailableProfiles []string        `json:"available_profiles"`            // ["performance", "balanced", "powersave", "auto"]
}

// Client defines the interface for hardware monitoring and power profile control.
type Client interface {
	GetStatus(ctx context.Context) (*Status, error)
	SetPowerProfile(ctx context.Context, profile string) error
}

type systemHardwareClient struct {
	mu sync.Mutex
}

// NewClient creates a new hardware management client.
func NewClient() Client {
	return &systemHardwareClient{}
}

// GetStatus reads thermal sensors, fans, and active power profiles from sysfs and system services.
func (c *systemHardwareClient) GetStatus(ctx context.Context) (*Status, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	status := &Status{
		CPUTempC:          0.0,
		Sensors:           make([]ThermalSensor, 0),
		Fans:              make([]FanSensor, 0),
		PowerProfile:      "balanced",
		CPUGovernor:       "powersave",
		AvailableProfiles: []string{"performance", "balanced", "powersave"},
	}

	var bestCPUTemp float64
	var bestCPUPriority int // 3: Package/Tctl/Tdie, 2: Core/CPU match, 1: generic sensor max
	var maxSensorTemp float64

	// 1. Read hwmon temperatures
	hwmonDirs, _ := filepath.Glob("/sys/class/hwmon/hwmon*")
	for _, dir := range hwmonDirs {
		nameBytes, _ := os.ReadFile(filepath.Join(dir, "name"))
		chipName := strings.TrimSpace(string(nameBytes))

		// Find all temp*_input files
		tempInputs, _ := filepath.Glob(filepath.Join(dir, "temp*_input"))
		for _, inputPath := range tempInputs {
			base := filepath.Base(inputPath)
			prefix := strings.TrimSuffix(base, "_input")

			labelBytes, err := os.ReadFile(filepath.Join(dir, prefix+"_label"))
			sensorLabel := chipName
			if err == nil && len(labelBytes) > 0 {
				sensorLabel = chipName + " " + strings.TrimSpace(string(labelBytes))
			} else {
				sensorLabel = chipName + " " + prefix
			}

			valBytes, err := os.ReadFile(inputPath)
			if err == nil {
				if milliC, err := strconv.ParseFloat(strings.TrimSpace(string(valBytes)), 64); err == nil && milliC > 0 {
					tempC := milliC / 1000.0
					sensor := ThermalSensor{
						Name:  sensorLabel,
						TempC: tempC,
					}

					critBytes, err := os.ReadFile(filepath.Join(dir, prefix+"_crit"))
					if err == nil {
						if critMilli, err := strconv.ParseFloat(strings.TrimSpace(string(critBytes)), 64); err == nil && critMilli > 0 {
							sensor.Critical = critMilli / 1000.0
						}
					}

					status.Sensors = append(status.Sensors, sensor)

					if tempC > maxSensorTemp {
						maxSensorTemp = tempC
					}

					lowerName := strings.ToLower(sensorLabel)
					if strings.Contains(lowerName, "package id 0") || strings.Contains(lowerName, "tctl") || strings.Contains(lowerName, "tdie") {
						if bestCPUPriority < 3 || tempC > bestCPUTemp {
							bestCPUTemp = tempC
							bestCPUPriority = 3
						}
					} else if strings.Contains(lowerName, "cpu") || strings.Contains(lowerName, "core") || strings.Contains(lowerName, "k10temp") {
						if bestCPUPriority < 2 || (bestCPUPriority == 2 && tempC > bestCPUTemp) {
							bestCPUTemp = tempC
							bestCPUPriority = 2
						}
					} else if strings.Contains(lowerName, "gpu") || strings.Contains(lowerName, "amdgpu") || strings.Contains(lowerName, "nouveau") || strings.Contains(lowerName, "nvidia") || strings.Contains(lowerName, "edge") || strings.Contains(lowerName, "junction") {
						if status.GPUTempC == nil || tempC > *status.GPUTempC {
							gpuVal := tempC
							status.GPUTempC = &gpuVal
						}
					}
				}
			}
		}

		// Find fan*_input files
		fanInputs, _ := filepath.Glob(filepath.Join(dir, "fan*_input"))
		for _, fanPath := range fanInputs {
			base := filepath.Base(fanPath)
			prefix := strings.TrimSuffix(base, "_input")
			valBytes, err := os.ReadFile(fanPath)
			if err == nil {
				if rpm, err := strconv.Atoi(strings.TrimSpace(string(valBytes))); err == nil {
					status.Fans = append(status.Fans, FanSensor{
						Name: chipName + " " + prefix,
						RPM:  rpm,
					})
				}
			}
		}
	}

	// 2. Fallback to /sys/class/thermal/thermal_zone* if no hwmon sensors or CPU temp not found
	if len(status.Sensors) == 0 || bestCPUPriority == 0 {
		tzDirs, _ := filepath.Glob("/sys/class/thermal/thermal_zone*")
		for _, tzDir := range tzDirs {
			typeBytes, _ := os.ReadFile(filepath.Join(tzDir, "type"))
			tzType := strings.TrimSpace(string(typeBytes))
			if tzType == "" {
				tzType = filepath.Base(tzDir)
			}

			tempBytes, err := os.ReadFile(filepath.Join(tzDir, "temp"))
			if err == nil {
				if milliC, err := strconv.ParseFloat(strings.TrimSpace(string(tempBytes)), 64); err == nil && milliC > 0 {
					tempC := milliC / 1000.0
					sensor := ThermalSensor{
						Name:  tzType,
						TempC: tempC,
					}
					status.Sensors = append(status.Sensors, sensor)

					if tempC > maxSensorTemp {
						maxSensorTemp = tempC
					}

					lowerType := strings.ToLower(tzType)
					if strings.Contains(lowerType, "x86_pkg_temp") || strings.Contains(lowerType, "cpu") || strings.Contains(lowerType, "soc") {
						if bestCPUPriority < 2 || tempC > bestCPUTemp {
							bestCPUTemp = tempC
							bestCPUPriority = 2
						}
					}
				}
			}
		}
	}

	// Resolve final CPU Temp
	if bestCPUTemp > 0 {
		status.CPUTempC = bestCPUTemp
	} else if maxSensorTemp > 0 {
		status.CPUTempC = maxSensorTemp
	} else {
		status.CPUTempC = 45.0 // fallback nominal if no sensors exist
	}

	// 3. Read CPU scaling governor
	govBytes, err := os.ReadFile("/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor")
	if err == nil {
		status.CPUGovernor = strings.TrimSpace(string(govBytes))
		if status.CPUGovernor == "performance" {
			status.PowerProfile = "performance"
		} else if status.CPUGovernor == "powersave" {
			status.PowerProfile = "powersave"
		} else {
			status.PowerProfile = "balanced"
		}
	}

	// 4. Read Energy Performance Preference (EPP) if available (AMD / Intel P-State)
	if eppBytes, err := os.ReadFile("/sys/devices/system/cpu/cpu0/cpufreq/energy_performance_preference"); err == nil {
		epp := strings.TrimSpace(string(eppBytes))
		if epp != "" {
			status.EPP = &epp
			switch epp {
			case "performance":
				status.PowerProfile = "performance"
			case "power", "balance_power":
				status.PowerProfile = "powersave"
			case "balance_performance", "default":
				status.PowerProfile = "balanced"
			}
		}
	}

	// 5. Read ACPI Platform Profile if available (ASUS, Lenovo ThinkPad, Dell, Framework, etc.)
	if platBytes, err := os.ReadFile("/sys/firmware/acpi/platform_profile"); err == nil {
		plat := strings.TrimSpace(string(platBytes))
		if plat != "" {
			status.PlatformProfile = &plat
			switch plat {
			case "performance":
				status.PowerProfile = "performance"
			case "low-power", "quiet":
				status.PowerProfile = "powersave"
			case "balanced", "balanced-performance":
				status.PowerProfile = "balanced"
			}
		}
	}

	// 6. Query powerprofilesctl if active
	if _, err := exec.LookPath("powerprofilesctl"); err == nil {
		cmd := exec.CommandContext(ctx, "powerprofilesctl", "get")
		if out, err := cmd.Output(); err == nil {
			ppd := strings.TrimSpace(string(out))
			switch ppd {
			case "performance":
				status.PowerProfile = "performance"
			case "power-saver":
				status.PowerProfile = "powersave"
			case "balanced":
				status.PowerProfile = "balanced"
			}
		}
	}

	// 7. Check auto-cpufreq service active state (only if actually active service)
	if isAutoCpuFreqActive(ctx) {
		status.PowerProfile = "auto"
		if !contains(status.AvailableProfiles, "auto") {
			status.AvailableProfiles = append(status.AvailableProfiles, "auto")
		}
	}

	return status, nil
}

// SetPowerProfile sets the CPU governor, EPP, ACPI platform profile, or power-profiles-daemon mode.
func (c *systemHardwareClient) SetPowerProfile(ctx context.Context, profile string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	governor := "powersave"
	epp := "balance_performance"
	platformProfile := "balanced"
	ppdProfile := "balanced"

	switch profile {
	case "performance":
		governor = "performance"
		epp = "performance"
		platformProfile = "performance"
		ppdProfile = "performance"
	case "powersave":
		governor = "powersave"
		epp = "power"
		platformProfile = "low-power"
		ppdProfile = "power-saver"
	case "balanced", "auto":
		governor = "schedutil"
		epp = "balance_performance"
		platformProfile = "balanced"
		ppdProfile = "balanced"
	default:
		governor = "powersave"
		epp = "balance_performance"
		platformProfile = "balanced"
		ppdProfile = "balanced"
	}

	// 1. If powerprofilesctl is available, prioritize notifying power-profiles-daemon over D-Bus
	if _, err := exec.LookPath("powerprofilesctl"); err == nil {
		_ = exec.CommandContext(ctx, "powerprofilesctl", "set", ppdProfile).Run()
	}

	// 2. Set ACPI platform profile if supported
	if _, err := os.Stat("/sys/firmware/acpi/platform_profile"); err == nil {
		// Read available choices to pick exact matching string
		if choicesBytes, err := os.ReadFile("/sys/firmware/acpi/platform_profile_choices"); err == nil {
			choices := string(choicesBytes)
			if profile == "powersave" && !strings.Contains(choices, "low-power") && strings.Contains(choices, "quiet") {
				platformProfile = "quiet"
			}
		}
		_ = os.WriteFile("/sys/firmware/acpi/platform_profile", []byte(platformProfile), 0644)
	}

	// 3. Set energy_performance_preference for all CPUs if available
	eppFiles, _ := filepath.Glob("/sys/devices/system/cpu/cpu*/cpufreq/energy_performance_preference")
	for _, f := range eppFiles {
		_ = os.WriteFile(f, []byte(epp), 0644)
	}

	// 4. Set scaling_governor for all CPUs
	govFiles, _ := filepath.Glob("/sys/devices/system/cpu/cpu*/cpufreq/scaling_governor")
	for _, f := range govFiles {
		_ = os.WriteFile(f, []byte(governor), 0644)
	}

	return nil
}

func isAutoCpuFreqActive(ctx context.Context) bool {
	cmd := exec.CommandContext(ctx, "systemctl", "is-active", "--quiet", "auto-cpufreq.service")
	return cmd.Run() == nil
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
