package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/l7v/panel-agent/internal/fleet"
)

// fleetNodesHandler handles GET /api/v1/fleet/nodes.
func fleetNodesHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Fleet == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "fleet service unavailable"})
			return
		}

		nodes, err := d.Fleet.ListNodes(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"nodes": nodes,
			"total": len(nodes),
		})
	}
}

// fleetStatusHandler handles GET /api/v1/fleet/status.
func fleetStatusHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Fleet == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "fleet service unavailable"})
			return
		}

		summary, err := d.Fleet.GetFleetStatus(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, summary)
	}
}

// fleetDeployHandler handles POST /api/v1/fleet/deploy.
func fleetDeployHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Fleet == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "fleet service unavailable"})
			return
		}

		var req fleet.ColmenaDeployRequest
		if r.Body != nil {
			_ = json.NewDecoder(r.Body).Decode(&req)
		}

		job, err := d.Fleet.TriggerColmenaDeploy(r.Context(), req)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusAccepted, job)
	}
}

// fleetDeployJobsHandler handles GET /api/v1/fleet/deploy/jobs.
func fleetDeployJobsHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Fleet == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "fleet service unavailable"})
			return
		}

		jobs := d.Fleet.ListColmenaJobs()
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"jobs":  jobs,
			"total": len(jobs),
		})
	}
}

// fleetDeployJobGetHandler handles GET /api/v1/fleet/deploy/jobs/{id}.
func fleetDeployJobGetHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Fleet == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "fleet service unavailable"})
			return
		}

		id := r.PathValue("id")
		job, ok := d.Fleet.GetColmenaJob(id)
		if !ok {
			writeError(w, http.StatusNotFound, map[string]string{"message": "colmena job not found"})
			return
		}
		writeJSON(w, http.StatusOK, job)
	}
}

// fleetDeployJobCancelHandler handles POST /api/v1/fleet/deploy/jobs/{id}/cancel.
func fleetDeployJobCancelHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Fleet == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "fleet service unavailable"})
			return
		}

		id := r.PathValue("id")
		err := d.Fleet.CancelColmenaJob(id)
		if err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "cancelled", "job_id": id})
	}
}

// fleetDeployStreamHandler handles GET /api/v1/fleet/deploy/stream (SSE).
func fleetDeployStreamHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Fleet == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "fleet service unavailable"})
			return
		}

		jobID := r.URL.Query().Get("job_id")

		var job *fleet.ColmenaDeployJob
		if jobID != "" {
			var ok bool
			job, ok = d.Fleet.GetColmenaJob(jobID)
			if !ok {
				writeError(w, http.StatusNotFound, map[string]string{"message": "job not found"})
				return
			}
		} else {
			jobs := d.Fleet.ListColmenaJobs()
			if len(jobs) > 0 {
				job = jobs[0]
			}
		}

		if job == nil {
			writeError(w, http.StatusNotFound, map[string]string{"message": "no colmena jobs available"})
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

		fmt.Fprintf(w, ": connected to colmena deployment %s\n\n", job.ID)
		initialStatus, _ := json.Marshal(map[string]interface{}{
			"id":          job.ID,
			"target":      job.Target,
			"action":      job.Action,
			"status":      job.Status,
			"command":     job.Command,
			"start_time":  job.StartTime,
			"exit_code":   job.ExitCode,
			"duration_ms": job.DurationMs,
		})
		fmt.Fprintf(w, "event: status\ndata: %s\n\n", initialStatus)
		flusher.Flush()

		linesCh, unsubscribe := job.Subscribe()
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
					finalStatus, _ := json.Marshal(map[string]interface{}{
						"id":          job.ID,
						"target":      job.Target,
						"action":      job.Action,
						"status":      job.Status,
						"exit_code":   job.ExitCode,
						"duration_ms": job.DurationMs,
					})
					fmt.Fprintf(w, "event: status\ndata: %s\n\n", finalStatus)
					flusher.Flush()
					return
				}

				data, _ := json.Marshal(map[string]string{
					"job_id": job.ID,
					"text":   line,
					"time":   time.Now().Format(time.RFC3339),
				})
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()
			}
		}
	}
}
