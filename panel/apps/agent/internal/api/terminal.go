package api

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/l7v/panel-agent/internal/terminal"
)

// TerminalSnippet represents a pre-configured quick command with category and parameters.
type TerminalSnippet struct {
	ID          string `json:"id"`
	Category    string `json:"category"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Command     string `json:"command"`
	AutoRun     bool   `json:"auto_run"`
	Icon        string `json:"icon"`
}

// defaultSnippets provides curated NixOS, system management, and agent workflow snippets.
var defaultSnippets = []TerminalSnippet{
	{
		ID:          "nh-os-switch",
		Category:    "NixOS",
		Title:       "nh os switch",
		Description: "Build and switch NixOS configuration using nh helper",
		Command:     "nh os switch",
		AutoRun:     false,
		Icon:        "Cpu",
	},
	{
		ID:          "nh-os-test",
		Category:    "NixOS",
		Title:       "nh os test",
		Description: "Test NixOS configuration without creating a boot entry",
		Command:     "nh os test",
		AutoRun:     false,
		Icon:        "Play",
	},
	{
		ID:          "nixos-rebuild-switch",
		Category:    "NixOS",
		Title:       "nixos-rebuild switch",
		Description: "Rebuild and switch using standard NixOS flake",
		Command:     "sudo nixos-rebuild switch --flake .",
		AutoRun:     false,
		Icon:        "RefreshCw",
	},
	{
		ID:          "nix-flake-check",
		Category:    "NixOS",
		Title:       "nix flake check",
		Description: "Validate flake inputs and evaluate all outputs",
		Command:     "nix flake check --show-trace",
		AutoRun:     true,
		Icon:        "CheckCircle",
	},
	{
		ID:          "nix-flake-update",
		Category:    "NixOS",
		Title:       "nix flake update",
		Description: "Update all flake lockfile inputs",
		Command:     "nix flake update",
		AutoRun:     false,
		Icon:        "DownloadCloud",
	},
	{
		ID:          "nix-collect-garbage",
		Category:    "Maintenance",
		Title:       "nix garbage collect",
		Description: "Delete old generations and run nix store garbage collector",
		Command:     "nh clean all --keep 3 || nix-collect-garbage -d",
		AutoRun:     false,
		Icon:        "Trash2",
	},
	{
		ID:          "btop",
		Category:    "Monitoring",
		Title:       "btop",
		Description: "Resource monitor for CPU, memory, disks and processes",
		Command:     "btop",
		AutoRun:     true,
		Icon:        "Activity",
	},
	{
		ID:          "systemctl-failed",
		Category:    "System",
		Title:       "List failed units",
		Description: "Show all currently failed systemd services",
		Command:     "systemctl --failed",
		AutoRun:     true,
		Icon:        "AlertTriangle",
	},
	{
		ID:          "journalctl-follow",
		Category:    "Logs",
		Title:       "journalctl -f",
		Description: "Follow system journal in real-time",
		Command:     "journalctl -f -n 50",
		AutoRun:     true,
		Icon:        "FileText",
	},
	{
		ID:          "zfs-status",
		Category:    "Storage",
		Title:       "zpool status",
		Description: "Display health and I/O status of ZFS storage pools",
		Command:     "zpool status -v || df -hT",
		AutoRun:     true,
		Icon:        "HardDrive",
	},
	{
		ID:          "claude-autonomous",
		Category:    "AI & Agents",
		Title:       "claude-autonomous.sh",
		Description: "Run autonomous Claude Code loop in isolated worktree",
		Command:     "./scripts/claude-autonomous.sh task-name 'prompt'",
		AutoRun:     false,
		Icon:        "Bot",
	},
}

// createSessionRequest represents JSON payload to create a new session.
type createSessionRequest struct {
	Title string `json:"title"`
	Shell string `json:"shell"`
	Cwd   string `json:"cwd"`
	Cols  uint16 `json:"cols"`
	Rows  uint16 `json:"rows"`
}

// listTerminalSessionsHandler handles GET /api/v1/terminal/sessions.
func listTerminalSessionsHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.TerminalManager == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "terminal manager unavailable"})
			return
		}
		sessions := d.TerminalManager.ListSessions()
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"sessions": sessions,
			"count":    len(sessions),
		})
	}
}

// createTerminalSessionHandler handles POST /api/v1/terminal/sessions.
func createTerminalSessionHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.TerminalManager == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "terminal manager unavailable"})
			return
		}

		var req createSessionRequest
		if r.Body != nil {
			_ = json.NewDecoder(r.Body).Decode(&req)
		}

		if req.Title == "" {
			req.Title = "Terminal"
		}
		if req.Cwd == "" {
			req.Cwd = os.Getenv("HOME")
		}

		session, err := d.TerminalManager.CreateSession(terminal.SessionOptions{
			Title: req.Title,
			Shell: req.Shell,
			Cwd:   req.Cwd,
			Cols:  req.Cols,
			Rows:  req.Rows,
		})
		if err != nil {
			d.Logger.Error("failed to create terminal session", "err", err)
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusCreated, session.Info())
	}
}

// getTerminalSessionHandler handles GET /api/v1/terminal/sessions/{id}.
func getTerminalSessionHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.TerminalManager == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "terminal manager unavailable"})
			return
		}

		id := r.PathValue("id")
		session, ok := d.TerminalManager.GetSession(id)
		if !ok {
			writeError(w, http.StatusNotFound, map[string]string{"message": "session not found"})
			return
		}

		writeJSON(w, http.StatusOK, session.Info())
	}
}

// killTerminalSessionHandler handles DELETE /api/v1/terminal/sessions/{id}.
func killTerminalSessionHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.TerminalManager == nil {
			writeError(w, http.StatusServiceUnavailable, map[string]string{"message": "terminal manager unavailable"})
			return
		}

		id := r.PathValue("id")
		if err := d.TerminalManager.KillSession(id); err != nil {
			writeError(w, http.StatusNotFound, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"message": "session killed", "id": id})
	}
}

// terminalWSHandler handles GET /api/v1/terminal/ws/{id}.
func terminalWSHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.TerminalManager == nil {
			http.Error(w, "terminal manager unavailable", http.StatusServiceUnavailable)
			return
		}

		id := r.PathValue("id")
		session, ok := d.TerminalManager.GetSession(id)
		if !ok {
			var err error
			session, err = d.TerminalManager.CreateSession(terminal.SessionOptions{
				ID:    id,
				Title: "Terminal",
			})
			if err != nil {
				d.Logger.Error("failed to create terminal session for ws", "id", id, "err", err)
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}

		terminal.HandleWebSocket(w, r, session, d.Logger)
	}
}

// terminalDefaultWSHandler handles GET /api/v1/terminal/ws (creates or connects to default session).
func terminalDefaultWSHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.TerminalManager == nil {
			http.Error(w, "terminal manager unavailable", http.StatusServiceUnavailable)
			return
		}

		session, err := d.TerminalManager.GetOrCreateDefaultSession("Terminal")
		if err != nil {
			d.Logger.Error("failed to get default session", "err", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		terminal.HandleWebSocket(w, r, session, d.Logger)
	}
}

// terminalSnippetsHandler handles GET /api/v1/terminal/snippets.
func terminalSnippetsHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"snippets": defaultSnippets,
		})
	}
}
