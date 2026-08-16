"use client";

import React, { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import type { LogStatsBucket } from "@/types/api";
import { CATEGORY_COLORS } from "@/lib/priority-color";
import { AlertCircle, AlertTriangle, Info, Bug, ShieldAlert } from "lucide-react";

interface LogHistogramProps {
    buckets: LogStatsBucket[];
    isLoading?: boolean;
    onSelectBucket?: (bucket: LogStatsBucket) => void;
}

export function LogHistogram({ buckets, isLoading, onSelectBucket }: LogHistogramProps) {
    const chartData = useMemo(() => {
        if (!buckets || buckets.length === 0) return [];
        return buckets.map((b) => {
            const counts = b.counts || {};
            const critical = (counts.emergency || 0) + (counts.alert || 0) + (counts.critical || 0);
            const error = counts.error || 0;
            const warning = counts.warning || 0;
            const info = (counts.notice || 0) + (counts.info || 0);
            const debug = counts.debug || 0;

            const timeLabel = new Date(b.timestamp).toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });

            return {
                time: timeLabel,
                timestamp: b.timestamp,
                critical,
                error,
                warning,
                info,
                debug,
                total: b.total || 0,
                raw: b,
            };
        });
    }, [buckets]);

    const totals = useMemo(() => {
        let critical = 0;
        let error = 0;
        let warning = 0;
        let info = 0;
        let debug = 0;
        let total = 0;

        for (const item of chartData) {
            critical += item.critical;
            error += item.error;
            warning += item.warning;
            info += item.info;
            debug += item.debug;
            total += item.total;
        }

        return { critical, error, warning, info, debug, total };
    }, [chartData]);

    if (isLoading) {
        return (
            <div className="h-28 rounded-lg border border-border bg-card/60 p-3 flex items-center justify-center animate-pulse">
                <span className="text-xs text-muted-foreground">Log istatistikleri yükleniyor…</span>
            </div>
        );
    }

    if (chartData.length === 0) {
        return null;
    }

    return (
        <div className="rounded-lg border border-border bg-card/90 backdrop-blur p-3 flex flex-col gap-2 transition-all">
            {/* Header / Summary badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2 text-xs">
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground tracking-tight">Log Hacmi & Dağılımı</span>
                    <span className="text-muted-foreground text-[11px] tabular-nums">
                        Toplam {totals.total.toLocaleString()} log
                    </span>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                    {totals.critical > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 font-medium text-rose-500 border border-rose-500/20">
                            <ShieldAlert className="h-3 w-3" strokeWidth={1.5} />
                            {totals.critical} Critical
                        </span>
                    )}
                    {totals.error > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive border border-destructive/20">
                            <AlertCircle className="h-3 w-3" strokeWidth={1.5} />
                            {totals.error} Error
                        </span>
                    )}
                    {totals.warning > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
                            {totals.warning} Warning
                        </span>
                    )}
                    {totals.info > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5 font-medium text-foreground border border-border/60">
                            <Info className="h-3 w-3" strokeWidth={1.5} />
                            {totals.info} Info
                        </span>
                    )}
                    {totals.debug > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 font-medium text-muted-foreground border border-border/40">
                            <Bug className="h-3 w-3" strokeWidth={1.5} />
                            {totals.debug} Debug
                        </span>
                    )}
                </div>
            </div>

            {/* Chart */}
            <div className="h-20 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 2, right: 4, left: -24, bottom: 0 }}
                        onClick={(state) => {
                            if (state?.activePayload?.[0]?.payload?.raw && onSelectBucket) {
                                onSelectBucket(state.activePayload[0].payload.raw);
                            }
                        }}
                    >
                        <XAxis
                            dataKey="time"
                            tick={{ fontSize: 10, fill: "var(--muted-foreground, #888)" }}
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            tick={{ fontSize: 9, fill: "var(--muted-foreground, #888)" }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (!active || !payload || payload.length === 0) return null;
                                const d = payload[0].payload;
                                return (
                                    <div className="rounded-xl border border-border bg-popover/95 backdrop-blur p-2.5 shadow-md text-xs space-y-1">
                                        <p className="font-semibold text-foreground font-mono">{d.time}</p>
                                        <div className="space-y-0.5 text-[11px] font-mono">
                                            {d.critical > 0 && <p className="text-rose-500 font-medium">Critical: {d.critical}</p>}
                                            {d.error > 0 && <p className="text-destructive font-medium">Error: {d.error}</p>}
                                            {d.warning > 0 && <p className="text-amber-700 dark:text-amber-400 font-medium">Warning: {d.warning}</p>}
                                            {d.info > 0 && <p className="text-foreground font-medium">Info: {d.info}</p>}
                                            {d.debug > 0 && <p className="text-muted-foreground font-medium">Debug: {d.debug}</p>}
                                            <p className="text-muted-foreground pt-1 border-t border-border/50">Total: {d.total}</p>
                                        </div>
                                    </div>
                                );
                            }}
                        />
                        <Bar dataKey="critical" stackId="a" fill={CATEGORY_COLORS.critical} radius={[0, 0, 0, 0]} />
                        <Bar dataKey="error" stackId="a" fill={CATEGORY_COLORS.error} radius={[0, 0, 0, 0]} />
                        <Bar dataKey="warning" stackId="a" fill={CATEGORY_COLORS.warning} radius={[0, 0, 0, 0]} />
                        <Bar dataKey="info" stackId="a" fill={CATEGORY_COLORS.info} radius={[0, 0, 0, 0]} />
                        <Bar dataKey="debug" stackId="a" fill={CATEGORY_COLORS.debug} radius={[2, 2, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
