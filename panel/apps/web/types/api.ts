// API type definitions matching the Go agent's JSON output exactly.

export interface Thresholds {
    CPUWarnPct: number;
    CPUCritPct: number;
    RAMWarnPct: number;
    RAMCritPct: number;
    DiskWarnPct: number;
    DiskCritPct: number;
}

export interface CPUStats {
    usage_pct: number;
}

export interface MemoryStats {
    total_mib: number;
    used_mib: number;
    usage_pct: number;
}

export interface DiskStats {
    mount: string;
    fs_type: string;
    total_gib: number;
    used_gib: number;
    avail_gib: number;
    usage_pct: number;
}

export interface NetStats {
    interface: string;
    rx_kbps: number;
    tx_kbps: number;
}

export interface MetricsSnapshot {
    cpu: CPUStats;
    memory: MemoryStats;
    disks: DiskStats[];
    network: NetStats[];
    timestamp: string;
    thresholds: Thresholds;
}

export type ActiveState = "active" | "inactive" | "failed" | "activating" | "deactivating" | "reloading" | string;
export type SubState = "running" | "exited" | "waiting" | "dead" | "failed" | "plugged" | "mounted" | string;
export type LoadState = "loaded" | "not-found" | "masked" | "error" | string;
export type UnitFileState = "enabled" | "enabled-runtime" | "disabled" | "static" | "masked" | "indirect" | "generated" | "transient" | string;

export interface ServiceUnit {
    name: string;
    description: string;
    load_state: LoadState;
    active_state: ActiveState;
    sub_state: SubState;
    unit_file_state: UnitFileState;
}

export interface ServiceActionResponse {
    unit: string;
    status: string;
}

export interface WifiStatus {
    enabled: boolean;
    ssid: string | null;
    signal_dbm: number | null;
    ip_address: string | null;
    gateway?: string | null;
    dns?: string[];
    freq_mhz?: number | null;
    band?: "2.4GHz" | "5GHz" | "6GHz" | null;
    rx_bytes?: number | null;
    tx_bytes?: number | null;
    rx_kbps?: number | null;
    tx_kbps?: number | null;
}

export interface AccessPoint {
    ssid: string;
    bssid: string;
    signal_dbm: number;
    security: "open" | "wep" | "wpa2" | "wpa3";
    freq_mhz: number;
    band: "2.4GHz" | "5GHz" | "6GHz";
    active: boolean;
}

export interface SavedConnection {
    id: string;
    uuid: string;
    ssid: string;
}

export interface BluetoothDevice {
    name: string;
    address: string;
    connected: boolean;
    paired: boolean;
    trusted: boolean;
    icon?: string;
    battery_pct?: number;
    rssi?: number;
}

export interface BluetoothStatus {
    enabled: boolean;
    adapter_name?: string;
    adapter_addr?: string;
    discovering?: boolean;
    devices: BluetoothDevice[];
}

export interface AudioDevice {
    id: string;
    name: string;
    description: string;
    is_default: boolean;
    type: "sink" | "source";
}

export interface AudioStatus {
    output_volume: number;
    output_muted: boolean;
    input_volume: number;
    input_muted: boolean;
    default_sink: string;
    default_source: string;
    sinks: AudioDevice[];
    sources: AudioDevice[];
}

export interface NightLightStatus {
    enabled: boolean;
    temperature: number;
}

export interface DisplayStatus {
    brightness_pct: number;
    can_brightness: boolean;
    device_name?: string;
    night_light: NightLightStatus;
}

export interface ThermalSensor {
    name: string;
    temp_c: number;
    critical?: number;
}

export interface FanSensor {
    name: string;
    rpm: number;
}

export interface HardwareStatus {
    cpu_temp_c: number;
    gpu_temp_c?: number;
    sensors: ThermalSensor[];
    fans: FanSensor[];
    power_profile: string;
    cpu_governor: string;
    available_profiles: string[];
}

export interface NixOSStatus {
    current_generation: number;
    version: string;
    kernel_version: string;
    uptime_seconds: number;
    nix_store_size_mb?: number;
    recent_generations?: string[];
}

export interface NixOSGeneration {
    number: number;
    timestamp: string;
    date_formatted: string;
    current: boolean;
    nixos_version: string;
    kernel_version: string;
    configuration_revision?: string;
    store_path: string;
}

export interface PackageDiffItem {
    name: string;
    change_type: "added" | "removed" | "updated" | "rebuilt";
    old_version?: string;
    new_version?: string;
    size_delta?: string;
    raw: string;
}

export interface DiffSummary {
    added_count: number;
    removed_count: number;
    updated_count: number;
    rebuilt_count: number;
    total_changes: number;
}

export interface GenerationDiff {
    from_generation: number;
    to_generation: number;
    from_store_path: string;
    to_store_path: string;
    summary: DiffSummary;
    items: PackageDiffItem[];
    raw_output: string;
}

