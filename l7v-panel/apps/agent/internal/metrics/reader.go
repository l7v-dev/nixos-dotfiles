package metrics

import "context"

// ProcfsReader reads system metrics from the Linux /proc filesystem.
// The concrete implementation is in procfs.go (Task 3.1).
type ProcfsReader interface {
	ReadSnapshot(ctx context.Context) (MetricsSnapshot, error)
}
