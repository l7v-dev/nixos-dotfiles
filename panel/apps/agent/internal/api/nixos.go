package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/l7v/panel-agent/internal/nixos"
)

// nixosStatusHandler handles GET /api/v1/nixos/status.
func nixosStatusHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		status, err := d.NixOS.GetStatus(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, status)
	}
}

// nixosGCHandler handles POST /api/v1/nixos/gc.
func nixosGCHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			DeleteOlderThan string `json:"delete_older_than"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)

		res, err := d.NixOS.RunGarbageCollect(r.Context(), req.DeleteOlderThan)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error(), "output": res.Output})
			return
		}
		writeJSON(w, http.StatusOK, res)
	}
}

// nixosOptimiseHandler handles POST /api/v1/nixos/optimise.
func nixosOptimiseHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		res, err := d.NixOS.RunStoreOptimise(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error(), "output": res.Output})
			return
		}
		writeJSON(w, http.StatusOK, res)
	}
}

// nixosGenerationsHandler handles GET /api/v1/nixos/generations.
func nixosGenerationsHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		gens, err := d.NixOS.ListGenerations(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"generations": gens,
			"total":       len(gens),
		})
	}
}

// nixosGenerationDiffHandler handles GET /api/v1/nixos/generations/diff.
func nixosGenerationDiffHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		fromStr := q.Get("from")
		toStr := q.Get("to")

		// If to/from not explicitly set, derive against current generation
		status, _ := d.NixOS.GetStatus(r.Context())
		currGen := 1
		if status != nil && status.CurrentGeneration > 0 {
			currGen = status.CurrentGeneration
		}

		fromGen, toGen := nixos.ParseGenerationNumbers(fromStr, toStr, currGen)

		diff, err := d.NixOS.GetGenerationDiff(r.Context(), fromGen, toGen)
		if err != nil && diff == nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, diff)
	}
}

// nixosGenerationSwitchHandler handles POST /api/v1/nixos/generations/switch.
func nixosGenerationSwitchHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Generation int `json:"generation"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Generation <= 0 {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "invalid generation number"})
			return
		}

		res, err := d.NixOS.SwitchGeneration(r.Context(), req.Generation)
		if err != nil {
			out := ""
			if res != nil {
				out = res.Output
			}
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": err.Error(),
				"output":  out,
			})
			return
		}
		writeJSON(w, http.StatusOK, res)
	}
}

// nixosGenerationRollbackHandler handles POST /api/v1/nixos/generations/rollback.
func nixosGenerationRollbackHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		res, err := d.NixOS.RollbackGeneration(r.Context())
		if err != nil {
			out := ""
			if res != nil {
				out = res.Output
			}
			writeError(w, http.StatusInternalServerError, map[string]string{
				"message": err.Error(),
				"output":  out,
			})
			return
		}
		writeJSON(w, http.StatusOK, res)
	}
}

// nixosFlakeHandler handles GET /api/v1/nixos/flake.
func nixosFlakeHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		flakePath := r.URL.Query().Get("path")
		info, err := d.NixOS.GetFlakeInfo(r.Context(), flakePath)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, info)
	}
}

// nixosRebuildHandler handles POST /api/v1/nixos/rebuild.
func nixosRebuildHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req nixos.RebuildRequest
		if r.Body != nil {
			_ = json.NewDecoder(r.Body).Decode(&req)
		}

		job, err := d.NixOS.TriggerRebuild(r.Context(), req)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusAccepted, job)
	}
}

// nixosRebuildJobsHandler handles GET /api/v1/nixos/rebuild/jobs.
func nixosRebuildJobsHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		jobs := d.NixOS.ListRebuildJobs()
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"jobs":  jobs,
			"total": len(jobs),
		})
	}
}

// nixosRebuildJobGetHandler handles GET /api/v1/nixos/rebuild/jobs/{id}.
func nixosRebuildJobGetHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		job, ok := d.NixOS.GetRebuildJob(id)
		if !ok {
			writeError(w, http.StatusNotFound, map[string]string{"message": "rebuild job not found"})
			return
		}
		writeJSON(w, http.StatusOK, job)
	}
}

// nixosRebuildJobCancelHandler handles POST /api/v1/nixos/rebuild/jobs/{id}/cancel.
func nixosRebuildJobCancelHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		err := d.NixOS.CancelRebuildJob(id)
		if err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "cancelled", "job_id": id})
	}
}

// nixosRebuildStreamHandler handles GET /api/v1/nixos/rebuild/stream (SSE).
func nixosRebuildStreamHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		jobID := r.URL.Query().Get("job_id")

		var job *nixos.RebuildJob
		if jobID != "" {
			var ok bool
			job, ok = d.NixOS.GetRebuildJob(jobID)
			if !ok {
				writeError(w, http.StatusNotFound, map[string]string{"message": "job not found"})
				return
			}
		} else {
			// Select the most recent active or last job
			jobs := d.NixOS.ListRebuildJobs()
			if len(jobs) > 0 {
				job = jobs[0]
			}
		}

		if job == nil {
			writeError(w, http.StatusNotFound, map[string]string{"message": "no rebuild jobs available"})
			return
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

		fmt.Fprintf(w, ": connected to rebuild job %s\n\n", job.ID)
		// Send initial status event
		initialStatus, _ := json.Marshal(map[string]interface{}{
			"id":          job.ID,
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
					// Channel closed, send final status event
					finalStatus, _ := json.Marshal(map[string]interface{}{
						"id":          job.ID,
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
