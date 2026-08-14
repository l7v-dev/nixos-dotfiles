export type EngineType = "podman" | "docker" | "unknown";

export type ContainerState =
    | "running"
    | "paused"
    | "exited"
    | "restarting"
    | "dead"
    | "created";

export interface PortMapping {
    ip?: string;
    privatePort: number;
    publicPort?: number;
    type: string;
}

export interface MountPoint {
    type: string;
    name?: string;
    source: string;
    destination: string;
    driver?: string;
    mode?: string;
    rw: boolean;
    propagation?: string;
}

export interface ContainerSummary {
    id: string;
    names: string[];
    image: string;
    imageId: string;
    command: string;
    created: number;
    state: ContainerState;
    status: string;
    ports: PortMapping[];
    labels: Record<string, string>;
    mounts: MountPoint[];
    stack?: string;
    isNixos?: boolean;
    engine: EngineType;
    cpuPct?: number;
    memoryUsage?: number;
    memoryLimit?: number;
    memoryPct?: number;
}

export interface ContainerStateInfo {
    status: string;
    running: boolean;
    paused: boolean;
    restarting: boolean;
    oomKilled: boolean;
    dead: boolean;
    pid: number;
    exitCode: number;
    error: string;
    startedAt: string;
    finishedAt: string;
    health?: {
        status: string;
        failingStreak: number;
    };
}

export interface ContainerDetail {
    id: string;
    created: string;
    path: string;
    args: string[];
    state: ContainerStateInfo;
    image: string;
    imageId: string;
    name: string;
    restartCount: number;
    driver: string;
    platform: string;
    mounts: MountPoint[];
    config: {
        hostname: string;
        domainname: string;
        user: string;
        env: string[];
        cmd: string[];
        entrypoint: string[];
        image: string;
        workingDir: string;
        labels: Record<string, string>;
        exposedPorts?: Record<string, unknown>;
    };
    networkSettings: {
        ipAddress: string;
        gateway: string;
        macAddress: string;
        bridge: string;
        ports: Record<string, { hostIp: string; hostPort: string }[]>;
        networks: Record<
            string,
            {
                networkId: string;
                ipAddress: string;
                gateway: string;
                macAddress: string;
            }
        >;
    };
    hostConfig: {
        memory: number;
        nanoCpus: number;
        cpuShares: number;
        autoRemove: boolean;
        networkMode: string;
        portBindings: Record<string, { hostIp: string; hostPort: string }[]>;
        restartPolicy: {
            name: string;
            maximumRetryCount: number;
        };
        privileged: boolean;
        readonlyRootfs: boolean;
    };
    isNixos?: boolean;
    stack?: string;
    engine: EngineType;
}

export interface ContainersOverview {
    totalContainers: number;
    runningContainers: number;
    pausedContainers: number;
    stoppedContainers: number;
    totalImages: number;
    totalVolumes: number;
    totalNetworks: number;
    engine: EngineType;
    engineVersion: string;
    engineApiVersion: string;
    totalCpuPct: number;
    totalMemoryBytes: number;
    totalMemoryLimit: number;
}

export interface ContainerStats {
    id: string;
    timestamp: string;
    cpuPct: number;
    memoryUsage: number;
    memoryLimit: number;
    memoryPct: number;
    networkRxBytes: number;
    networkTxBytes: number;
    blockReadBytes: number;
    blockWriteBytes: number;
    pids: number;
}

export interface ImageSummary {
    id: string;
    parentId?: string;
    repoTags: string[];
    repoDigests: string[];
    created: number;
    size: number;
    sharedSize: number;
    virtualSize: number;
    labels: Record<string, string>;
    containers: number;
    inUse: boolean;
}

export interface VolumeSummary {
    name: string;
    driver: string;
    mountpoint: string;
    createdAt?: string;
    labels: Record<string, string>;
    scope: string;
    inUse: boolean;
    containers?: string[];
    sizeBytes?: number;
}

export interface NetworkSummary {
    id: string;
    name: string;
    created?: string;
    scope: string;
    driver: string;
    enableIPv6: boolean;
    internal: boolean;
    attachable: boolean;
    ipam: {
        driver: string;
        config: { subnet?: string; gateway?: string }[];
    };
    containers?: Record<
        string,
        {
            name: string;
            endpointId: string;
            macAddress: string;
            ipv4Address: string;
            ipv6Address: string;
        }
    >;
    labels: Record<string, string>;
}

export interface StackSummary {
    name: string;
    type: "compose" | "pod" | "standalone";
    containerCount: number;
    runningCount: number;
    containers: ContainerSummary[];
    created: number;
    configFiles?: string[];
}

export interface CreateContainerRequest {
    name?: string;
    image: string;
    cmd?: string[];
    entrypoint?: string[];
    env?: string[];
    ports?: PortMapping[];
    mounts?: MountPoint[];
    network?: string;
    restartPolicy?: string;
    memoryMB?: number;
    cpus?: number;
    privileged?: boolean;
    labels?: Record<string, string>;
    autoStart?: boolean;
}

export interface BulkActionRequest {
    action: "start" | "stop" | "restart" | "pause" | "unpause" | "remove";
    ids: string[];
    force?: boolean;
}

export interface BulkActionResult {
    success: string[];
    failed: Record<string, string>;
}

export interface PullImageProgress {
    status: string;
    progress?: string;
    current?: number;
    total?: number;
    id?: string;
    error?: string;
}

export interface LogLine {
    timestamp: string;
    stream: "stdout" | "stderr";
    message: string;
}
