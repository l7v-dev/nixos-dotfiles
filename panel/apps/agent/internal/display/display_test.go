package display

import (
	"context"
	"testing"
)

func TestDisplayClient_StatusAndDefaults(t *testing.T) {
	client := NewClient()
	status, err := client.GetStatus(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if status == nil {
		t.Fatal("expected status, got nil")
	}

	if status.BrightnessPct < 1 || status.BrightnessPct > 100 {
		t.Errorf("expected brightness percentage between 1 and 100, got %d", status.BrightnessPct)
	}
}

func TestDisplayClient_SetNightLight(t *testing.T) {
	client := NewClient()
	ctx := context.Background()

	// Setting night light should update cached state and clamp temperature
	err := client.SetNightLight(ctx, true, 4000)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	status, err := client.GetStatus(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if status.NightLight.Temperature != 4000 {
		t.Errorf("expected temp 4000, got %d", status.NightLight.Temperature)
	}
}
