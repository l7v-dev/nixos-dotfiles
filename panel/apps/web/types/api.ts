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

export interface ServiceUnit {
    name: string;
    description: string;
    load_state: string;
    active_state: string;
    sub_state: string;
    unit_file_state: string;
}

export interface WifiStatus {
    enabled: boolean;
    ssid: string | null;
    signal_dbm: number | null;
    ip_address: string | null;
}

export interface BluetoothDevice {
    name: string;
    address: string;
    connected: boolean;
}

export interface BluetoothStatus {
    enabled: boolean;
    devices: BluetoothDevice[];
}

export interface LogEntry {
    timestamp: string;
    unit: string;
    priority: number;
    message: string;
}

export interface HealthResponse {
    status: "ok" | "degraded";
    version?: string;
    message?: string;
}

export interface AgentError {
    message: string;
    unit?: string;
    operation?: string;
    action?: string;
    interface?: string;
}

export type ThresholdLevel = "green" | "amber" | "red";
