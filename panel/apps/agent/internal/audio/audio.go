package audio

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"sync"
)

// AudioDevice represents an input (source) or output (sink) audio device.
type AudioDevice struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsDefault   bool   `json:"is_default"`
	Type        string `json:"type"` // "sink" or "source"
}

// AudioStatus contains full audio volume, mute and device information.
type AudioStatus struct {
	OutputVolume  int           `json:"output_volume"` // 0-150%
	OutputMuted   bool          `json:"output_muted"`
	InputVolume   int           `json:"input_volume"`  // 0-100%
	InputMuted    bool          `json:"input_muted"`
	DefaultSink   string        `json:"default_sink"`
	DefaultSource string        `json:"default_source"`
	Sinks         []AudioDevice `json:"sinks"`
	Sources       []AudioDevice `json:"sources"`
}

// Client defines the interface for audio operations.
type Client interface {
	GetStatus(ctx context.Context) (*AudioStatus, error)
	SetVolume(ctx context.Context, target string, volumePct int) error
	SetMute(ctx context.Context, target string, muted bool) error
	SetDefault(ctx context.Context, target string, deviceID string) error
}

type systemAudioClient struct {
	mu sync.Mutex
}

// NewClient creates a new system audio client.
func NewClient() Client {
	return &systemAudioClient{}
}

// GetStatus inspects the system audio configuration.
func (c *systemAudioClient) GetStatus(ctx context.Context) (*AudioStatus, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	status := &AudioStatus{
		OutputVolume:  70,
		OutputMuted:   false,
		InputVolume:   80,
		InputMuted:    false,
		DefaultSink:   "@DEFAULT_AUDIO_SINK@",
		DefaultSource: "@DEFAULT_AUDIO_SOURCE@",
		Sinks:         make([]AudioDevice, 0),
		Sources:       make([]AudioDevice, 0),
	}

	// 1. Try wpctl (PipeWire / WirePlumber default on modern NixOS)
	if _, err := exec.LookPath("wpctl"); err == nil {
		c.queryWpctl(ctx, status)
		return status, nil
	}

	// 2. Try pamixer
	if _, err := exec.LookPath("pamixer"); err == nil {
		c.queryPamixer(ctx, status)
		return status, nil
	}

	// 3. Try pactl fallback
	if _, err := exec.LookPath("pactl"); err == nil {
		c.queryPactl(ctx, status)
		return status, nil
	}

	// Default fallback if no audio CLI is found
	status.Sinks = append(status.Sinks, AudioDevice{
		ID:          "@DEFAULT_AUDIO_SINK@",
		Name:        "Default Speaker / Headset",
		Description: "PipeWire Virtual Sink",
		IsDefault:   true,
		Type:        "sink",
	})
	status.Sources = append(status.Sources, AudioDevice{
		ID:          "@DEFAULT_AUDIO_SOURCE@",
		Name:        "Default Microphone",
		Description: "PipeWire Virtual Source",
		IsDefault:   true,
		Type:        "source",
	})
	return status, nil
}

func (c *systemAudioClient) queryWpctl(ctx context.Context, status *AudioStatus) {
	// Output volume
	outCmd := exec.CommandContext(ctx, "wpctl", "get-volume", "@DEFAULT_AUDIO_SINK@")
	if out, err := outCmd.Output(); err == nil {
		vol, muted := parseWpctlVolume(string(out))
		status.OutputVolume = vol
		status.OutputMuted = muted
	}

	// Input volume
	inCmd := exec.CommandContext(ctx, "wpctl", "get-volume", "@DEFAULT_AUDIO_SOURCE@")
	if in, err := inCmd.Output(); err == nil {
		vol, muted := parseWpctlVolume(string(in))
		status.InputVolume = vol
		status.InputMuted = muted
	}

	// Parse status devices
	statusCmd := exec.CommandContext(ctx, "wpctl", "status")
	if out, err := statusCmd.Output(); err == nil {
		parseWpctlStatus(string(out), status)
	}
}

func parseWpctlVolume(raw string) (int, bool) {
	muted := strings.Contains(raw, "[MUTED]")
	re := regexp.MustCompile(`Volume:\s+([0-9.]+)`)
	matches := re.FindStringSubmatch(raw)
	if len(matches) > 1 {
		if val, err := strconv.ParseFloat(matches[1], 64); err == nil {
			return int(val*100 + 0.5), muted
		}
	}
	return 50, muted
}

