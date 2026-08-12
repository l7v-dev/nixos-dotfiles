package journal

import "context"

// Reader tails the systemd journal and emits LogEntry values.
// The concrete implementation is in tail.go (Task 7.1).
type Reader interface {
	Tail(ctx context.Context, opts TailOptions)
}
