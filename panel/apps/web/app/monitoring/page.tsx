"use client";

import { useState } from "react";
import type { TimeRange } from "@/hooks/usePrometheusQuery";
import { TimeRangeSelector } from "@/components/monitoring/TimeRangeSelector";
import { StatCardRow } from "@/components/monitoring/StatCardRow";
import { CpuCharts } from "@/components/monitoring/CpuCharts";
import { MemoryChart } from "@/components/monitoring/MemoryChart";
import { DiskCharts } from "@/components/monitoring/DiskCharts";
import { NetworkCharts } from "@/components/monitoring/NetworkCharts";
import { SystemdCharts } from "@/components/monitoring/SystemdCharts";
import { ThermalChart } from "@/components/monitoring/ThermalChart";

export default function MonitoringPage() {
    const [timeRange, setTimeRange] = useState<TimeRange>("15m");

    return (
        <div className="flex flex-col gap-6 pb-12">
            {/* Page Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-lg font-semibold">Monitoring</h1>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Real-time system telemetry and Prometheus time-series analytics
                    </p>
                </div>
                <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            </div>

            {/* Instant procfs metrics row */}
            <StatCardRow />

            {/* CPU section */}
            <div className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    CPU & Processor Metrics
                </h2>
                <CpuCharts timeRange={timeRange} />
            </div>

            {/* Memory section */}
            <div className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Memory & Swap Allocation
                </h2>
                <MemoryChart timeRange={timeRange} />
            </div>

            {/* Disk I/O section */}
            <div className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Storage & Disk I/O
                </h2>
                <DiskCharts timeRange={timeRange} />
            </div>

            {/* Network section */}
            <div className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Network Interface Telemetry
                </h2>
                <NetworkCharts timeRange={timeRange} />
            </div>

            {/* Systemd & Thermal section */}
            <div className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    System Services & Sensors
                </h2>
                <SystemdCharts timeRange={timeRange} />
                <ThermalChart timeRange={timeRange} />
            </div>
        </div>
    );
}