export interface SwitchResult {
    action: string;
    target_generation: number;
    current_generation: number;
    status: string;
    output: string;
    duration_ms: number;
    timestamp: string;
}

export interface FlakeInput {
    name: string;
    type: string;
    owner?: string;
    repo?: string;
    ref?: string;
    revision?: string;
    short_revision?: string;
    last_modified?: string;
    last_modified_relative?: string;
    nar_hash?: string;
    url?: string;
}

export interface FlakeInfo {
    flake_path: string;
    lock_version: number;
    total_inputs: number;
    inputs: FlakeInput[];
    last_updated: string;
}

export type RebuildAction = "switch" | "boot" | "test" | "dry-activate" | "update";

export interface RebuildRequest {
    action: RebuildAction;
    flake_path?: string;
    host?: string;
    max_jobs?: number;
    cores?: number;
    update_inputs?: string[];
}

export interface RebuildJob {
    id: string;
    action: RebuildAction;
    status: "queued" | "running" | "completed" | "failed" | "cancelled";
    command: string;
    start_time: string;
    end_time?: string;
    duration_ms: number;
    exit_code: number;
    logs: string[];
}

export interface MaintenanceResult {
    action: string;
    status: string;
    output: string;
    freed_mb?: number;
}

// ---------------------------------------------------------------------------
// Fleet & Multi-Host Orchestration (Section B)
// ---------------------------------------------------------------------------

export interface FleetNode {
    id: string;
    name: string;
    target_host: string;
    roles: string[];
    tags: string[];
    status: "online" | "offline" | "unreachable" | "local";
    ping_ms: number;
    agent_url?: string;
    mesh_ip?: string;
    is_local: boolean;
    last_checked: string;
}

export interface FleetSummary {
    total_nodes: number;
    online_nodes: number;
    offline_nodes: number;
    nodes: FleetNode[];
    last_updated: string;
}

export type ColmenaDeployAction = "apply" | "build" | "test" | "upload";

export interface ColmenaDeployRequest {
    target: string; // "@production", "server", "builder", "backup", "all"
    action?: ColmenaDeployAction;
    build_on_target?: boolean;
    flake_path?: string;
    verbose?: boolean;
}

export interface ColmenaDeployJob {
    id: string;
    target: string;
    action: ColmenaDeployAction;
    status: "running" | "completed" | "failed" | "cancelled";
    command: string;
    start_time: string;
    end_time?: string;
    duration_ms: number;
    exit_code: number;
    logs: string[];
}

// ---------------------------------------------------------------------------
// Btrfs Snapshots & Restic Backup (Section C)
// ---------------------------------------------------------------------------

export interface SnapperConfig {
    name: string;
    subvolume: string;
}

export interface SnapperSnapshot {
    id: number;
    config: string;
    type: "single" | "pre" | "post" | string;
    pre_id?: number;
    date: string;
    date_string: string;
    cleanup?: string;
    description: string;
    user_data?: string;
}

export interface CreateSnapshotRequest {
    config?: string;
    description: string;
    cleanup?: string;
    type?: string;
    user_data?: string;
}

export interface ResticStatus {
    enabled: boolean;
    repository: string;
    backend: "s3" | "sftp" | "local" | string;
    service_active: boolean;
    service_substate: string;
    last_run_time?: string;
    last_run_success: boolean;
    next_run_time?: string;
    snapshot_count: number;
    paths: string[];
}

export interface ResticSnapshot {
    id: string;
    short_id: string;
    time: string;
    paths: string[];
    hostname: string;
    username: string;
    tags: string[];
}

export interface VPNTunnel {
    type: "tailscale" | "wireguard" | string;
    active: boolean;
    ip_address?: string;
    status: "connected" | "stopped" | "not_installed" | string;
    peers_count?: number;
}

export type ExposureType = "localhost" | "mesh" | "public";

export interface PortAuditItem {
    protocol: string;
    port: number;
    address: string;
    process?: string;
    pid?: number;
    exposure: ExposureType;
    is_protected: boolean;
}

export interface SOPSAuditReport {
    key_file_exists: boolean;
    key_file_path: string;
    public_key?: string;
    registered_in_sops: boolean;
    decryption_ok: boolean;
    status_message: string;
    last_tested_at: string;
}

export interface Fail2banJailInfo {
    name: string;
    currently_banned: number;
    total_banned: number;
    banned_ips: string[];
}

export interface Fail2banStatus {
    enabled: boolean;
    active_jails: number;
    total_banned_ip: number;
    jails: Fail2banJailInfo[];
}

export interface SecurityAuditReport {
    score: number;
    grade: "A+" | "A" | "B" | "C" | "F" | string;
    firewall_active: boolean;
    vpn_active: boolean;
    sops_report: SOPSAuditReport;
    fail2ban: Fail2banStatus;
    open_ports: PortAuditItem[];
    total_listening: number;
    public_listening: number;
    sysctl_hardened: boolean;
    recommendations: string[];
    audited_at: string;
}

