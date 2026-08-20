package hardware

import (
	"context"
	"testing"
)

func TestNewClient(t *testing.T) {
	client := NewClient()
	if client == nil {
		t.Fatal("expected non-nil hardware client")
	}

	ctx := context.Background()
	status, err := client.GetStatus(ctx)
	if err != nil {
		t.Fatalf("GetStatus failed: %v", err)
	}

	if status == nil {
		t.Fatal("expected non-nil status")
	}

	if status.PowerProfile == "" {
		t.Error("expected non-empty PowerProfile")
	}

	if len(status.AvailableProfiles) == 0 {
		t.Error("expected non-empty AvailableProfiles")
	}
}

func TestSetPowerProfile(t *testing.T) {
	client := NewClient()
	ctx := context.Background()

	profiles := []string{"performance", "balanced", "powersave"}
	for _, p := range profiles {
		err := client.SetPowerProfile(ctx, p)
		if err != nil {
			t.Errorf("SetPowerProfile(%s) failed: %v", p, err)
		}
	}
}
