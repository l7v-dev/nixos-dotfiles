"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";
import type { LogEntry } from "@/types/api";
import { PRIORITY_LABELS, priorityToBadgeClass } from "@/lib/priority-color";
import { renderFormattedLogMessage } from "@/lib/ansi-parser";
import { ArrowDown, AlertCircle, RefreshCw } from "lucide-react";

interface LogViewerProps {
    entries: LogEntry[];
    isConnected?: boolean;
    isLoading?: boolean;
    error?: string | null;
    searchQuery?: string;
    density?: "compact" | "normal";
    isLiveMode?: boolean;
    onSelectEntry?: (entry: LogEntry) => void;
    onRetry?: () => void;
}

export function LogViewer({
    entries,
    isConnected = true,
    isLoading = false,
    error,
    searchQuery = "",
    density = "compact",
    isLiveMode = true,
    onSelectEntry,
    onRetry,
}: LogViewerProps) {
    const listRef = useRef<List>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    const prevLengthRef = useRef(entries.length);

    const rowHeight = density === "compact" ? 28 : 38;

    // Resize observer to fill container
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                setDimensions({
                    width: clientWidth || 800,
                    height: Math.max(clientHeight - 32, 200), // account for header
                });
            }
        };

        updateDimensions();
        const observer = new ResizeObserver(updateDimensions);
        if (containerRef.current) observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    // Auto-scroll when new items arrive in live mode
    useEffect(() => {
        const prevLen = prevLengthRef.current;
        prevLengthRef.current = entries.length;

        if (entries.length > prevLen) {
            const added = entries.length - prevLen;
            if (isAtBottom && isLiveMode) {
                listRef.current?.scrollToItem(entries.length - 1, "end");
            } else if (isLiveMode) {
                setUnreadCount((c) => c + added);
            }
        }
    }, [entries.length, isAtBottom, isLiveMode]);

    const scrollToBottom = useCallback(() => {
        setIsAtBottom(true);
        setUnreadCount(0);
        listRef.current?.scrollToItem(entries.length - 1, "end");
    }, [entries.length]);

    const handleScroll = useCallback(
        ({ scrollOffset }: { scrollOffset: number }) => {
            const maxScroll = Math.max(0, entries.length * rowHeight - dimensions.height);
            // Considered at bottom if within 3 rows of the end
            const atBottom = maxScroll - scrollOffset <= rowHeight * 3;
            setIsAtBottom(atBottom);
            if (atBottom) {
                setUnreadCount(0);
            }
        },
        [entries.length, rowHeight, dimensions.height]
    );

    const itemData = useMemo(() => ({
        entries,
        searchQuery,
        density,
        onSelectEntry,
    }), [entries, searchQuery, density, onSelectEntry]);

    const Row = useCallback(
        ({ index, style, data }: ListChildComponentProps) => {
            const { entries, searchQuery, density, onSelectEntry } = data;
            const entry: LogEntry = entries[index];
            if (!entry) return null;

            const timeStr = new Date(entry.timestamp).toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                fractionalSecondDigits: 3,
            });

            return (
                <div
                    style={style}
                    onClick={() => onSelectEntry?.(entry)}
                    className={`flex items-center gap-2.5 px-3 font-mono text-xs border-b border-border/20 cursor-pointer transition-colors select-text hover:bg-accent/40 ${
                        index % 2 === 0 ? "bg-card/40" : "bg-card/70"
                    }`}
                >
                    {/* Timestamp */}
                    <span className="text-muted-foreground shrink-0 w-24 tabular-nums text-[11px]">
                        {timeStr}
                    </span>

                    {/* Unit */}
                    <span
                        className="text-muted-foreground font-semibold shrink-0 w-36 truncate text-[11px]"
                        title={entry.unit || entry.comm || "system"}
                    >
                        {entry.unit || entry.comm || "—"}
                    </span>

                    {/* Severity Badge */}
                    <span
                        className={`inline-flex items-center justify-center shrink-0 w-14 rounded px-1.5 py-0.2 text-[10px] font-bold border tracking-wider ${priorityToBadgeClass(
                            entry.priority
                        )}`}
                    >
                        {PRIORITY_LABELS[entry.priority] ?? String(entry.priority)}
                    </span>

                    {/* PID */}
                    {entry.pid ? (
                        <span className="text-muted-foreground/70 shrink-0 w-12 text-[10px] tabular-nums truncate">
                            [{entry.pid}]
                        </span>
                    ) : null}

                    {/* Message */}
                    <div className="flex-1 min-w-0 truncate text-foreground text-xs">
                        {renderFormattedLogMessage(entry.message, searchQuery)}
                    </div>
                </div>
            );
        },
        []
    );

    return (
        <div
            ref={containerRef}
            className="relative flex-1 rounded-lg border border-border bg-card overflow-hidden flex flex-col min-h-[300px]"
        >
            {/* Table Column Headers */}
            <div className="flex items-center gap-2.5 px-3 py-2 border-b border-border bg-muted/50 font-mono text-[11px] font-semibold text-muted-foreground shrink-0 select-none">
                <span className="w-24">Zaman</span>
                <span className="w-36">Unit / Servis</span>
                <span className="w-14 text-center">Şiddet</span>
                <span className="w-12">PID</span>
                <span className="flex-1">Log Mesajı</span>
            </div>

            {/* List / States */}
            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground p-6">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-xs">Log kayıtları yükleniyor…</p>
                </div>
            ) : error ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-destructive p-6 text-center">
                    <AlertCircle className="h-8 w-8" />
                    <p className="text-xs font-semibold">{error}</p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                        >
                            Yeniden Dene
                        </button>
                    )}
                </div>
            ) : entries.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground p-6">
                    {isConnected ? (
                        <>
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-xs font-medium text-foreground">Yeni log bekleniyor…</p>
                            <p className="text-[11px] text-muted-foreground">Filtre kriterlerine uygun log bulunamadı veya henüz üretilmedi.</p>
                        </>
                    ) : (
                        <p className="text-xs">Bağlantı kesildi</p>
                    )}
                </div>
            ) : (
                <List
                    ref={listRef}
                    height={dimensions.height}
                    width={dimensions.width}
                    itemCount={entries.length}
                    itemSize={rowHeight}
                    itemData={itemData}
                    onScroll={handleScroll}
                    className="virtual-log-list"
                >
                    {Row}
                </List>
            )}

            {/* Floating New Logs Indicator */}
            {unreadCount > 0 && isLiveMode && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                    <button
                        onClick={scrollToBottom}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all animate-bounce"
                    >
                        <ArrowDown className="h-3.5 w-3.5" />
                        <span>{unreadCount} yeni log</span>
                    </button>
                </div>
            )}
        </div>
    );
}
