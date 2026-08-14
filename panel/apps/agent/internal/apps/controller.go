package apps

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/l7v/panel-agent/internal/dbus"
)

var (
	ErrAppNotFound      = errors.New("application not found")
	ErrNoSystemdUnit    = errors.New("application is a CLI tool or static binary; no systemd unit to control directly")
	ErrUnsupportedAction = errors.New("unsupported lifecycle action")
	ErrDependencyWarning = errors.New("stopping this application will affect running dependent services")
)

// LifecycleController manages safe runtime operations for applications.
type LifecycleController interface {
	PerformAction(ctx context.Context, appID string, req AppActionRequest, callerIP string) (*AppActionResponse, error)
	GetAuditLogger() *AuditLogger
}

type lifecycleController struct {
	engine  Engine
	systemd dbus.SystemdClient
	audit   *AuditLogger
}

// NewController creates a new lifecycle controller instance.
func NewController(engine Engine, systemd dbus.SystemdClient) LifecycleController {
	return &lifecycleController{
		engine:  engine,
		systemd: systemd,
		audit:   NewAuditLogger(200),
	}
}

func (c *lifecycleController) GetAuditLogger() *AuditLogger {
	return c.audit
}

// PerformAction executes a lifecycle action with safety checks and impact analysis.
func (c *lifecycleController) PerformAction(ctx context.Context, appID string, req AppActionRequest, callerIP string) (*AppActionResponse, error) {
	app, err := c.engine.GetApplication(ctx, appID)
	if err != nil {
		return nil, err
	}
	if app == nil {
		return nil, ErrAppNotFound
	}

	res := &AppActionResponse{
		AppID:     app.ID,
		Action:    req.Action,
		Timestamp: time.Now(),
	}

	// For CLI tools without a systemd unit:
	if app.SystemdUnit == "" {
		res.Status = "noop"
		res.Message = fmt.Sprintf("Application '%s' is an interactive CLI tool/binary (%s). Launch via Web Terminal or sandboxed runner.", app.Name, app.BinaryName)
		c.audit.Log(AuditRecord{
			AppID:    app.ID,
			Action:   req.Action,
			Status:   "noop",
			Message:  res.Message,
			CallerIP: callerIP,
		})
		return res, nil
	}

	if c.systemd == nil {
		return nil, errors.New("systemd D-Bus interface unavailable")
	}

	// 1. Dependency impact analysis on Stop / Restart
	if (req.Action == "stop" || req.Action == "restart") && len(app.Dependents) > 0 {
		var activeDependents []string
		for _, depID := range app.Dependents {
			depApp, _ := c.engine.GetApplication(ctx, depID)
			if depApp != nil && depApp.Status == StatusRunning {
				activeDependents = append(activeDependents, depApp.Name)
			}
		}

		if len(activeDependents) > 0 && !req.Force {
			res.Status = "rejected"
			res.Affected = activeDependents
			res.Message = fmt.Sprintf("Stopping %s affects %d active services: %v. Confirm with force=true.", app.Name, len(activeDependents), activeDependents)
			c.audit.Log(AuditRecord{
				AppID:    app.ID,
				Action:   req.Action,
				Status:   "rejected",
				Message:  res.Message,
				CallerIP: callerIP,
			})
			return res, ErrDependencyWarning
		}
	}

	// 2. Perform systemd action
	var execErr error
	switch req.Action {
	case "start":
		execErr = c.systemd.StartUnit(ctx, app.SystemdUnit)
	case "stop":
		execErr = c.systemd.StopUnit(ctx, app.SystemdUnit)
	case "restart":
		execErr = c.systemd.RestartUnit(ctx, app.SystemdUnit)
	case "enable":
		execErr = c.systemd.EnableUnit(ctx, app.SystemdUnit)
	case "disable":
		execErr = c.systemd.DisableUnit(ctx, app.SystemdUnit)
	default:
		return nil, ErrUnsupportedAction
	}

	if execErr != nil {
		res.Status = "failed"
		res.Message = execErr.Error()
		c.audit.Log(AuditRecord{
			AppID:    app.ID,
			Action:   req.Action,
			Status:   "failed",
			Message:  execErr.Error(),
			CallerIP: callerIP,
		})
		return res, execErr
	}

	res.Status = "success"
	res.Message = fmt.Sprintf("Action '%s' completed successfully on %s", req.Action, app.SystemdUnit)
	c.audit.Log(AuditRecord{
		AppID:    app.ID,
		Action:   req.Action,
		Status:   "success",
		Message:  res.Message,
		CallerIP: callerIP,
	})

	return res, nil
}
