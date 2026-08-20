package api

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseBatteryDirectEnergy(t *testing.T) {
	tmpDir := t.TempDir()

	_ = os.WriteFile(filepath.Join(tmpDir, "status"), []byte("Charging\n"), 0644)
	_ = os.WriteFile(filepath.Join(tmpDir, "capacity"), []byte("85\n"), 0644)
	_ = os.WriteFile(filepath.Join(tmpDir, "energy_now"), []byte("45000000\n"), 0644)
	_ = os.WriteFile(filepath.Join(tmpDir, "energy_full"), []byte("50000000\n"), 0644)
	_ = os.WriteFile(filepath.Join(tmpDir, "energy_full_design"), []byte("52000000\n"), 0644)
	_ = os.WriteFile(filepath.Join(tmpDir, "power_now"), []byte("15000000\n"), 0644)
	_ = os.WriteFile(filepath.Join(tmpDir, "voltage_now"), []byte("15400000\n"), 0644)
	_ = os.WriteFile(filepath.Join(tmpDir, "cycle_count"), []byte("42\n"), 0644)
	_ = os.WriteFile(filepath.Join(tmpDir, "manufacturer"), []byte("SMP\n"), 0644)
	_ = os.WriteFile(filepath.Join(tmpDir, "model_name"), []byte("L19M4P72\n"), 0644)

	bat := parseBattery(tmpDir, "BAT0")

	if bat.Name != "BAT0" {
		t.Errorf("expected name BAT0, got %s", bat.Name)
	}
	if bat.Status != "Charging" {
		t.Errorf("expected status Charging, got %s", bat.Status)
	}
	if bat.CapacityPct != 85 {
		t.Errorf("expected capacity 85, got %d", bat.CapacityPct)
	}
	if bat.EnergyNowUwh == nil || *bat.EnergyNowUwh != 45000000 {
		t.Errorf("expected EnergyNowUwh 45000000, got %v", bat.EnergyNowUwh)
	}
	if bat.PowerW == nil || *bat.PowerW != 15.0 {
		t.Errorf("expected PowerW 15.0, got %v", bat.PowerW)
	}
	if bat.VoltageV == nil || *bat.VoltageV != 15.4 {
		t.Errorf("expected VoltageV 15.4, got %v", bat.VoltageV)
	}
	if bat.HealthPct == nil || *bat.HealthPct < 96.0 {
		t.Errorf("expected HealthPct ~96.2, got %v", bat.HealthPct)
	}
	if bat.CycleCount == nil || *bat.CycleCount != 42 {
		t.Errorf("expected CycleCount 42, got %v", bat.CycleCount)
	}
	if bat.TimeRemainingMin == nil || *bat.TimeRemainingMin != 20 {
		// (50M - 45M) * 60 / 15M = 5M * 60 / 15M = 20 mins
		t.Errorf("expected TimeRemainingMin 20, got %v", bat.TimeRemainingMin)
	}
}

func TestParseBatteryChargeFallback(t *testing.T) {
	tmpDir := t.TempDir()

	_ = os.WriteFile(filepath.Join(tmpDir, "status"), []byte("Discharging\n"), 0644)
	_ = os.WriteFile(filepath.Join(tmpDir, "capacity"), []byte("50\n"), 0644)
	_ = os.WriteFile(filepath.Join(tmpDir, "charge_now"), []byte("3000000\n"), 0644)      // 3 Ah
	_ = os.WriteFile(filepath.Join(tmpDir, "charge_full"), []byte("6000000\n"), 0644)     // 6 Ah
	_ = os.WriteFile(filepath.Join(tmpDir, "current_now"), []byte("1000000\n"), 0644)     // 1 A
	_ = os.WriteFile(filepath.Join(tmpDir, "voltage_now"), []byte("10000000\n"), 0644)    // 10 V

	bat := parseBattery(tmpDir, "BAT1")

	if bat.Status != "Discharging" {
		t.Errorf("expected status Discharging, got %s", bat.Status)
	}
	// EnergyNow = 3,000,000 * 10,000,000 / 1e6 = 30,000,000 µWh
	if bat.EnergyNowUwh == nil || *bat.EnergyNowUwh != 30000000 {
		t.Errorf("expected calculated EnergyNowUwh 30000000, got %v", bat.EnergyNowUwh)
	}
	// PowerNow = 1,000,000 * 10,000,000 / 1e6 = 10,000,000 µW (10 Watts)
	if bat.PowerW == nil || *bat.PowerW != 10.0 {
		t.Errorf("expected calculated PowerW 10.0, got %v", bat.PowerW)
	}
	// TimeRemaining = 30,000,000 * 60 / 10,000,000 = 180 mins
	if bat.TimeRemainingMin == nil || *bat.TimeRemainingMin != 180 {
		t.Errorf("expected TimeRemainingMin 180, got %v", bat.TimeRemainingMin)
	}
}
