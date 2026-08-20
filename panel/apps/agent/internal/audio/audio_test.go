package audio

import (
	"context"
	"testing"
)

func TestParseWpctlVolume(t *testing.T) {
	tests := []struct {
		input       string
		expectedVol int
		expectedMut bool
	}{
		{"Volume: 0.70", 70, false},
		{"Volume: 1.25", 125, false},
		{"Volume: 0.00 [MUTED]", 0, true},
		{"Volume: 0.65 [MUTED]", 65, true},
		{"Volume: 1.50", 150, false},
	}

	for _, tt := range tests {
		vol, muted := parseWpctlVolume(tt.input)
		if vol != tt.expectedVol {
			t.Errorf("parseWpctlVolume(%q) vol = %d; want %d", tt.input, vol, tt.expectedVol)
		}
		if muted != tt.expectedMut {
			t.Errorf("parseWpctlVolume(%q) muted = %v; want %v", tt.input, muted, tt.expectedMut)
		}
	}
}

func TestParseWpctlStatus(t *testing.T) {
	rawStatus := `
PipeWire 'pipewire-0' [0.3.65, user@host, cookie:12345]
 └─ Clients:
      31. WirePlumber                         [0.4.13, user@host, pid:1234]

Audio
 ├─ Devices:
 │      42. Built-in Audio                      [alsa]
 │
 ├─ Sinks:
 │  *   48. Built-in Audio Analog Stereo        [vol: 0.70]
 │      49. HDMI / DisplayPort Audio            [vol: 1.00]
 │
 ├─ Sink endpoints:
 │
 ├─ Sources:
 │  *   50. Built-in Audio Analog Stereo        [vol: 0.80]
 │      51. USB Microphone                      [vol: 0.90]
 │
 ├─ Filters:
 │
 └─ Streams:
`
	status := &AudioStatus{
		Sinks:   make([]AudioDevice, 0),
		Sources: make([]AudioDevice, 0),
	}

	parseWpctlStatus(rawStatus, status)

	if len(status.Sinks) != 2 {
		t.Fatalf("expected 2 sinks, got %d", len(status.Sinks))
	}
	if status.DefaultSink != "48" {
		t.Errorf("expected default sink 48, got %s", status.DefaultSink)
	}
	if status.Sinks[0].Name != "Built-in Audio Analog Stereo" {
		t.Errorf("expected sink name 'Built-in Audio Analog Stereo', got %q", status.Sinks[0].Name)
	}

	if len(status.Sources) != 2 {
		t.Fatalf("expected 2 sources, got %d", len(status.Sources))
	}
	if status.DefaultSource != "50" {
		t.Errorf("expected default source 50, got %s", status.DefaultSource)
	}
}

func TestSystemAudioClient_Fallback(t *testing.T) {
	client := NewClient()
	status, err := client.GetStatus(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if status == nil {
		t.Fatal("expected status, got nil")
	}
	if len(status.Sinks) == 0 {
		t.Error("expected at least 1 sink in status")
	}
	if len(status.Sources) == 0 {
		t.Error("expected at least 1 source in status")
	}
}
