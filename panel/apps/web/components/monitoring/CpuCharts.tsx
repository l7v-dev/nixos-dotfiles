"use client";

import React, { useMemo } from "react";
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend,
} from "recharts";
import { deriveStep, type TimeRange, useQueryRange } from "@/hooks/usePrometheusQuery";
import { parseRangeData, mergeSeriesForRecharts } from "@/lib/prometheus";
import { ChartSection } from "./ChartSection";

interface CpuChartsProps {
    timeRange: TimeRange;
}

const CORE_COLORS = [
    "hsl(var(--primary))",
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ec4899",
    "#8b5cf6",
    "#06b6d4",
    "#14b8a6",
    "#f97316",
    "#6366f1",
    "#84cc16",
    "#d946ef",
    "#0ea5e9",
    "#a855f7",
    "#22c55e",
    "#eab308",
];

export function CpuCharts({ timeRange }: CpuChartsProps) {
    const step = deriveStep(timeRange);
    const rateWindow = `${Math.max(step * 4, 120)}s`;

    // Total CPU usage
    const totalCpuQuery = `(1 - avg(rate(node_cpu_seconds_total{mode="idle"}[${rateWindow}]))) * 100`;
    const {
        data: totalData,
        isLoading: totalLoading,
        isError: totalError,
        refetch: refetchTotal,
    } = useQueryRange(totalCpuQuery, timeRange);

    // Core usage
    const coreQuery = `(1 - rate(node_cpu_seconds_total{mode="idle"}[${rateWindow}])) * 100`;
    const {
        data: coreData,
        isLoading: coreLoading,
        isError: coreError,
        refetch: refetchCore,
    } = useQueryRange(coreQuery, timeRange);

    // I/O Wait and Steal
    const ioWaitQuery = `avg(rate(node_cpu_seconds_total{mode="iowait"}[${rateWindow}])) * 100`;
    const {
        data: ioWaitData,
        isLoading: ioWaitLoading,
        isError: ioWaitError,
        refetch: refetchIoWait,
    } = useQueryRange(ioWaitQuery, timeRange);

    const stealQuery = `avg(rate(node_cpu_seconds_total{mode="steal"}[${rateWindow}])) * 100`;
    const {
        data: stealData,
        isLoading: stealLoading,
        isError: stealError,
        refetch: refetchSteal,
    } = useQueryRange(stealQuery, timeRange);

    const parsedTotal = useMemo(() => {
        if (!totalData?.data?.result?.[0]) return [];
        return parseRangeData(totalData.data.result[0]);
    }, [totalData]);

    const { corePoints, coreKeys } = useMemo(() => {
        if (!coreData?.data) return { corePoints: [], coreKeys: [] };
        const merged = mergeSeriesForRecharts(coreData.data, "cpu");
        const keys = coreData.data.result.map((s) => s.metric?.cpu || "core");
        return { corePoints: merged, coreKeys: Array.from(new Set(keys)) };
    }, [coreData]);

    const parsedWaitSteal = useMemo(() => {
        const timeMap = new Map<number, { time: number; iowait?: number; steal?: number }>();

        if (ioWaitData?.data?.result?.[0]) {
            for (const pt of parseRangeData(ioWaitData.data.result[0])) {
                timeMap.set(pt.time, { time: pt.time, iowait: pt.value });
            }
        }
        if (stealData?.data?.result?.[0]) {
            for (const pt of parseRangeData(stealData.data.result[0])) {
                const existing = timeMap.get(pt.time) || { time: pt.time };
                existing.steal = pt.value;
                timeMap.set(pt.time, existing);
            }
        }
        return Array.from(timeMap.values()).sort((a, b) => a.time - b.time);
    }, [ioWaitData, stealData]);

    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {/* Total CPU */}
            <ChartSection
                title="Total CPU Utilization"
                subtitle={`Averaged across all cores (${timeRange})`}
                isLoading={totalLoading}
                isError={totalError}
                onRetry={() => refetchTotal()}
            >
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={parsedTotal}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis
                                dataKey="time"
                                tickFormatter={formatTime}
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                domain={[0, 100]}
                                unit="%"
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                                width={36}
                            />
                            <Tooltip
                                labelFormatter={(t: number) => new Date(t).toLocaleTimeString()}
                                formatter={(val: number) => [`${val.toFixed(1)}%`, "CPU"]}
                                contentStyle={{
                                    background: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                dot={false}
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </ChartSection>

            {/* Per-Core Usage (Stacked Area) */}
            <ChartSection
                title="CPU Utilization per Core"
                subtitle="Per-core stacked utilization"
                isLoading={coreLoading}
                isError={coreError}
                onRetry={() => refetchCore()}
            >
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={corePoints}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis
                                dataKey="time"
                                tickFormatter={formatTime}
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                unit="%"
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                                width={36}
                            />
                            <Tooltip
                                labelFormatter={(t: number) => new Date(t).toLocaleTimeString()}
                                formatter={(val: number, name: string) => [`${val.toFixed(1)}%`, `Core ${name}`]}
                                contentStyle={{
                                    background: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                }}
                            />
                            {coreKeys.map((k, idx) => (
                                <Area
                                    key={k}
                                    type="monotone"
                                    dataKey={k}
                                    stackId="1"
                                    stroke={CORE_COLORS[idx % CORE_COLORS.length]}
                                    fill={CORE_COLORS[idx % CORE_COLORS.length]}
                                    fillOpacity={0.4}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </ChartSection>

            {/* I/O Wait & Steal */}
            <div className="lg:col-span-2">
                <ChartSection
                    title="I/O Wait & Steal"
                    subtitle="System latency and virtualization overhead"
                    isLoading={ioWaitLoading || stealLoading}
                    isError={ioWaitError || stealError}
                    onRetry={() => {
                        refetchIoWait();
                        refetchSteal();
                    }}
                >
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={parsedWaitSteal}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                <XAxis
                                    dataKey="time"
                                    tickFormatter={formatTime}
                                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    unit="%"
                                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={36}
                                />
                                <Tooltip
                                    labelFormatter={(t: number) => new Date(t).toLocaleTimeString()}
                                    formatter={(val: number, name: string) => [`${val.toFixed(2)}%`, name]}
                                    contentStyle={{
                                        background: "hsl(var(--card))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                    }}
                                />
                                <Legend
                                    wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                                    formatter={(val) => <span className="text-muted-foreground">{val}</span>}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="iowait"
                                    name="I/O Wait"
                                    dot={false}
                                    stroke="#f59e0b"
                                    strokeWidth={1.5}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="steal"
                                    name="Steal"
                                    dot={false}
                                    stroke="#ec4899"
                                    strokeWidth={1.5}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </ChartSection>
            </div>
        </div>
    );
}
