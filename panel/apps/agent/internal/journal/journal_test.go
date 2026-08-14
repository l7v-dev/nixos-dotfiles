package journal_test

import (
	"context"
	"testing"
	"time"

	"github.com/l7v/panel-agent/internal/journal"
)

type mockReader struct {
	entries []journal.LogEntry
}

func (m *mockReader) Tail(ctx context.Context, opts journal.TailOptions) {
	for _, e := range m.entries {
		select {
		case <-ctx.Done():
			return
		case opts.Out <- e:
		}
	}
}

func (m *mockReader) Query(_ context.Context, opts journal.QueryOptions) (journal.QueryResult, error) {
	var filtered []journal.LogEntry
	for _, e := range m.entries {
		if opts.Unit != "" && e.Unit != opts.Unit {
			continue
		}
		if opts.MinPriority > 0 && e.Priority > opts.MinPriority {
			continue
		}
		filtered = append(filtered, e)
		if opts.Limit > 0 && len(filtered) >= opts.Limit {
			break
		}
	}
	return journal.QueryResult{
		Entries: filtered,
		Total:   len(filtered),
	}, nil
}

func (m *mockReader) ListUnits(_ context.Context) ([]string, error) {
	set := make(map[string]bool)
	for _, e := range m.entries {
		if e.Unit != "" {
			set[e.Unit] = true
		}
	}
	var units []string
	for u := range set {
		units = append(units, u)
	}
	return units, nil
}

func (m *mockReader) GetStats(_ context.Context, since, until time.Time, _ time.Duration) ([]journal.LogStatsBucket, error) {
	b := journal.LogStatsBucket{
		Timestamp: since,
		Counts:    map[string]int{"error": 1, "info": 2},
		Total:     3,
	}
	return []journal.LogStatsBucket{b}, nil
}

func TestMockReader_QueryAndTail(t *testing.T) {
	now := time.Now().UTC()
	entries := []journal.LogEntry{
		{Timestamp: now.Add(-2 * time.Minute), Unit: "nginx.service", Priority: 3, Message: "error connect", PID: 123},
		{Timestamp: now.Add(-1 * time.Minute), Unit: "nginx.service", Priority: 6, Message: "request GET /", PID: 123},
		{Timestamp: now, Unit: "sshd.service", Priority: 6, Message: "session opened", PID: 456},
	}

	mr := &mockReader{entries: entries}

	// Test Query
	res, err := mr.Query(context.Background(), journal.QueryOptions{Unit: "nginx.service", Limit: 10})
	if err != nil {
		t.Fatalf("Query failed: %v", err)
	}
	if len(res.Entries) != 2 {
		t.Fatalf("expected 2 entries for nginx, got %d", len(res.Entries))
	}

	// Test Units
	units, err := mr.ListUnits(context.Background())
	if err != nil {
		t.Fatalf("ListUnits failed: %v", err)
	}
	if len(units) != 2 {
		t.Fatalf("expected 2 units, got %d", len(units))
	}
}
