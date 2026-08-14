"use client";

import React, { useMemo } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend,
} from "recharts";
import { type TimeRange, useQueryRange } from "@/hooks/usePrometheusQuery";
import { parseRangeData } from "@/lib/prometheus";
import { ChartSection } from "./ChartSection";

interface MemoryChartProps {
    timeRange: TimeRange;
}

export function MemoryChart({ timeRange }: MemoryChartProps) {
    const usedQuery = `(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / 1048576`;
    const cachedQuery = `node_memory_Cached_bytes / 1048576`;
    const buffersQuery = `node_memory_Buffers_bytes / 1048576`;
    const swapQuery = `(node_memory_SwapTotal_bytes - node_memory_SwapFree_bytes) / 1048576`;

    const { data: usedData, isLoading: usedLoading, isError: usedError, refetch: refetchUsed } =
        useQueryRange(usedQuery, timeRange);
    const { data: cachedData, isLoading: cachedLoading, isError: cachedError, refetch: refetchCached } =
        useQueryRange(cachedQuery, timeRange);
    const { data: buffersData, isLoading: buffersLoading, isError: buffersError, refetch: refetchBuffers } =
        useQueryRange(buffersQuery, timeRange);
    const { data: swapData, isLoading: swapLoading, isError: swapError, refetch: refetchSwap } =
        useQueryRange(swapQuery, timeRange);

    const mergedData = useMemo(() => {
        const map = new Map<number, { time: number; used?: number; cached?: number; buffers?: number; swap?: number }>();

        if (usedData?.data?.result?.[0]) {
            for (const pt of parseRangeData(usedData.data.result[0])) {
                map.set(pt.time, { time: pt.time, used: pt.value });
            }
        }
        if (cachedData?.data?.result?.[0]) {
            for (const pt of parseRangeData(cachedData.data.result[0])) {
                const item = map.get(pt.time) || { time: pt.time };
                item.cached = pt.value;
                map.set(pt.time, item);
            }
        }
        if (buffersData?.data?.result?.[0]) {
            for (const pt of parseRangeData(buffersData.data.result[0])) {
                const item = map.get(pt.time) || { time: pt.time };
                item.buffers = pt.value;
                map.set(pt.time, item);
            }
        }
        if (swapData?.data?.result?.[0]) {
            for (const pt of parseRangeData(swapData.data.result[0])) {
                const item = map.get(pt.time) || { time: pt.time };
                item.swap = pt.value;
                map.set(pt.time, item);
            }
        }

        return Array.from(map.values()).sort((a, b) => a.time - b.time);
    }, [usedData, cachedData, buffersData, swapData]);

    const formatTime = (ts: number) =>
        new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const isLoading = usedLoading || cachedLoading || buffersLoading || swapLoading;
    const isError = usedError || cachedError || buffersError || swapError;

    const refetchAll = () => {
        refetchUsed();
        refetchCached();
        refetchBuffers();
        refetchSwap();
    };

    return (
        <ChartSection
            title="Memory & Swap Breakdown"
            subtitle={`Stacked allocation in MiB (${timeRange})`}
            isLoading={isLoading}
            isError={isError}
            onRetry={refetchAll}
        >
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mergedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                            dataKey="time"
                            tickFormatter={formatTime}
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            unit=" MiB"
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                            width={54}
                        />
                        <Tooltip
                            labelFormatter={(t: number) => new Date(t).toLocaleTimeString()}
                            formatter={(val: number, name: string) => [`${val.toFixed(1)} MiB`, name]}
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
                        <Area
                            type="monotone"
                            dataKey="used"
                            name="Used Memory"
                            stackId="1"
                            stroke="hsl(var(--primary))"
                            fill="hsl(var(--primary))"
                            fillOpacity={0.5}
                        />
                        <Area
                            type="monotone"
                            dataKey="cached"
                            name="Cached"
                            stackId="1"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.4}
                        />
                        <Area
                            type="monotone"
                            dataKey="buffers"
                            name="Buffers"
                            stackId="1"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.4}
                        />
                        <Area
                            type="monotone"
                            dataKey="swap"
                            name="Swap Used"
                            stackId="2"
                            stroke="#f59e0b"
                            fill="#f59e0b"
                            fillOpacity={0.3}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </ChartSection>
    );
}
