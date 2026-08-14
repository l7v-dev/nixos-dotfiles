package journal

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/coreos/go-systemd/v22/sdjournal"
)

// journalReader is the concrete Reader implementation backed by sdjournal with journalctl fallback.
type journalReader struct {
	fallback Reader
}

// NewReader returns a Reader that tails and queries the live systemd journal.
func NewReader() Reader {
	return &journalReader{
		fallback: newFallbackReader(),
	}
}

// parseEntry converts an sdjournal.JournalEntry to our LogEntry model.
func parseEntry(entry *sdjournal.JournalEntry) LogEntry {
	priority := 6 // default: informational
	if pStr, ok := entry.Fields[sdjournal.SD_JOURNAL_FIELD_PRIORITY]; ok {
		if p, err := strconv.Atoi(pStr); err == nil {
			priority = p
		}
	}

	ts := time.Unix(0, int64(entry.RealtimeTimestamp)*int64(time.Microsecond)).UTC()

	unit := entry.Fields[sdjournal.SD_JOURNAL_FIELD_SYSTEMD_UNIT]
	if unit == "" {
		unit = entry.Fields["UNIT"]
	}
	if unit == "" {
		unit = entry.Fields[sdjournal.SD_JOURNAL_FIELD_COMM]
	}

	comm := entry.Fields[sdjournal.SD_JOURNAL_FIELD_COMM]
	syslogID := entry.Fields[sdjournal.SD_JOURNAL_FIELD_SYSLOG_IDENTIFIER]
	hostname := entry.Fields[sdjournal.SD_JOURNAL_FIELD_HOSTNAME]
	transport := entry.Fields[sdjournal.SD_JOURNAL_FIELD_TRANSPORT]
	msg := entry.Fields[sdjournal.SD_JOURNAL_FIELD_MESSAGE]

	var pid, uid int
	if pidStr, ok := entry.Fields[sdjournal.SD_JOURNAL_FIELD_PID]; ok {
		pid, _ = strconv.Atoi(pidStr)
	}
	if uidStr, ok := entry.Fields[sdjournal.SD_JOURNAL_FIELD_UID]; ok {
		uid, _ = strconv.Atoi(uidStr)
	}

	return LogEntry{
		Timestamp: ts,
		Unit:      unit,
		Priority:  priority,
		Message:   msg,
		PID:       pid,
		UID:       uid,
		Comm:      comm,
		SyslogID:  syslogID,
		Hostname:  hostname,
		Transport: transport,
		Cursor:    entry.Cursor,
		Fields:    entry.Fields,
	}
}

// matchesFilter checks whether a LogEntry matches priority, unit, and search criteria.
func matchesFilter(entry LogEntry, unit string, minPriority int, priorities []int, search string) bool {
	if !matchesPriority(entry.Priority, minPriority, priorities) {
		return false
	}
	if !matchesUnit(entry.Unit, entry.Comm, entry.SyslogID, unit) {
		return false
	}
	if !matchesSearch(entry.Message, entry.Unit, entry.Comm, search) {
		return false
	}
	return true
}

func matchesPriority(priority int, minPriority int, priorities []int) bool {
	if len(priorities) > 0 {
		for _, p := range priorities {
			if p == priority {
				return true
			}
		}
		return false
	}
	if minPriority > 0 && priority > minPriority {
		return false
	}
	return true
}

func matchesUnit(unit, comm, syslogID, targetUnit string) bool {
	if targetUnit == "" {
		return true
	}
	tu := strings.ToLower(strings.TrimSpace(targetUnit))
	tuBase := strings.TrimSuffix(tu, ".service")

	u := strings.ToLower(unit)
	c := strings.ToLower(comm)
	s := strings.ToLower(syslogID)

	return u == tu || u == tuBase || strings.TrimSuffix(u, ".service") == tuBase ||
		c == tu || c == tuBase ||
		s == tu || s == tuBase ||
		strings.Contains(u, tu) || strings.Contains(c, tu)
}

func matchesSearch(msg, unit, comm string, search string) bool {
	if search == "" {
		return true
	}
	s := strings.ToLower(search)
	return strings.Contains(strings.ToLower(msg), s) ||
		strings.Contains(strings.ToLower(unit), s) ||
		strings.Contains(strings.ToLower(comm), s)
}

// applyUnitMatches adds matches to sdjournal for robust unit matching.
func applyUnitMatches(jrnl *sdjournal.Journal, targetUnit string) {
	if targetUnit == "" {
		return
	}
	unit := strings.TrimSpace(targetUnit)
	unitService := unit
	if !strings.Contains(unit, ".") {
		unitService = unit + ".service"
	}
	_ = jrnl.AddMatch("_SYSTEMD_UNIT=" + unitService)
	_ = jrnl.AddDisjunction()
	_ = jrnl.AddMatch("_SYSTEMD_UNIT=" + unit)
	_ = jrnl.AddDisjunction()
	_ = jrnl.AddMatch("UNIT=" + unitService)
	_ = jrnl.AddDisjunction()
	_ = jrnl.AddMatch("SYSLOG_IDENTIFIER=" + unit)
	_ = jrnl.AddDisjunction()
	_ = jrnl.AddMatch("_COMM=" + unit)
}

// Tail opens the journal, streams initial backlog entries if requested, and then
// continuously streams new entries until ctx is cancelled.
func (j *journalReader) Tail(ctx context.Context, opts TailOptions) {
	jrnl, err := sdjournal.NewJournal()
	if err != nil {
		// Fallback to journalctl subprocess engine if CGO sdjournal cannot open.
		if j.fallback != nil {
			j.fallback.Tail(ctx, opts)
			return
		}
		opts.Err <- fmt.Errorf("open journal: %w", err)
		return
	}
	defer jrnl.Close()

	applyUnitMatches(jrnl, opts.Unit)

	backlog := opts.Backlog
	if backlog <= 0 {
		backlog = 100 // default initial backlog
	}
	if backlog > 2000 {
		backlog = 2000
	}

	// 1. Initial Backlog: Seek to tail, step back, and emit existing entries.
	if err := jrnl.SeekTail(); err == nil {
		_, _ = jrnl.PreviousSkip(uint64(backlog))
		for {
			select {
			case <-ctx.Done():
				return
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
			if matchesFilter(entry, opts.Unit, opts.MinPriority, opts.Priorities, opts.Search) {
				select {
				case <-ctx.Done():
					return
				case opts.Out <- entry:
				}
			}
		}
	}

	// 2. Live Tail: Continuously wait for new entries.
	for {
		status := jrnl.Wait(150 * time.Millisecond)
		if status == sdjournal.SD_JOURNAL_NOP {
			select {
			case <-ctx.Done():
				return
			default:
			}
			continue
		}

		for {
			select {
			case <-ctx.Done():
				return
			default:
			}

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
				break
			}

			rawEntry, err := jrnl.GetEntry()
			if err != nil {
				continue
			}
			entry := parseEntry(rawEntry)
			if matchesFilter(entry, opts.Unit, opts.MinPriority, opts.Priorities, opts.Search) {
				select {
				case <-ctx.Done():
					return
				case opts.Out <- entry:
				}
			}
		}
	}
}
