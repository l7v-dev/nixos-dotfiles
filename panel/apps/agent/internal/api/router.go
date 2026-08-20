package api

import (
	"log/slog"
	"net/http"

	"github.com/l7v/panel-agent/internal/ai"
	"github.com/l7v/panel-agent/internal/apps"
	"github.com/l7v/panel-agent/internal/audio"
	"github.com/l7v/panel-agent/internal/auth"
	"github.com/l7v/panel-agent/internal/containers"
	"github.com/l7v/panel-agent/internal/dbus"
	"github.com/l7v/panel-agent/internal/display"
	"github.com/l7v/panel-agent/internal/files"
	"github.com/l7v/panel-agent/internal/fleet"
	"github.com/l7v/panel-agent/internal/hardware"
	"github.com/l7v/panel-agent/internal/journal"
	"github.com/l7v/panel-agent/internal/metrics"
	"github.com/l7v/panel-agent/internal/nixos"
	"github.com/l7v/panel-agent/internal/packages"
	"github.com/l7v/panel-agent/internal/security"
	"github.com/l7v/panel-agent/internal/storage"
	"github.com/l7v/panel-agent/internal/terminal"
)

// Deps holds all dependencies injected into API handlers.
// Clients are behind interfaces so unit tests can inject mocks.
type Deps struct {
	Systemd          dbus.SystemdClient
	Logind           dbus.LogindClient
	Network          dbus.NetworkClient
	Bluetooth        dbus.BluetoothClient
	Audio            audio.Client
	Display          display.Client
	Hardware         hardware.Client
	NixOS            nixos.Client
	Packages         packages.Client
	Files            files.Client
	Fleet            fleet.Client
	Security         security.Client
	Storage          storage.Client
	AI               ai.Client
	Auth             auth.Manager
	Procfs           metrics.ProcfsReader
	Journal          journal.Reader
	Logger           *slog.Logger
	Version          string
	Thresholds       metrics.Thresholds
	WoLHosts         map[string]string
	PrometheusWidget bool
	TerminalManager  terminalManagerClient
	AppsEngine       apps.Engine
	AppsController   apps.LifecycleController
	ContainerManager containers.Manager
	AllowedOrigins   []string
}

// terminalManagerClient interface for dependency injection & testing
type terminalManagerClient interface {
	CreateSession(opts terminal.SessionOptions) (*terminal.Session, error)
	GetSession(id string) (*terminal.Session, bool)
	GetOrCreateDefaultSession(title string) (*terminal.Session, error)
	ListSessions() []terminal.SessionInfo
	KillSession(id string) error
}

