"use client";

import { useState, useRef, useEffect, useDeferredValue } from "react";
import { useLogs } from "@/hooks/useLogs";
import { priorityToColor, PRIORITY_LABELS } from "@/lib/priority-color";
import { Search, Trash2 } from "lucide-react";

export default function LogsPage() {
    const [unit, setUnit] = useState("");
    const [priority, setPriority] = useState<number>(0);
    const [search, setSearch] = useState("");
    const [paused, setPaused] = useState(false);
    const [debouncedUnit, setDebouncedUnit] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    const deferredSearch = useDeferredValue(search);

    // Debounce unit filter to avoid reconnecting on every keystroke.
    useEffect(() => {
        const t = setTimeout(() => setDebouncedUnit(unit), 400);
        return () => clearTimeout(t);
    }, [unit]);

    const { entries, isConnected, error, retryCount, clear } = useLogs(
        debouncedUnit || undefined,
        // Send priority only when a real filter is selected (0 = all).
        priority > 0 ? priority : undefined
    );

    // Auto-scroll to bottom unless paused.
    useEffect(() => {
        if (!paused) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [entries, paused]);

    // Client-side message text filter (runs after SSE filter).
    const q = deferredSearch.toLowerCase();
    const visible = q
        ? entries.filter(
            (e) =>
                e.message.toLowerCase().includes(q) ||
                e.unit.toLowerCase().includes(q)
        )
        : entries;

    return (
        <div className="flex flex-col h-full gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold">Loglar</h1>
                    <p className="mt-0.5 text-xs text-muted-foreground">systemd journal akışı</p>
                </div>
                <div className="flex items-center gap-2">
                    {error ? (
                        <span className="text-xs text-destructive">{error}</span>
                    ) : retryCount > 0 ? (
                        <span className="text-xs text-amber-500">
                            Yeniden bağlanıyor… ({retryCount}/5)
                        </span>
                    ) : (
                        <span className={`flex items-center gap-1 text-xs ${isConnected ? "text-green-600" : "text-muted-foreground"}`}>
                            <span className={`inline-block h-2 w-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
                            {isConnected ? "Canlı" : "Bağlantı kesik"}
                        </span>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                {/* Unit filter (reconnects) */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder="Unit filtrele…"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-sm w-44 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>

                {/* Priority filter (reconnects) */}
                <select
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                    <option value={0}>Tüm öncelikler</option>
                    {[3, 4, 5, 6, 7].map((p) => (
                        <option key={p} value={p}>
                            {PRIORITY_LABELS[p]} ve üstü
                        </option>
                    ))}
                </select>

                {/* Message text search (client-side, no reconnect) */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder="Mesaj ara…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-sm w-44 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>

                {/* Pause / Resume */}
                <button
                    onClick={() => setPaused((v) => !v)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${paused
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-accent"
                        }`}
                >
                    {paused ? "▶ Devam" : "⏸ Duraklat"}
                </button>

                {/* Clear buffer */}
                <button
                    onClick={clear}
                    className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-destructive/50 hover:text-destructive transition-colors"
                >
                    <Trash2 className="h-3 w-3" />
                    Temizle
                </button>

                {/* Entry count */}
                <span className="ml-auto self-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {visible.length}{entries.length !== visible.length && `/${entries.length}`}
                </span>
            </div>

            {/* Log viewer */}
            <div className="flex-1 overflow-auto rounded-lg border border-border bg-card font-mono text-xs">
                <div className="p-2 space-y-0.5">
                    {visible.length === 0 && (
                        <p className="text-muted-foreground text-center py-8">
                            {isConnected ? "Log bekleniyor…" : "Bağlı değil"}
                        </p>
                    )}
                    {visible.map((entry, i) => (
                        <div
                            key={i}
                            className="flex gap-2 py-0.5 hover:bg-accent/30 rounded px-1"
                        >
                            <span className="text-muted-foreground shrink-0 w-20 tabular-nums">
                                {new Date(entry.timestamp).toLocaleTimeString("tr-TR")}
                            </span>
                            <span className="text-muted-foreground shrink-0 w-36 truncate" title={entry.unit}>
                                {entry.unit || "—"}
                            </span>
                            <span className={`shrink-0 w-14 font-medium ${priorityToColor(entry.priority)}`}>
                                {PRIORITY_LABELS[entry.priority] ?? String(entry.priority)}
                            </span>
                            <span className="break-all min-w-0">{entry.message}</span>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
}
