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
	OutputVolume int           `json:"output_volume"` // 0-150%
	OutputMuted  bool          `json:"output_muted"`
	InputVolume  int           `json:"input_volume"`  // 0-100%
	InputMuted   bool          `json:"input_muted"`
	DefaultSink  string        `json:"default_sink"`
	DefaultSource string       `json:"default_source"`
	Sinks        []AudioDevice `json:"sinks"`
	Sources      []AudioDevice `json:"sources"`
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
		OutputVolume: 70,
		OutputMuted:  false,
		InputVolume:  80,
		InputMuted:   false,
		Sinks:        make([]AudioDevice, 0),
		Sources:      make([]AudioDevice, 0),
	}

	// 1. Try wpctl (PipeWire / WirePlumber default on modern NixOS)
	if _, err := exec.LookPath("wpctl"); err == nil {
		c.queryWpctl(ctx, status)
		return status, nil
	}

	// 2. Try pamixer / pactl fallback
	if _, err := exec.LookPath("pamixer"); err == nil {
		c.queryPamixer(ctx, status)
		return status, nil
	}

	// Default fallback if no CLI is installed yet (dev or minimal server)
	status.Sinks = append(status.Sinks, AudioDevice{
		ID:          "@DEFAULT_AUDIO_SINK@",
		Name:        "Default Output",
		Description: "System Default Output",
		IsDefault:   true,
		Type:        "sink",
	})
	status.Sources = append(status.Sources, AudioDevice{
		ID:          "@DEFAULT_AUDIO_SOURCE@",
		Name:        "Default Microphone",
		Description: "System Default Input",
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
		if strings.HasPrefix(trimmed, "Sinks:") {
			section = "sinks"
			continue
		} else if strings.HasPrefix(trimmed, "Sources:") {
			section = "sources"
			continue
		} else if strings.HasPrefix(trimmed, "Filters:") || strings.HasPrefix(trimmed, "Streams:") || strings.HasPrefix(trimmed, "Audio") {
			section = ""
		}

		if section == "sinks" || section == "sources" {
			isDefault := strings.Contains(line, "*")
			re := regexp.MustCompile(`(\d+)\.\s+(.*?)(?:\s+\[vol:|$)`)
			matches := re.FindStringSubmatch(line)
			if len(matches) > 2 {
				id := strings.TrimSpace(matches[1])
				desc := strings.TrimSpace(matches[2])
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
		cmd := exec.CommandContext(ctx, "wpctl", "set-volume", targetDevice, fraction)
		var stderr bytes.Buffer
		cmd.Stderr = &stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("wpctl set-volume failed: %s", stderr.String())
		}
		return nil
	}

	if _, err := exec.LookPath("pamixer"); err == nil {
		args := []string{"--set-volume", strconv.Itoa(volumePct)}
		if target == "source" || target == "input" {
			args = append([]string{"--default-source"}, args...)
		}
		return exec.CommandContext(ctx, "pamixer", args...).Run()
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
	return nil
}
