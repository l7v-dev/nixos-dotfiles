"use client";

import { useMetrics } from "@/hooks/useMetrics";
import { classifyThreshold } from "@/lib/thresholds";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useRef, useState, useEffect } from "react";
import type { CPUStats } from "@/types/api";

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

    if (isLoading) return <div className="text-muted-foreground text-sm">Loading metrics…</div>;
    if (error) return <div className="text-red-500 text-sm">Failed to load metrics</div>;
    if (!data) return null;

    const thr = data.thresholds;

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-semibold">Dashboard</h1>

            {/* Metric cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    label="CPU"
                    value={`${data.cpu.usage_pct.toFixed(1)}%`}
                    level={classifyThreshold(data.cpu.usage_pct, thr.CPUWarnPct, thr.CPUCritPct)}
                />
                <MetricCard
                    label="RAM"
                    value={`${data.memory.used_mib} / ${data.memory.total_mib} MiB`}
                    sub={`${data.memory.usage_pct.toFixed(1)}%`}
                    level={classifyThreshold(data.memory.usage_pct, thr.RAMWarnPct, thr.RAMCritPct)}
                />
            </div>

            {/* CPU chart */}
            <div className="rounded-lg border border-border bg-card p-4">
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">CPU history (60s)</h2>
                <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={cpuHistory}>
                        <XAxis dataKey="t" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                        <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, "CPU"]} />
                        <Line type="monotone" dataKey="pct" dot={false} strokeWidth={2} stroke="hsl(var(--primary))" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Disk table */}
            <div className="rounded-lg border border-border bg-card p-4">
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">Disk</h2>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                            <th className="pb-1 pr-4">Mount</th>
                            <th className="pb-1 pr-4">Used</th>
                            <th className="pb-1 pr-4">Total</th>
                            <th className="pb-1">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.disks.map((d) => (
                            <tr key={d.mount} className="border-b border-border last:border-0">
                                <td className="py-1 pr-4 font-mono text-xs">{d.mount}</td>
                                <td className="py-1 pr-4">{d.used_gib.toFixed(1)} GiB</td>
                                <td className="py-1 pr-4">{d.total_gib.toFixed(1)} GiB</td>
                                <td className="py-1">
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

            {/* Network */}
            <div className="rounded-lg border border-border bg-card p-4">
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">Network</h2>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                            <th className="pb-1 pr-4">Interface</th>
                            <th className="pb-1 pr-4">↓ RX</th>
                            <th className="pb-1">↑ TX</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.network.map((n) => (
                            <tr key={n.interface} className="border-b border-border last:border-0">
                                <td className="py-1 pr-4 font-mono text-xs">{n.interface}</td>
                                <td className="py-1 pr-4">{n.rx_kbps.toFixed(1)} kB/s</td>
                                <td className="py-1">{n.tx_kbps.toFixed(1)} kB/s</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function MetricCard({
    label, value, sub, level,
}: {
    label: string;
    value: string;
    sub?: string;
    level: "green" | "amber" | "red";
}) {
    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            <div className="mt-2">
                <StatusBadge level={level} label={level} />
            </div>
        </div>
    );
}
