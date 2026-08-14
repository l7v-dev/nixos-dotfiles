"use client";

import React, { useRef, useEffect, useState } from "react";
import {
    Search,
    Download,
    Trash2,
    Play,
    Pause,
    ArrowDown,
    Filter,
    Terminal as TerminalIcon,
} from "lucide-react";
import { useContainerLogs } from "@/hooks/useContainerLogs";

interface Props {
    containerId: string;
}

export function ContainerLogViewer({ containerId }: Props) {
    const [tail, setTail] = useState("200");
    const [autoScroll, setAutoScroll] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const {
        logs,
        totalLogs,
        filterText,
        setFilterText,
        streamFilter,
        setStreamFilter,
        isPaused,
        setIsPaused,
        isConnected,
        clearLogs,
        downloadLogs,
    } = useContainerLogs(containerId, { tail, timestamps: true });

    // Auto-scroll on new logs
    useEffect(() => {
        if (autoScroll && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    return (
        <div className="flex h-[520px] flex-col rounded-lg border border-border bg-[#0d1117] text-slate-200">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-[#161b22] px-3 py-2 text-xs">
                {/* Left: Filter & Search */}
                <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                        <Search className="absolute left-2 h-3.5 w-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Loglarda ara (regex / kelime)..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className="h-7 w-48 rounded bg-slate-900 pl-7 pr-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-64"
                        />
                    </div>

                    {/* Stream filter */}
                    <div className="flex items-center rounded bg-slate-900 p-0.5 text-[11px]">
                        <button
                            onClick={() => setStreamFilter("all")}
                            className={`rounded px-2 py-0.5 font-medium transition-colors ${
                                streamFilter === "all"
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            Tümü
                        </button>
                        <button
                            onClick={() => setStreamFilter("stdout")}
                            className={`rounded px-2 py-0.5 font-medium transition-colors ${
                                streamFilter === "stdout"
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            stdout
                        </button>
                        <button
                            onClick={() => setStreamFilter("stderr")}
                            className={`rounded px-2 py-0.5 font-medium transition-colors ${
                                streamFilter === "stderr"
                                    ? "bg-red-600 text-white"
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            stderr
                        </button>
                    </div>
                </div>

                {/* Right: Controls & Status */}
                <div className="flex items-center gap-2">
                    {/* Tail selector */}
                    <select
                        value={tail}
                        onChange={(e) => setTail(e.target.value)}
                        className="h-7 rounded bg-slate-900 px-2 text-xs text-slate-300 focus:outline-none"
                    >
                        <option value="50">Son 50 satır</option>
                        <option value="100">Son 100 satır</option>
                        <option value="200">Son 200 satır</option>
                        <option value="500">Son 500 satır</option>
                        <option value="1000">Son 1000 satır</option>
                        <option value="all">Tüm Loglar</option>
                    </select>

                    {/* Auto scroll toggle */}
                    <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        title={autoScroll ? "Otomatik kaydırmayı kapat" : "Otomatik kaydırmayı aç"}
                        className={`flex h-7 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors ${
                            autoScroll
                                ? "bg-slate-800 text-blue-400"
                                : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                        }`}
                    >
                        <ArrowDown className="h-3 w-3" />
                        Oto-Kaydır
                    </button>

                    {/* Pause / Resume */}
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        title={isPaused ? "Akışı Devam Ettir" : "Akışı Duraklat"}
                        className={`flex h-7 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors ${
                            isPaused
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                        }`}
                    >
                        {isPaused ? (
                            <>
                                <Play className="h-3 w-3" /> Devam
                            </>
                        ) : (
                            <>
                                <Pause className="h-3 w-3" /> Duraklat
                            </>
                        )}
                    </button>

                    {/* Download */}
                    <button
                        onClick={downloadLogs}
                        title="Logları İndir (.log)"
                        className="flex h-7 items-center gap-1 rounded bg-slate-900 px-2 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
                    >
                        <Download className="h-3 w-3" />
                    </button>

                    {/* Clear */}
                    <button
                        onClick={clearLogs}
                        title="Ekranı Temizle"
                        className="flex h-7 items-center gap-1 rounded bg-slate-900 px-2 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
            </div>

            {/* Terminal Output Area */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed select-text"
            >
                {logs.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-slate-500">
                        <TerminalIcon className="mb-2 h-6 w-6 opacity-40" />
                        <p>Henüz log kaydı bulunmuyor veya filtrelere uyan log yok.</p>
                        {filterText && (
                            <button
                                onClick={() => setFilterText("")}
                                className="mt-2 text-blue-400 underline hover:text-blue-300"
                            >
                                Arama filtresini temizle
                            </button>
                        )}
                    </div>
                ) : (
                    logs.map((log, index) => {
                        const isErr = log.stream === "stderr";
                        return (
                            <div
                                key={index}
                                className={`flex items-start gap-2 hover:bg-slate-900/60 ${
                                    isErr ? "text-red-400" : "text-slate-300"
                                }`}
                            >
                                {log.timestamp && (
                                    <span className="shrink-0 text-[10px] text-slate-600 select-none">
                                        {new Date(log.timestamp).toLocaleTimeString([], {
                                            hour12: false,
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                        })}
                                    </span>
                                )}
                                <span
                                    className={`shrink-0 rounded px-1 text-[9px] font-semibold uppercase select-none ${
                                        isErr
                                            ? "bg-red-950/80 text-red-400"
                                            : "bg-slate-800 text-slate-400"
                                    }`}
                                >
                                    {log.stream}
                                </span>
                                <span className="flex-1 break-all whitespace-pre-wrap">
                                    {log.message}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Bottom Status Bar */}
            <div className="flex items-center justify-between border-t border-slate-800/80 bg-[#161b22]/70 px-3 py-1 text-[11px] text-slate-400">
                <div className="flex items-center gap-3">
                    <span>Toplam Satır: {totalLogs}</span>
                    {filterText && <span>Filtrelenen: {logs.length}</span>}
                </div>
                <div className="flex items-center gap-1.5">
                    <span
                        className={`h-2 w-2 rounded-full ${
                            isConnected ? "bg-emerald-500" : "bg-red-500"
                        }`}
                    />
                    <span>{isConnected ? "Soket Bağlı" : "Bağlantı Kesildi"}</span>
                </div>
            </div>
        </div>
    );
}
