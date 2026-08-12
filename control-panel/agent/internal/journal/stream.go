package journal

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"
	"time"
)

// LogEntry represents a journal log entry
type LogEntry struct {
	Timestamp string `json:"timestamp"`
	Priority  int    `json:"priority"`
	Message   string `json:"message"`
	Unit      string `json:"unit,omitempty"`
}

// StreamLogs streams journal entries as SSE
func StreamLogs(w io.Writer, follow bool) error {
	args := []string{
		"-o", "json",
		"--no-pager",
		"-n", "100", // Last 100 entries
	}

	if follow {
		args = append(args, "-f")
	}

	cmd := exec.Command("journalctl", args...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		return err
	}

	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			var raw map[string]interface{}
			if err := json.Unmarshal(scanner.Bytes(), &raw); err != nil {
				continue
			}

			entry := LogEntry{
				Timestamp: time.Now().Format(time.RFC3339),
				Priority:  6,
				Message:   "",
			}

			if msg, ok := raw["MESSAGE"].(string); ok {
				entry.Message = msg
			}
			if prio, ok := raw["PRIORITY"].(string); ok {
				fmt.Sscanf(prio, "%d", &entry.Priority)
			}
			if unit, ok := raw["_SYSTEMD_UNIT"].(string); ok {
				entry.Unit = unit
			}

			data, _ := json.Marshal(entry)
			fmt.Fprintf(w, "data: %s\n\n", data)
			w.(io.Flusher).Flush()
		}
	}()

	return cmd.Wait()
}
