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
} from "recharts";
import { deriveStep, type TimeRange, useQueryRange } from "@/hooks/usePrometheusQuery";
import { parseRangeData } from "@/lib/prometheus";
import { ChartSection } from "./ChartSection";

interface DiskChartsProps {
    timeRange: TimeRange;
}

export function DiskCharts({ timeRange }: DiskChartsProps) {
    const step = deriveStep(timeRange);

    const rateWindow = `${Math.max(step * 4, 120)}s`;

    // IOPS
    const readIopsQuery = `sum(rate(node_disk_reads_completed_total[${rateWindow}]))`;
    const writeIopsQuery = `sum(rate(node_disk_writes_completed_total[${rateWindow}]))`;

    const {
        data: readIopsData,
        isLoading: readIopsLoading,
        isError: readIopsError,
        refetch: refetchReadIops,
    } = useQueryRange(readIopsQuery, timeRange);

    const {
        data: writeIopsData,
        isLoading: writeIopsLoading,
        isError: writeIopsError,
        refetch: refetchWriteIops,
    } = useQueryRange(writeIopsQuery, timeRange);

    // Throughput MB/s
    const readBytesQuery = `sum(rate(node_disk_read_bytes_total[${rateWindow}])) / 1048576`;
    const writeBytesQuery = `sum(rate(node_disk_written_bytes_total[${rateWindow}])) / 1048576`;

    const {
        data: readBytesData,
        isLoading: readBytesLoading,
        isError: readBytesError,
        refetch: refetchReadBytes,
    } = useQueryRange(readBytesQuery, timeRange);

    const {
        data: writeBytesData,
        isLoading: writeBytesLoading,
        isError: writeBytesError,
        refetch: refetchWriteBytes,
    } = useQueryRange(writeBytesQuery, timeRange);

    const iopsPoints = useMemo(() => {
        const map = new Map<number, { time: number; read?: number; write?: number }>();
        if (readIopsData?.data?.result?.[0]) {
            for (const pt of parseRangeData(readIopsData.data.result[0])) {
                map.set(pt.time, { time: pt.time, read: pt.value });
            }
        }
        if (writeIopsData?.data?.result?.[0]) {
            for (const pt of parseRangeData(writeIopsData.data.result[0])) {
                const item = map.get(pt.time) || { time: pt.time };
                item.write = pt.value;
                map.set(pt.time, item);
            }
        }
        return Array.from(map.values()).sort((a, b) => a.time - b.time);
    }, [readIopsData, writeIopsData]);

    const throughputPoints = useMemo(() => {
        const map = new Map<number, { time: number; readMb?: number; writeMb?: number }>();
        if (readBytesData?.data?.result?.[0]) {
            for (const pt of parseRangeData(readBytesData.data.result[0])) {
                map.set(pt.time, { time: pt.time, readMb: pt.value });
            }
        }
        if (writeBytesData?.data?.result?.[0]) {
            for (const pt of parseRangeData(writeBytesData.data.result[0])) {
                const item = map.get(pt.time) || { time: pt.time };
                item.writeMb = pt.value;
                map.set(pt.time, item);
            }
        }
        return Array.from(map.values()).sort((a, b) => a.time - b.time);
    }, [readBytesData, writeBytesData]);

    const formatTime = (ts: number) =>
        new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {/* IOPS */}
            <ChartSection
                title="Disk IOPS"
                subtitle={`Read and write operations per second (${timeRange})`}
                isLoading={readIopsLoading || writeIopsLoading}
                isError={readIopsError || writeIopsError}
                onRetry={() => {
                    refetchReadIops();
                    refetchWriteIops();
                }}
            >
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={iopsPoints}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis
                                dataKey="time"
                                tickFormatter={formatTime}
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                unit=" ops/s"
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                                width={48}
                            />
                            <Tooltip
                                labelFormatter={(t: number) => new Date(t).toLocaleTimeString()}
                                formatter={(val: number, name: string) => [`${val.toFixed(1)} ops/s`, name]}
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
                                dataKey="read"
                                name="Read IOPS"
                                dot={false}
                                stroke="hsl(var(--primary))"
                                strokeWidth={1.5}
                            />
                            <Line
                                type="monotone"
                                dataKey="write"
                                name="Write IOPS"
                                dot={false}
                                stroke="#f59e0b"
                                strokeWidth={1.5}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </ChartSection>

            {/* Throughput */}
            <ChartSection
                title="Disk Throughput"
                subtitle={`Read and write bandwidth in MB/s (${timeRange})`}
                isLoading={readBytesLoading || writeBytesLoading}
                isError={readBytesError || writeBytesError}
                onRetry={() => {
                    refetchReadBytes();
                    refetchWriteBytes();
                }}
            >
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={throughputPoints}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis
                                dataKey="time"
                                tickFormatter={formatTime}
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                unit=" MB/s"
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                                width={48}
                            />
                            <Tooltip
                                labelFormatter={(t: number) => new Date(t).toLocaleTimeString()}
                                formatter={(val: number, name: string) => [`${val.toFixed(2)} MB/s`, name]}
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
                                dataKey="readMb"
                                name="Read MB/s"
                                dot={false}
                                stroke="#10b981"
                                strokeWidth={1.5}
                            />
                            <Line
                                type="monotone"
                                dataKey="writeMb"
                                name="Write MB/s"
                                dot={false}
                                stroke="#ec4899"
                                strokeWidth={1.5}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </ChartSection>
        </div>
    );
}
