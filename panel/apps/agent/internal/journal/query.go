package journal

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/coreos/go-systemd/v22/sdjournal"
)

// priorityToLevelName maps numeric priority 0-7 to category key.
func priorityToLevelName(p int) string {
	switch p {
	case 0:
		return "emergency"
	case 1:
		return "alert"
	case 2:
		return "critical"
	case 3:
		return "error"
	case 4:
		return "warning"
	case 5:
		return "notice"
	case 6:
		return "info"
	case 7:
		return "debug"
	default:
		return "info"
	}
}

// Query performs a filtered historical query against systemd journald.
func (j *journalReader) Query(ctx context.Context, opts QueryOptions) (QueryResult, error) {
	jrnl, err := sdjournal.NewJournal()
	if err != nil {
		if j.fallback != nil {
			return j.fallback.Query(ctx, opts)
		}
		return QueryResult{}, fmt.Errorf("open journal: %w", err)
	}
	defer jrnl.Close()

	applyUnitMatches(jrnl, opts.Unit)

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	if limit > 2000 {
		limit = 2000
	}

	// Determine starting seek position.
	if opts.Cursor != "" {
		if err := jrnl.SeekCursor(opts.Cursor); err == nil {
			_, _ = jrnl.Next()
		}
	} else if opts.Since != nil {
		_ = jrnl.SeekRealtimeUsec(uint64(opts.Since.UnixNano() / 1000))
	} else if opts.Reverse {
		_ = jrnl.SeekTail()
		_, _ = jrnl.PreviousSkip(uint64(limit * 3))
	} else {
		// Default: last 1 hour or last limit entries
		_ = jrnl.SeekTail()
		_, _ = jrnl.PreviousSkip(uint64(limit * 3))
	}

	var entries []LogEntry
	var nextCursor string

	for len(entries) < limit {
		select {
		case <-ctx.Done():
			return QueryResult{Entries: entries, Total: len(entries)}, ctx.Err()
		default:
		}

		n, err := jrnl.Next()
		if err != nil || n == 0 {
			break
		}

		rawEntry, err := jrnl.GetEntry()
		if err != nil {
			continue
		}

		entry := parseEntry(rawEntry)

		// Check until bound
		if opts.Until != nil && entry.Timestamp.After(*opts.Until) {
			break
		}

		if matchesFilter(entry, opts.Unit, opts.MinPriority, opts.Priorities, opts.Search) {
			entries = append(entries, entry)
			nextCursor = entry.Cursor
		}
	}

	if opts.Reverse {
		// Reverse order so newest is first
		for i, j := 0, len(entries)-1; i < j; i, j = i+1, j-1 {
			entries[i], entries[j] = entries[j], entries[i]
		}
	}

	return QueryResult{
		Entries:    entries,
		NextCursor: nextCursor,
		Total:      len(entries),
	}, nil
}

// ListUnits returns a sorted list of unique systemd unit names that have logged recently.
func (j *journalReader) ListUnits(ctx context.Context) ([]string, error) {
	jrnl, err := sdjournal.NewJournal()
	if err != nil {
		if j.fallback != nil {
			return j.fallback.ListUnits(ctx)
		}
		return nil, fmt.Errorf("open journal: %w", err)
	}
	defer jrnl.Close()

	// Seek to 24 hours ago
	since := time.Now().Add(-24 * time.Hour)
	_ = jrnl.SeekRealtimeUsec(uint64(since.UnixNano() / 1000))

	unitMap := make(map[string]bool)
	maxScan := 5000
	scanned := 0

	for scanned < maxScan {
		select {
		case <-ctx.Done():
			break
		default:
		}

		n, err := jrnl.Next()
		if err != nil || n == 0 {
			break
		}
		scanned++

		rawEntry, err := jrnl.GetEntry()
		if err != nil {
			continue
		}

		u := rawEntry.Fields[sdjournal.SD_JOURNAL_FIELD_SYSTEMD_UNIT]
		if u == "" {
			u = rawEntry.Fields["UNIT"]
		}
		if u == "" {
			u = rawEntry.Fields[sdjournal.SD_JOURNAL_FIELD_COMM]
		}
		if u != "" {
			unitMap[u] = true
		}
	}

	units := make([]string, 0, len(unitMap))
	for u := range unitMap {
		units = append(units, u)
	}
	sort.Strings(units)

	return units, nil
}

// GetStats returns aggregated log count buckets over the specified time range.
func (j *journalReader) GetStats(ctx context.Context, since, until time.Time, bucketDuration time.Duration) ([]LogStatsBucket, error) {
	if bucketDuration <= 0 {
		bucketDuration = time.Minute
	}
	if until.Before(since) {
		since, until = until, since
	}

	jrnl, err := sdjournal.NewJournal()
	if err != nil {
		if j.fallback != nil {
			return j.fallback.GetStats(ctx, since, until, bucketDuration)
		}
		return nil, fmt.Errorf("open journal: %w", err)
	}
	defer jrnl.Close()

	_ = jrnl.SeekRealtimeUsec(uint64(since.UnixNano() / 1000))

	// Pre-create time buckets
	var buckets []LogStatsBucket
	bucketMap := make(map[int64]*LogStatsBucket)

	for t := since.Truncate(bucketDuration); !t.After(until); t = t.Add(bucketDuration) {
		b := LogStatsBucket{
			Timestamp: t,
			Counts:    make(map[string]int),
			Total:     0,
		}
		buckets = append(buckets, b)
		bucketMap[t.Unix()] = &buckets[len(buckets)-1]
	}

	maxScan := 20000
	scanned := 0

	for scanned < maxScan {
		select {
		case <-ctx.Done():
			break
		default:
		}

		n, err := jrnl.Next()
		if err != nil || n == 0 {
			break
		}
		scanned++

		rawEntry, err := jrnl.GetEntry()
		if err != nil {
			continue
		}

		entry := parseEntry(rawEntry)
		if entry.Timestamp.After(until) {
			break
		}

		bucketTime := entry.Timestamp.Truncate(bucketDuration).Unix()
		if b, ok := bucketMap[bucketTime]; ok {
			level := priorityToLevelName(entry.Priority)
			b.Counts[level]++
			b.Total++
		}
	}

	return buckets, nil
}
