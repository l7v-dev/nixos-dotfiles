"use client";

import React, { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";
import { type TimeRange } from "@/hooks/usePrometheusQuery";
import { useInstantQuery } from "@/hooks/usePrometheusQuery";
import { ChartSection } from "./ChartSection";

interface SystemdChartsProps {
    timeRange: TimeRange;
}

export function SystemdCharts({ timeRange }: SystemdChartsProps) {
    // Top 10 systemd unit tasks
    const tasksQuery = `topk(10, systemd_unit_tasks_current)`;
    const {
        data: tasksData,
        isLoading: tasksLoading,
        isError: tasksError,
        refetch: refetchTasks,
    } = useInstantQuery(tasksQuery);

    // Active unit start times for uptime calculation
    const uptimeQuery = `time() - (systemd_unit_start_time_seconds > 0)`;
    const {
        data: uptimeData,
        isLoading: uptimeLoading,
        isError: uptimeError,
        refetch: refetchUptime,
    } = useInstantQuery(uptimeQuery);

    const taskItems = useMemo(() => {
        if (!tasksData?.data?.result) return [];
        return tasksData.data.result
            .map((r) => {
                const name = r.metric.name || r.metric.unit || "unit";
                const val = parseFloat(r.value[1]);
                return {
                    name: name.replace(/\.service$/, ""),
                    tasks: isFinite(val) ? val : 0,
                };
            })
            .sort((a, b) => b.tasks - a.tasks)
            .slice(0, 10);
    }, [tasksData]);

    const uptimeItems = useMemo(() => {
        if (!uptimeData?.data?.result) return [];
        return uptimeData.data.result
            .map((r) => {
                const name = r.metric.name || r.metric.unit || "unit";
                const uptimeSec = parseFloat(r.value[1]);
                return {
                    name,
                    uptimeSec: isFinite(uptimeSec) ? uptimeSec : 0,
                };
            })
            .filter((u) => u.uptimeSec > 0)
            .sort((a, b) => b.uptimeSec - a.uptimeSec)
            .slice(0, 8);
    }, [uptimeData]);

    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (d > 0) return `${d}d ${h}h`;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m ${Math.floor(seconds % 60)}s`;
    };

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {/* Top Tasks BarChart */}
            <ChartSection
                title="Top Systemd Units by Tasks"
                subtitle="Units with highest thread/task count"
                isLoading={tasksLoading}
                isError={tasksError}
                onRetry={() => refetchTasks()}
            >
                <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={taskItems} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                            <XAxis
                                type="number"
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                width={110}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                formatter={(val: number) => [`${val} tasks`, "Task Count"]}
                                contentStyle={{
                                    background: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                }}
                            />
                            <Bar dataKey="tasks" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </ChartSection>

            {/* Service Uptime Table */}
            <ChartSection
                title="Service Uptime Ranking"
                subtitle="Longest running active systemd units"
                isLoading={uptimeLoading}
                isError={uptimeError}
                onRetry={() => refetchUptime()}
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border text-left">
                                <th className="py-2 text-muted-foreground font-medium">Unit Name</th>
                                <th className="py-2 text-right text-muted-foreground font-medium">Uptime</th>
                            </tr>
                        </thead>
                        <tbody>
                            {uptimeItems.map((item) => (
                                <tr
                                    key={item.name}
                                    className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors"
                                >
                                    <td className="py-2 font-mono text-muted-foreground truncate max-w-[200px]">
                                        {item.name}
                                    </td>
                                    <td className="py-2 text-right font-medium tabular-nums">
                                        {formatUptime(item.uptimeSec)}
                                    </td>
                                </tr>
                            ))}
                            {uptimeItems.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="py-4 text-center text-muted-foreground">
                                        No active systemd units found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </ChartSection>
        </div>
    );
}
