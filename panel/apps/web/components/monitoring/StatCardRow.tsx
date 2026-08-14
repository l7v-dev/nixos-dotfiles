"use client";

import React from "react";
import { useMetrics } from "@/hooks/useMetrics";
import { classifyThreshold } from "@/lib/thresholds";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ThresholdLevel } from "@/types/api";
import { Cpu, MemoryStick, HardDrive, Network } from "lucide-react";

export function StatCardRow() {
    const { data, isLoading, error } = useMetrics();

    if (isLoading) {
        return (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-28 rounded-lg bg-muted/50 border border-border" />
                ))}
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                Real-time metrics procfs endpoint unavailable
            </div>
        );
    }

    const thr = data.thresholds;
    const totalRx = data.network.reduce((acc, n) => acc + n.rx_kbps, 0);
    const totalTx = data.network.reduce((acc, n) => acc + n.tx_kbps, 0);

    const primaryDisk = data.disks.length > 0 ? data.disks[0] : null;

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
                label="CPU Usage"
                value={`${data.cpu.usage_pct.toFixed(1)}%`}
                sub="System utilization"
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
                label="Disk (Root)"
                value={primaryDisk ? `${primaryDisk.usage_pct.toFixed(1)}%` : "—"}
                sub={primaryDisk ? `${primaryDisk.used_gib.toFixed(1)} / ${primaryDisk.total_gib.toFixed(1)} GiB` : undefined}
                icon={<HardDrive className="h-4 w-4" />}
                level={primaryDisk ? classifyThreshold(primaryDisk.usage_pct, thr.DiskWarnPct, thr.DiskCritPct) : "green"}
            />
            <StatCard
                label="Network Traffic"
                value={`${(totalRx + totalTx).toFixed(1)} kB/s`}
                sub={`↓ ${totalRx.toFixed(1)} kB/s  ↑ ${totalTx.toFixed(1)} kB/s`}
                icon={<Network className="h-4 w-4" />}
                level="green"
            />
        </div>
    );
}

function StatCard({
    label,
    value,
    sub,
    icon,
    level,
}: {
    label: string;
    value: string;
    sub?: string;
    icon: React.ReactNode;
    level: ThresholdLevel;
}) {
    const accentColor =
        level === "red"
            ? "bg-destructive"
            : level === "amber"
            ? "bg-orange-400"
            : "bg-primary";

    return (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
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