export interface AuthStatus {
    auth_enabled: boolean;
    auth_method: "pin" | "password" | "none" | string;
    active_session: boolean;
    expires_at?: string;
}

export interface Session {
    token: string;
    created_at: string;
    expires_at: string;
    client_ip?: string;
}

export interface OpenPort {
    protocol: "tcp" | "udp" | string;
    port: number;
    address: string;
    process?: string;
}

export interface UserSession {
    id: string;
    user: string;
    seat?: string;
    tty?: string;
    type?: string;
}

export interface SecurityStatus {
    vpn: VPNTunnel;
    open_ports: OpenPort[];
    sessions: UserSession[];
    firewall_on: boolean;
}

export interface RemovableDisk {
    name: string;
    device: string;
    label: string;
    mount_point: string;
    size_gib: number;
    used_gib?: number;
    fs_type: string;
    is_mounted: boolean;
}

export interface LogEntry {
    timestamp: string;
    unit: string;
    priority: number;
    message: string;
    pid?: number;
    uid?: number;
    comm?: string;
    syslog_id?: string;
    hostname?: string;
    transport?: string;
    cursor?: string;
    fields?: Record<string, string>;
}

export interface LogStatsBucket {
    timestamp: string;
    counts: Record<string, number>;
    total: number;
}

export interface LogQueryResult {
    entries: LogEntry[];
    next_cursor?: string;
    total: number;
}

export interface LogQueryParams {
    since?: string;
    until?: string;
    unit?: string;
    priority?: number;
    priorities?: number[];
    search?: string;
    limit?: number;
    cursor?: string;
    reverse?: boolean;
}

export type TimeRangePreset = "live" | "5m" | "15m" | "1h" | "6h" | "24h" | "7d" | "custom";

export interface HealthResponse {
    status: "ok" | "degraded";
    version?: string;
    message?: string;
}

export interface PowerCapabilities {
    can_power_off: boolean;
    can_reboot: boolean;
    can_suspend: boolean;
    can_hibernate: boolean;
    can_hybrid_sleep: boolean;
}

export interface WoLHost {
    name: string;
    mac: string;
}

export interface WoLResponse {
    mac: string;
    broadcast: string;
    port: number;
    status: string;
}

export interface BatteryInfo {
    name: string;
    status: "Charging" | "Discharging" | "Full" | "Unknown" | string;
    capacity_pct: number;
    energy_now_uwh?: number;
    energy_full_uwh?: number;
    power_now_uw?: number;
    time_remaining_min?: number;
}

export interface PowerStatus {
    ac_online: boolean;
    batteries: BatteryInfo[];
}

export interface ScheduledShutdownInfo {
    scheduled: boolean;
    action?: string;
    execute_at?: string;   // RFC3339
    remaining_min?: number;
}

export interface AgentError {
    message: string;
    unit?: string;
    operation?: string;
    action?: string;
    interface?: string;
}

export type ThresholdLevel = "green" | "amber" | "red";

// ---------------------------------------------------------------------------
// AI Agents, Autonomous Loops & MicroVM Sandboxes (Section D)
// ---------------------------------------------------------------------------

export type AgentTaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type SandboxTier = 0 | 1 | 2 | 3;

export interface AgentTask {
    id: string;
    task_slug: string;
    prompt: string;
    agent_engine: string;
    max_iterations: number;
    current_iteration: number;
    status: AgentTaskStatus;
    working_dir: string;
    worktree_path?: string;
    branch?: string;
    session_name?: string;
    pid?: number;
    cpu_percent: number;
    memory_mb: number;
    start_time: string;
    end_time?: string;
    duration_ms: number;
    exit_code: number;
    logs: string[];
    is_external: boolean;
}

export interface StartTaskRequest {
    task_slug: string;
    prompt: string;
    max_iterations: number;
    agent_engine: string;
    working_dir?: string;
    sandbox_tier?: SandboxTier;
}

export type AIToolCategory =
    | "coding_agent"
    | "assistant"
    | "code_review"
    | "memory_intelligence"
    | "workflow_management"
    | "sandboxing_isolation";

export interface AIToolInfo {
    name: string;
    binary_name: string;
    description: string;
    category: AIToolCategory;
    sandbox_tier: SandboxTier;
    installed: boolean;
    version?: string;
    source: string;
    path?: string;
}

export interface VirtioShare {
    tag: string;
    source: string;
    mount_point: string;
    proto: string;
}

export interface MicroVMInfo {
    name: string;
    status: "running" | "stopped" | "failed" | "unknown" | string;
    vcpu: number;
    memory_mb: number;
    shares: VirtioShare[];
    ssh_command: string;
    socket_path?: string;
    systemd_unit: string;
    uptime_seconds: number;
}

export interface MicroVMHostStatus {
    supported: boolean;
    kvm_enabled: boolean;
    virtiofsd_running: boolean;
    available_vms: string[];
    hypervisor: string;
}
