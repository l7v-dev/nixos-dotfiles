"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useHostStore } from "@/store/host-store";
import { useLogs } from "@/hooks/useLogs";
import { useLogQuery } from "@/hooks/useLogQuery";
import { useLogUnits } from "@/hooks/useLogUnits";
import { useLogStats } from "@/hooks/useLogStats";
import { LogHistogram } from "@/components/logs/LogHistogram";
import { LogToolbar } from "@/components/logs/LogToolbar";
import { LogViewer } from "@/components/logs/LogViewer";
import { LogDetailDrawer } from "@/components/logs/LogDetailDrawer";
import type { LogEntry, TimeRangePreset } from "@/types/api";
import { ScrollText, Server, Wifi, WifiOff } from "lucide-react";

export default function LogsPage() {
    const host = useHostStore((s) => s.selectedHost);

    // Filter & Mode state
    const [mode, setMode] = useState<"live" | "historical">("live");
    const [timeRange, setTimeRange] = useState<TimeRangePreset>("live");
    const [unit, setUnit] = useState("");
    const [debouncedUnit, setDebouncedUnit] = useState("");
    const [selectedPriorities, setSelectedPriorities] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7]);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [density, setDensity] = useState<"compact" | "normal">("compact");
    const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);

    // Debounce unit and search to avoid reconnecting SSE on every keypress
    useEffect(() => {
        const t = setTimeout(() => setDebouncedUnit(unit), 300);
        return () => clearTimeout(t);
    }, [unit]);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    // Active units list
    const { data: availableUnits = [] } = useLogUnits();

    // Time window calculation for historical mode and stats
    const { sinceStr, untilStr } = useMemo(() => {
        if (mode === "live" || timeRange === "live") {
            return { sinceStr: "1h", untilStr: undefined };
        }
        return { sinceStr: timeRange, untilStr: undefined };
    }, [mode, timeRange]);

    // Live Stream Hook
    const liveLogs = useLogs(
        debouncedUnit || undefined,
        undefined,
        selectedPriorities.length < 8 ? selectedPriorities : undefined,
        debouncedSearch || undefined,
        250 // initial backlog
    );

    // Historical Query Hook
    const historicalQuery = useLogQuery(
        {
            unit: debouncedUnit || undefined,
            priorities: selectedPriorities.length < 8 ? selectedPriorities : undefined,
            since: sinceStr,
            search: debouncedSearch || undefined,
            limit: 500,
            reverse: true,
        },
        mode === "historical"
    );

    // Histogram Stats Hook
    const { data: statsBuckets = [], isLoading: isStatsLoading } = useLogStats(
        sinceStr,
        untilStr,
        timeRange === "24h" || timeRange === "7d" ? "15m" : "1m",
        true
    );

    // Active entries selection
    const rawEntries = useMemo(() => {
        if (mode === "live") {
            return liveLogs.entries;
        }
        return historicalQuery.data?.entries ?? [];
    }, [mode, liveLogs.entries, historicalQuery.data?.entries]);

    // Client-side filtering if search is typed without waiting for reconnect
    const displayEntries = useMemo(() => {
        if (!debouncedSearch.trim()) return rawEntries;
        const q = debouncedSearch.toLowerCase();
        return rawEntries.filter(
            (e) =>
                e.message.toLowerCase().includes(q) ||
                (e.unit && e.unit.toLowerCase().includes(q)) ||
                (e.comm && e.comm.toLowerCase().includes(q))
        );
    }, [rawEntries, debouncedSearch]);

    // Toggle single priority
    const handleTogglePriority = useCallback((priority: number) => {
        setSelectedPriorities((prev) => {
            if (prev.includes(priority)) {
                return prev.filter((p) => p !== priority);
            } else {
                return [...prev, priority].sort((a, b) => a - b);
            }
        });
    }, []);

    // Export handler
    const handleExport = useCallback(
        (format: "json" | "csv" | "ndjson" | "raw") => {
            const params = new URLSearchParams();
            params.set("format", format);
            if (debouncedUnit) params.set("unit", debouncedUnit);
            if (selectedPriorities.length < 8) {
                params.set("priorities", selectedPriorities.join(","));
            }
            if (debouncedSearch) params.set("search", debouncedSearch);
            if (sinceStr) params.set("since", sinceStr);
            params.set("limit", "2000");

            const url = `/api/agent/${encodeURIComponent(host)}/api/v1/logs/export?${params.toString()}`;
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `logs-${host}-${format}.${format === "raw" ? "log" : format}`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        [host, debouncedUnit, selectedPriorities, debouncedSearch, sinceStr]
    );

    return (
        <div className="flex flex-col h-[calc(100vh-4.5rem)] gap-2.5 p-1">
            {/* Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="rounded-lg bg-primary/10 p-2 border border-primary/20 text-primary">
                        <ScrollText className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-bold tracking-tight text-foreground">Sistem & Servis Logları</h1>
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground border border-border/50">
                                <Server className="h-3 w-3" /> {host}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            systemd journald ve servis çıktı akışı & analitiği
                        </p>
                    </div>
                </div>

                {/* Connection Status indicator */}
                <div className="flex items-center gap-2 text-xs">
                    {mode === "live" ? (
                        liveLogs.error ? (
                            <span className="inline-flex items-center gap-1 text-destructive font-medium bg-destructive/10 px-2 py-1 rounded border border-destructive/20">
                                <WifiOff className="h-3 w-3" /> {liveLogs.error}
                            </span>
                        ) : liveLogs.retryCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-medium bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                                Yeniden bağlanıyor ({liveLogs.retryCount}/5)…
                            </span>
                        ) : (
                            <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium border text-xs ${
                                    liveLogs.isConnected
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                        : "bg-muted text-muted-foreground border-border"
                                }`}
                            >
                                <span
                                    className={`h-2 w-2 rounded-full ${
                                        liveLogs.isConnected ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"
                                    }`}
                                />
                                {liveLogs.isConnected ? "Canlı Akış Aktif" : "Bağlantı Kesik"}
                            </span>
                        )
                    ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full text-xs border border-border">
                            Geçmiş Kayıt Modu
                        </span>
                    )}
                </div>
            </div>

            {/* Log Rate / Volume Histogram */}
            <LogHistogram
                buckets={statsBuckets}
                isLoading={isStatsLoading}
                onSelectBucket={(b) => {
                    // Zoom into bucket time range
                    setMode("historical");
                }}
            />

            {/* Log Toolbar */}
            <LogToolbar
                mode={mode}
                onModeChange={setMode}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                unit={unit}
                onUnitChange={setUnit}
                availableUnits={availableUnits}
                selectedPriorities={selectedPriorities}
                onTogglePriority={handleTogglePriority}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isPaused={liveLogs.isPaused}
                onTogglePause={liveLogs.togglePause}
                onClear={liveLogs.clear}
                onRefresh={historicalQuery.refetch}
                onExport={handleExport}
                density={density}
                onToggleDensity={() => setDensity((d) => (d === "compact" ? "normal" : "compact"))}
                totalLogs={rawEntries.length}
                filteredLogs={displayEntries.length}
            />

            {/* Virtualized Log Viewer */}
            <LogViewer
                entries={displayEntries}
                isConnected={liveLogs.isConnected}
                isLoading={mode === "historical" && historicalQuery.isLoading}
                error={mode === "live" ? liveLogs.error : historicalQuery.error?.message}
                searchQuery={debouncedSearch}
                density={density}
                isLiveMode={mode === "live"}
                onSelectEntry={setSelectedEntry}
                onRetry={mode === "live" ? () => liveLogs.clear() : () => historicalQuery.refetch()}
            />

            {/* Structured Log Detail Drawer */}
            <LogDetailDrawer
                entry={selectedEntry}
                onClose={() => setSelectedEntry(null)}
                onFilterUnit={(u) => setUnit(u)}
            />
        </div>
    );
}
