"use client";

import { Cpu, HardDrive, Activity, RotateCcw, Clock, ShieldCheck } from "lucide-react";
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
        if (d > 0) return `${d} gün ${h} sa`;
        if (h > 0) return `${h} sa ${m} dk`;
        return `${m} dakika`;
    };

    const getCpuColor = (pct: number) => {
        if (pct >= 80) return "text-destructive bg-destructive";
        if (pct >= 50) return "text-amber-400 bg-amber-400";
        return "text-emerald-400 bg-emerald-400";
    };

    return (
        <div className="space-y-4">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
                {/* Memory Card */}
                <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Bellek (RAM)</span>
                        <HardDrive className="h-4 w-4 text-blue-400" />
                    </div>
                    <p className="mt-1 text-xl font-bold tabular-nums">
                        {isRunning ? `${memMB} MB` : "—"}
                    </p>
                    {memLimitMB > 0 ? (
                        <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>Limit: {memLimitMB} MB</span>
                                <span>%{Math.min(100, Math.round((memMB / memLimitMB) * 100))}</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-300"
                                    style={{
                                        width: `${Math.min(100, (memMB / memLimitMB) * 100)}%`,
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        <p className="mt-1 text-[10px] text-muted-foreground">Limit: Belirlenmemiş</p>
                    )}
                </div>

                {/* CPU Card */}
                <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">CPU Kullanımı</span>
                        <Cpu className="h-4 w-4 text-purple-400" />
                    </div>
                    <p className="mt-1 text-xl font-bold tabular-nums">
                        {isRunning ? `%${cpuPct.toFixed(1)}` : "—"}
                    </p>
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Yük Seviyesi</span>
                            <span>{cpuPct < 30 ? "Düşük" : cpuPct < 70 ? "Orta" : "Yüksek"}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-full transition-all duration-300 ${
                                    getCpuColor(cpuPct).split(" ")[1]
                                }`}
                                style={{ width: `${Math.min(100, cpuPct)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Tasks / PIDs Card */}
                <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Aktif Görevler (Tasks)</span>
                        <Activity className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="mt-1 text-xl font-bold tabular-nums">
                        {isRunning ? tasks : "—"}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">Cgroup threads / pids</p>
                </div>

                {/* Uptime Card */}
                <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Çalışma Süresi</span>
                        <Clock className="h-4 w-4 text-amber-400" />
                    </div>
                    <p className="mt-1 text-base font-bold tabular-nums">
                        {isRunning ? formatUptime(uptimeSec) : "—"}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">Kesintisiz uptime</p>
                </div>
            </div>

            {/* Health & Status Box */}
            <div className="rounded-xl border border-border/70 bg-card/40 p-4 space-y-2">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <h4 className="text-xs font-semibold">Sağlık ve İzolasyon Durumu</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div>
                        <span className="text-muted-foreground">Systemd Substate:</span>
                        <p className="font-mono font-medium text-foreground">{app.status}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Yeniden Başlatma:</span>
                        <p className="font-mono font-medium text-foreground">
                            {app.metrics.restarts_total ?? 0} kez
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
