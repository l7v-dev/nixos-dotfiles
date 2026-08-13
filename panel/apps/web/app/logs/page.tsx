"use client";

import { useState, useRef, useEffect } from "react";
import { useLogs } from "@/hooks/useLogs";
import { priorityToColor, PRIORITY_LABELS } from "@/lib/priority-color";

export default function LogsPage() {
    const [unit, setUnit] = useState("");
    const [priority, setPriority] = useState<number>(0);
    const [debouncedUnit, setDebouncedUnit] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    // Debounce unit filter to avoid reconnecting on every keystroke.
    useEffect(() => {
        const t = setTimeout(() => setDebouncedUnit(unit), 400);
        return () => clearTimeout(t);
    }, [unit]);

    const { entries, isConnected, error, retryCount } = useLogs(
        debouncedUnit || undefined,
        priority || undefined
    );

    // Auto-scroll to bottom when new entries arrive.
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [entries]);

    return (
        <div className="flex flex-col h-full gap-3">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Logs</h1>
                <div className="flex items-center gap-2">
                    {error ? (
                        <span className="text-xs text-red-500">{error}</span>
                    ) : retryCount > 0 ? (
                        <span className="text-xs text-amber-500">Reconnecting… ({retryCount}/5)</span>
                    ) : (
                        <span className={`flex items-center gap-1 text-xs ${isConnected ? "text-green-600" : "text-muted-foreground"}`}>
                            <span className={`inline-block h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-slate-400"}`} />
                            {isConnected ? "Live" : "Disconnected"}
                        </span>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                <input
                    type="search"
                    placeholder="Filter by unit…"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="rounded border border-input bg-background px-3 py-1.5 text-sm w-48"
                />
                <select
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="rounded border border-input bg-background px-2 py-1.5 text-sm"
                >
                    <option value={0}>All priorities</option>
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((p) => (
                        <option key={p} value={p}>{PRIORITY_LABELS[p]} ({p})+</option>
                    ))}
                </select>
            </div>

            {/* Log viewer */}
            <div className="flex-1 overflow-auto rounded-lg border border-border bg-card font-mono text-xs">
                <div className="p-2 space-y-0.5">
                    {entries.length === 0 && (
                        <p className="text-muted-foreground text-center py-8">
                            {isConnected ? "Waiting for log entries…" : "Not connected"}
                        </p>
                    )}
                    {entries.map((entry, i) => (
                        <div key={i} className="flex gap-2 py-0.5 hover:bg-accent/30 rounded px-1">
                            <span className="text-muted-foreground shrink-0 w-20">
                                {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="text-muted-foreground shrink-0 w-32 truncate">{entry.unit}</span>
                            <span className={`shrink-0 w-12 ${priorityToColor(entry.priority)}`}>
                                {PRIORITY_LABELS[entry.priority] ?? entry.priority}
                            </span>
                            <span className="break-all">{entry.message}</span>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
}
