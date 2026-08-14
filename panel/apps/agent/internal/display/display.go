package display

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
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

// GetStatus reads the current screen brightness and night light configuration.
func (c *systemDisplayClient) GetStatus(ctx context.Context) (*DisplayStatus, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	status := &DisplayStatus{
		BrightnessPct: 100,
		CanBrightness: false,
		NightLight:    c.cachedNightL,
	}

	// Check /sys/class/backlight
	matches, _ := filepath.Glob("/sys/class/backlight/*")
	if len(matches) > 0 {
		devicePath := matches[0]
		status.DeviceName = filepath.Base(devicePath)
		curBytes, err1 := os.ReadFile(filepath.Join(devicePath, "brightness"))
		maxBytes, err2 := os.ReadFile(filepath.Join(devicePath, "max_brightness"))

		if err1 == nil && err2 == nil {
			curVal, errC := strconv.Atoi(strings.TrimSpace(string(curBytes)))
			maxVal, errM := strconv.Atoi(strings.TrimSpace(string(maxBytes)))
			if errC == nil && errM == nil && maxVal > 0 {
				status.BrightnessPct = (curVal * 100) / maxVal
				status.CanBrightness = true
				return status, nil
			}
		}
	}

	// Fallback to brightnessctl if installed
	if _, err := exec.LookPath("brightnessctl"); err == nil {
		out, err := exec.CommandContext(ctx, "brightnessctl", "g").Output()
		maxOut, err2 := exec.CommandContext(ctx, "brightnessctl", "m").Output()
		if err == nil && err2 == nil {
			curVal, _ := strconv.Atoi(strings.TrimSpace(string(out)))
			maxVal, _ := strconv.Atoi(strings.TrimSpace(string(maxOut)))
			if maxVal > 0 {
				status.BrightnessPct = (curVal * 100) / maxVal
				status.CanBrightness = true
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

	// Try direct sysfs write if accessible
	matches, _ := filepath.Glob("/sys/class/backlight/*")
	if len(matches) > 0 {
		devicePath := matches[0]
		maxBytes, err := os.ReadFile(filepath.Join(devicePath, "max_brightness"))
		if err == nil {
			maxVal, err := strconv.Atoi(strings.TrimSpace(string(maxBytes)))
			if err == nil && maxVal > 0 {
				targetVal := (percent * maxVal) / 100
				if targetVal < 1 {
					targetVal = 1
				}
				valStr := strconv.Itoa(targetVal)
				if err := os.WriteFile(filepath.Join(devicePath, "brightness"), []byte(valStr), 0644); err == nil {
					return nil
				}
			}
		}
	}

	// Fallback to brightnessctl
	if _, err := exec.LookPath("brightnessctl"); err == nil {
		cmd := exec.CommandContext(ctx, "brightnessctl", "s", fmt.Sprintf("%d%%", percent))
		return cmd.Run()
	}

	return nil
}

// SetNightLight configures gammastep or blue light temperature.
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

	// If gammastep is available, control it
	if _, err := exec.LookPath("gammastep"); err == nil {
		// Kill existing one-shot gammastep if any
		_ = exec.CommandContext(ctx, "pkill", "-x", "gammastep").Run()
		if enabled {
			// Run gammastep one-shot with chosen temperature
			go func() {
				_ = exec.Command("gammastep", "-O", strconv.Itoa(tempKelvin)).Run()
			}()
		} else {
			_ = exec.Command("gammastep", "-x").Run()
		}
	}

	return nil
}

// LockSession locks the current graphical session via loginctl.
func (c *systemDisplayClient) LockSession(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "loginctl", "lock-sessions")
	return cmd.Run()
}
