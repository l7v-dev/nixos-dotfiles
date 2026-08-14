package api

import (
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"

	"github.com/l7v/panel-agent/internal/metrics"
	"pgregory.net/rapid"
)

func testDeps(prometheusWidget bool) Deps {
	return Deps{
		Logger:           slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError})),
		Version:          "test",
		Thresholds:       metrics.Thresholds{},
		PrometheusWidget: prometheusWidget,
	}
}

// ── Unit Tests ───────────────────────────────────────────────────────────────

func TestIsQueryAllowed(t *testing.T) {
	tests := []struct {
		name    string
		query   string
		allowed bool
	}{
		// Allowed prefixes
		{"simple node metric", "node_cpu_seconds_total", true},
		{"simple systemd metric", "systemd_unit_start_time_seconds", true},
		{"simple go metric", "go_goroutines", true},
		{"simple process metric", "process_cpu_seconds_total", true},
		{"metric with label filter", `node_cpu_seconds_total{mode!="idle"}`, true},
		{"rate function", `rate(node_cpu_seconds_total[5m])`, true},
		{"sum by rate", `sum by (cpu) (rate(node_cpu_seconds_total[1m]))`, true},
		{"topk function", `topk(10, node_systemd_unit_tasks_current)`, true},
		{"subtraction of allowed metrics", `node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes`, true},
		{"division and rate", `rate(node_disk_read_bytes_total[5m]) / 1024 / 1024`, true},
		{"__name__ allowed matcher", `{__name__="node_thermal_zone_temp"}`, true},

		// Rejected queries
		{"empty query", "", false},
		{"whitespace query", "   ", false},
		{"unallowed prefix", "custom_metric_total", false},
		{"unallowed metric in function", "rate(unauthorized_secret_metric[5m])", false},
		{"mixed allowed and unallowed", "node_cpu_seconds_total + secret_metric", false},
		{"unallowed in __name__", `{__name__="unallowed_metric"}`, false},
		{"influx or mysql prefix", "mysql_global_status_threads_running", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := isQueryAllowed(tt.query)
			if got != tt.allowed {
				t.Errorf("isQueryAllowed(%q) = %v; want %v", tt.query, got, tt.allowed)
			}
		})
	}
}

func TestValidateTimeRange(t *testing.T) {
	tests := []struct {
		name    string
		start   int64
		end     int64
		wantErr bool
	}{
		{"exact same start and end", 1000, 1000, false},
		{"1 hour range", 1000, 4600, false},
		{"30 days range", 1000, 1000 + maxTimeRangeSec, false},
		{"negative start", -10, 1000, true},
		{"negative end", 1000, -10, true},
		{"end before start", 5000, 1000, true},
		{"exceeding 30 days", 1000, 1000 + maxTimeRangeSec + 1, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateTimeRange(tt.start, tt.end)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateTimeRange(%d, %d) error = %v; wantErr %v", tt.start, tt.end, err, tt.wantErr)
			}
		})
	}
}

