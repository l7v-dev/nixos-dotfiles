"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    X,
    Terminal,
    Sparkles,
    Play,
    Square,
    RotateCcw,
    Copy,
    Check,
    Clock,
    AlertCircle,
    CheckCircle2,
    Sliders,
    Cpu,
    Trash2,
} from "lucide-react";
import {
    useRebuildAction,
    useCancelRebuildJob,
    useRebuildJobs,
} from "@/hooks/useNixOS";
import { useRebuildStream } from "@/hooks/useRebuildStream";
import type { RebuildAction } from "@/types/api";

interface Props {
    open: boolean;
    onClose: () => void;
}

export function RebuildConsoleModal({ open, onClose }: Props) {
    const [action, setAction] = useState<RebuildAction>("switch");
    const [maxJobs, setMaxJobs] = useState(3);
    const [cores, setCores] = useState(3);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const rebuildMutation = useRebuildAction();
    const cancelMutation = useCancelRebuildJob();
    const { data: jobsData } = useRebuildJobs();

    const { lines, isConnected, status: streamStatus, clear: clearStream } = useRebuildStream(
        activeJobId,
        open && activeJobId !== null
    );

    const terminalRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of terminal when new lines arrive
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [lines]);

    // Check if there is a running job on open
    useEffect(() => {
        if (open && !activeJobId && jobsData?.jobs) {
            const runningJob = jobsData.jobs.find((j) => j.status === "running");
            if (runningJob) {
                setActiveJobId(runningJob.id);
            }
        }
    }, [open, activeJobId, jobsData]);

    if (!open) return null;

    const isRunning = streamStatus?.status === "running" || rebuildMutation.isPending;

    const handleStartRebuild = () => {
        clearStream();
        rebuildMutation.mutate(
            {
                action,
                max_jobs: maxJobs,
                cores: cores,
            },
            {
                onSuccess: (job) => {
                    setActiveJobId(job.id);
                },
            }
        );
    };

    const handleCancel = () => {
        if (!activeJobId) return;
        cancelMutation.mutate(activeJobId);
    };

    const handleCopyLogs = () => {
        navigator.clipboard.writeText(lines.join("\n"));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getStatusBadge = () => {
        const s = streamStatus?.status || (isRunning ? "running" : "idle");
        switch (s) {
            case "running":
                return (
                    <span className="flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/30 animate-pulse">
                        <span className="h-2 w-2 rounded-full bg-cyan-400" />
                        Derleniyor…
                    </span>
                );
            case "completed":
                return (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Başarıyla Tamamlandı
                    </span>
                );
            case "failed":
                return (
                    <span className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive border border-destructive/30">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Hata (Exit: {streamStatus?.exit_code ?? 1})
                    </span>
                );
            case "cancelled":
                return (
                    <span className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-400 border border-orange-500/30">
                        <Square className="h-3 w-3" />
                        İptal Edildi
                    </span>
                );
            default:
                return (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        Hazır
                    </span>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* ── Header ── */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <Terminal className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-semibold">NixOS Canlı Rebuild Konsolu</h2>
                                {getStatusBadge()}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Sistem derleme ve canlı SSE terminal akışı (`nh os switch` / `nixos-rebuild`)
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* ── Action & Config Toolbar ── */}
                <div className="border-b border-border/80 bg-background/50 px-6 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Mode selectors */}
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-semibold text-muted-foreground mr-1">Mod:</span>
                            {[
                                { id: "switch", label: "Switch (Devreye Al)", desc: "nh os switch" },
                                { id: "boot", label: "Boot", desc: "nh os boot" },
                                { id: "test", label: "Test", desc: "nixos-rebuild test" },
                                { id: "dry-activate", label: "Dry Run", desc: "dry-activate" },
                                { id: "update", label: "Flake Update & Rebuild", desc: "update.sh" },
                            ].map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setAction(m.id as RebuildAction)}
                                    disabled={isRunning}
                                    className={`rounded-lg px-2.5 py-1.5 font-medium transition-all disabled:opacity-50 ${
                                        action === m.id
                                            ? "bg-primary text-primary-foreground shadow-xs"
                                            : "border border-border/60 bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                                    }`}
                                    title={m.desc}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        {/* Cores & Jobs controls */}
                        <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1.5">
                                <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">Jobs:</span>
                                <select
                                    value={maxJobs}
                                    onChange={(e) => setMaxJobs(parseInt(e.target.value, 10))}
                                    disabled={isRunning}
                                    className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    {[1, 2, 3, 4, 6, 8].map((n) => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">Cores:</span>
                                <select
                                    value={cores}
                                    onChange={(e) => setCores(parseInt(e.target.value, 10))}
                                    disabled={isRunning}
                                    className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    {[1, 2, 3, 4, 6, 8].map((n) => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Start / Cancel Action Button */}
                            {isRunning ? (
                                <button
                                    onClick={handleCancel}
                                    disabled={cancelMutation.isPending}
                                    className="flex items-center gap-1.5 rounded-lg bg-destructive px-3.5 py-1.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors"
                                >
                                    <Square className="h-3.5 w-3.5" />
                                    İptal Et
                                </button>
                            ) : (
                                <button
                                    onClick={handleStartRebuild}
                                    disabled={rebuildMutation.isPending}
                                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                                >
                                    <Play className="h-3.5 w-3.5 fill-current" />
                                    Derlemeyi Başlat
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Terminal Console ── */}
                <div className="relative flex-1 bg-black/90 p-4 font-mono text-xs overflow-hidden flex flex-col">
                    {/* Terminal controls overlay */}
                    <div className="flex items-center justify-between pb-2 border-b border-border/30 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                            <span>stdout / stderr canlı akış</span>
                            {streamStatus?.duration_ms ? (
                                <span className="text-muted-foreground/70">
                                    · {(streamStatus.duration_ms / 1000).toFixed(1)} sn
                                </span>
                            ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopyLogs}
                                disabled={lines.length === 0}
                                className="flex items-center gap-1 rounded bg-white/5 px-2 py-1 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors disabled:opacity-30"
                            >
                                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                {copied ? "Kopyalandı" : "Kopyala"}
                            </button>
                            <button
                                onClick={clearStream}
                                disabled={lines.length === 0}
                                className="flex items-center gap-1 rounded bg-white/5 px-2 py-1 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors disabled:opacity-30"
                            >
                                <Trash2 className="h-3 w-3" />
                                Temizle
                            </button>
                        </div>
                    </div>

                    {/* Console Output Area */}
                    <div
                        ref={terminalRef}
                        className="flex-1 overflow-y-auto pt-3 space-y-1 select-text scrollbar-thin scrollbar-thumb-white/10"
                    >
                        {lines.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-center text-muted-foreground/60 text-xs">
                                <div>
                                    <Sparkles className="mx-auto mb-2 h-6 w-6 text-muted-foreground/30" />
                                    <p>Henüz bir derleme işlemi başlatılmadı.</p>
                                    <p className="text-[11px] text-muted-foreground/40 mt-0.5">
                                        Yukarıdaki menüden modu seçip &quot;Derlemeyi Başlat&quot; butonuna tıklayın.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            lines.map((line, idx) => {
                                let colorClass = "text-slate-300";
                                if (line.includes("[ERROR]") || line.includes("error:")) {
                                    colorClass = "text-red-400 font-semibold";
                                } else if (line.includes("[SUCCESS]") || line.includes("success:")) {
                                    colorClass = "text-emerald-400 font-semibold";
                                } else if (line.includes("[INFO]") || line.includes("evaluating") || line.includes("building")) {
                                    colorClass = "text-cyan-400";
                                } else if (line.includes("[WARN]") || line.includes("warning:")) {
                                    colorClass = "text-amber-400";
                                }

                                return (
                                    <div key={idx} className={`leading-relaxed whitespace-pre-wrap break-all ${colorClass}`}>
                                        {line}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between border-t border-border px-6 py-3 text-xs text-muted-foreground bg-background/50">
                    <span className="font-mono">
                        {activeJobId ? `Job ID: ${activeJobId}` : "Hazır"}
                    </span>
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-border bg-background px-4 py-1.5 font-medium text-foreground hover:bg-muted transition-colors"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
}
