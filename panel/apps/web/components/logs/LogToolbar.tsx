"use client";

import React, { useState } from "react";
import {
    Search,
    Play,
    Pause,
    Trash2,
    Download,
    RefreshCw,
    SlidersHorizontal,
    X,
    Filter,
} from "lucide-react";
import type { TimeRangePreset } from "@/types/api";

interface LogToolbarProps {
    mode: "live" | "historical";
    onModeChange: (mode: "live" | "historical") => void;
    timeRange: TimeRangePreset;
    onTimeRangeChange: (range: TimeRangePreset) => void;
    unit: string;
    onUnitChange: (unit: string) => void;
    availableUnits: string[];
    selectedPriorities: number[];
    onTogglePriority: (priority: number) => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
    isPaused: boolean;
    onTogglePause: () => void;
    onClear: () => void;
    onRefresh?: () => void;
    onExport: (format: "json" | "csv" | "ndjson" | "raw") => void;
    density: "compact" | "normal";
    onToggleDensity: () => void;
    totalLogs: number;
    filteredLogs: number;
}

const SEVERITY_GROUPS = [
    { label: "Critical", priorities: [0, 1, 2], badge: "bg-destructive/15 text-destructive border-destructive/30", color: "text-destructive" },
    { label: "Error", priorities: [3], badge: "bg-destructive/15 text-destructive border-destructive/30", color: "text-destructive" },
    { label: "Warning", priorities: [4], badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", color: "text-amber-600 dark:text-amber-400" },
    { label: "Info", priorities: [5, 6], badge: "bg-muted/80 text-foreground border-border/80", color: "text-foreground" },
    { label: "Debug", priorities: [7], badge: "bg-muted/50 text-muted-foreground border-border/50", color: "text-muted-foreground" },
];

export function LogToolbar({
    mode,
    onModeChange,
    timeRange,
    onTimeRangeChange,
    unit,
    onUnitChange,
    availableUnits,
    selectedPriorities,
    onTogglePriority,
    searchQuery,
    onSearchChange,
    isPaused,
    onTogglePause,
    onClear,
    onRefresh,
    onExport,
    density,
    onToggleDensity,
    totalLogs,
    filteredLogs,
}: LogToolbarProps) {
    const [exportOpen, setExportOpen] = useState(false);

    const isGroupActive = (groupPriorities: number[]) => {
        return groupPriorities.some((p) => selectedPriorities.includes(p));
    };

    const handleGroupToggle = (groupPriorities: number[]) => {
        groupPriorities.forEach((p) => onTogglePriority(p));
    };

    return (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card/90 backdrop-blur p-2.5">
            {/* Top row: Mode Tabs, Time Range, Unit filter, Search */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Live vs Historical Mode Toggle */}
                <div className="inline-flex rounded-md bg-muted/60 p-0.5 border border-border/50">
                    <button
                        onClick={() => {
                            onModeChange("live");
                            onTimeRangeChange("live");
                        }}
                        className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all ${
                            mode === "live"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Canlı Akış
                    </button>
                    <button
                        onClick={() => {
                            onModeChange("historical");
                            if (timeRange === "live") onTimeRangeChange("1h");
                        }}
                        className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all ${
                            mode === "historical"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Geçmiş Sorgu
                    </button>
                </div>

                {/* Time Range Selector (enabled in historical mode) */}
                {mode === "historical" && (
                    <select
                        value={timeRange}
                        onChange={(e) => onTimeRangeChange(e.target.value as TimeRangePreset)}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                        <option value="5m">Son 5 Dakika</option>
                        <option value="15m">Son 15 Dakika</option>
                        <option value="1h">Son 1 Saat</option>
                        <option value="6h">Son 6 Saat</option>
                        <option value="24h">Son 24 Saat</option>
                        <option value="7d">Son 7 Gün</option>
                    </select>
                )}

                {/* Unit / Service Selector */}
                <div className="relative">
                    <select
                        value={unit}
                        onChange={(e) => onUnitChange(e.target.value)}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs max-w-[180px] truncate focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                        <option value="">Tüm Servisler / Unitler</option>
                        {availableUnits.map((u) => (
                            <option key={u} value={u}>
                                {u}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Search box */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Log mesajı veya anahtar kelime ara…"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full rounded-md border border-border bg-background py-1 pl-8 pr-7 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>

                {/* Live controls: Pause, Clear, Refresh */}
                <div className="flex items-center gap-1 ml-auto">
                    {mode === "live" ? (
                        <button
                            onClick={onTogglePause}
                            title={isPaused ? "Akışı Başlat" : "Akışı Duraklat"}
                            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                                isPaused
                                    ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                                    : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                            }`}
                        >
                            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                            {isPaused ? "Devam Et" : "Duraklat"}
                        </button>
                    ) : (
                        onRefresh && (
                            <button
                                onClick={onRefresh}
                                title="Yenile"
                                className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                                <RefreshCw className="h-3 w-3" />
                                Yenile
                            </button>
                        )
                    )}

                    <button
                        onClick={onClear}
                        title="Ekranı Temizle"
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive transition-colors"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>

                    {/* Export Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setExportOpen((o) => !o)}
                            title="Dışa Aktar"
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                            <Download className="h-3 w-3" />
                            Dışa Aktar
                        </button>

                        {exportOpen && (
                            <div className="absolute right-0 top-full mt-1 w-36 rounded-md border border-border bg-popover p-1 shadow-lg z-50 text-xs">
                                <button
                                    onClick={() => {
                                        onExport("json");
                                        setExportOpen(false);
                                    }}
                                    className="w-full text-left px-2 py-1.5 rounded hover:bg-accent transition-colors"
                                >
                                    JSON (.json)
                                </button>
                                <button
                                    onClick={() => {
                                        onExport("csv");
                                        setExportOpen(false);
                                    }}
                                    className="w-full text-left px-2 py-1.5 rounded hover:bg-accent transition-colors"
                                >
                                    CSV (.csv)
                                </button>
                                <button
                                    onClick={() => {
                                        onExport("ndjson");
                                        setExportOpen(false);
                                    }}
                                    className="w-full text-left px-2 py-1.5 rounded hover:bg-accent transition-colors"
                                >
                                    NDJSON (.ndjson)
                                </button>
                                <button
                                    onClick={() => {
                                        onExport("raw");
                                        setExportOpen(false);
                                    }}
                                    className="w-full text-left px-2 py-1.5 rounded hover:bg-accent transition-colors"
                                >
                                    Raw Log (.log)
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Density Toggle */}
                    <button
                        onClick={onToggleDensity}
                        title={`Görünüm Yoğunluğu: ${density === "compact" ? "Kompakt" : "Normal"}`}
                        className={`rounded-md border p-1 text-xs transition-colors ${
                            density === "compact"
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:bg-accent"
                        }`}
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Bottom row: Severity Multi-Select Pills & Log Counts */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2 text-xs">
                <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mr-1">
                        <Filter className="h-3 w-3" /> Şiddet:
                    </span>
                    {SEVERITY_GROUPS.map((group) => {
                        const active = isGroupActive(group.priorities);
                        return (
                            <button
                                key={group.label}
                                onClick={() => handleGroupToggle(group.priorities)}
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-all ${
                                    active
                                        ? group.badge
                                        : "border-border/40 bg-background/50 text-muted-foreground hover:border-border hover:text-foreground"
                                }`}
                            >
                                {group.label}
                            </button>
                        );
                    })}
                </div>

                <div className="text-[11px] text-muted-foreground tabular-nums">
                    Gösterilen: <span className="font-semibold text-foreground">{filteredLogs}</span> / {totalLogs}
                </div>
            </div>
        </div>
    );
}
