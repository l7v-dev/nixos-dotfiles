package containers

import (
	"bufio"
	"bytes"
	"context"
	"encoding/binary"
	"fmt"
	"io"
	"net/url"
	"strings"
	"time"
)

// LogLine represents a structured log entry emitted by a container.
type LogLine struct {
	Timestamp time.Time `json:"timestamp"`
	Stream    string    `json:"stream"` // stdout, stderr
	Message   string    `json:"message"`
}

// LogStreamOptions specifies parameters for reading container logs.
type LogStreamOptions struct {
	Follow     bool
	Tail       string // e.g. "100", "all"
	Since      int64  // unix timestamp
	Timestamps bool
	Stdout     bool
	Stderr     bool
}

// StreamLogs reads logs from the OCI engine, demultiplexes stdout/stderr streams, and feeds out.
func (m *containerManager) StreamLogs(ctx context.Context, id string, opts LogStreamOptions, out chan<- LogLine) error {
	q := url.Values{}
	if opts.Follow {
		q.Set("follow", "1")
	}
	if opts.Tail != "" {
		q.Set("tail", opts.Tail)
	} else {
		q.Set("tail", "100")
	}
	if opts.Timestamps {
		q.Set("timestamps", "1")
	}
	if opts.Since > 0 {
		q.Set("since", fmt.Sprintf("%d", opts.Since))
	}
	if opts.Stdout {
		q.Set("stdout", "1")
	} else {
		q.Set("stdout", "1")
	}
	if opts.Stderr {
		q.Set("stderr", "1")
	} else {
		q.Set("stderr", "1")
	}

	path := fmt.Sprintf("/containers/%s/logs?%s", url.PathEscape(id), q.Encode())

	resp, err := m.client.DoRequest(ctx, "GET", path, nil)
	if err != nil {
		return fmt.Errorf("request container logs: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("engine returned %d for logs", resp.StatusCode)
	}

	reader := bufio.NewReader(resp.Body)
	header := make([]byte, 8)

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		// Read 8-byte header
		_, err := io.ReadFull(reader, header)
		if err != nil {
			if err == io.EOF || ctx.Err() != nil {
				return nil
			}
			// Might be raw TTY without 8-byte header
			line, readErr := reader.ReadString('\n')
			if readErr != nil && len(line) == 0 {
				return nil
			}
			select {
			case out <- parseRawLogLine(line, opts.Timestamps):
			case <-ctx.Done():
				return ctx.Err()
			}
			continue
		}

		streamType := header[0]
		frameSize := binary.BigEndian.Uint32(header[4:8])

		var streamName string
		switch streamType {
		case 1:
			streamName = "stdout"
		case 2:
			streamName = "stderr"
		default:
			streamName = "stdout"
		}

		frameBuf := make([]byte, frameSize)
		_, err = io.ReadFull(reader, frameBuf)
		if err != nil {
			if err == io.EOF || ctx.Err() != nil {
				return nil
			}
			return fmt.Errorf("read log payload: %w", err)
		}

		// Split multi-line payload
		lines := bytes.Split(frameBuf, []byte("\n"))
		for _, rawLine := range lines {
			if len(rawLine) == 0 {
				continue
			}

			lineStr := string(rawLine)
			var ts time.Time
			msg := lineStr

			if opts.Timestamps {
				parts := strings.SplitN(lineStr, " ", 2)
				if len(parts) == 2 {
					if parsed, err := time.Parse(time.RFC3339Nano, parts[0]); err == nil {
						ts = parsed
						msg = parts[1]
					}
				}
			}

			if ts.IsZero() {
				ts = time.Now()
			}

			entry := LogLine{
				Timestamp: ts,
				Stream:    streamName,
				Message:   msg,
			}

			select {
			case out <- entry:
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}
}

func parseRawLogLine(line string, withTimestamps bool) LogLine {
	trimmed := strings.TrimRight(line, "\r\n")
	ts := time.Now()
	msg := trimmed

	if withTimestamps {
		parts := strings.SplitN(trimmed, " ", 2)
		if len(parts) == 2 {
			if parsed, err := time.Parse(time.RFC3339Nano, parts[0]); err == nil {
				ts = parsed
				msg = parts[1]
			}
		}
	}

	return LogLine{
		Timestamp: ts,
		Stream:    "stdout",
		Message:   msg,
	}
}
