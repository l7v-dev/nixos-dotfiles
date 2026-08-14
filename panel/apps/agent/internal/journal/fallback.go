package journal

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"sort"
	"strconv"
	"strings"
	"time"
)

type fallbackReader struct{}

func newFallbackReader() Reader {
	return &fallbackReader{}
}

// rawJSONEntry represents the JSON schema output by `journalctl -o json`.
type rawJSONEntry map[string]interface{}

func parseFallbackJSON(raw rawJSONEntry) (LogEntry, bool) {
	if raw == nil {
		return LogEntry{}, false
	}

	priority := 6
	if pVal, ok := raw["PRIORITY"]; ok {
		switch v := pVal.(type) {
		case string:
			if p, err := strconv.Atoi(v); err == nil {
				priority = p
			}
		case float64:
			priority = int(v)
		}
	}

	var ts time.Time
	if rtVal, ok := raw["__REALTIME_TIMESTAMP"]; ok {
		switch v := rtVal.(type) {
		case string:
			if usec, err := strconv.ParseInt(v, 10, 64); err == nil {
				ts = time.Unix(0, usec*int64(time.Microsecond)).UTC()
			}
		case float64:
			ts = time.Unix(0, int64(v)*int64(time.Microsecond)).UTC()
		}
	}
	if ts.IsZero() {
		ts = time.Now().UTC()
	}

	getString := func(key string) string {
		if val, ok := raw[key]; ok {
			if s, ok := val.(string); ok {
				return s
			}
		}
		return ""
	}

	getInt := func(key string) int {
		if val, ok := raw[key]; ok {
			switch v := val.(type) {
			case string:
				n, _ := strconv.Atoi(v)
				return n
			case float64:
				return int(v)
			}
		}
		return 0
	}

	unit := getString("_SYSTEMD_UNIT")
	if unit == "" {
		unit = getString("UNIT")
	}
	if unit == "" {
		unit = getString("_COMM")
	}

	comm := getString("_COMM")
	syslogID := getString("SYSLOG_IDENTIFIER")
	hostname := getString("_HOSTNAME")
	transport := getString("_TRANSPORT")
	cursor := getString("__CURSOR")
	msg := getString("MESSAGE")
	pid := getInt("_PID")
	uid := getInt("_UID")

	fields := make(map[string]string)
	for k, v := range raw {
		if s, ok := v.(string); ok {
			fields[k] = s
		}
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
		Cursor:    cursor,
		Fields:    fields,
	}, true
}

func (f *fallbackReader) Tail(ctx context.Context, opts TailOptions) {
	backlog := opts.Backlog
	if backlog <= 0 {
		backlog = 100
	}
	if backlog > 2000 {
		backlog = 2000
	}

	args := []string{"-o", "json", "-n", strconv.Itoa(backlog), "-f"}
	if opts.Unit != "" {
		u := opts.Unit
		if !strings.Contains(u, ".") {
			u = u + ".service"
		}
		args = append(args, "-u", u)
	}

	cmd := exec.CommandContext(ctx, "journalctl", args...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		opts.Err <- fmt.Errorf("journalctl stdout pipe: %w", err)
		return
	}

	if err := cmd.Start(); err != nil {
		opts.Err <- fmt.Errorf("start journalctl: %w", err)
		return
	}
	defer func() {
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
	}()

	scanner := bufio.NewScanner(stdout)
	buf := make([]byte, 1024*1024)
	scanner.Buffer(buf, 10*1024*1024)

	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return
		default:
		}

		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		var raw rawJSONEntry
		if err := json.Unmarshal(line, &raw); err != nil {
			continue
		}

		entry, ok := parseFallbackJSON(raw)
		if !ok {
			continue
		}

		if matchesFilter(entry, opts.Unit, opts.MinPriority, opts.Priorities, opts.Search) {
			select {
			case <-ctx.Done():
				return
			case opts.Out <- entry:
			}
		}
	}

	if err := scanner.Err(); err != nil && ctx.Err() == nil {
		select {
		case <-ctx.Done():
		case opts.Err <- fmt.Errorf("journalctl scan error: %w", err):
		}
	}
}

func (f *fallbackReader) Query(ctx context.Context, opts QueryOptions) (QueryResult, error) {
	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	if limit > 2000 {
		limit = 2000
	}

	args := []string{"-o", "json", "-n", strconv.Itoa(limit * 2)}
	if opts.Unit != "" {
		u := opts.Unit
		if !strings.Contains(u, ".") {
			u = u + ".service"
		}
		args = append(args, "-u", u)
	}
	if opts.Since != nil {
		args = append(args, "--since", opts.Since.Format("2006-01-02 15:04:05"))
	}
	if opts.Until != nil {
		args = append(args, "--until", opts.Until.Format("2006-01-02 15:04:05"))
	}

	cmd := exec.CommandContext(ctx, "journalctl", args...)
	out, err := cmd.Output()
	if err != nil {
		return QueryResult{}, fmt.Errorf("journalctl query: %w", err)
	}

	var entries []LogEntry
	scanner := bufio.NewScanner(strings.NewReader(string(out)))
	buf := make([]byte, 1024*1024)
	scanner.Buffer(buf, 10*1024*1024)

	var nextCursor string
	for scanner.Scan() && len(entries) < limit {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		var raw rawJSONEntry
		if err := json.Unmarshal(line, &raw); err != nil {
			continue
		}

		entry, ok := parseFallbackJSON(raw)
		if !ok {
			continue
		}

		if matchesFilter(entry, opts.Unit, opts.MinPriority, opts.Priorities, opts.Search) {
			entries = append(entries, entry)
			nextCursor = entry.Cursor
		}
	}

	if opts.Reverse {
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

func (f *fallbackReader) ListUnits(ctx context.Context) ([]string, error) {
	cmd := exec.CommandContext(ctx, "journalctl", "-F", "_SYSTEMD_UNIT")
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("journalctl list units: %w", err)
	}

	var units []string
	scanner := bufio.NewScanner(strings.NewReader(string(out)))
	for scanner.Scan() {
		u := strings.TrimSpace(scanner.Text())
		if u != "" {
			units = append(units, u)
		}
	}
	sort.Strings(units)
	return units, nil
}

func (f *fallbackReader) GetStats(ctx context.Context, since, until time.Time, bucketDuration time.Duration) ([]LogStatsBucket, error) {
	res, err := f.Query(ctx, QueryOptions{
		Since: &since,
		Until: &until,
		Limit: 2000,
	})
	if err != nil {
		return nil, err
	}

	if bucketDuration <= 0 {
		bucketDuration = time.Minute
	}

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

	for _, entry := range res.Entries {
		bucketTime := entry.Timestamp.Truncate(bucketDuration).Unix()
		if b, ok := bucketMap[bucketTime]; ok {
			level := priorityToLevelName(entry.Priority)
			b.Counts[level]++
			b.Total++
		}
	}

	return buckets, nil
}
