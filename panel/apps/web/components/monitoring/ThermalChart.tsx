"use client";

import React, { useMemo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend,
    ReferenceLine,
} from "recharts";
import { type TimeRange, useQueryRange } from "@/hooks/usePrometheusQuery";
import { mergeSeriesForRecharts } from "@/lib/prometheus";
import { ChartSection } from "./ChartSection";

interface ThermalChartProps {
    timeRange: TimeRange;
}

const THERMAL_COLORS = [
    "#f59e0b",
    "#ef4444",
    "#3b82f6",
    "#10b981",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#f97316",
];

export function ThermalChart({ timeRange }: ThermalChartProps) {
    const thermalQuery = `node_thermal_zone_temp`;
    const { data, isLoading, isError, refetch } = useQueryRange(thermalQuery, timeRange);

    const { thermalPoints, zoneKeys } = useMemo(() => {
        if (!data?.data) return { thermalPoints: [], zoneKeys: [] };
        const merged = mergeSeriesForRecharts(data.data, "type");
        const keys = data.data.result.map((s) => s.metric?.type || s.metric?.zone || "zone");
        return { thermalPoints: merged, zoneKeys: Array.from(new Set(keys)) };
    }, [data]);

    const formatTime = (ts: number) =>
        new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return (
        <ChartSection
            title="Thermal Sensors"
            subtitle={`Zone temperature curves in °C (${timeRange})`}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
        >
            <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={thermalPoints}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                            dataKey="time"
                            tickFormatter={formatTime}
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            unit=" °C"
                            domain={[0, 105]}
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                            width={42}
                        />
                        <Tooltip
                            labelFormatter={(t: number) => new Date(t).toLocaleTimeString()}
                            formatter={(val: number, name: string) => [`${val.toFixed(1)} °C`, name]}
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
                        <ReferenceLine
                            y={90}
                            stroke="#ef4444"
                            strokeDasharray="4 4"
                            label={{
                                value: "90°C Crit",
                                position: "top",
                                fill: "#ef4444",
                                fontSize: 10,
                            }}
                        />
                        {zoneKeys.map((k, idx) => (
                            <Line
                                key={k}
                                type="monotone"
                                dataKey={k}
                                name={k}
                                dot={false}
                                stroke={THERMAL_COLORS[idx % THERMAL_COLORS.length]}
                                strokeWidth={1.5}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </ChartSection>
    );
}
