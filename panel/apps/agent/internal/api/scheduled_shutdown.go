package api

import (
	"encoding/json"
	"net/http"
	"time"
)

// ScheduleRequest is the JSON body for POST /api/v1/power/schedule.
type ScheduleRequest struct {
	// Action is one of: shutdown, reboot, halt.
	Action string `json:"action"`
	// DelayMinutes schedules the action N minutes from now.
	// Exactly one of DelayMinutes or AtTime must be set.
	DelayMinutes *int `json:"delay_minutes,omitempty"`
	// AtTime schedules the action at a specific UTC time (RFC3339).
	AtTime *string `json:"at_time,omitempty"`
}

// ScheduleResponse is returned when a shutdown is scheduled or cancelled.
type ScheduleResponse struct {
	Action    string `json:"action"`
	Scheduled bool   `json:"scheduled"`
	// ExecuteAt is the UTC time the action will execute (RFC3339). Empty when cancelled.
	ExecuteAt string `json:"execute_at,omitempty"`
	// RemainingMin is the approximate minutes until execution.
	RemainingMin int `json:"remaining_min,omitempty"`
}

// scheduleShutdownHandler handles POST /api/v1/power/schedule.
// Schedules a delayed shutdown/reboot using logind ScheduleShutdown D-Bus call.
func scheduleShutdownHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req ScheduleRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{
				"message": "invalid JSON: " + err.Error(),
			})
			return
		}

		// Validate action.
		validActions := map[string]bool{"shutdown": true, "reboot": true, "halt": true}
		if !validActions[req.Action] {
			writeError(w, http.StatusBadRequest, map[string]string{
				"action":  req.Action,
				"message": "action must be one of: shutdown, reboot, halt",
			})
			return
		}

		// Resolve target time.
		var executeAt time.Time
		switch {
		case req.DelayMinutes != nil:
			if *req.DelayMinutes < 1 {
				writeError(w, http.StatusBadRequest, map[string]string{
					"message": "delay_minutes must be >= 1",
				})
				return
			}
			executeAt = time.Now().UTC().Add(time.Duration(*req.DelayMinutes) * time.Minute)

		case req.AtTime != nil:
			t, err := time.Parse(time.RFC3339, *req.AtTime)
			if err != nil {
				writeError(w, http.StatusBadRequest, map[string]string{
					"message": "at_time must be RFC3339 format: " + err.Error(),
				})
				return
			}
			executeAt = t.UTC()
			if executeAt.Before(time.Now().UTC().Add(time.Minute)) {
				writeError(w, http.StatusBadRequest, map[string]string{
					"message": "at_time must be at least 1 minute in the future",
				})
				return
			}

		default:
			writeError(w, http.StatusBadRequest, map[string]string{
				"message": "one of delay_minutes or at_time is required",
			})
			return
		}

		// Schedule via logind ScheduleShutdown.
		// logind accepts microseconds since epoch (uint64).
		usec := uint64(executeAt.UnixMicro()) //nolint:gosec
		if err := d.Logind.ScheduleShutdown(r.Context(), req.Action, usec); err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"action":  req.Action,
				"message": err.Error(),
			})
			return
		}

		remaining := int(time.Until(executeAt).Minutes())
		if remaining < 1 {
			remaining = 1
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(ScheduleResponse{ //nolint:errcheck
			Action:       req.Action,
			Scheduled:    true,
			ExecuteAt:    executeAt.Format(time.RFC3339),
			RemainingMin: remaining,
		})
	}
}

// cancelShutdownHandler handles DELETE /api/v1/power/schedule.
// Cancels a previously scheduled logind shutdown.
func cancelShutdownHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := d.Logind.CancelScheduledShutdown(r.Context()); err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"message": err.Error(),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(ScheduleResponse{ //nolint:errcheck
			Scheduled: false,
		})
	}
}

// scheduleStatusHandler handles GET /api/v1/power/schedule.
// Returns whether a shutdown is currently scheduled.
func scheduleStatusHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		info, err := d.Logind.GetScheduledShutdown(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{
				"message": err.Error(),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(info) //nolint:errcheck
	}
}
