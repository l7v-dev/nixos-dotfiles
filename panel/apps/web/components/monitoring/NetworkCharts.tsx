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
import { mergeSeriesForRecharts } from "@/lib/prometheus";
import { ChartSection } from "./ChartSection";

interface NetworkChartsProps {
    timeRange: TimeRange;
}

const NET_COLORS = ["hsl(var(--primary))", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

export function NetworkCharts({ timeRange }: NetworkChartsProps) {
    const step = deriveStep(timeRange);

    const rateWindow = `${Math.max(step * 4, 120)}s`;

    const rxQuery = `sum by (device) (rate(node_network_receive_bytes_total{device!="lo"}[${rateWindow}])) / 1024`;
    const txQuery = `sum by (device) (rate(node_network_transmit_bytes_total{device!="lo"}[${rateWindow}])) / 1024`;

    const { data: rxData, isLoading: rxLoading, isError: rxError, refetch: refetchRx } =
        useQueryRange(rxQuery, timeRange);
    const { data: txData, isLoading: txLoading, isError: txError, refetch: refetchTx } =
        useQueryRange(txQuery, timeRange);

    const dropQuery = `sum by (device) (rate(node_network_receive_drop_total{device!="lo"}[${rateWindow}])) + sum by (device) (rate(node_network_transmit_drop_total{device!="lo"}[${rateWindow}])) + sum by (device) (rate(node_network_receive_errs_total{device!="lo"}[${rateWindow}])) + sum by (device) (rate(node_network_transmit_errs_total{device!="lo"}[${rateWindow}]))`;

    const { data: dropData, isLoading: dropLoading, isError: dropError, refetch: refetchDrop } =
        useQueryRange(dropQuery, timeRange);

    const { rxPoints, rxKeys } = useMemo(() => {
        if (!rxData?.data) return { rxPoints: [], rxKeys: [] };
        const merged = mergeSeriesForRecharts(rxData.data, "device");
        const keys = rxData.data.result.map((s) => s.metric?.device || "unknown");
        return { rxPoints: merged, rxKeys: Array.from(new Set(keys)) };
    }, [rxData]);

    const { txPoints, txKeys } = useMemo(() => {
        if (!txData?.data) return { txPoints: [], txKeys: [] };
        const merged = mergeSeriesForRecharts(txData.data, "device");
        const keys = txData.data.result.map((s) => s.metric?.device || "unknown");
        return { txPoints: merged, txKeys: Array.from(new Set(keys)) };
    }, [txData]);

    const { dropPoints, dropKeys } = useMemo(() => {
        if (!dropData?.data) return { dropPoints: [], dropKeys: [] };
        const merged = mergeSeriesForRecharts(dropData.data, "device");
        const keys = dropData.data.result.map((s) => s.metric?.device || "unknown");
        return { dropPoints: merged, dropKeys: Array.from(new Set(keys)) };
    }, [dropData]);

    const formatTime = (ts: number) =>
        new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {/* Receive Throughput */}
            <ChartSection
                title="Network Receive (RX)"
                subtitle={`Throughput in kB/s across active interfaces (${timeRange})`}
                isLoading={rxLoading}
                isError={rxError}
                onRetry={() => refetchRx()}
            >
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={rxPoints}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis
                                dataKey="time"
                                tickFormatter={formatTime}
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                unit=" kB/s"
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                                width={48}
                            />
                            <Tooltip
                                labelFormatter={(t: number) => new Date(t).toLocaleTimeString()}
                                formatter={(val: number, name: string) => [`${val.toFixed(1)} kB/s`, name]}
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
                            {rxKeys.map((k, idx) => (
                                <Line
                                    key={k}
                                    type="monotone"
                                    dataKey={k}
                                    name={k}
                                    dot={false}
                                    stroke={NET_COLORS[idx % NET_COLORS.length]}
                                    strokeWidth={1.5}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </ChartSection>

            {/* Transmit Throughput */}
            <ChartSection
                title="Network Transmit (TX)"
                subtitle={`Throughput in kB/s across active interfaces (${timeRange})`}
                isLoading={txLoading}
                isError={txError}
                onRetry={() => refetchTx()}
            >
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={txPoints}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis
                                dataKey="time"
                                tickFormatter={formatTime}
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                unit=" kB/s"
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                                width={48}
                            />
                            <Tooltip
                                labelFormatter={(t: number) => new Date(t).toLocaleTimeString()}
                                formatter={(val: number, name: string) => [`${val.toFixed(1)} kB/s`, name]}
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
                            {txKeys.map((k, idx) => (
                                <Line
                                    key={k}
                                    type="monotone"
                                    dataKey={k}
                                    name={k}
                                    dot={false}
                                    stroke={NET_COLORS[idx % NET_COLORS.length]}
                                    strokeWidth={1.5}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </ChartSection>

            {/* Packet Drops & Errors */}
            <div className="lg:col-span-2">
                <ChartSection
                    title="Packet Drops & Errors"
                    subtitle={`Sum of drops and errors across non-loopback devices (${timeRange})`}
                    isLoading={dropLoading}
                    isError={dropError}
                    onRetry={() => refetchDrop()}
                >
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dropPoints}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                <XAxis
                                    dataKey="time"
                                    tickFormatter={formatTime}
                                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    unit=" pkts/s"
                                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={48}
                                />
                                <Tooltip
                                    labelFormatter={(t: number) => new Date(t).toLocaleTimeString()}
                                    formatter={(val: number, name: string) => [`${val.toFixed(2)} pkts/s`, name]}
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
                                {dropKeys.map((k, idx) => (
                                    <Line
                                        key={k}
                                        type="monotone"
                                        dataKey={k}
                                        name={`${k} drops`}
                                        dot={false}
                                        stroke={NET_COLORS[idx % NET_COLORS.length]}
                                        strokeWidth={1.5}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </ChartSection>
            </div>
        </div>
    );
}