func parseWpctlStatus(raw string, status *AudioStatus) {
	lines := strings.Split(raw, "\n")
	section := ""
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Detect section start
		if strings.Contains(trimmed, "Sinks:") && !strings.Contains(trimmed, "Sink endpoints:") {
			section = "sinks"
			continue
		} else if strings.Contains(trimmed, "Sources:") && !strings.Contains(trimmed, "Source endpoints:") {
			section = "sources"
			continue
		} else if strings.Contains(trimmed, "Sink endpoints:") || strings.Contains(trimmed, "Filters:") ||
			strings.Contains(trimmed, "Streams:") || strings.Contains(trimmed, "Video") ||
			strings.Contains(trimmed, "Settings") {
			section = ""
			continue
		}

		if section == "sinks" || section == "sources" {
			isDefault := strings.Contains(line, "*")

			// Match: "48. Built-in Audio Analog Stereo [vol: 0.65]" or "48. Name"
			re := regexp.MustCompile(`(\d+)\.\s+(.*?)(?:\s+\[vol:|$)`)
			matches := re.FindStringSubmatch(line)
			if len(matches) > 2 {
				id := strings.TrimSpace(matches[1])
				desc := strings.TrimSpace(matches[2])
				// Clean trailing brackets if any
				if idx := strings.Index(desc, "["); idx != -1 {
					desc = strings.TrimSpace(desc[:idx])
				}
				if desc == "" {
					desc = fmt.Sprintf("Audio Device %s", id)
				}

				dev := AudioDevice{
					ID:          id,
					Name:        desc,
					Description: desc,
					IsDefault:   isDefault,
					Type:        "sink",
				}
				if section == "sinks" {
					dev.Type = "sink"
					if isDefault {
						status.DefaultSink = id
					}
					status.Sinks = append(status.Sinks, dev)
				} else {
					dev.Type = "source"
					if isDefault {
						status.DefaultSource = id
					}
					status.Sources = append(status.Sources, dev)
				}
			}
		}
	}
}

func (c *systemAudioClient) queryPamixer(ctx context.Context, status *AudioStatus) {
	if out, err := exec.CommandContext(ctx, "pamixer", "--get-volume").Output(); err == nil {
		if v, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil {
			status.OutputVolume = v
		}
	}
	if out, err := exec.CommandContext(ctx, "pamixer", "--get-mute").Output(); err == nil {
		status.OutputMuted = strings.TrimSpace(string(out)) == "true"
	}
	if out, err := exec.CommandContext(ctx, "pamixer", "--default-source", "--get-volume").Output(); err == nil {
		if v, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil {
			status.InputVolume = v
		}
	}
	if out, err := exec.CommandContext(ctx, "pamixer", "--default-source", "--get-mute").Output(); err == nil {
		status.InputMuted = strings.TrimSpace(string(out)) == "true"
	}
}

func (c *systemAudioClient) queryPactl(ctx context.Context, status *AudioStatus) {
	// Query default sink volume
	if out, err := exec.CommandContext(ctx, "pactl", "get-sink-volume", "@DEFAULT_SINK@").Output(); err == nil {
		re := regexp.MustCompile(`/\s*(\d+)%\s*/`)
		m := re.FindStringSubmatch(string(out))
		if len(m) > 1 {
			if v, err := strconv.Atoi(m[1]); err == nil {
				status.OutputVolume = v
			}
		}
	}
	// Query default sink mute
	if out, err := exec.CommandContext(ctx, "pactl", "get-sink-mute", "@DEFAULT_SINK@").Output(); err == nil {
		status.OutputMuted = strings.Contains(strings.ToLower(string(out)), "yes")
	}
	// Query default source volume
	if out, err := exec.CommandContext(ctx, "pactl", "get-source-volume", "@DEFAULT_SOURCE@").Output(); err == nil {
		re := regexp.MustCompile(`/\s*(\d+)%\s*/`)
		m := re.FindStringSubmatch(string(out))
		if len(m) > 1 {
			if v, err := strconv.Atoi(m[1]); err == nil {
				status.InputVolume = v
			}
		}
	}
	// Query default source mute
	if out, err := exec.CommandContext(ctx, "pactl", "get-source-mute", "@DEFAULT_SOURCE@").Output(); err == nil {
		status.InputMuted = strings.Contains(strings.ToLower(string(out)), "yes")
	}
}

