"use client";

import React, { useState } from "react";
import type { LogEntry } from "@/types/api";
import { priorityToBadgeClass, PRIORITY_FULL_LABELS } from "@/lib/priority-color";
import {
    X,
    Copy,
    Check,
    Filter,
    Clock,
    Server,
    Cpu,
    Shield,
    FileText,
    Code,
} from "lucide-react";

interface LogDetailDrawerProps {
    entry: LogEntry | null;
    onClose: () => void;
    onFilterUnit?: (unit: string) => void;
}

export function LogDetailDrawer({ entry, onClose, onFilterUnit }: LogDetailDrawerProps) {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    if (!entry) return null;

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const formattedTime = new Date(entry.timestamp).toLocaleString("tr-TR", {
        dateStyle: "medium",
        timeStyle: "medium",
    });

    const isoTime = new Date(entry.timestamp).toISOString();

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-xl bg-card border-l border-border shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30">
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${priorityToBadgeClass(entry.priority)}`}>
                            {PRIORITY_FULL_LABELS[entry.priority] ?? `Priority ${entry.priority}`}
                        </span>
                        <h2 className="text-sm font-semibold text-foreground truncate max-w-[280px]">
                            {entry.unit || entry.comm || "Sistem Logu"}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                    {/* Log Message */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" /> Log Mesajı
                            </span>
                            <button
                                onClick={() => copyToClipboard(entry.message, "message")}
                                className="inline-flex items-center gap-1 text-[11px] hover:text-foreground transition-colors"
                            >
                                {copiedKey === "message" ? (
                                    <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                    <Copy className="h-3 w-3" />
                                )}
                                {copiedKey === "message" ? "Kopyalandı" : "Kopyala"}
                            </button>
                        </div>
                        <div className="rounded-md border border-border bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap break-all select-text">
                            {entry.message}
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="space-y-2">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Server className="h-3.5 w-3.5" /> Temel Metadata
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                            {/* Timestamp */}
                            <div className="rounded-md border border-border/70 bg-background/60 p-2 space-y-1">
                                <span className="text-muted-foreground text-[10px] uppercase font-semibold flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Zaman Damgası
                                </span>
                                <p className="font-mono text-foreground">{formattedTime}</p>
                                <p className="text-muted-foreground text-[10px] font-mono">{isoTime}</p>
                            </div>

                            {/* Unit / Service */}
                            <div className="rounded-md border border-border/70 bg-background/60 p-2 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-[10px] uppercase font-semibold flex items-center gap-1">
                                        <Shield className="h-3 w-3" /> Systemd Unit
                                    </span>
                                    {entry.unit && onFilterUnit && (
                                        <button
                                            onClick={() => {
                                                onFilterUnit(entry.unit);
                                                onClose();
                                            }}
                                            title="Bu unit'e göre filtrele"
                                            className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                                        >
                                            <Filter className="h-2.5 w-2.5" /> Filtrele
                                        </button>
                                    )}
                                </div>
                                <p className="font-mono text-foreground truncate">{entry.unit || "—"}</p>
                            </div>

                            {/* Process Info */}
                            <div className="rounded-md border border-border/70 bg-background/60 p-2 space-y-1">
                                <span className="text-muted-foreground text-[10px] uppercase font-semibold flex items-center gap-1">
                                    <Cpu className="h-3 w-3" /> Süreç (Process)
                                </span>
                                <p className="font-mono text-foreground">
                                    {entry.comm || "—"} {entry.pid ? `(PID: ${entry.pid})` : ""}
                                </p>
                            </div>

                            {/* Hostname & Transport */}
                            <div className="rounded-md border border-border/70 bg-background/60 p-2 space-y-1">
                                <span className="text-muted-foreground text-[10px] uppercase font-semibold">
                                    Host / Transport
                                </span>
                                <p className="font-mono text-foreground">
                                    {entry.hostname || "local"} / {entry.transport || "journal"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* All Journal Fields */}
                    {entry.fields && Object.keys(entry.fields).length > 0 && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span className="font-semibold text-foreground flex items-center gap-1.5">
                                    <Code className="h-3.5 w-3.5" /> Tüm Journald Alanları ({Object.keys(entry.fields).length})
                                </span>
                                <button
                                    onClick={() => copyToClipboard(JSON.stringify(entry.fields, null, 2), "fields")}
                                    className="inline-flex items-center gap-1 text-[11px] hover:text-foreground transition-colors"
                                >
                                    {copiedKey === "fields" ? (
                                        <Check className="h-3 w-3 text-emerald-400" />
                                    ) : (
                                        <Copy className="h-3 w-3" />
                                    )}
                                    {copiedKey === "fields" ? "JSON Kopyalandı" : "JSON Kopyala"}
                                </button>
                            </div>
                            <div className="rounded-md border border-border bg-muted/40 p-2 font-mono text-[11px] max-h-56 overflow-y-auto space-y-1">
                                {Object.entries(entry.fields).map(([k, v]) => (
                                    <div key={k} className="flex gap-2 py-0.5 border-b border-border/30 last:border-0">
                                        <span className="text-muted-foreground font-semibold shrink-0 select-text">{k}:</span>
                                        <span className="text-foreground break-all select-text">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Raw JSON Record */}
                    <div className="space-y-1.5 pt-2">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">Ham JSON Kaydı</span>
                            <button
                                onClick={() => copyToClipboard(JSON.stringify(entry, null, 2), "raw-json")}
                                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {copiedKey === "raw-json" ? (
                                    <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                    <Copy className="h-3 w-3" />
                                )}
                                {copiedKey === "raw-json" ? "Kopyalandı" : "Tümünü Kopyala"}
                            </button>
                        </div>
                        <pre className="rounded-md border border-border bg-muted/60 p-3 font-mono text-[10px] overflow-x-auto select-text text-muted-foreground">
                            {JSON.stringify(entry, null, 2)}
                        </pre>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-border p-3 bg-muted/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-md border border-border px-4 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
}
