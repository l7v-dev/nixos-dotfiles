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

export interface MaintenanceResult {
    action: string;
    status: string;
    output: string;
    freed_mb?: number;
}

export interface VPNTunnel {
    type: "tailscale" | "wireguard" | string;
    active: boolean;
    ip_address?: string;
    status: "connected" | "stopped" | "not_installed" | string;
    peers_count?: number;
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
