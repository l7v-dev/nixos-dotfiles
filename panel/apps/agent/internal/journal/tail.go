// Package journal tails the systemd journal and emits LogEntry values via a channel.
package journal

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/coreos/go-systemd/v22/sdjournal"
)

// journalReader is the concrete Reader implementation backed by sdjournal.
type journalReader struct{}

// NewReader returns a Reader that tails the live systemd journal.
func NewReader() Reader {
	return &journalReader{}
}

// Tail opens the journal, seeks to tail, and emits entries until ctx is cancelled.
// Unit and MinPriority filters are applied server-side. On failure, a single error
// is sent to opts.Err and the function returns. Goroutine leak prevention: the
// select on ctx.Done() ensures cleanup within 1 second of client disconnect.
func (j *journalReader) Tail(ctx context.Context, opts TailOptions) {
	jrnl, err := sdjournal.NewJournal()
	if err != nil {
		opts.Err <- fmt.Errorf("open journal: %w", err)
		return
	}
	defer jrnl.Close()

	// Apply unit filter when specified.
	if opts.Unit != "" {
		if err := jrnl.AddMatch("_SYSTEMD_UNIT=" + opts.Unit); err != nil {
			opts.Err <- fmt.Errorf("add journal match: %w", err)
			return
		}
	}

	// Seek to the tail so we only emit new entries going forward.
	if err := jrnl.SeekTail(); err != nil {
		opts.Err <- fmt.Errorf("seek journal tail: %w", err)
		return
	}
	// Skip the last existing entry to avoid replaying it.
	_, _ = jrnl.PreviousSkip(1)

	for {
		// Wait for new entries (100ms timeout to check ctx between waits).
		status := jrnl.Wait(100 * time.Millisecond)
		if status == sdjournal.SD_JOURNAL_NOP {
			// No new entries — check for cancellation and loop.
			select {
			case <-ctx.Done():
				return
			default:
			}
			continue
		}

		// Drain all available new entries.
		for {
			n, err := jrnl.Next()
			if err != nil {
				select {
				case <-ctx.Done():
					return
				case opts.Err <- fmt.Errorf("journal next: %w", err):
					return
				}
			}
			if n == 0 {
				break // no more entries in this batch
			}

			entry, err := jrnl.GetEntry()
			if err != nil {
				continue // skip unreadable entry
			}

			// Parse priority.
			priority := 6 // default: informational
			if pStr, ok := entry.Fields[sdjournal.SD_JOURNAL_FIELD_PRIORITY]; ok {
				if p, err := strconv.Atoi(pStr); err == nil {
					priority = p
				}
			}

			// Apply minimum priority filter.
			// journald priority: 0 = emergency (most severe), 7 = debug (least severe).
			// MinPriority = 3 means "show only errors and above" → keep entries where priority <= 3.
			// MinPriority = 0 means "show everything".
			if opts.MinPriority > 0 && priority > opts.MinPriority {
				continue
			}

			// Parse timestamp (microseconds since epoch).
			ts := time.Unix(0, int64(entry.RealtimeTimestamp)*int64(time.Microsecond))

			unit := entry.Fields[sdjournal.SD_JOURNAL_FIELD_SYSTEMD_UNIT]
			if unit == "" {
				unit = entry.Fields["_COMM"]
			}

			msg := entry.Fields[sdjournal.SD_JOURNAL_FIELD_MESSAGE]

			logEntry := LogEntry{
				Timestamp: ts,
				Unit:      unit,
				Priority:  priority,
				Message:   msg,
			}

			select {
			case <-ctx.Done():
				return
			case opts.Out <- logEntry:
			}
		}
	}
}
