package journal_test

import (
	"context"
	"testing"
	"time"

	"github.com/l7v/panel-agent/internal/journal"
	"pgregory.net/rapid"
)

// Bug 2 — Stale Pointer Corruption in GetStats
// Property 1: Bug Condition — Stale Pointers Corrupt Bucket Counts
// Validates: Requirements 1.5, 1.6, 2.5, 2.6, 2.7
//
// Root Cause:
// In unfixed code, buckets is initialized with zero capacity:
//   var buckets []LogStatsBucket
// Each append triggers slice reallocation, leaving pointers in bucketMap
// pointing to abandoned backing arrays. As a result, counts written to
// early buckets are lost, and the returned slice contains Total=0 for those buckets.

type stubQueryReader struct {
	entries []journal.LogEntry
}

func (s *stubQueryReader) Tail(ctx context.Context, opts journal.TailOptions) {}

func (s *stubQueryReader) Query(ctx context.Context, opts journal.QueryOptions) (journal.QueryResult, error) {
	var filtered []journal.LogEntry
	for _, e := range s.entries {
		if opts.Since != nil && e.Timestamp.Before(*opts.Since) {
			continue
		}
		if opts.Until != nil && e.Timestamp.After(*opts.Until) {
			continue
		}
		filtered = append(filtered, e)
	}
	return journal.QueryResult{
		Entries: filtered,
		Total:   len(filtered),
	}, nil
}

func (s *stubQueryReader) ListUnits(ctx context.Context) ([]string, error) {
	return nil, nil
}

func (s *stubQueryReader) GetStats(ctx context.Context, since, until time.Time, bucketDuration time.Duration) ([]journal.LogStatsBucket, error) {
	res, err := s.Query(ctx, journal.QueryOptions{
		Since: &since,
		Until: &until,
		Limit: 20000,
	})
	if err != nil {
		return nil, err
	}

	buckets, bucketMap := journal.InitStatsBuckets(since, until, bucketDuration)

	for _, entry := range res.Entries {
		bucketTime := entry.Timestamp.Truncate(bucketDuration).Unix()
		if b, ok := bucketMap[bucketTime]; ok {
			level := journal.PriorityToLevelName(entry.Priority)
			b.Counts[level]++
			b.Total++
		}
	}

	return buckets, nil
}

// TestBugCondition_GetStatsStalePointers verifies that when multiple buckets are
// generated (e.g. 61 buckets for a 1-hour range with 1-minute buckets), all buckets
// retain their accumulated counts and are not corrupted by slice reallocation.
func TestBugCondition_GetStatsStalePointers(t *testing.T) {
	baseTime := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	since := baseTime
	until := baseTime.Add(60 * time.Minute) // 61 1-minute buckets (12:00 to 13:00)
	bucketDuration := time.Minute

	// Seed entries across various buckets: first, early, middle, and late buckets
	testEntries := []journal.LogEntry{
		{Timestamp: baseTime.Add(0 * time.Minute), Priority: 3, Message: "first bucket error"},
		{Timestamp: baseTime.Add(1 * time.Minute), Priority: 6, Message: "second bucket info"},
		{Timestamp: baseTime.Add(5 * time.Minute), Priority: 3, Message: "early bucket error"},
		{Timestamp: baseTime.Add(15 * time.Minute), Priority: 4, Message: "mid-early bucket warning"},
		{Timestamp: baseTime.Add(30 * time.Minute), Priority: 6, Message: "middle bucket info"},
		{Timestamp: baseTime.Add(59 * time.Minute), Priority: 3, Message: "late bucket error"},
		{Timestamp: baseTime.Add(60 * time.Minute), Priority: 6, Message: "last bucket info"},
	}

	reader := &stubQueryReader{entries: testEntries}
	buckets, err := reader.GetStats(context.Background(), since, until, bucketDuration)
	if err != nil {
		t.Fatalf("GetStats failed: %v", err)
	}

	expectedBucketCount := 61
	if len(buckets) != expectedBucketCount {
		t.Fatalf("expected %d buckets, got %d", expectedBucketCount, len(buckets))
	}

	// Verify capacity equals or exceeds length (no reallocation occurred)
	if cap(buckets) < len(buckets) {
		t.Fatalf("capacity (%d) is less than length (%d)", cap(buckets), len(buckets))
	}

	// Check each seeded bucket
	expectedCounts := map[int]struct {
		total int
		level string
	}{
		0:  {total: 1, level: "error"},
		1:  {total: 1, level: "info"},
		5:  {total: 1, level: "error"},
		15: {total: 1, level: "warning"},
		30: {total: 1, level: "info"},
		59: {total: 1, level: "error"},
		60: {total: 1, level: "info"},
	}

	for idx, expected := range expectedCounts {
		b := buckets[idx]
		if b.Total != expected.total {
			t.Errorf("bucket %d (timestamp %v): expected Total=%d, got Total=%d (stale pointer corruption!)",
				idx, b.Timestamp, expected.total, b.Total)
		}
		if b.Counts[expected.level] != expected.total {
			t.Errorf("bucket %d (timestamp %v): expected Counts[%s]=%d, got %d",
				idx, b.Timestamp, expected.level, expected.total, b.Counts[expected.level])
		}
	}
}

