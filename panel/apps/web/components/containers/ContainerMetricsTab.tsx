"use client";

import React from "react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";
import {
    Cpu,
    HardDrive,
    Network,
    Database,
    Activity,
    Wifi,
    WifiOff,
} from "lucide-react";
import { useContainerStats } from "@/hooks/useContainerStats";

interface Props {
    containerId: string;
    isRunning: boolean;
}

export function ContainerMetricsTab({ containerId, isRunning }: Props) {
    const { stats, history, isConnected, error } = useContainerStats(containerId, isRunning);

    if (!isRunning) {
        return (
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
                <Activity className="mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">Kapsayıcı çalışmıyor</p>
                <p className="text-xs text-muted-foreground/70">
                    Gerçek zamanlı metrikleri görüntülemek için konteyneri başlatın.
                </p>
            </div>
        );
    }

    const currentCpu = stats?.cpuPct ? Math.round(stats.cpuPct * 10) / 10 : 0;
    const currentMemMB = stats?.memoryUsage
        ? Math.round((stats.memoryUsage / 1024 / 1024) * 10) / 10
        : 0;
    const limitMemMB = stats?.memoryLimit
        ? Math.round((stats.memoryLimit / 1024 / 1024) * 10) / 10
        : 0;
    const memPct = stats?.memoryPct ? Math.round(stats.memoryPct * 10) / 10 : 0;
    const currentPIDs = stats?.pids || 0;

    return (
        <div className="space-y-4">
            {/* Status Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Canlı Telemetri (cgroups v2)
                    </span>
                    {isConnected ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                            Canlı Akış
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                            <WifiOff className="h-2.5 w-2.5" />
                            Bağlanıyor...
                        </span>
                    )}
                </div>
                {error && <span className="text-[11px] text-destructive">{error}</span>}
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {/* CPU */}
                <div className="rounded-lg border border-border bg-card/60 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>CPU Kullanımı</span>
                        <Cpu className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <div className="mt-1 text-lg font-bold text-foreground">
                        %{currentCpu}
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${Math.min(100, currentCpu)}%` }}
                        />
                    </div>
                </div>

                {/* Memory */}
                <div className="rounded-lg border border-border bg-card/60 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Bellek (RAM)</span>
                        <HardDrive className="h-3.5 w-3.5 text-purple-500" />
                    </div>
                    <div className="mt-1 text-lg font-bold text-foreground">
                        {currentMemMB} MB
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                        <span>Limit: {limitMemMB > 0 ? `${limitMemMB} MB` : "Limitsiz"}</span>
                        <span>%{memPct}</span>
                    </div>
                </div>

                {/* Network Total */}
                <div className="rounded-lg border border-border bg-card/60 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Ağ Trafiği</span>
                        <Network className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    <div className="mt-1 text-xs font-semibold text-foreground">
                        Rx: {stats ? Math.round((stats.networkRxBytes / 1024 / 1024) * 10) / 10 : 0} MB
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Tx: {stats ? Math.round((stats.networkTxBytes / 1024 / 1024) * 10) / 10 : 0} MB
                    </div>
                </div>

                {/* PIDs */}
                <div className="rounded-lg border border-border bg-card/60 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Aktif İş Parçacığı</span>
                        <Activity className="h-3.5 w-3.5 text-amber-500" />
                    </div>
                    <div className="mt-1 text-lg font-bold text-foreground">
                        {currentPIDs} PID
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                        Süreç & thread sayısı
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* CPU Chart */}
                <div className="rounded-lg border border-border bg-card p-3.5">
                    <p className="mb-2 text-xs font-semibold text-foreground">
                        CPU Kullanım Eğrisi (%)
                    </p>
                    <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                                <YAxis tick={{ fontSize: 9 }} domain={[0, "auto"]} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                                        borderRadius: "6px",
                                        fontSize: "11px",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="cpu"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#cpuGrad)"
                                    name="CPU %"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Memory Chart */}
                <div className="rounded-lg border border-border bg-card p-3.5">
                    <p className="mb-2 text-xs font-semibold text-foreground">
                        Bellek Kullanımı (MB)
                    </p>
                    <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                                <YAxis tick={{ fontSize: 9 }} domain={[0, "auto"]} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                                        borderRadius: "6px",
                                        fontSize: "11px",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="memoryMB"
                                    stroke="#a855f7"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#memGrad)"
                                    name="RAM (MB)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Network I/O Rate Chart */}
                <div className="rounded-lg border border-border bg-card p-3.5">
                    <p className="mb-2 text-xs font-semibold text-foreground">
                        Anlık Ağ Akışı (KB/s)
                    </p>
                    <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                                <YAxis tick={{ fontSize: 9 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                                        borderRadius: "6px",
                                        fontSize: "11px",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="netRxKb"
                                    stroke="#10b981"
                                    strokeWidth={1.5}
                                    fill="#10b981"
                                    fillOpacity={0.2}
                                    name="İndirme (Rx KB/s)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="netTxKb"
                                    stroke="#06b6d4"
                                    strokeWidth={1.5}
                                    fill="#06b6d4"
                                    fillOpacity={0.2}
                                    name="Yükleme (Tx KB/s)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Block I/O Rate Chart */}
                <div className="rounded-lg border border-border bg-card p-3.5">
                    <p className="mb-2 text-xs font-semibold text-foreground">
                        Disk I/O Hızı (KB/s)
                    </p>
                    <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                                <YAxis tick={{ fontSize: 9 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                                        borderRadius: "6px",
                                        fontSize: "11px",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="blockReadKb"
                                    stroke="#f59e0b"
                                    strokeWidth={1.5}
                                    fill="#f59e0b"
                                    fillOpacity={0.2}
                                    name="Okuma (Read KB/s)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="blockWriteKb"
                                    stroke="#ef4444"
                                    strokeWidth={1.5}
                                    fill="#ef4444"
                                    fillOpacity={0.2}
                                    name="Yazma (Write KB/s)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
