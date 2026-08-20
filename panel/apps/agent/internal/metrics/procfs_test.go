package metrics_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/l7v/panel-agent/internal/metrics"
)

// Bug 6 — Metrics 2s Block
// Property 1: Bug Condition & Expected Behavior — ReadSnapshot Completes in <= 1100ms
// Validates: Requirements 1.13, 1.14, 2.18, 2.19, 2.20
func TestReadSnapshotLatency(t *testing.T) {
	reader := metrics.NewProcfsReader()
	ctx := context.Background()

	start := time.Now()
	snapshot, err := reader.ReadSnapshot(ctx)
	elapsed := time.Since(start)

	if err != nil {
		t.Fatalf("ReadSnapshot failed: %v", err)
	}

	if elapsed > 1200*time.Millisecond {
		t.Fatalf("ReadSnapshot took %v, expected <= 1100ms (sequential sleep bug detected)", elapsed)
	}

	if snapshot.Timestamp.IsZero() {
		t.Fatalf("Snapshot timestamp is zero")
	}
}

// Property 2: Preservation — MetricsSnapshot Output Fields and Context Cancellation
// Validates: Requirements 3.17, 3.18, 3.19
func TestReadSnapshot_Preservation_FieldsPopulated(t *testing.T) {
	reader := metrics.NewProcfsReader()
	ctx := context.Background()

	snapshot, err := reader.ReadSnapshot(ctx)
	if err != nil {
		t.Fatalf("ReadSnapshot failed: %v", err)
	}

	// CPU pct in valid range [0, 100]
	if snapshot.CPU.UsagePct < 0 || snapshot.CPU.UsagePct > 100 {
		t.Errorf("CPU usage %f out of [0, 100] range", snapshot.CPU.UsagePct)
	}

	// Memory populated
	if snapshot.Memory.TotalMiB == 0 {
		t.Errorf("Memory total is 0")
	}

	// Network is non-nil slice
	if snapshot.Network == nil {
		t.Errorf("Network slice is nil")
	}

	// Disks is non-nil slice
	if snapshot.Disks == nil {
		t.Errorf("Disks slice is nil")
	}

	// Timestamp is recent
	if time.Since(snapshot.Timestamp) > 5*time.Second {
		t.Errorf("Timestamp %v is too old", snapshot.Timestamp)
	}
}

func TestReadSnapshot_Preservation_ContextCancellation(t *testing.T) {
	reader := metrics.NewProcfsReader()
	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	start := time.Now()
	_, err := reader.ReadSnapshot(ctx)
	elapsed := time.Since(start)

	if err == nil {
		t.Fatalf("expected error on cancelled context, got nil")
	}

	if !errors.Is(err, context.DeadlineExceeded) && !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context cancellation error, got %v", err)
	}

	if elapsed > 400*time.Millisecond {
		t.Fatalf("ReadSnapshot did not abort promptly on context cancellation: took %v", elapsed)
	}
}