// TestPreservation_GetStatsEdgeInputs verifies that edge case inputs continue to behave
// correctly as specified in preservation requirements:
// - Duration <= 0 is clamped to time.Minute
// - Swapped since/until bounds are normalized
// - Empty range returns at least 1 zero-count bucket
func TestPreservation_GetStatsEdgeInputs(t *testing.T) {
	reader := &stubQueryReader{}
	baseTime := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)

	t.Run("DurationZeroClampedToMinute", func(t *testing.T) {
		since := baseTime
		until := baseTime.Add(5 * time.Minute)
		buckets, err := reader.GetStats(context.Background(), since, until, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(buckets) != 6 {
			t.Fatalf("expected 6 buckets for 5m range with default 1m duration, got %d", len(buckets))
		}
	})

	t.Run("SwappedBounds", func(t *testing.T) {
		since := baseTime.Add(10 * time.Minute)
		until := baseTime // until is before since
		buckets, err := reader.GetStats(context.Background(), since, until, time.Minute)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(buckets) != 11 {
			t.Fatalf("expected 11 buckets when bounds swapped, got %d", len(buckets))
		}
		if buckets[0].Timestamp.After(buckets[len(buckets)-1].Timestamp) {
			t.Fatalf("expected first bucket timestamp <= last bucket timestamp")
		}
	})

	t.Run("EmptyRangeSameTimestamp", func(t *testing.T) {
		buckets, err := reader.GetStats(context.Background(), baseTime, baseTime, time.Minute)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(buckets) != 1 {
			t.Fatalf("expected 1 bucket for same timestamp, got %d", len(buckets))
		}
		if buckets[0].Total != 0 {
			t.Fatalf("expected zero total for empty entries, got %d", buckets[0].Total)
		}
	})
}

// TestProperty_GetStatsBucketCountsMatchJournal is a property-based test generating random
// time ranges and log entries, asserting the sum of all bucket Total fields equals the total
// number of matching injected log entries.
func TestProperty_GetStatsBucketCountsMatchJournal(t *testing.T) {
	rapid.Check(t, func(tc *rapid.T) {
		baseSec := rapid.Int64Range(1700000000, 1800000000).Draw(tc, "baseSec")
		baseTime := time.Unix(baseSec, 0).UTC().Truncate(time.Minute)

		rangeMinutes := rapid.IntRange(1, 120).Draw(tc, "rangeMinutes")
		since := baseTime
		until := baseTime.Add(time.Duration(rangeMinutes) * time.Minute)

		numEntries := rapid.IntRange(0, 50).Draw(tc, "numEntries")
		var entries []journal.LogEntry
		for i := 0; i < numEntries; i++ {
			offsetSec := rapid.Int64Range(0, int64(rangeMinutes*60)).Draw(tc, "offsetSec")
			p := rapid.IntRange(0, 7).Draw(tc, "priority")
			entries = append(entries, journal.LogEntry{
				Timestamp: since.Add(time.Duration(offsetSec) * time.Second),
				Priority:  p,
				Message:   "pbt log message",
			})
		}

		reader := &stubQueryReader{entries: entries}
		buckets, err := reader.GetStats(context.Background(), since, until, time.Minute)
		if err != nil {
			tc.Fatalf("GetStats failed: %v", err)
		}

		totalCountInBuckets := 0
		for _, b := range buckets {
			totalCountInBuckets += b.Total
			sumLevels := 0
			for _, c := range b.Counts {
				sumLevels += c
			}
			if sumLevels != b.Total {
				tc.Fatalf("bucket sum of levels (%d) != Total (%d)", sumLevels, b.Total)
			}
		}

		if totalCountInBuckets != len(entries) {
			tc.Fatalf("expected sum of bucket totals (%d) to equal entry count (%d)",
				totalCountInBuckets, len(entries))
		}
	})
}
