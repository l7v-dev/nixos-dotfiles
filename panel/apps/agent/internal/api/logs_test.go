package api_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/l7v/panel-agent/internal/api"
	"github.com/l7v/panel-agent/internal/journal"
)

type mockJournal struct {
	entries []journal.LogEntry
}

func (m *mockJournal) Tail(ctx context.Context, opts journal.TailOptions) {
	for _, e := range m.entries {
		select {
		case <-ctx.Done():
			return
		case opts.Out <- e:
		}
	}
}

func (m *mockJournal) Query(_ context.Context, opts journal.QueryOptions) (journal.QueryResult, error) {
	var list []journal.LogEntry
	for _, e := range m.entries {
		if opts.Unit != "" && e.Unit != opts.Unit {
			continue
		}
		list = append(list, e)
	}
	return journal.QueryResult{Entries: list, Total: len(list)}, nil
}

func (m *mockJournal) ListUnits(_ context.Context) ([]string, error) {
	return []string{"nginx.service", "sshd.service"}, nil
}

func (m *mockJournal) GetStats(_ context.Context, since, until time.Time, _ time.Duration) ([]journal.LogStatsBucket, error) {
	return []journal.LogStatsBucket{
		{
			Timestamp: since,
			Counts:    map[string]int{"error": 1, "info": 2},
			Total:     3,
		},
	}, nil
}

func TestLogsAPI_Query(t *testing.T) {
	now := time.Now().UTC()
	entries := []journal.LogEntry{
		{Timestamp: now.Add(-time.Minute), Unit: "nginx.service", Priority: 3, Message: "error msg"},
		{Timestamp: now, Unit: "sshd.service", Priority: 6, Message: "info msg"},
	}

	router := api.NewRouter(api.Deps{
		Journal: &mockJournal{entries: entries},
	})

	// Test GET /api/v1/logs/query
	req := httptest.NewRequest("GET", "/api/v1/logs/query?unit=nginx.service", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var res journal.QueryResult
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	if len(res.Entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(res.Entries))
	}
	if res.Entries[0].Unit != "nginx.service" {
		t.Fatalf("expected nginx.service, got %s", res.Entries[0].Unit)
	}
}

func TestLogsAPI_Units(t *testing.T) {
	router := api.NewRouter(api.Deps{
		Journal: &mockJournal{},
	})

	req := httptest.NewRequest("GET", "/api/v1/logs/units", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var res map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	units, ok := res["units"].([]interface{})
	if !ok || len(units) != 2 {
		t.Fatalf("expected 2 units, got %v", res["units"])
	}
}

func TestLogsAPI_Stats(t *testing.T) {
	router := api.NewRouter(api.Deps{
		Journal: &mockJournal{},
	})

	req := httptest.NewRequest("GET", "/api/v1/logs/stats?since=1h", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var res map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	buckets, ok := res["buckets"].([]interface{})
	if !ok || len(buckets) != 1 {
		t.Fatalf("expected 1 bucket, got %v", res["buckets"])
	}
}

func TestLogsAPI_Export(t *testing.T) {
	now := time.Now().UTC()
	entries := []journal.LogEntry{
		{Timestamp: now, Unit: "nginx.service", Priority: 3, Message: "error msg"},
	}

	router := api.NewRouter(api.Deps{
		Journal: &mockJournal{entries: entries},
	})

	req := httptest.NewRequest("GET", "/api/v1/logs/export?format=csv", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "text/csv; charset=utf-8" {
		t.Fatalf("expected text/csv, got %s", ct)
	}
}
