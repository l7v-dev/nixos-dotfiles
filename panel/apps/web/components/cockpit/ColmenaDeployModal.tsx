"use client";

import React, { useState, useRef, useEffect } from "react";
import { useColmenaDeploy, useCancelColmenaJob } from "@/hooks/useFleet";
import { useColmenaStream } from "@/hooks/useColmenaStream";
import type { ColmenaDeployAction } from "@/types/api";
import {
    X,
    Terminal as TerminalIcon,
    Play,
    Square,
    Trash2,
    CheckCircle2,
    XCircle,
    Loader2,
    ShieldAlert,
    Rocket,
} from "lucide-react";

interface ColmenaDeployModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const TARGET_PRESETS = [
    { id: "@production", label: "Üretim Filosu (@production)", desc: "server.l7v.dev ve kritik üretim servisleri" },
    { id: "all", label: "Tüm Filo (All Nodes)", desc: "server, builder ve backup düğümlerinin tamamı" },
    { id: "server", label: "Core Server (server)", desc: "Web, DB, Matrix ve Forgejo" },
    { id: "builder", label: "CI Builder (builder)", desc: "Buildkite agent ve ikili önbellek" },
    { id: "backup", label: "Backup Node (backup)", desc: "Restic ve ZFS yedek depolama" },
];

