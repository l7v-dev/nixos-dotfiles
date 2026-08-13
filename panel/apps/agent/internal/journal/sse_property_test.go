package journal_test

// Feature: l7v-panel
// Property 3: LogEntry SSE Serialisation Round-Trip
// Validates: Requirements 5.1, 5.2
//
// For all LogEntry values, serialising to JSON and deserialising back must
// produce a structurally equal value — including Unicode, newlines, priority 0-7.

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/l7v/panel-agent/internal/journal"
	"pgregory.net/rapid"
)

func TestProperty3_LogEntrySSERoundTrip(t *testing.T) {
	rapid.Check(t, func(tc *rapid.T) {
		// Generate arbitrary LogEntry values.
		priority := rapid.IntRange(0, 7).Draw(tc, "priority")
		msg := rapid.String().Draw(tc, "message") // arbitrary Unicode including newlines
		unit := rapid.StringN(0, 64, -1).Draw(tc, "unit")

		// Use a fixed timestamp to avoid floating-point precision issues.
		ts := time.Unix(
			rapid.Int64Range(0, 1<<32).Draw(tc, "ts_sec"),
			0,
		).UTC()

		entry := journal.LogEntry{
			Timestamp: ts,
			Unit:      unit,
			Priority:  priority,
			Message:   msg,
		}

		// Serialise to JSON (the format used in SSE data fields).
		data, err := json.Marshal(entry)
		if err != nil {
			tc.Fatalf("Marshal failed: %v", err)
		}

		// Deserialise back.
		var got journal.LogEntry
		if err := json.Unmarshal(data, &got); err != nil {
			tc.Fatalf("Unmarshal failed: %v", err)
		}

		// Property: all fields must be equal after the round-trip.
		if !got.Timestamp.Equal(entry.Timestamp) {
			tc.Fatalf("Timestamp mismatch: want %v, got %v", entry.Timestamp, got.Timestamp)
		}
		if got.Unit != entry.Unit {
			tc.Fatalf("Unit mismatch: want %q, got %q", entry.Unit, got.Unit)
		}
		if got.Priority != entry.Priority {
			tc.Fatalf("Priority mismatch: want %d, got %d", entry.Priority, got.Priority)
		}
		if got.Message != entry.Message {
			tc.Fatalf("Message mismatch: want %q, got %q", entry.Message, got.Message)
		}
	})
}
