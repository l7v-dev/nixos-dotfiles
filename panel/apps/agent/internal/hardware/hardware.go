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
	PowerProfile      string          `json:"power_profile"`      // "performance", "balanced", "powersave", "auto"
	CPUGovernor       string          `json:"cpu_governor"`       // e.g. "powersave", "performance", "schedutil"
	AvailableProfiles []string        `json:"available_profiles"` // ["performance", "balanced", "powersave"]
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
		CPUTempC:          45.0,
		Sensors:           make([]ThermalSensor, 0),
		Fans:              make([]FanSensor, 0),
		PowerProfile:      "balanced",
		CPUGovernor:       "powersave",
		AvailableProfiles: []string{"performance", "balanced", "powersave"},
	}

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
				if milliC, err := strconv.ParseFloat(strings.TrimSpace(string(valBytes)), 64); err == nil {
					tempC := milliC / 1000.0
					sensor := ThermalSensor{
						Name:  sensorLabel,
						TempC: tempC,
					}

					critBytes, err := os.ReadFile(filepath.Join(dir, prefix+"_crit"))
					if err == nil {
						if critMilli, err := strconv.ParseFloat(strings.TrimSpace(string(critBytes)), 64); err == nil {
							sensor.Critical = critMilli / 1000.0
						}
					}

					status.Sensors = append(status.Sensors, sensor)

					// Best match for CPU temp
					lowerName := strings.ToLower(sensorLabel)
					if strings.Contains(lowerName, "cpu") || strings.Contains(lowerName, "tctl") || strings.Contains(lowerName, "core") || strings.Contains(lowerName, "k10temp") {
						status.CPUTempC = tempC
					} else if strings.Contains(lowerName, "gpu") || strings.Contains(lowerName, "amdgpu") || strings.Contains(lowerName, "edge") {
						gpuVal := tempC
						status.GPUTempC = &gpuVal
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

	// 2. Read CPU scaling governor
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

	// 3. Check auto-cpufreq status if available
	if _, err := exec.LookPath("auto-cpufreq"); err == nil {
		status.PowerProfile = "auto"
	}

	return status, nil
}

// SetPowerProfile sets the CPU governor or power-profiles-daemon mode.
func (c *systemHardwareClient) SetPowerProfile(ctx context.Context, profile string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	governor := "powersave"
	switch profile {
	case "performance":
		governor = "performance"
	case "powersave":
		governor = "powersave"
	case "balanced", "auto":
		governor = "schedutil"
	default:
		governor = "powersave"
	}

	// Set scaling_governor for all CPUs
	govFiles, _ := filepath.Glob("/sys/devices/system/cpu/cpu*/cpufreq/scaling_governor")
	for _, f := range govFiles {
		_ = os.WriteFile(f, []byte(governor), 0644)
	}

	// If powerprofilesctl is available, also notify it
	if _, err := exec.LookPath("powerprofilesctl"); err == nil {
		ppdProfile := "balanced"
		if profile == "performance" {
			ppdProfile = "performance"
		} else if profile == "powersave" {
			ppdProfile = "power-saver"
		}
		_ = exec.CommandContext(ctx, "powerprofilesctl", "set", ppdProfile).Run()
	}

	return nil
}
