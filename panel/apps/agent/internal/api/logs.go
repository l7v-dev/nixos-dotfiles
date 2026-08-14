package api

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/l7v/panel-agent/internal/journal"
)

// parsePriorities parses a comma-separated list of priority ints (e.g. "0,1,2,3").
func parsePriorities(s string) []int {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	var result []int
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if val, err := strconv.Atoi(p); err == nil && val >= 0 && val <= 7 {
			result = append(result, val)
		}
	}
	return result
}

// parseTimeOrDuration parses RFC3339 timestamp or duration like "15m", "1h", "24h" relative to now.
func parseTimeOrDuration(s string) *time.Time {
	if s == "" {
		return nil
	}
	// Try RFC3339
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		utc := t.UTC()
		return &utc
	}
	// Try duration (e.g. "15m", "1h")
	if d, err := time.ParseDuration(s); err == nil {
		t := time.Now().UTC().Add(-d)
		return &t
	}
	return nil
}

// logsStreamHandler handles GET /api/v1/logs/stream (SSE).
func logsStreamHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Journal == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "journal service unavailable"})
			return
		}

		unit := r.URL.Query().Get("unit")
		search := r.URL.Query().Get("search")
		if search == "" {
			search = r.URL.Query().Get("q")
		}

		minPriority := 0
		if pStr := r.URL.Query().Get("priority"); pStr != "" {
			if p, err := strconv.Atoi(pStr); err == nil && p >= 0 && p <= 7 {
				minPriority = p
			}
		}

		priorities := parsePriorities(r.URL.Query().Get("priorities"))

		backlog := 100
		if bStr := r.URL.Query().Get("backlog"); bStr != "" {
			if b, err := strconv.Atoi(bStr); err == nil && b >= 0 && b <= 2000 {
				backlog = b
			}
		}

		// SSE headers
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no")
		w.Header().Del("Content-Length")
		w.WriteHeader(http.StatusOK)

		flusher, ok := w.(http.Flusher)
		if !ok {
			return
		}

		fmt.Fprint(w, ": connected\n\n")
		flusher.Flush()

		entries := make(chan journal.LogEntry, 128)
		errCh := make(chan error, 1)

		go d.Journal.Tail(r.Context(), journal.TailOptions{
			Unit:        unit,
			MinPriority: minPriority,
			Priorities:  priorities,
			Search:      search,
			Backlog:     backlog,
			Out:         entries,
			Err:         errCh,
		})

		heartbeat := time.NewTicker(15 * time.Second)
		defer heartbeat.Stop()

		for {
			select {
			case <-r.Context().Done():
				return

			case <-heartbeat.C:
				fmt.Fprint(w, ": keep-alive\n\n")
				flusher.Flush()

			case err := <-errCh:
				msg, _ := json.Marshal(map[string]string{"message": err.Error()})
				fmt.Fprintf(w, "event: error\ndata: %s\n\n", msg)
				flusher.Flush()
				return

			case entry := <-entries:
				data, err := json.Marshal(entry)
				if err != nil {
					continue
				}
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()
			}
		}
	}
}

// logsQueryHandler handles GET /api/v1/logs/query.
func logsQueryHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Journal == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "journal service unavailable"})
			return
		}

		q := r.URL.Query()
		unit := q.Get("unit")
		search := q.Get("search")
		if search == "" {
			search = q.Get("q")
		}

		minPriority := 0
		if pStr := q.Get("priority"); pStr != "" {
			if p, err := strconv.Atoi(pStr); err == nil && p >= 0 && p <= 7 {
				minPriority = p
			}
		}

		priorities := parsePriorities(q.Get("priorities"))
		since := parseTimeOrDuration(q.Get("since"))
		until := parseTimeOrDuration(q.Get("until"))

		limit := 100
		if lStr := q.Get("limit"); lStr != "" {
			if l, err := strconv.Atoi(lStr); err == nil && l > 0 && l <= 2000 {
				limit = l
			}
		}

		cursor := q.Get("cursor")
		reverse := q.Get("reverse") == "true" || q.Get("reverse") == "1"

		res, err := d.Journal.Query(r.Context(), journal.QueryOptions{
			Since:       since,
			Until:       until,
			Unit:        unit,
			MinPriority: minPriority,
			Priorities:  priorities,
			Search:      search,
			Limit:       limit,
			Cursor:      cursor,
			Reverse:     reverse,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, res)
	}
}