func TestPrometheusWidgetDisabled_Returns404(t *testing.T) {
	router := NewRouter(testDeps(false))
	srv := httptest.NewServer(router)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/v1/metrics/query?query=node_cpu_seconds_total")
	if err != nil {
		t.Fatalf("unexpected request error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("expected 404 when PANEL_PROMETHEUS_WIDGET=0, got %d", resp.StatusCode)
	}
}

func TestPrometheusProxy_Validations(t *testing.T) {
	// Mock Prometheus backend
	mockProm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"success","data":{"resultType":"vector","result":[]}}`))
	}))
	defer mockProm.Close()

	// Handler with mockProm base URL
	queryHandler := prometheusProxyHandler("query", mockProm.URL)
	queryRangeHandler := prometheusProxyHandler("query_range", mockProm.URL)

	t.Run("empty query returns 400", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/metrics/query?query=", nil)
		rec := httptest.NewRecorder()
		queryHandler(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", rec.Code)
		}
	})

	t.Run("too long query returns 400", func(t *testing.T) {
		longQuery := "node_" + strings.Repeat("a", 5000)
		req := httptest.NewRequest(http.MethodGet, "/api/v1/metrics/query?query="+longQuery, nil)
		rec := httptest.NewRecorder()
		queryHandler(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", rec.Code)
		}
	})

	t.Run("unallowed prefix returns 403", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/metrics/query?query=custom_app_metrics", nil)
		rec := httptest.NewRecorder()
		queryHandler(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Errorf("expected 403, got %d", rec.Code)
		}
	})

	t.Run("query_range missing start/end returns 400", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/metrics/query_range?query=node_cpu_seconds_total", nil)
		rec := httptest.NewRecorder()
		queryRangeHandler(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", rec.Code)
		}
	})

	t.Run("query_range range > 30 days returns 400", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/metrics/query_range?query=node_cpu_seconds_total&start=1000&end=3000000", nil)
		rec := httptest.NewRecorder()
		queryRangeHandler(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", rec.Code)
		}
	})

	t.Run("valid query returns 200 with matching Content-Type", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/metrics/query?query=node_cpu_seconds_total", nil)
		rec := httptest.NewRecorder()
		queryHandler(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rec.Code)
		}
		if rec.Header().Get("Content-Type") != "application/json" {
			t.Errorf("expected application/json Content-Type, got %s", rec.Header().Get("Content-Type"))
		}
	})
}

func TestPrometheusProxy_UnreachablePrometheus_Returns502(t *testing.T) {
	// Point to an unreachable address
	queryHandler := prometheusProxyHandler("query", "http://127.0.0.1:59999")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/metrics/query?query=node_cpu_seconds_total", nil)
	rec := httptest.NewRecorder()
	queryHandler(rec, req)

	if rec.Code != http.StatusBadGateway {
		t.Errorf("expected 502 Bad Gateway when Prometheus is unreachable, got %d", rec.Code)
	}
}

// ── Property-Based Tests (Rapid) ─────────────────────────────────────────────

// Property 3: Allowlist Validation Invariant
func TestProperty3_AllowlistValidation(t *testing.T) {
	rapid.Check(t, func(tc *rapid.T) {
		prefix := rapid.SampledFrom(allowedPrefixes).Draw(tc, "prefix")
		suffix := rapid.StringMatching(`^[a-zA-Z0-9_]{1,32}$`).Draw(tc, "suffix")
		metricName := prefix + suffix

		// Form a valid PromQL expression
		exprType := rapid.IntRange(0, 3).Draw(tc, "exprType")
		var query string
		switch exprType {
		case 0:
			query = metricName
		case 1:
			query = fmt.Sprintf("rate(%s[5m])", metricName)
		case 2:
			query = fmt.Sprintf(`%s{mode!="idle"}`, metricName)
		case 3:
			query = fmt.Sprintf("topk(5, %s)", metricName)
		}

		if !isQueryAllowed(query) {
			tc.Fatalf("valid allowed query %q was rejected", query)
		}

		// Now test an unallowed prefix (must be rejected)
		unallowedPrefix := rapid.SampledFrom([]string{"secret_", "user_", "app_", "custom_", "metric_"}).Draw(tc, "unallowedPrefix")
		unallowedQuery := unallowedPrefix + suffix
		if isQueryAllowed(unallowedQuery) {
			tc.Fatalf("unallowed query %q was accepted", unallowedQuery)
		}
	})
}

// Property 4: Time Range Validation
func TestProperty4_TimeRangeValidation(t *testing.T) {
	rapid.Check(t, func(tc *rapid.T) {
		start := rapid.Int64Range(0, 2_000_000_000).Draw(tc, "start")
		diff := rapid.Int64Range(0, 4_000_000).Draw(tc, "diff")
		end := start + diff

		err := validateTimeRange(start, end)
		if diff <= maxTimeRangeSec {
			if err != nil {
				tc.Fatalf("valid time range diff=%d rejected with error: %v", diff, err)
			}
		} else {
			if err == nil {
				tc.Fatalf("invalid time range diff=%d (> %d) was accepted", diff, maxTimeRangeSec)
			}
		}
	})
}

// Property 5: Proxy Round-Trip — Byte-for-byte and Content-Type integrity
func TestProperty5_ProxyRoundTrip(t *testing.T) {
	rapid.Check(t, func(tc *rapid.T) {
		bodyBytes := rapid.SliceOfN(rapid.Byte(), 1, 2048).Draw(tc, "body")
		contentType := rapid.SampledFrom([]string{
			"application/json",
			"text/plain; charset=utf-8",
			"application/x-protobuf",
		}).Draw(tc, "ct")
		statusCode := rapid.SampledFrom([]int{http.StatusOK, http.StatusBadRequest, http.StatusNotFound}).Draw(tc, "status")

		mockProm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", contentType)
			w.WriteHeader(statusCode)
			w.Write(bodyBytes)
		}))
		defer mockProm.Close()

		handler := prometheusProxyHandler("query", mockProm.URL)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/metrics/query?query=node_cpu_seconds_total", nil)
		rec := httptest.NewRecorder()
		handler(rec, req)

		if rec.Code != statusCode {
			tc.Fatalf("status code mismatch: got %d, want %d", rec.Code, statusCode)
		}
		if rec.Header().Get("Content-Type") != contentType {
			tc.Fatalf("Content-Type mismatch: got %q, want %q", rec.Header().Get("Content-Type"), contentType)
		}
		respBody := rec.Body.Bytes()
		if string(respBody) != string(bodyBytes) {
			tc.Fatalf("body mismatch: got length %d, want length %d", len(respBody), len(bodyBytes))
		}
	})
}

// Property 6: Concurrent Request Independence
func TestProperty6_ConcurrentRequestIndependence(t *testing.T) {
	rapid.Check(t, func(tc *rapid.T) {
		n := rapid.IntRange(5, 20).Draw(tc, "concurrency")

		mockProm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			q := r.URL.Query().Get("query")
			if q == "node_fail" {
				w.WriteHeader(http.StatusInternalServerError)
				w.Write([]byte(`error`))
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status":"success"}`))
		}))
		defer mockProm.Close()

		handler := prometheusProxyHandler("query", mockProm.URL)

		var wg sync.WaitGroup
		wg.Add(n)

		results := make([]int, n)

		for i := 0; i < n; i++ {
			idx := i
			go func() {
				defer wg.Done()
				var query string
				if idx%2 == 0 {
					query = "node_success"
				} else {
					query = "node_fail"
				}

				req := httptest.NewRequest(http.MethodGet, "/api/v1/metrics/query?query="+query, nil)
				rec := httptest.NewRecorder()
				handler(rec, req)
				results[idx] = rec.Code
			}()
		}

		wg.Wait()

		for i := 0; i < n; i++ {
			if i%2 == 0 && results[i] != http.StatusOK {
				tc.Fatalf("success request %d failed with code %d", i, results[i])
			}
			if i%2 != 0 && results[i] != http.StatusInternalServerError {
				tc.Fatalf("fail request %d got unexpected code %d", i, results[i])
			}
		}
	})
}