// NewRouter wires all API routes and wraps the mux in logging middleware.
func NewRouter(d Deps) http.Handler {
	if d.Logger == nil {
		d.Logger = slog.Default()
	}
	mux := http.NewServeMux()

	// Catch-all for unknown paths → JSON 404.
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		writeError(w, http.StatusNotFound, map[string]string{"message": "not found"})
	})

	// Health
	mux.Handle("GET /api/v1/health", healthHandler(d))

	// Metrics (procfs)
	mux.Handle("GET /api/v1/metrics", metricsHandler(d))

	// Prometheus proxy (conditional on PrometheusWidget)
	if d.PrometheusWidget {
		mux.Handle("GET /api/v1/metrics/query", prometheusProxyHandler("query"))
		mux.Handle("GET /api/v1/metrics/query_range", prometheusProxyHandler("query_range"))
		d.Logger.Info("prometheus proxy enabled",
			"endpoints", []string{"/api/v1/metrics/query", "/api/v1/metrics/query_range"})
	} else {
		d.Logger.Info("prometheus proxy disabled (PANEL_PROMETHEUS_WIDGET != 1)")
	}

	// Service management (D-Bus systemd)
	mux.Handle("GET /api/v1/services", listServicesHandler(d))
	mux.Handle("POST /api/v1/services/{unit}/start", serviceActionHandler(d, "start"))
	mux.Handle("POST /api/v1/services/{unit}/stop", serviceActionHandler(d, "stop"))
	mux.Handle("POST /api/v1/services/{unit}/restart", serviceActionHandler(d, "restart"))
	mux.Handle("POST /api/v1/services/{unit}/enable", serviceActionHandler(d, "enable"))
	mux.Handle("POST /api/v1/services/{unit}/disable", serviceActionHandler(d, "disable"))

	// Application & Ecosystem Lifecycle Management
	mux.Handle("GET /api/v1/apps", listAppsHandler(d))
	mux.Handle("GET /api/v1/apps/summary", appsSummaryHandler(d))
	mux.Handle("GET /api/v1/apps/dependencies", appsDependenciesHandler(d))
	mux.Handle("GET /api/v1/apps/audit", appsAuditHandler(d))
	mux.Handle("GET /api/v1/apps/{id}", getAppHandler(d))
	mux.Handle("POST /api/v1/apps/{id}/action", appActionHandler(d))
	mux.Handle("GET /api/v1/apps/{id}/logs", appLogsStreamHandler(d))

	// Container & OCI Management (Podman / Docker)
	mux.Handle("GET /api/v1/containers", listContainersHandler(d))
	mux.Handle("GET /api/v1/containers/summary", containerOverviewHandler(d))
	mux.Handle("POST /api/v1/containers", createContainerHandler(d))
	mux.Handle("POST /api/v1/containers/bulk-action", bulkContainerActionHandler(d))
	mux.Handle("GET /api/v1/containers/stacks", listStacksHandler(d))
	mux.Handle("GET /api/v1/containers/images", listImagesHandler(d))
	mux.Handle("POST /api/v1/containers/images/pull", pullImageHandler(d))
	mux.Handle("POST /api/v1/containers/images/prune", pruneImagesHandler(d))
	mux.Handle("DELETE /api/v1/containers/images/{id}", removeImageHandler(d))
	mux.Handle("GET /api/v1/containers/volumes", listVolumesHandler(d))
	mux.Handle("POST /api/v1/containers/volumes", createVolumeHandler(d))
	mux.Handle("POST /api/v1/containers/volumes/prune", pruneVolumesHandler(d))
	mux.Handle("DELETE /api/v1/containers/volumes/{name}", removeVolumeHandler(d))
	mux.Handle("GET /api/v1/containers/networks", listNetworksHandler(d))
	mux.Handle("POST /api/v1/containers/networks", createNetworkHandler(d))
	mux.Handle("DELETE /api/v1/containers/networks/{id}", removeNetworkHandler(d))
	mux.Handle("POST /api/v1/containers/networks/{id}/connect", connectNetworkHandler(d))
	mux.Handle("POST /api/v1/containers/networks/{id}/disconnect", disconnectNetworkHandler(d))
	mux.Handle("GET /api/v1/containers/{id}", getContainerHandler(d))
	mux.Handle("POST /api/v1/containers/{id}/start", containerActionHandler(d, "start"))
	mux.Handle("POST /api/v1/containers/{id}/stop", containerActionHandler(d, "stop"))
	mux.Handle("POST /api/v1/containers/{id}/restart", containerActionHandler(d, "restart"))
	mux.Handle("POST /api/v1/containers/{id}/pause", containerActionHandler(d, "pause"))
	mux.Handle("POST /api/v1/containers/{id}/unpause", containerActionHandler(d, "unpause"))
	mux.Handle("POST /api/v1/containers/{id}/kill", containerActionHandler(d, "kill"))
	mux.Handle("DELETE /api/v1/containers/{id}", removeContainerHandler(d))
	mux.Handle("GET /api/v1/containers/{id}/stats", containerStatsStreamHandler(d))
	mux.Handle("GET /api/v1/containers/{id}/logs", containerLogsStreamHandler(d))
	mux.Handle("POST /api/v1/containers/{id}/exec", createContainerExecHandler(d))
	mux.Handle("GET /api/v1/containers/exec/{execId}/ws", containerExecWSHandler(d))

	// Power control (D-Bus logind)
	mux.Handle("GET /api/v1/power/capabilities", powerCapabilitiesHandler(d))
	mux.Handle("GET /api/v1/power/status", powerStatusHandler(d))
	mux.Handle("POST /api/v1/power/shutdown", powerHandler(d, "shutdown"))
	mux.Handle("POST /api/v1/power/reboot", powerHandler(d, "reboot"))
	mux.Handle("POST /api/v1/power/sleep", powerHandler(d, "sleep"))
	mux.Handle("POST /api/v1/power/hibernate", powerHandler(d, "hibernate"))
	mux.Handle("POST /api/v1/power/hybrid-sleep", powerHandler(d, "hybrid-sleep"))
	mux.Handle("POST /api/v1/power/wol", wolHandler(d))
	mux.Handle("GET /api/v1/power/wol/hosts", wolHostsHandler(d))
	mux.Handle("GET /api/v1/power/schedule", scheduleStatusHandler(d))
	mux.Handle("POST /api/v1/power/schedule", scheduleShutdownHandler(d))
	mux.Handle("DELETE /api/v1/power/schedule", cancelShutdownHandler(d))

	// Network (D-Bus NetworkManager + BlueZ)
	mux.Handle("GET /api/v1/network/wifi", wifiStatusHandler(d))
	mux.Handle("POST /api/v1/network/wifi/toggle", wifiToggleHandler(d))
	mux.Handle("GET /api/v1/network/wifi/scan", wifiScanHandler(d))
	mux.Handle("POST /api/v1/network/wifi/connect", wifiConnectHandler(d))
	mux.Handle("POST /api/v1/network/wifi/disconnect", wifiDisconnectHandler(d))
	mux.Handle("GET /api/v1/network/wifi/connections", wifiConnectionsHandler(d))
	mux.Handle("DELETE /api/v1/network/wifi/connections/{uuid}", wifiDeleteConnectionHandler(d))
	mux.Handle("GET /api/v1/network/bluetooth", bluetoothStatusHandler(d))
	mux.Handle("POST /api/v1/network/bluetooth/toggle", bluetoothToggleHandler(d))
	mux.Handle("GET /api/v1/network/bluetooth/scan", bluetoothScanHandler(d))
	mux.Handle("POST /api/v1/network/bluetooth/pair/{address}", bluetoothPairHandler(d))
	mux.Handle("POST /api/v1/network/bluetooth/connect/{address}", bluetoothConnectHandler(d))
	mux.Handle("POST /api/v1/network/bluetooth/disconnect/{address}", bluetoothDisconnectHandler(d))
	mux.Handle("DELETE /api/v1/network/bluetooth/device/{address}", bluetoothRemoveHandler(d))

	// Audio controls (PipeWire / WirePlumber)
	if d.Audio != nil {
		mux.Handle("GET /api/v1/audio/status", audioStatusHandler(d))
		mux.Handle("POST /api/v1/audio/volume", audioVolumeHandler(d))
		mux.Handle("POST /api/v1/audio/mute", audioMuteHandler(d))
		mux.Handle("POST /api/v1/audio/default", audioDefaultDeviceHandler(d))
	}

	// Display & Brightness
	if d.Display != nil {
		mux.Handle("GET /api/v1/display/status", displayStatusHandler(d))
		mux.Handle("POST /api/v1/display/brightness", displayBrightnessHandler(d))
		mux.Handle("POST /api/v1/display/nightlight", displayNightLightHandler(d))
		mux.Handle("POST /api/v1/display/lock", displayLockHandler(d))
	}

	// Hardware & Thermals
	if d.Hardware != nil {
		mux.Handle("GET /api/v1/hardware/status", hardwareStatusHandler(d))
		mux.Handle("GET /api/v1/hardware/thermals", hardwareStatusHandler(d))
		mux.Handle("POST /api/v1/hardware/power-profile", hardwarePowerProfileHandler(d))
	}

	// NixOS Maintenance, Generations, Diff, Flake & Live Rebuild
	if d.NixOS != nil {
		mux.Handle("GET /api/v1/nixos/status", nixosStatusHandler(d))
		mux.Handle("POST /api/v1/nixos/gc", nixosGCHandler(d))
		mux.Handle("POST /api/v1/nixos/optimise", nixosOptimiseHandler(d))
		mux.Handle("GET /api/v1/nixos/generations", nixosGenerationsHandler(d))
		mux.Handle("GET /api/v1/nixos/generations/diff", nixosGenerationDiffHandler(d))
		mux.Handle("POST /api/v1/nixos/generations/switch", nixosGenerationSwitchHandler(d))
		mux.Handle("POST /api/v1/nixos/generations/rollback", nixosGenerationRollbackHandler(d))
		mux.Handle("GET /api/v1/nixos/flake", nixosFlakeHandler(d))
		mux.Handle("POST /api/v1/nixos/rebuild", nixosRebuildHandler(d))
		mux.Handle("GET /api/v1/nixos/rebuild/jobs", nixosRebuildJobsHandler(d))
		mux.Handle("GET /api/v1/nixos/rebuild/jobs/{id}", nixosRebuildJobGetHandler(d))
		mux.Handle("POST /api/v1/nixos/rebuild/jobs/{id}/cancel", nixosRebuildJobCancelHandler(d))
		mux.Handle("GET /api/v1/nixos/rebuild/stream", nixosRebuildStreamHandler(d))
	}

	// Nix Packages & Options Search
	if d.Packages != nil {
		mux.Handle("GET /api/v1/packages/search", packagesSearchHandler(d))
		mux.Handle("GET /api/v1/packages/options", packagesOptionsHandler(d))
		mux.Handle("GET /api/v1/packages/installed", packagesInstalledHandler(d))
		mux.Handle("GET /api/v1/packages/info", packagesInfoHandler(d))
	}

	// File Explorer & Host Filesystem Management
	if d.Files != nil {
		mux.Handle("GET /api/v1/fs/list", fsListHandler(d))
		mux.Handle("GET /api/v1/fs/stat", fsStatHandler(d))
		mux.Handle("GET /api/v1/fs/read", fsReadHandler(d))
		mux.Handle("GET /api/v1/fs/download", fsDownloadHandler(d))
		mux.Handle("POST /api/v1/fs/write", fsWriteHandler(d))
		mux.Handle("POST /api/v1/fs/upload", fsUploadHandler(d))
		mux.Handle("POST /api/v1/fs/mkdir", fsMkdirHandler(d))
		mux.Handle("POST /api/v1/fs/delete", fsDeleteHandler(d))
		mux.Handle("POST /api/v1/fs/rename", fsRenameHandler(d))
		mux.Handle("POST /api/v1/fs/copy", fsCopyHandler(d))
		mux.Handle("POST /api/v1/fs/chmod", fsChmodHandler(d))
		mux.Handle("POST /api/v1/fs/archive", fsArchiveHandler(d))
		mux.Handle("POST /api/v1/fs/extract", fsExtractHandler(d))
		mux.Handle("GET /api/v1/fs/search", fsSearchHandler(d))
		mux.Handle("GET /api/v1/fs/git", fsGitHandler(d))
	}

	// Multi-Host Fleet & Colmena Orchestration
	if d.Fleet != nil {
		mux.Handle("GET /api/v1/fleet/nodes", fleetNodesHandler(d))
		mux.Handle("GET /api/v1/fleet/status", fleetStatusHandler(d))
		mux.Handle("POST /api/v1/fleet/deploy", fleetDeployHandler(d))
		mux.Handle("GET /api/v1/fleet/deploy/jobs", fleetDeployJobsHandler(d))
		mux.Handle("GET /api/v1/fleet/deploy/jobs/{id}", fleetDeployJobGetHandler(d))
		mux.Handle("POST /api/v1/fleet/deploy/jobs/{id}/cancel", fleetDeployJobCancelHandler(d))
		mux.Handle("GET /api/v1/fleet/deploy/stream", fleetDeployStreamHandler(d))
	}

	// Security, SOPS Audit & Fail2ban
	if d.Security != nil {
		mux.Handle("GET /api/v1/security/status", securityStatusHandler(d))
		mux.Handle("GET /api/v1/security/audit", securityAuditHandler(d))
		mux.Handle("GET /api/v1/security/sops", securitySOPSHandler(d))
		mux.Handle("POST /api/v1/security/sops/verify", securitySOPSVerifyHandler(d))
		mux.Handle("GET /api/v1/security/secrets", securitySecretsHandler(d))
		mux.Handle("GET /api/v1/security/fail2ban", securityFail2banHandler(d))
		mux.Handle("POST /api/v1/security/fail2ban/unban", securityFail2banUnbanHandler(d))
		mux.Handle("POST /api/v1/security/fail2ban/ban", securityFail2banBanHandler(d))
		mux.Handle("POST /api/v1/security/vpn/toggle", securityVPNToggleHandler(d))
	}

	// Web Authentication & PIN Lock
	mux.Handle("GET /api/v1/auth/status", authStatusHandler(d))
	mux.Handle("POST /api/v1/auth/login", authLoginHandler(d))
	mux.Handle("POST /api/v1/auth/logout", authLogoutHandler(d))
	mux.Handle("POST /api/v1/auth/verify", authVerifyHandler(d))

	// Storage, Snapper & Restic Backups
	if d.Storage != nil {
		mux.Handle("GET /api/v1/storage/removable", storageRemovableHandler(d))
		mux.Handle("POST /api/v1/storage/unmount", storageUnmountHandler(d))
		mux.Handle("GET /api/v1/storage/snapshots", storageSnapshotsHandler(d))
		mux.Handle("POST /api/v1/storage/snapshots", storageCreateSnapshotHandler(d))
		mux.Handle("DELETE /api/v1/storage/snapshots/{config}/{id}", storageDeleteSnapshotHandler(d))
		mux.Handle("GET /api/v1/storage/restic/status", storageResticStatusHandler(d))
		mux.Handle("GET /api/v1/storage/restic/snapshots", storageResticSnapshotsHandler(d))
		mux.Handle("POST /api/v1/storage/restic/backup", storageResticBackupHandler(d))
	}

	// AI Agents, Autonomous Loops & MicroVM Sandboxes
	if d.AI != nil {
		mux.Handle("GET /api/v1/ai/tasks", aiTasksListHandler(d))
		mux.Handle("POST /api/v1/ai/tasks", aiTaskCreateHandler(d))
		mux.Handle("GET /api/v1/ai/tasks/{id}", aiTaskGetHandler(d))
		mux.Handle("POST /api/v1/ai/tasks/{id}/cancel", aiTaskCancelHandler(d))
		mux.Handle("GET /api/v1/ai/tasks/{id}/stream", aiTaskStreamHandler(d))
		mux.Handle("GET /api/v1/ai/tools", aiToolsListHandler(d))
		mux.Handle("GET /api/v1/ai/microvms", aiMicroVMListHandler(d))
		mux.Handle("GET /api/v1/ai/microvms/host-status", aiMicroVMHostStatusHandler(d))
		mux.Handle("POST /api/v1/ai/microvms/{name}/start", aiMicroVMActionHandler(d, "start"))
		mux.Handle("POST /api/v1/ai/microvms/{name}/stop", aiMicroVMActionHandler(d, "stop"))
		mux.Handle("POST /api/v1/ai/microvms/{name}/restart", aiMicroVMActionHandler(d, "restart"))
	}

	// Log streaming & querying
	mux.Handle("GET /api/v1/logs/stream", logsStreamHandler(d))
	mux.Handle("GET /api/v1/logs/query", logsQueryHandler(d))
	mux.Handle("GET /api/v1/logs/units", logsUnitsHandler(d))
	mux.Handle("GET /api/v1/logs/stats", logsStatsHandler(d))
	mux.Handle("GET /api/v1/logs/export", logsExportHandler(d))

	// Terminal Sessions & WebSocket
	mux.Handle("GET /api/v1/terminal/sessions", listTerminalSessionsHandler(d))
	mux.Handle("POST /api/v1/terminal/sessions", createTerminalSessionHandler(d))
	mux.Handle("GET /api/v1/terminal/sessions/{id}", getTerminalSessionHandler(d))
	mux.Handle("DELETE /api/v1/terminal/sessions/{id}", killTerminalSessionHandler(d))
	mux.Handle("GET /api/v1/terminal/ws/{id}", terminalWSHandler(d))
	mux.Handle("GET /api/v1/terminal/ws", terminalDefaultWSHandler(d))
	mux.Handle("GET /api/v1/terminal/snippets", terminalSnippetsHandler(d))

	// Prometheus metrics (not under /api/v1/)
	mux.Handle("GET /metrics", prometheusHandler(d))

	return withMiddleware(requireAuth(d)(mux), d.Logger)
}

