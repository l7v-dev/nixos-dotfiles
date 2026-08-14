package apps

import (
	"sync"
	"time"
)

// AuditRecord logs an operational action taken on an application.
type AuditRecord struct {
	ID        string    `json:"id"`
	AppID     string    `json:"app_id"`
	Action    string    `json:"action"`
	Status    string    `json:"status"` // "success" | "failed" | "rejected"
	Message   string    `json:"message,omitempty"`
	Timestamp time.Time `json:"timestamp"`
	CallerIP  string    `json:"caller_ip,omitempty"`
}

// AuditLogger keeps a thread-safe record of recent operations.
type AuditLogger struct {
	mu      sync.RWMutex
	records []AuditRecord
	maxCap  int
}

// NewAuditLogger initializes an audit buffer with capacity limit.
func NewAuditLogger(maxCap int) *AuditLogger {
	if maxCap <= 0 {
		maxCap = 200
	}
	return &AuditLogger{
		records: make([]AuditRecord, 0, maxCap),
		maxCap:  maxCap,
	}
}

// Log records a new audit entry.
func (l *AuditLogger) Log(record AuditRecord) {
	l.mu.Lock()
	defer l.mu.Unlock()

	if record.Timestamp.IsZero() {
		record.Timestamp = time.Now()
	}

	if len(l.records) >= l.maxCap {
		// Drop oldest record
		l.records = l.records[1:]
	}
	l.records = append(l.records, record)
}

// GetRecent returns the most recent audit records up to limit.
func (l *AuditLogger) GetRecent(limit int) []AuditRecord {
	l.mu.RLock()
	defer l.mu.RUnlock()

	if limit <= 0 || limit > len(l.records) {
		limit = len(l.records)
	}

	out := make([]AuditRecord, limit)
	startIdx := len(l.records) - limit
	copy(out, l.records[startIdx:])
	return out
}
