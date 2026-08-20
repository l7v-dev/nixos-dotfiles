package display

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
)

// NightLightStatus represents the night light / blue light filter state.
type NightLightStatus struct {
	Enabled     bool `json:"enabled"`
	Temperature int  `json:"temperature"` // in Kelvin (e.g. 4500)
}

// DisplayStatus holds current display brightness and night light info.
type DisplayStatus struct {
	BrightnessPct int              `json:"brightness_pct"`
	CanBrightness bool             `json:"can_brightness"`
	DeviceName    string           `json:"device_name,omitempty"`
	NightLight    NightLightStatus `json:"night_light"`
}

// Client defines the interface for display controls.
type Client interface {
	GetStatus(ctx context.Context) (*DisplayStatus, error)
	SetBrightness(ctx context.Context, percent int) error
	SetNightLight(ctx context.Context, enabled bool, tempKelvin int) error
	LockSession(ctx context.Context) error
}

type systemDisplayClient struct {
	mu           sync.Mutex
	cachedNightL NightLightStatus
}

// NewClient creates a new system display client.
func NewClient() Client {
	return &systemDisplayClient{
		cachedNightL: NightLightStatus{
			Enabled:     false,
			Temperature: 4500,
		},
	}
}

// getPrioritizedBacklightDevices returns list of backlight devices sorted by hardware raw capability.
func getPrioritizedBacklightDevices() []string {
	matches, _ := filepath.Glob("/sys/class/backlight/*")
	if len(matches) == 0 {
		return nil
	}

	sort.Slice(matches, func(i, j int) bool {
		baseI := filepath.Base(matches[i])
		baseJ := filepath.Base(matches[j])

		score := func(name string) int {
			switch {
			case strings.HasPrefix(name, "intel_backlight"):
				return 100
			case strings.HasPrefix(name, "amdgpu_bl"):
				return 90
			case strings.HasPrefix(name, "apple-panel-bl"):
				return 85
			case strings.HasPrefix(name, "nvidia_"):
				return 80
			case strings.HasPrefix(name, "acpi_video"):
				return 10
			default:
				return 50
			}
		}
		return score(baseI) > score(baseJ)
	})

	return matches
}

// isNightLightProcessRunning checks if wlsunset or gammastep is active.
func isNightLightProcessRunning(ctx context.Context) bool {
	if err := exec.CommandContext(ctx, "pgrep", "-x", "wlsunset").Run(); err == nil {
		return true
	}
	if err := exec.CommandContext(ctx, "pgrep", "-x", "gammastep").Run(); err == nil {
		return true
	}
	if err := exec.CommandContext(ctx, "pgrep", "-x", "hyprsunset").Run(); err == nil {
		return true
	}
	return false
}

// GetStatus reads current screen brightness and night light configuration.
func (c *systemDisplayClient) GetStatus(ctx context.Context) (*DisplayStatus, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Sync live night light process status
	isLiveRunning := isNightLightProcessRunning(ctx)
	if isLiveRunning {
		c.cachedNightL.Enabled = true
	}

	status := &DisplayStatus{
		BrightnessPct: 100,
		CanBrightness: false,
		NightLight:    c.cachedNightL,
	}

	// 1. Check prioritized /sys/class/backlight
	devices := getPrioritizedBacklightDevices()
	for _, devPath := range devices {
		curBytes, err1 := os.ReadFile(filepath.Join(devPath, "brightness"))
		maxBytes, err2 := os.ReadFile(filepath.Join(devPath, "max_brightness"))

		if err1 == nil && err2 == nil {
			curVal, errC := strconv.Atoi(strings.TrimSpace(string(curBytes)))
			maxVal, errM := strconv.Atoi(strings.TrimSpace(string(maxBytes)))
			if errC == nil && errM == nil && maxVal > 0 {
				status.DeviceName = filepath.Base(devPath)
				status.BrightnessPct = (curVal * 100) / maxVal
				status.CanBrightness = true
				return status, nil
			}
		}
	}

	// 2. Fallback to brightnessctl
	if _, err := exec.LookPath("brightnessctl"); err == nil {
		out, err := exec.CommandContext(ctx, "brightnessctl", "g").Output()
		maxOut, err2 := exec.CommandContext(ctx, "brightnessctl", "m").Output()
		if err == nil && err2 == nil {
			curVal, _ := strconv.Atoi(strings.TrimSpace(string(out)))
			maxVal, _ := strconv.Atoi(strings.TrimSpace(string(maxOut)))
			if maxVal > 0 {
				status.BrightnessPct = (curVal * 100) / maxVal
				status.CanBrightness = true
				status.DeviceName = "brightnessctl"
				return status, nil
			}
		}
	}

	// 3. Fallback to light CLI
	if _, err := exec.LookPath("light"); err == nil {
		out, err := exec.CommandContext(ctx, "light", "-G").Output()
		if err == nil {
			if v, err := strconv.ParseFloat(strings.TrimSpace(string(out)), 64); err == nil {
				status.BrightnessPct = int(v + 0.5)
				status.CanBrightness = true
				status.DeviceName = "light"
				return status, nil
			}
		}
	}

	return status, nil
}

