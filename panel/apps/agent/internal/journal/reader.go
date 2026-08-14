package journal

import (
	"context"
	"time"
)

// Reader provides live streaming and historical queries against the systemd journal.
type Reader interface {
	Tail(ctx context.Context, opts TailOptions)
	Query(ctx context.Context, opts QueryOptions) (QueryResult, error)
	ListUnits(ctx context.Context) ([]string, error)
	GetStats(ctx context.Context, since, until time.Time, bucketDuration time.Duration) ([]LogStatsBucket, error)
}