export function ColmenaDeployModal({ open, onOpenChange }: ColmenaDeployModalProps) {
    const [target, setTarget] = useState<string>("@production");
    const [action, setAction] = useState<ColmenaDeployAction>("apply");
    const [buildOnTarget, setBuildOnTarget] = useState<boolean>(false);
    const [verbose, setVerbose] = useState<boolean>(false);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [autoScroll, setAutoScroll] = useState<boolean>(true);

    const deployMutation = useColmenaDeploy();
    const cancelMutation = useCancelColmenaJob();

    const {
        lines,
        status: streamStatus,
        clear: clearLogs,
    } = useColmenaStream(activeJobId, open);

    const terminalEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll when new log lines arrive
    useEffect(() => {
        if (autoScroll && terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [lines, autoScroll]);

    if (!open) return null;

    const handleStartDeploy = async () => {
        clearLogs();
        try {
            const job = await deployMutation.mutateAsync({
                target,
                action,
                build_on_target: buildOnTarget,
                verbose,
            });
            setActiveJobId(job.id);
        } catch {
            // Error is handled in hook
        }
    };

    const handleCancelDeploy = async () => {
        if (!activeJobId) return;
        try {
            await cancelMutation.mutateAsync(activeJobId);
        } catch {
            // Error handled
        }
    };

    const isRunning = streamStatus?.status === "running" || deployMutation.isPending;

    const getStatusBadge = () => {
        if (deployMutation.isPending) {
            return (
                <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs text-primary font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Başlatılıyor...
                </span>
            );
        }
        if (!streamStatus) {
            return (
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                    Hazır
                </span>
            );
        }
        switch (streamStatus.status) {
            case "running":
                return (
                    <span className="flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-400 font-medium">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Dağıtılıyor...
                    </span>
                );
            case "completed":
                return (
                    <span className="flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Başarılı (0)
                    </span>
                );
            case "failed":
                return (
                    <span className="flex items-center gap-1 rounded-full border border-rose-500/50 bg-rose-500/10 px-2.5 py-0.5 text-xs text-rose-400 font-medium">
                        <XCircle className="w-3 h-3" />
                        Hata ({streamStatus.exit_code})
                    </span>
                );
            case "cancelled":
                return (
                    <span className="flex items-center gap-1 rounded-full border border-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                        <ShieldAlert className="w-3 h-3" />
                        İptal Edildi
                    </span>
                );
            default:
                return <span className="rounded-full border px-2.5 py-0.5 text-xs">{streamStatus.status}</span>;
        }
    };

    const formatLogLine = (line: string) => {
        if (line.includes("[ERROR]") || line.includes("error:")) {
            return <span className="text-rose-400 font-semibold">{line}</span>;
        }
        if (line.includes("[SUCCESS]") || line.includes("success:")) {
            return <span className="text-emerald-400 font-semibold">{line}</span>;
        }
        if (line.includes("[WARN]") || line.includes("warning:")) {
            return <span className="text-amber-400">{line}</span>;
        }
        if (line.includes("[INFO]") || line.includes("evaluating") || line.includes("pushing")) {
            return <span className="text-sky-400">{line}</span>;
        }
        if (line.startsWith(">>>") || line.startsWith("===")) {
            return <span className="text-primary font-bold">{line}</span>;
        }
        return <span className="text-foreground/90">{line}</span>;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="flex h-full max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* ── Header ── */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Rocket className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold">Colmena Filo Dağıtım Konsolu</h2>
                            <p className="text-xs text-muted-foreground">
                                NixOS sunucu filosuna (server, builder, backup) tek tıkla bildirimsel deployment
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {getStatusBadge()}
                        <button
                            onClick={() => onOpenChange(false)}
                            aria-label="Kapat"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* ── Configuration Controls ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 border-b border-border/60 bg-muted/10">
                    {/* Target Selection */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Hedef Sunucu / Grup
                        </label>
                        <select
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            disabled={isRunning}
                            className="h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium focus:ring-1 focus:ring-primary text-foreground"
                        >
                            {TARGET_PRESETS.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Action Selection */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Dağıtım Eylemi
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {(["apply", "build", "test"] as ColmenaDeployAction[]).map((a) => (
                                <button
                                    key={a}
                                    type="button"
                                    disabled={isRunning}
                                    onClick={() => setAction(a)}
                                    className={`h-9 rounded-lg text-xs font-semibold uppercase transition-colors ${
                                        action === a
                                            ? "bg-primary text-primary-foreground"
                                            : "border border-border bg-background text-muted-foreground hover:bg-muted"
                                    }`}
                                >
                                    {a}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Action buttons bar ── */}
                <div className="flex items-center justify-between gap-3 px-6 py-2.5 border-b border-border/60 bg-muted/5">
                    <div className="flex items-center gap-4 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                            <input
                                type="checkbox"
                                checked={buildOnTarget}
                                onChange={(e) => setBuildOnTarget(e.target.checked)}
                                disabled={isRunning}
                                className="rounded border-border bg-background text-primary"
                            />
                            Hedefte Derle (--build-on-target)
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                            <input
                                type="checkbox"
                                checked={verbose}
                                onChange={(e) => setVerbose(e.target.checked)}
                                disabled={isRunning}
                                className="rounded border-border bg-background text-primary"
                            />
                            Detaylı Çıktı (--verbose)
                        </label>
                    </div>

                    <div className="flex items-center gap-2">
                        {isRunning ? (
                            <button
                                onClick={handleCancelDeploy}
                                disabled={cancelMutation.isPending}
                                className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-xs"
                            >
                                <Square className="w-3.5 h-3.5 fill-current" />
                                Dağıtımı İptal Et
                            </button>
                        ) : (
                            <button
                                onClick={handleStartDeploy}
                                disabled={deployMutation.isPending}
                                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-xs"
                            >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Dağıtımı Başlat ({action.toUpperCase()})
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Terminal Console Output ── */}
                <div className="flex flex-col flex-1 min-h-[280px] bg-black/90 font-mono text-xs shadow-inner overflow-hidden">
                    {/* Terminal Top Bar */}
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border/40 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
                            <span>colmena {action} --on {target}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setAutoScroll(!autoScroll)}
                                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                                    autoScroll ? "bg-primary/20 border-primary/40 text-primary" : "border-border text-muted-foreground"
                                }`}
                            >
                                Oto-Kaydır
                            </button>
                            <button
                                onClick={clearLogs}
                                title="Konsolu Temizle"
                                className="p-1 hover:text-foreground text-muted-foreground transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Stream Content */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-1 select-text">
                        {lines.length === 0 ? (
                            <div className="text-muted-foreground/50 italic py-12 text-center">
                                Dağıtım çıktısı burada canlı olarak akacaktır.
                            </div>
                        ) : (
                            lines.map((line, idx) => (
                                <div key={idx} className="leading-relaxed whitespace-pre-wrap break-all">
                                    {formatLogLine(line)}
                                </div>
                            ))
                        )}
                        <div ref={terminalEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
}
