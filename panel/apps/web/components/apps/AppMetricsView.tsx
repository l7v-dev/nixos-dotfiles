"use client";

import { Cpu, HardDrive, Activity, Clock, ShieldCheck } from "lucide-react";
import type { Application } from "@/types/apps";

interface AppMetricsViewProps {
    app: Application;
}

export function AppMetricsView({ app }: AppMetricsViewProps) {
    const isRunning = app.status === "running";
    const memMB = app.metrics.memory_mb || 0;
    const memLimitMB = app.metrics.memory_limit_mb || 0;
    const cpuPct = app.metrics.cpu_percent || 0;
    const tasks = app.metrics.tasks_current || 0;
    const uptimeSec = app.metrics.uptime_seconds || 0;

    const formatUptime = (seconds: number) => {
        if (!seconds) return "—";
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (d > 0) return `${d}d ${h}h`;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    return (
        <div className="space-y-4 font-sans">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
                {/* Memory Card */}
                <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Memory (RAM)</span>
                        <HardDrive className="h-4 w-4 text-foreground" strokeWidth={1.5} />
                    </div>
                    <p className="mt-1 text-xl font-bold font-mono tnum text-foreground">
                        {isRunning ? `${memMB} MB` : "—"}
                    </p>
                    {memLimitMB > 0 ? (
                        <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                <span>Limit: {memLimitMB} MB</span>
                                <span>{Math.min(100, Math.round((memMB / memLimitMB) * 100))}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{
                                        width: `${Math.min(100, (memMB / memLimitMB) * 100)}%`,
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        <p className="mt-1 text-[10px] text-muted-foreground font-mono">Limit: Unbounded</p>
                    )}
                </div>

                {/* CPU Card */}
                <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">CPU Utilization</span>
                        <Cpu className="h-4 w-4 text-foreground" strokeWidth={1.5} />
                    </div>
                    <p className="mt-1 text-xl font-bold font-mono tnum text-foreground">
                        {isRunning ? `${cpuPct.toFixed(1)}%` : "—"}
                    </p>
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                            <span>Load State</span>
                            <span>{cpuPct < 30 ? "Nominal" : cpuPct < 70 ? "Elevated" : "High"}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-full transition-all duration-300 ${
                                    cpuPct >= 80 ? "bg-destructive" : cpuPct >= 50 ? "bg-amber-500" : "bg-primary"
                                }`}
                                style={{ width: `${Math.min(100, cpuPct)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Tasks / PIDs Card */}
                <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Active Tasks / PIDs</span>
                        <Activity className="h-4 w-4 text-foreground" strokeWidth={1.5} />
                    </div>
                    <p className="mt-1 text-xl font-bold font-mono tnum text-foreground">
                        {isRunning ? tasks : "—"}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground font-mono">Cgroup task threads</p>
                </div>

                {/* Uptime Card */}
                <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Service Uptime</span>
                        <Clock className="h-4 w-4 text-foreground" strokeWidth={1.5} />
                    </div>
                    <p className="mt-1 text-base font-bold font-mono tnum text-foreground">
                        {isRunning ? formatUptime(uptimeSec) : "—"}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground font-mono">Continuous runtime</p>
                </div>
            </div>

            {/* Health & Status Box */}
            <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <h4 className="text-xs font-semibold text-foreground">Health & Isolation Status</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div>
                        <span className="text-muted-foreground">Systemd Substate:</span>
                        <p className="font-mono font-medium text-foreground">{app.status}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Restart Count:</span>
                        <p className="font-mono font-medium text-foreground">
                            {app.metrics.restarts_total ?? 0}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
