"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Trash2, Copy, Check, Search, AlertCircle } from "lucide-react";
import { useHostStore } from "@/store/host-store";
import type { Application } from "@/types/apps";

interface LogEntry {
    timestamp: string;
    unit: string;
    priority: number;
    message: string;
    pid?: number;
}

interface AppLogViewerProps {
    app: Application;
}

export function AppLogViewer({ app }: AppLogViewerProps) {
    const host = useHostStore((s) => s.selectedHost);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [connected, setConnected] = useState(false);
    const [paused, setPaused] = useState(false);
    const [search, setSearch] = useState("");
    const [copied, setCopied] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!app.systemd_unit) return;

        setLogs([]);
        setConnected(false);

        const url = `/api/agent/${encodeURIComponent(host)}/api/v1/apps/${encodeURIComponent(app.id)}/logs?backlog=150`;
        const es = new EventSource(url);

        es.onopen = () => {
            setConnected(true);
        };

        es.onmessage = (e) => {
            if (paused) return;
            try {
                const entry: LogEntry = JSON.parse(e.data);
                setLogs((prev) => {
                    const next = [...prev, entry];
                    if (next.length > 500) return next.slice(next.length - 500);
                    return next;
                });
            } catch {
                // Ignore raw strings / heartbeat
            }
        };

        es.onerror = () => {
            setConnected(false);
        };

        return () => {
            es.close();
        };
    }, [app.id, app.systemd_unit, host, paused]);

    useEffect(() => {
        if (!paused && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, paused]);

    const handleCopy = () => {
        const text = logs.map((l) => `[${l.timestamp}] ${l.message}`).join("\n");
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!app.systemd_unit) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2 text-muted-foreground/60" />
                <p className="text-sm font-medium">Bağlı Systemd Birimi Yok</p>
                <p className="mt-1 text-xs max-w-sm">
                    Bu uygulama statik bir ikili dosya veya CLI aracıdır. Doğrudan terminal üzerinden çıktı üretir.
                </p>
            </div>
        );
    }

    const filteredLogs = search
        ? logs.filter((l) => l.message.toLowerCase().includes(search.toLowerCase()))
        : logs;

    const getPriorityCls = (priority: number) => {
        if (priority <= 3) return "text-destructive font-medium"; // Error / Crit / Alert
        if (priority === 4) return "text-amber-400"; // Warning
        if (priority <= 6) return "text-foreground/90"; // Info / Notice
        return "text-muted-foreground/70 font-light"; // Debug
    };

    return (
        <div className="flex flex-col h-full space-y-2">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-[11px] font-mono">
                        <span
                            className={`h-2 w-2 rounded-full ${
                                connected ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/40"
                            }`}
                        />
                        {connected ? "Canlı Akış" : "Bağlantı Kuruluyor..."}
                    </span>

                    {/* Search */}
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Loglarda ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-md border border-border bg-card py-1 pl-7 pr-2 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setPaused(!paused)}
                        title={paused ? "Akışı Devam Ettir" : "Akışı Duraklat"}
                        className="flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                        <span>{paused ? "Devam Et" : "Durdur"}</span>
                    </button>
                    <button
                        onClick={handleCopy}
                        title="Tüm Logları Kopyala"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                    <button
                        onClick={() => setLogs([])}
                        title="Ekranı Temizle"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
            </div>

            {/* Terminal Window */}
            <div
                ref={containerRef}
                className="flex-1 min-h-[300px] max-h-[480px] overflow-y-auto rounded-lg border border-border/80 bg-black/90 p-3 font-mono text-[11px] leading-relaxed shadow-inner"
            >
                {filteredLogs.map((log, i) => (
                    <div key={i} className="flex gap-2 py-0.5 hover:bg-white/5 transition-colors">
                        <span className="text-muted-foreground/40 shrink-0 select-none">
                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "—"}
                        </span>
                        <span className={`break-all ${getPriorityCls(log.priority)}`}>
                            {log.message}
                        </span>
                    </div>
                ))}

                {filteredLogs.length === 0 && (
                    <p className="text-muted-foreground/50 py-8 text-center text-xs">
                        {connected ? "Henüz yeni bir log girdisi yok..." : "Log servisine bağlanıyor..."}
                    </p>
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