// logsUnitsHandler handles GET /api/v1/logs/units.
func logsUnitsHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Journal == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "journal service unavailable"})
			return
		}

		units, err := d.Journal.ListUnits(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"units": units,
			"total": len(units),
		})
	}
}

// logsStatsHandler handles GET /api/v1/logs/stats.
func logsStatsHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Journal == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "journal service unavailable"})
			return
		}

		q := r.URL.Query()
		since := parseTimeOrDuration(q.Get("since"))
		if since == nil {
			t := time.Now().UTC().Add(-1 * time.Hour)
			since = &t
		}

		until := parseTimeOrDuration(q.Get("until"))
		if until == nil {
			t := time.Now().UTC()
			until = &t
		}

		interval := time.Minute
		if intStr := q.Get("interval"); intStr != "" {
			if d, err := time.ParseDuration(intStr); err == nil && d > 0 {
				interval = d
			}
		}

		buckets, err := d.Journal.GetStats(r.Context(), *since, *until, interval)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"buckets": buckets,
			"since":   *since,
			"until":   *until,
		})
	}
}

// logsExportHandler handles GET /api/v1/logs/export.
func logsExportHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Journal == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "journal service unavailable"})
			return
		}

		q := r.URL.Query()
		format := strings.ToLower(q.Get("format"))
		if format == "" {
			format = "json"
		}

		unit := q.Get("unit")
		search := q.Get("search")
		priorities := parsePriorities(q.Get("priorities"))
		since := parseTimeOrDuration(q.Get("since"))
		until := parseTimeOrDuration(q.Get("until"))

		limit := 1000
		if lStr := q.Get("limit"); lStr != "" {
			if l, err := strconv.Atoi(lStr); err == nil && l > 0 && l <= 10000 {
				limit = l
			}
		}

		res, err := d.Journal.Query(r.Context(), journal.QueryOptions{
			Since:      since,
			Until:      until,
			Unit:       unit,
			Priorities: priorities,
			Search:     search,
			Limit:      limit,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		filename := fmt.Sprintf("system-logs-%s", time.Now().Format("20060102-150405"))

		switch format {
		case "csv":
			w.Header().Set("Content-Type", "text/csv; charset=utf-8")
			w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s.csv", filename))
			cw := csv.NewWriter(w)
			_ = cw.Write([]string{"Timestamp", "Unit", "Priority", "PID", "Comm", "Message"})
			for _, e := range res.Entries {
				_ = cw.Write([]string{
					e.Timestamp.Format(time.RFC3339),
					e.Unit,
					strconv.Itoa(e.Priority),
					strconv.Itoa(e.PID),
					e.Comm,
					e.Message,
				})
			}
			cw.Flush()

		case "raw", "log", "txt":
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s.log", filename))
			for _, e := range res.Entries {
				fmt.Fprintf(w, "%s [%s] (p=%d) %s\n",
					e.Timestamp.Format(time.RFC3339),
					e.Unit,
					e.Priority,
					e.Message,
				)
			}

		case "ndjson":
			w.Header().Set("Content-Type", "application/x-ndjson; charset=utf-8")
			w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s.ndjson", filename))
			for _, e := range res.Entries {
				data, _ := json.Marshal(e)
				w.Write(data)
				w.Write([]byte("\n"))
			}

		default: // "json"
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s.json", filename))
			writeJSON(w, http.StatusOK, res.Entries)
		}
	}
}
