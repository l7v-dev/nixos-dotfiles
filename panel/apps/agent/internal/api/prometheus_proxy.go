package api

import (
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode"
)

var allowedPrefixes = []string{
	"node_",
	"systemd_",
	"go_",
	"process_",
}

const (
	maxQueryLength = 4096
	maxTimeRangeSec = 2_592_000 // 30 days in seconds
	defaultPrometheusBase = "http://localhost:9090"
	proxyClientTimeout = 10 * time.Second
)

var promQLKeywords = map[string]bool{
	// Aggregations
	"sum": true, "min": true, "max": true, "avg": true, "group": true,
	"stddev": true, "stdvar": true, "count": true, "count_values": true,
	"bottomk": true, "topk": true, "quantile": true,
	// Modifiers & Clauses
	"by": true, "without": true, "on": true, "ignoring": true,
	"group_left": true, "group_right": true, "offset": true, "bool": true,
	"and": true, "or": true, "unless": true, "atan2": true,
	// Functions
	"abs": true, "absent": true, "absent_over_time": true, "ceil": true,
	"changes": true, "clamp": true, "clamp_max": true, "clamp_min": true,
	"day_of_month": true, "day_of_week": true, "day_of_year": true,
	"days_in_month": true, "delta": true, "deriv": true, "exp": true,
	"floor": true, "histogram_avg": true, "histogram_count": true,
	"histogram_fraction": true, "histogram_quantile": true,
	"histogram_stddev": true, "histogram_stdvar": true, "histogram_sum": true,
	"histogram_volume": true, "holt_winters": true, "hour": true,
	"idelta": true, "increase": true, "irate": true, "label_join": true,
	"label_replace": true, "ln": true, "log2": true, "log10": true,
	"minute": true, "month": true, "predict_linear": true, "rate": true,
	"resets": true, "round": true, "scalar": true, "sgn": true,
	"sort": true, "sort_desc": true, "sqrt": true, "time": true,
	"timestamp": true, "vector": true, "year": true,
	"avg_over_time": true, "min_over_time": true, "max_over_time": true,
	"sum_over_time": true, "count_over_time": true, "quantile_over_time": true,
	"stddev_over_time": true, "stdvar_over_time": true, "last_over_time": true,
	"present_over_time": true, "mad_over_time": true,
	"inf": true, "nan": true,
}

// hasAllowedPrefix checks if a metric identifier starts with any allowed prefix.
func hasAllowedPrefix(metricName string) bool {
	for _, p := range allowedPrefixes {
		if strings.HasPrefix(metricName, p) {
			return true
		}
	}
	return false
}

// isQueryAllowed checks whether all metric names in the PromQL query start with an allowed prefix.
func isQueryAllowed(query string) bool {
	q := strings.TrimSpace(query)
	if q == "" {
		return false
	}

	runes := []rune(q)
	n := len(runes)
	i := 0

	foundMetric := false

	for i < n {
		r := runes[i]

		// Skip whitespace
		if unicode.IsSpace(r) {
			i++
			continue
		}

		// Skip comments (# ...)
		if r == '#' {
			for i < n && runes[i] != '\n' {
				i++
			}
			continue
		}

		// Skip strings
		if r == '"' || r == '\'' || r == '`' {
			quote := r
			i++
			for i < n && runes[i] != quote {
				if runes[i] == '\\' && i+1 < n {
					i += 2
					continue
				}
				i++
			}
			if i < n {
				i++ // skip closing quote
			}
			continue
		}

		// Range vector / duration brackets [5m], [15s], etc.
		if r == '[' {
			for i < n && runes[i] != ']' {
				i++
			}
			if i < n {
				i++ // skip ']'
			}
			continue
		}

		// Label matchers {...}
		if r == '{' {
			i++
			// Parse inside label matcher
			for i < n && runes[i] != '}' {
				// Skip whitespace and commas
				if unicode.IsSpace(runes[i]) || runes[i] == ',' {
					i++
					continue
				}

				// Read label key
				if isIdentStart(runes[i]) {
					startKey := i
					for i < n && isIdentPart(runes[i]) {
						i++
					}
					key := string(runes[startKey:i])

					// Skip whitespace before operator
					for i < n && unicode.IsSpace(runes[i]) {
						i++
					}

					// Skip operator (=, !=, =~, !~)
					for i < n && (runes[i] == '=' || runes[i] == '!' || runes[i] == '~') {
						i++
					}

					// Skip whitespace before string value
					for i < n && unicode.IsSpace(runes[i]) {
						i++
					}

					// Read string value
					if i < n && (runes[i] == '"' || runes[i] == '\'' || runes[i] == '`') {
						qChar := runes[i]
						i++
						valStart := i
						for i < n && runes[i] != qChar {
							if runes[i] == '\\' && i+1 < n {
								i += 2
								continue
							}
							i++
						}
						val := string(runes[valStart:i])
						if i < n {
							i++ // closing quote
						}

						// If __name__ is explicitly matched, validate it!
						if key == "__name__" {
							foundMetric = true
							if !hasAllowedPrefix(val) {
								return false
							}
						}
					}
				} else {
					i++
				}
			}
			if i < n {
				i++ // skip '}'
			}
			continue
		}

		// Identifier
		if isIdentStart(r) {
			start := i
			for i < n && isIdentPart(runes[i]) {
				i++
			}
			ident := string(runes[start:i])

			// If it's a number followed by duration unit, e.g. "15s", "5m"
			if isNumberWithDuration(ident) {
				continue
			}

			// Check for clauses like by (...), without (...), on (...), ignoring (...)
			if ident == "by" || ident == "without" || ident == "on" || ident == "ignoring" {
				// Skip whitespace
				for i < n && unicode.IsSpace(runes[i]) {
					i++
				}
				// Skip parentheses (label list)
				if i < n && runes[i] == '(' {
					depth := 1
					i++
					for i < n && depth > 0 {
						if runes[i] == '(' {
							depth++
						} else if runes[i] == ')' {
							depth--
						}
						i++
					}
				}
				continue
			}

			// Check keywords / functions
			if promQLKeywords[ident] {
				continue
			}

			// It is a metric name
			foundMetric = true
			if !hasAllowedPrefix(ident) {
				return false
			}
			continue
		}

		i++
	}

	return foundMetric
}