// SetVolume updates the audio volume for sink or source.
func (c *systemAudioClient) SetVolume(ctx context.Context, target string, volumePct int) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if volumePct < 0 {
		volumePct = 0
	}
	if volumePct > 150 {
		volumePct = 150
	}

	targetDevice := "@DEFAULT_AUDIO_SINK@"
	if target == "source" || target == "input" {
		targetDevice = "@DEFAULT_AUDIO_SOURCE@"
		if volumePct > 100 {
			volumePct = 100
		}
	}

	if _, err := exec.LookPath("wpctl"); err == nil {
		fraction := fmt.Sprintf("%.2f", float64(volumePct)/100.0)
		// Use -l 1.5 to allow volume boost above 100% up to 150%
		cmd := exec.CommandContext(ctx, "wpctl", "set-volume", "-l", "1.5", targetDevice, fraction)
		var stderr bytes.Buffer
		cmd.Stderr = &stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("wpctl set-volume failed: %s", stderr.String())
		}
		return nil
	}

	if _, err := exec.LookPath("pamixer"); err == nil {
		args := []string{"--set-volume", strconv.Itoa(volumePct), "--allow-boost"}
		if target == "source" || target == "input" {
			args = append([]string{"--default-source"}, args...)
		}
		return exec.CommandContext(ctx, "pamixer", args...).Run()
	}

	if _, err := exec.LookPath("pactl"); err == nil {
		pactlTarget := "@DEFAULT_SINK@"
		cmdName := "set-sink-volume"
		if target == "source" || target == "input" {
			pactlTarget = "@DEFAULT_SOURCE@"
			cmdName = "set-source-volume"
		}
		return exec.CommandContext(ctx, "pactl", cmdName, pactlTarget, fmt.Sprintf("%d%%", volumePct)).Run()
	}

	return nil
}

// SetMute sets the mute state for sink or source.
func (c *systemAudioClient) SetMute(ctx context.Context, target string, muted bool) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	targetDevice := "@DEFAULT_AUDIO_SINK@"
	if target == "source" || target == "input" {
		targetDevice = "@DEFAULT_AUDIO_SOURCE@"
	}

	if _, err := exec.LookPath("wpctl"); err == nil {
		muteVal := "0"
		if muted {
			muteVal = "1"
		}
		cmd := exec.CommandContext(ctx, "wpctl", "set-mute", targetDevice, muteVal)
		return cmd.Run()
	}

	if _, err := exec.LookPath("pamixer"); err == nil {
		action := "--unmute"
		if muted {
			action = "--mute"
		}
		args := []string{action}
		if target == "source" || target == "input" {
			args = append([]string{"--default-source"}, args...)
		}
		return exec.CommandContext(ctx, "pamixer", args...).Run()
	}

	if _, err := exec.LookPath("pactl"); err == nil {
		pactlTarget := "@DEFAULT_SINK@"
		cmdName := "set-sink-mute"
		if target == "source" || target == "input" {
			pactlTarget = "@DEFAULT_SOURCE@"
			cmdName = "set-source-mute"
		}
		muteStr := "0"
		if muted {
			muteStr = "1"
		}
		return exec.CommandContext(ctx, "pactl", cmdName, pactlTarget, muteStr).Run()
	}

	return nil
}

// SetDefault changes the default audio sink or source device.
func (c *systemAudioClient) SetDefault(ctx context.Context, target string, deviceID string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if _, err := exec.LookPath("wpctl"); err == nil {
		cmd := exec.CommandContext(ctx, "wpctl", "set-default", deviceID)
		return cmd.Run()
	}

	if _, err := exec.LookPath("pactl"); err == nil {
		cmdName := "set-default-sink"
		if target == "source" || target == "input" {
			cmdName = "set-default-source"
		}
		return exec.CommandContext(ctx, "pactl", cmdName, deviceID).Run()
	}

	return nil
}

