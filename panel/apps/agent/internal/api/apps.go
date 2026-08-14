package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/l7v/panel-agent/internal/apps"
	"github.com/l7v/panel-agent/internal/journal"
)

// getAppsEngine returns the configured apps engine or lazily instantiates one.
func getAppsEngine(d Deps) apps.Engine {
	if d.AppsEngine != nil {
		return d.AppsEngine
	}
	return apps.NewEngine(d.Systemd)
}

// getAppsController returns the configured apps controller or lazily instantiates one.
func getAppsController(d Deps) apps.LifecycleController {
	if d.AppsController != nil {
		return d.AppsController
	}
	return apps.NewController(getAppsEngine(d), d.Systemd)
}

// listAppsHandler handles GET /api/v1/apps
func listAppsHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		engine := getAppsEngine(d)
		allApps, err := engine.ListApplications(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": "failed to list applications: " + err.Error(),
			})
			return
		}

		categoryFilter := r.URL.Query().Get("category")
		statusFilter := r.URL.Query().Get("status")
		q := strings.ToLower(r.URL.Query().Get("q"))

		filtered := make([]apps.Application, 0, len(allApps))
		for _, a := range allApps {
			if categoryFilter != "" && string(a.Category) != categoryFilter {
				continue
			}
			if statusFilter != "" && string(a.Status) != statusFilter {
				continue
			}
			if q != "" {
				nameMatch := strings.Contains(strings.ToLower(a.Name), q)
				descMatch := strings.Contains(strings.ToLower(a.Description), q)
				idMatch := strings.Contains(strings.ToLower(a.ID), q)
				tagMatch := false
				for _, t := range a.Tags {
					if strings.Contains(strings.ToLower(t), q) {
						tagMatch = true
						break
					}
				}
				if !nameMatch && !descMatch && !idMatch && !tagMatch {
					continue
				}
			}
			filtered = append(filtered, a)
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(filtered) //nolint:errcheck
	}
}

// appsSummaryHandler handles GET /api/v1/apps/summary
func appsSummaryHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		engine := getAppsEngine(d)
		summary, err := engine.GetSummary(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": "failed to generate apps summary: " + err.Error(),
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(summary) //nolint:errcheck
	}
}

// appsDependenciesHandler handles GET /api/v1/apps/dependencies
func appsDependenciesHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		engine := getAppsEngine(d)
		graph, err := engine.GetDependencyGraph(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": "failed to build dependency graph: " + err.Error(),
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(graph) //nolint:errcheck
	}
}

// appsAuditHandler handles GET /api/v1/apps/audit
func appsAuditHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctrl := getAppsController(d)
		limit := 50
		if lStr := r.URL.Query().Get("limit"); lStr != "" {
			if l, err := strconv.Atoi(lStr); err == nil && l > 0 {
				limit = l
			}
		}

		records := ctrl.GetAuditLogger().GetRecent(limit)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(records) //nolint:errcheck
	}
}

// getAppHandler handles GET /api/v1/apps/{id}
func getAppHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "missing app id"})
			return
		}

		engine := getAppsEngine(d)
		app, err := engine.GetApplication(r.Context(), id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		if app == nil {
			writeError(w, http.StatusNotFound, map[string]string{"message": "application not found"})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(app) //nolint:errcheck
	}
}

// appActionHandler handles POST /api/v1/apps/{id}/action
func appActionHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "missing app id"})
			return
		}

		var req apps.AppActionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "invalid JSON body: " + err.Error()})
			return
		}

		ctrl := getAppsController(d)
		callerIP := r.RemoteAddr
		res, err := ctrl.PerformAction(r.Context(), id, req, callerIP)
		if err != nil {
			status := http.StatusUnprocessableEntity
			if err == apps.ErrAppNotFound {
				status = http.StatusNotFound
			} else if err == apps.ErrDependencyWarning {
				status = http.StatusConflict
			}
			msg := err.Error()
			if res != nil && res.Message != "" {
				msg = res.Message
			}
			writeError(w, status, map[string]string{
				"message": msg,
				"app_id":  id,
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(res) //nolint:errcheck
	}
}

// appLogsStreamHandler handles GET /api/v1/apps/{id}/logs (SSE)
func appLogsStreamHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Journal == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "journal service unavailable"})
			return
		}

		id := r.PathValue("id")
		engine := getAppsEngine(d)
		app, err := engine.GetApplication(r.Context(), id)
		if err != nil || app == nil {
			writeError(w, http.StatusNotFound, map[string]string{"message": "application not found"})
			return
		}

		if app.SystemdUnit == "" {
			writeError(w, http.StatusBadRequest, map[string]string{
				"message": "application does not have an attached systemd unit for journald logging",
			})
			return
		}

		flusher, ok := w.(http.Flusher)
		if !ok {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": "streaming unsupported"})
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no")
		w.Header().Del("Content-Length")
		w.WriteHeader(http.StatusOK)

		backlog := 100
		if bStr := r.URL.Query().Get("backlog"); bStr != "" {
			if b, err := strconv.Atoi(bStr); err == nil && b >= 0 && b <= 2000 {
				backlog = b
			}
		}

		fmt.Fprint(w, ": connected\n\n")
		flusher.Flush()

		entries := make(chan journal.LogEntry, 128)
		errCh := make(chan error, 1)

		opts := journal.TailOptions{
			Unit:       app.SystemdUnit,
			Backlog:    backlog,
			Out:        entries,
			Err:        errCh,
			Priorities: parsePriorities(r.URL.Query().Get("priorities")),
			Search:     r.URL.Query().Get("search"),
		}

		go d.Journal.Tail(r.Context(), opts)

		ctx := r.Context()
		for {
			select {
			case <-ctx.Done():
				return
			case entry, ok := <-entries:
				if !ok {
					return
				}
				data, err := json.Marshal(entry)
				if err != nil {
					continue
				}
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()
			case <-errCh:
				return
			}
		}
	}
}