func isIdentStart(r rune) bool {
	return r == '_' || unicode.IsLetter(r) || r == ':'
}

func isIdentPart(r rune) bool {
	return r == '_' || unicode.IsLetter(r) || unicode.IsDigit(r) || r == ':'
}

func isNumberWithDuration(s string) bool {
	if s == "" {
		return false
	}
	// e.g. "15s", "5m", "1h", "2d"
	i := 0
	for i < len(s) && (s[i] >= '0' && s[i] <= '9') {
		i++
	}
	if i == 0 || i == len(s) {
		return false
	}
	unit := s[i:]
	return unit == "s" || unit == "m" || unit == "h" || unit == "d" || unit == "w" || unit == "y" || unit == "ms"
}

// validateTimeRange checks that start and end are valid and diff <= 30 days.
func validateTimeRange(start, end int64) error {
	if start < 0 || end < 0 {
		return errors.New("start and end must be non-negative")
	}
	if end < start {
		return errors.New("end must be greater than or equal to start")
	}
	if end-start > maxTimeRangeSec {
		return fmt.Errorf("time range %d exceeds maximum of %d seconds", end-start, maxTimeRangeSec)
	}
	return nil
}

// prometheusProxyHandler creates an http.HandlerFunc for proxying query or query_range requests to Prometheus.
func prometheusProxyHandler(endpointType string, customPrometheusBase ...string) http.HandlerFunc {
	promBase := defaultPrometheusBase
	if len(customPrometheusBase) > 0 && customPrometheusBase[0] != "" {
		promBase = customPrometheusBase[0]
	}

	client := &http.Client{
		Timeout: proxyClientTimeout,
	}

	return func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("query")
		if strings.TrimSpace(query) == "" || len(query) > maxQueryLength {
			writeError(w, http.StatusBadRequest, map[string]string{
				"message": "query: boş veya çok uzun (max 4096)",
			})
			return
		}

		if !isQueryAllowed(query) {
			writeError(w, http.StatusForbidden, map[string]string{
				"message": "query: izin verilmeyen metrik öneki",
			})
			return
		}

		if endpointType == "query_range" {
			startStr := r.URL.Query().Get("start")
			endStr := r.URL.Query().Get("end")
			if startStr == "" || endStr == "" {
				writeError(w, http.StatusBadRequest, map[string]string{
					"message": "start/end: geçersiz unix timestamp",
				})
				return
			}

			start, err1 := strconv.ParseInt(startStr, 10, 64)
			end, err2 := strconv.ParseInt(endStr, 10, 64)
			if err1 != nil || err2 != nil {
				writeError(w, http.StatusBadRequest, map[string]string{
					"message": "start/end: geçersiz unix timestamp",
				})
				return
			}

			if err := validateTimeRange(start, end); err != nil {
				if end-start > maxTimeRangeSec {
					writeError(w, http.StatusBadRequest, map[string]string{
						"message": "zaman aralığı maksimum 30 günü geçemez",
					})
				} else {
					writeError(w, http.StatusBadRequest, map[string]string{
						"message": "start/end: geçersiz unix timestamp",
					})
				}
				return
			}
		}

		targetURL, err := url.Parse(fmt.Sprintf("%s/api/v1/%s", promBase, endpointType))
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": "internal error constructing target URL",
			})
			return
		}
		targetURL.RawQuery = r.URL.RawQuery

		req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, targetURL.String(), nil)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": "internal error creating request: " + err.Error(),
			})
			return
		}

		resp, err := client.Do(req)
		if err != nil {
			var netErr net.Error
			if errors.As(err, &netErr) && netErr.Timeout() {
				writeError(w, http.StatusGatewayTimeout, map[string]string{
					"message": "prometheus isteği zaman aşımına uğradı",
				})
				return
			}
			if errors.Is(err, http.ErrHandlerTimeout) || strings.Contains(err.Error(), "deadline exceeded") || strings.Contains(err.Error(), "Client.Timeout") {
				writeError(w, http.StatusGatewayTimeout, map[string]string{
					"message": "prometheus isteği zaman aşımına uğradı",
				})
				return
			}
			writeError(w, http.StatusBadGateway, map[string]string{
				"message": "prometheus erişilemez: " + err.Error(),
			})
			return
		}
		defer resp.Body.Close()

		ct := resp.Header.Get("Content-Type")
		if ct != "" {
			w.Header().Set("Content-Type", ct)
		}
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body) //nolint:errcheck
	}
}
