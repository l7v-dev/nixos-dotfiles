// Enterprise Application & Ingress Type Definitions matching Go agent internal/apps JSON output exactly.

export type AppCategory =
    | "ingress_network"
    | "core_platform"
    | "observability"
    | "database"
    | "ai_workload"
    | "cicd_automation"
    | "backup_dr";

export type AccessLevel =
    | "public_https"
    | "tailscale_mesh"
    | "internal_only";

export type AppStatus =
    | "running"
    | "stopped"
    | "failed"
    | "degraded"
    | "standby";

export type SandboxTier = 0 | 1 | 2 | 3;

export interface AppEndpoint {
    type: "http" | "https" | "tcp" | "unix" | "ssh" | string;
    url?: string;
    port?: number;
    access_level?: AccessLevel;
    internal?: boolean;
}

export interface AppMetrics {
    cpu_percent: number;
    memory_mb: number;
    memory_limit_mb?: number;
    tasks_current: number;
    restarts_total?: number;
    uptime_seconds: number;
}

export interface NixProvenance {
    declared_in?: string;
    package_name?: string;
    version?: string;
    store_path?: string;
    flake_input?: string;
    secret_keys?: string[];
}

export interface Application {
    id: string;
    name: string;
    description: string;
    category: AppCategory;
    status: AppStatus;
    access_level: AccessLevel;
    systemd_unit?: string;
    binary_name?: string;
    sandbox_tier: SandboxTier;
    endpoints?: AppEndpoint[];
    dependencies?: string[];
    dependents?: string[];
    metrics: AppMetrics;
    provenance: NixProvenance;
    tags?: string[];
    last_started?: string;
}

export interface CategorySummary {
    category: AppCategory;
    total: number;
    running: number;
    stopped: number;
    failed: number;
    degraded: number;
}

export interface AppsSummary {
    total_apps: number;
    running_apps: number;
    stopped_apps: number;
    failed_apps: number;
    degraded_apps: number;
    total_memory_mb: number;
    total_cpu_percent: number;
    categories: CategorySummary[];
}

export interface AppActionRequest {
    action: "start" | "stop" | "restart" | "reload" | "enable" | "disable";
    force?: boolean;
}

export interface AppActionResponse {
    app_id: string;
    action: string;
    status: "success" | "failed" | "rejected" | "noop";
    timestamp: string;
    message?: string;
    affected?: string[];
}

export interface DependencyNode {
    id: string;
    name: string;
    category: AppCategory;
    status: AppStatus;
    access_level: AccessLevel;
    systemd_unit?: string;
}

export interface DependencyEdge {
    source: string;
    target: string;
    type: "requires" | "wants" | "proxies" | string;
}

export interface DependencyGraph {
    nodes: DependencyNode[];
    edges: DependencyEdge[];
}

export interface AppAuditRecord {
    id: string;
    app_id: string;
    action: string;
    status: string;
    message?: string;
    timestamp: string;
    caller_ip?: string;
}
