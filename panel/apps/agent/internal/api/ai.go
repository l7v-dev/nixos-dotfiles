package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/l7v/panel-agent/internal/ai"
)

// aiTasksListHandler handles GET /api/v1/ai/tasks.
func aiTasksListHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.AI == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "AI manager service unavailable"})
			return
		}

		tasks, err := d.AI.ListTasks(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"tasks": tasks,
			"total": len(tasks),
		})
	}
}

// aiTaskCreateHandler handles POST /api/v1/ai/tasks.
func aiTaskCreateHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.AI == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "AI manager service unavailable"})
			return
		}

		var req ai.StartTaskRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "invalid request body: " + err.Error()})
			return
		}

		task, err := d.AI.StartTask(r.Context(), req)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusAccepted, task)
	}
}

// aiTaskGetHandler handles GET /api/v1/ai/tasks/{id}.
func aiTaskGetHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.AI == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "AI manager service unavailable"})
			return
		}

		id := r.PathValue("id")
		task, ok := d.AI.GetTask(id)
		if !ok {
			writeError(w, http.StatusNotFound, map[string]string{"message": "task not found"})
			return
		}

		writeJSON(w, http.StatusOK, task)
	}
}

// aiTaskCancelHandler handles POST /api/v1/ai/tasks/{id}/cancel.
func aiTaskCancelHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.AI == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "AI manager service unavailable"})
			return
		}

		id := r.PathValue("id")
		cleanup := r.URL.Query().Get("cleanup") == "true"

		if err := d.AI.CancelTask(id, cleanup); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{
			"status":  "cancelled",
			"task_id": id,
		})
	}
}

// aiTaskStreamHandler handles GET /api/v1/ai/tasks/{id}/stream (SSE).
func aiTaskStreamHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.AI == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "AI manager service unavailable"})
			return
		}

		id := r.PathValue("id")

		type managedGetter interface {
			GetManagedTask(id string) (*ai.ManagedTask, bool)
		}

		getter, ok := d.AI.(managedGetter)
		if !ok {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": "streaming not supported"})
			return
		}

		managed, exists := getter.GetManagedTask(id)
		if !exists {
			writeError(w, http.StatusNotFound, map[string]string{"message": "task not found"})
			return
		}

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

		fmt.Fprintf(w, ": connected to task stream %s\n\n", id)
		flusher.Flush()

		linesCh, unsubscribe := managed.Subscribe()
		defer unsubscribe()

		heartbeat := time.NewTicker(10 * time.Second)
		defer heartbeat.Stop()

		for {
			select {
			case <-r.Context().Done():
				return

			case <-heartbeat.C:
				fmt.Fprint(w, ": keep-alive\n\n")
				flusher.Flush()

			case line, ok := <-linesCh:
				if !ok {
					return
				}
				data, _ := json.Marshal(map[string]string{
					"task_id": id,
					"text":    line,
					"time":    time.Now().Format(time.RFC3339),
				})
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()
			}
		}
	}
}

// aiToolsListHandler handles GET /api/v1/ai/tools.
func aiToolsListHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.AI == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "AI manager service unavailable"})
			return
		}

		tools, err := d.AI.ListTools(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"tools": tools,
			"total": len(tools),
		})
	}
}

// aiMicroVMListHandler handles GET /api/v1/ai/microvms.
func aiMicroVMListHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.AI == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "AI manager service unavailable"})
			return
		}

		vms, err := d.AI.ListMicroVMs(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"microvms": vms,
			"total":    len(vms),
		})
	}
}

// aiMicroVMHostStatusHandler handles GET /api/v1/ai/microvms/host-status.
func aiMicroVMHostStatusHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.AI == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "AI manager service unavailable"})
			return
		}

		status, err := d.AI.GetHostStatus(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, status)
	}
}

// aiMicroVMActionHandler handles POST /api/v1/ai/microvms/{name}/(start|stop|restart).
func aiMicroVMActionHandler(d Deps, action string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.AI == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "AI manager service unavailable"})
			return
		}

		name := r.PathValue("name")
		var err error

		switch action {
		case "start":
			err = d.AI.StartMicroVM(r.Context(), name)
		case "stop":
			err = d.AI.StopMicroVM(r.Context(), name)
		case "restart":
			err = d.AI.RestartMicroVM(r.Context(), name)
		default:
			writeError(w, http.StatusBadRequest, map[string]string{"message": "unknown action: " + action})
			return
		}

		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{
			"status":   "ok",
			"name":     name,
			"action":   action,
		})
	}
}
