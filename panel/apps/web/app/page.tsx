"use client";

import { useMetrics } from "@/hooks/useMetrics";
import { classifyThreshold } from "@/lib/thresholds";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useRef, useState, useEffect } from "react";
import type { CPUStats, ThresholdLevel } from "@/types/api";
import { Cpu, MemoryStick, HardDrive, Network } from "lucide-react";

const CPU_HISTORY_MAX = 60;

export default function DashboardPage() {
    const { data, isLoading, error } = useMetrics();
    const [cpuHistory, setCpuHistory] = useState<{ t: string; pct: number }[]>([]);
    const prevData = useRef<CPUStats | null>(null);

    useEffect(() => {
        if (data?.cpu && data.cpu !== prevData.current) {
            prevData.current = data.cpu;
            const now = new Date().toLocaleTimeString();
            setCpuHistory((h) => {
                const next = [...h, { t: now, pct: data.cpu.usage_pct }];
                return next.length > CPU_HISTORY_MAX ? next.slice(-CPU_HISTORY_MAX) : next;
            });
        }
    }, [data]);

    if (isLoading) return <PageSkeleton />;
    if (error) return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load metrics
        </div>
    );
    if (!data) return null;

    const thr = data.thresholds;

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-lg font-semibold">Dashboard</h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    Real-time system metrics
                </p>
            </div>

            {/* Stat cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="CPU Usage"
                    value={`${data.cpu.usage_pct.toFixed(1)}%`}
                    icon={<Cpu className="h-4 w-4" />}
                    level={classifyThreshold(data.cpu.usage_pct, thr.CPUWarnPct, thr.CPUCritPct)}
                />
                <StatCard
                    label="Memory"
                    value={`${data.memory.usage_pct.toFixed(1)}%`}
                    sub={`${data.memory.used_mib} / ${data.memory.total_mib} MiB`}
                    icon={<MemoryStick className="h-4 w-4" />}
                    level={classifyThreshold(data.memory.usage_pct, thr.RAMWarnPct, thr.RAMCritPct)}
                />
                <StatCard
                    label="Disk"
                    value={data.disks.length > 0 ? `${data.disks[0].usage_pct.toFixed(1)}%` : "—"}
                    sub={data.disks.length > 0 ? data.disks[0].mount : undefined}
                    icon={<HardDrive className="h-4 w-4" />}
                    level={data.disks.length > 0
                        ? classifyThreshold(data.disks[0].usage_pct, thr.DiskWarnPct, thr.DiskCritPct)
                        : "green"}
                />
                <StatCard
                    label="Interfaces"
                    value={`${data.network.length}`}
                    sub="network interfaces"
                    icon={<Network className="h-4 w-4" />}
                    level="green"
                />
            </div>

            {/* CPU chart */}
            <div className="rounded-lg border border-border bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-medium">CPU History</h2>
                    <span className="text-xs text-muted-foreground">Last 60s</span>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={cpuHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                            dataKey="t"
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            interval="preserveStartEnd"
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            unit="%"
                            axisLine={false}
                            tickLine={false}
                            width={32}
                        />
                        <Tooltip
                            formatter={(v: number) => [`${v.toFixed(1)}%`, "CPU"]}
                            contentStyle={{
                                background: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "6px",
                                fontSize: "12px",
                            }}
                            labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                        />
                        <Line
                            type="monotone"
                            dataKey="pct"
                            dot={false}
                            strokeWidth={1.5}
                            stroke="hsl(var(--primary))"
                            strokeLinecap="round"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Bottom tables */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Disk table */}
                <div className="rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <h2 className="text-sm font-medium">Disk</h2>
                        <span className="text-xs text-muted-foreground">{data.disks.length} mounts</span>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-left">
                                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Mount</th>
                                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Used</th>
                                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Total</th>
                                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.disks.map((d) => (
                                <tr
                                    key={d.mount}
                                    className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors"
                                >
                                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{d.mount}</td>
                                    <td className="px-4 py-2.5">{d.used_gib.toFixed(1)} GiB</td>
                                    <td className="px-4 py-2.5">{d.total_gib.toFixed(1)} GiB</td>
                                    <td className="px-4 py-2.5">
                                        <StatusBadge
                                            level={classifyThreshold(d.usage_pct, thr.DiskWarnPct, thr.DiskCritPct)}
                                            label={`${d.usage_pct.toFixed(1)}%`}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Network table */}
                <div className="rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <h2 className="text-sm font-medium">Network</h2>
                        <span className="text-xs text-muted-foreground">{data.network.length} interfaces</span>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-left">
                                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Interface</th>
                                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">↓ RX</th>
                                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">↑ TX</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.network.map((n) => (
                                <tr
                                    key={n.interface}
                                    className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors"
                                >
                                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{n.interface}</td>
                                    <td className="px-4 py-2.5 tabular-nums">{n.rx_kbps.toFixed(1)} kB/s</td>
                                    <td className="px-4 py-2.5 tabular-nums">{n.tx_kbps.toFixed(1)} kB/s</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* ─── Stat Card ─── */

function StatCard({
    label, value, sub, icon, level,
}: {
    label: string;
    value: string;
    sub?: string;
    icon: React.ReactNode;
    level: ThresholdLevel;
}) {
    const accentColor =
        level === "red" ? "bg-destructive" :
        level === "amber" ? "bg-orange-400" :
        "bg-primary";

    return (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
            {/* Accent top strip */}
            <div className={`h-0.5 w-full ${accentColor}`} />
            <div className="p-4">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                        {label}
                    </p>
                    <span className="text-muted-foreground/60">{icon}</span>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
                {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
                <div className="mt-3">
                    <StatusBadge level={level} label={level} />
                </div>
            </div>
        </div>
    );
}

/* ─── Loading skeleton ─── */

function PageSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-6 w-32 rounded bg-muted" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-28 rounded-lg bg-muted" />
                ))}
            </div>
            <div className="h-52 rounded-lg bg-muted" />
        </div>
    );
}