// SetBrightness sets the screen brightness percentage (1 - 100).
func (c *systemDisplayClient) SetBrightness(ctx context.Context, percent int) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if percent < 1 {
		percent = 1
	}
	if percent > 100 {
		percent = 100
	}

	// 1. Try direct sysfs write if accessible
	devices := getPrioritizedBacklightDevices()
	for _, devPath := range devices {
		maxBytes, err := os.ReadFile(filepath.Join(devPath, "max_brightness"))
		if err == nil {
			maxVal, err := strconv.Atoi(strings.TrimSpace(string(maxBytes)))
			if err == nil && maxVal > 0 {
				targetVal := (percent * maxVal) / 100
				if targetVal < 1 {
					targetVal = 1
				}
				valStr := strconv.Itoa(targetVal)
				if err := os.WriteFile(filepath.Join(devPath, "brightness"), []byte(valStr), 0644); err == nil {
					return nil
				}
			}
		}
	}

	// 2. Fallback to brightnessctl
	if _, err := exec.LookPath("brightnessctl"); err == nil {
		cmd := exec.CommandContext(ctx, "brightnessctl", "s", fmt.Sprintf("%d%%", percent))
		return cmd.Run()
	}

	// 3. Fallback to light CLI
	if _, err := exec.LookPath("light"); err == nil {
		cmd := exec.CommandContext(ctx, "light", "-S", strconv.Itoa(percent))
		return cmd.Run()
	}

	return nil
}

// SetNightLight configures wlsunset, gammastep, or hyprsunset blue light filter.
func (c *systemDisplayClient) SetNightLight(ctx context.Context, enabled bool, tempKelvin int) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if tempKelvin < 2500 {
		tempKelvin = 2500
	}
	if tempKelvin > 6500 {
		tempKelvin = 6500
	}

	c.cachedNightL = NightLightStatus{
		Enabled:     enabled,
		Temperature: tempKelvin,
	}

	// Terminate existing night light daemons
	_ = exec.CommandContext(ctx, "pkill", "-x", "wlsunset").Run()
	_ = exec.CommandContext(ctx, "pkill", "-x", "gammastep").Run()
	_ = exec.CommandContext(ctx, "pkill", "-x", "hyprsunset").Run()

	if !enabled {
		return nil
	}

	// 1. Try wlsunset (Wayland / Niri default on modern NixOS)
	if _, err := exec.LookPath("wlsunset"); err == nil {
		go func() {
			_ = exec.Command("wlsunset", "-t", strconv.Itoa(tempKelvin), "-T", "6500").Run()
		}()
		return nil
	}

	// 2. Try gammastep
	if _, err := exec.LookPath("gammastep"); err == nil {
		go func() {
			_ = exec.Command("gammastep", "-O", strconv.Itoa(tempKelvin)).Run()
		}()
		return nil
	}

	// 3. Try hyprsunset
	if _, err := exec.LookPath("hyprsunset"); err == nil {
		go func() {
			_ = exec.Command("hyprsunset", "--temperature", strconv.Itoa(tempKelvin)).Run()
		}()
		return nil
	}

	return nil
}

// LockSession locks the current graphical session using standard session managers.
func (c *systemDisplayClient) LockSession(ctx context.Context) error {
	// Try loginctl lock-session
	if err := exec.CommandContext(ctx, "loginctl", "lock-session").Run(); err == nil {
		return nil
	}
	if err := exec.CommandContext(ctx, "loginctl", "lock-sessions").Run(); err == nil {
		return nil
	}

	// Fallback to direct lockers if loginctl failed
	lockers := []string{"hyprlock", "swaylock", "waylock", "gtklock"}
	for _, locker := range lockers {
		if _, err := exec.LookPath(locker); err == nil {
			go func(bin string) {
				_ = exec.Command(bin).Run()
			}(locker)
			return nil
		}
	}

	return nil
}

