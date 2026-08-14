package journal

import "time"

// LogEntry is a single journal log entry emitted as an SSE event or REST query item.
type LogEntry struct {
	Timestamp time.Time         `json:"timestamp"`
	Unit      string            `json:"unit"`
	Priority  int               `json:"priority"` // 0 (emergency) – 7 (debug)
	Message   string            `json:"message"`
	PID       int               `json:"pid,omitempty"`
	UID       int               `json:"uid,omitempty"`
	Comm      string            `json:"comm,omitempty"`
	SyslogID  string            `json:"syslog_id,omitempty"`
	Hostname  string            `json:"hostname,omitempty"`
	Transport string            `json:"transport,omitempty"`
	Cursor    string            `json:"cursor,omitempty"`
	Fields    map[string]string `json:"fields,omitempty"`
}

// TailOptions configures a journal tail session.
type TailOptions struct {
	Unit        string       // filter to a specific systemd unit (empty = all)
	MinPriority int          // emit entries at or above this priority (0 = all, 3 = err+above)
	Priorities  []int        // specific allowed priorities (e.g. [3,4]; if non-empty, overrides MinPriority)
	Search      string       // case-insensitive substring search in message / unit
	Backlog     int          // number of initial entries to send before live tail (default 100, max 2000)
	Out         chan<- LogEntry
	Err         chan<- error
}

// QueryOptions configures a historical log search.
type QueryOptions struct {
	Since       *time.Time
	Until       *time.Time
	Unit        string
	MinPriority int
	Priorities  []int
	Search      string
	Limit       int    // max entries to return (default 100, max 2000)
	Cursor      string // pagination cursor
	Reverse     bool   // true = newest first, false = chronological
	Boot        *int   // 0 = current boot, -1 = previous boot
}

// QueryResult represents the response for a historical log query.
type QueryResult struct {
	Entries    []LogEntry `json:"entries"`
	NextCursor string     `json:"next_cursor,omitempty"`
	Total      int        `json:"total"`
}

// LogStatsBucket represents aggregated log frequency counts bucketed by time.
type LogStatsBucket struct {
	Timestamp time.Time      `json:"timestamp"`
	Counts    map[string]int `json:"counts"` // "emergency", "alert", "critical", "error", "warning", "notice", "info", "debug"
	Total     int            `json:"total"`
}
