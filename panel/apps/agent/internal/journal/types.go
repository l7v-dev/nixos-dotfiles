package journal

import "time"

// LogEntry is a single journal log entry emitted as an SSE event.
type LogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Unit      string    `json:"unit"`
	Priority  int       `json:"priority"` // 0 (emergency) – 7 (debug)
	Message   string    `json:"message"`
}

// TailOptions configures a journal tail session.
type TailOptions struct {
	Unit        string       // filter to a specific systemd unit (empty = all)
	MinPriority int          // emit entries at or above this priority (0 = all)
	Out         chan<- LogEntry
	Err         chan<- error
}
