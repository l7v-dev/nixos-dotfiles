"use client";

import {
    Play,
    Square,
    RotateCw,
    ExternalLink,
    Terminal,
    ShieldAlert,
    Cpu,
    HardDrive,
    Server,
    Bot,
    Box,
    Layers,
    Wrench,
    Sparkles,
} from "lucide-react";
import type { Application } from "@/types/apps";
import { useAppActions } from "@/hooks/useApps";

interface AppCardProps {
    app: Application;
    onSelect: (app: Application) => void;
    onActionConfirm?: (app: Application, action: "start" | "stop" | "restart") => void;
}

export function AppCard({ app, onSelect, onActionConfirm }: AppCardProps) {
    const { start, stop, restart, runAction } = useAppActions(app.id);

    const isRunning = app.status === "running";
    const isFailed = app.status === "failed";
    const isDegraded = app.status === "degraded";
    const isStandby = app.status === "standby";

    const isPending = runAction.isPending;

    const getCategoryIcon = () => {
        switch (app.category) {
            case "core_service":
                return <Server className="h-4 w-4 text-blue-400" />;
            case "ai_agent":
                return <Bot className="h-4 w-4 text-purple-400" />;
            case "microvm":
                return <Box className="h-4 w-4 text-emerald-400" />;
            case "dev_tool":
                return <Wrench className="h-4 w-4 text-amber-400" />;
            case "desktop_capability":
                return <Layers className="h-4 w-4 text-cyan-400" />;
            default:
                return <Server className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getCategoryLabel = () => {
        switch (app.category) {
            case "core_service":
                return "Sistem Servisi";
            case "ai_agent":
                return "AI Ajanı";
            case "microvm":
                return "MicroVM Sandbox";
            case "dev_tool":
                return "Geliştirici Aracı";
            case "desktop_capability":
                return "Masaüstü Yeteneği";
            default:
                return app.category;
        }
    };

    const getStatusBadge = () => {
        if (isRunning) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Çalışıyor
                </span>
            );
        }
        if (isFailed) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive border border-destructive/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    Hata (Failed)
                </span>
            );
        }
        if (isDegraded) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Yeniden Başlatılıyor
                </span>
            );
        }
        if (isStandby) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground border border-border">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                    Hazır / Standby
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground border border-border">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                Durduruldu
            </span>
        );
    };

    const getSandboxBadge = () => {
        if (app.sandbox_tier === 1) {
            return (
                <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-mono text-purple-300 border border-purple-500/20">
                    <Sparkles className="h-2.5 w-2.5" /> Tier 1: Claudebox
                </span>
            );
        }
        if (app.sandbox_tier === 2) {
            return (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/20">
                    <Box className="h-2.5 w-2.5" /> Tier 2: MicroVM
                </span>
            );
        }
        if (app.sandbox_tier === 3) {
            return (
                <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-mono text-blue-300 border border-blue-500/20">
                    <Terminal className="h-2.5 w-2.5" /> Tier 3: Worktree Loop
                </span>
            );
        }
        return null;
    };

    // Find primary public or local HTTP URL
    const primaryEndpoint = app.endpoints?.find((e) => e.type === "https" || e.type === "http");

    const handleAction = (action: "start" | "stop" | "restart") => {
        if (onActionConfirm && (action === "stop" || action === "restart") && (app.dependents?.length ?? 0) > 0) {
            onActionConfirm(app, action);
            return;
        }

        switch (action) {
            case "start":
                start();
                break;
            case "stop":
                stop();
                break;
            case "restart":
                restart();
                break;
        }
    };

    return (
        <div className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card/60 p-4 backdrop-blur-sm transition-all duration-200 hover:border-primary/50 hover:bg-card/90 hover:shadow-lg">
            {/* Top header */}
            <div>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 border border-border/50 group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
                            {getCategoryIcon()}
                        </div>
                        <div className="min-w-0">
                            <h3
                                onClick={() => onSelect(app)}
                                className="cursor-pointer truncate text-sm font-semibold text-foreground hover:text-primary transition-colors"
                            >
                                {app.name}
                            </h3>
                            <p className="text-[11px] text-muted-foreground truncate">
                                {getCategoryLabel()}
                            </p>
                        </div>
                    </div>
                    {getStatusBadge()}
                </div>

                {/* Description */}
                <p className="mt-2.5 text-xs text-muted-foreground/90 line-clamp-2 min-h-[32px]">
                    {app.description}
                </p>

                {/* Badges & Tags */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {getSandboxBadge()}
                    {app.systemd_unit && (
                        <span className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground border border-border/40">
                            {app.systemd_unit}
                        </span>
                    )}
                    {primaryEndpoint?.url && (
                        <a
                            href={primaryEndpoint.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {primaryEndpoint.port ? `:${primaryEndpoint.port}` : "Web UI"}
                            <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                    )}
                </div>

                {/* Resource Telemetry */}
                {isRunning && (
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-2 border border-border/30">
                        <div className="flex items-center gap-1.5">
                            <HardDrive className="h-3 w-3 text-muted-foreground/70" />
                            <div className="min-w-0">
                                <p className="text-[10px] text-muted-foreground">Bellek (RAM)</p>
                                <p className="text-xs font-semibold tabular-nums">
                                    {app.metrics.memory_mb > 0 ? `${app.metrics.memory_mb} MB` : "—"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Cpu className="h-3 w-3 text-muted-foreground/70" />
                            <div className="min-w-0">
                                <p className="text-[10px] text-muted-foreground">CPU Yükü</p>
                                <p className="text-xs font-semibold tabular-nums">
                                    {app.metrics.cpu_percent > 0 ? `%${app.metrics.cpu_percent.toFixed(1)}` : "%0.0"}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                <button
                    onClick={() => onSelect(app)}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    Detaylar & Loglar →
                </button>

                <div className="flex items-center gap-1">
                    {app.systemd_unit && (
                        <>
                            {isRunning ? (
                                <>
                                    <button
                                        disabled={isPending}
                                        onClick={() => handleAction("restart")}
                                        title="Yeniden Başlat (Restart)"
                                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 transition-colors"
                                    >
                                        <RotateCw className={`h-3 w-3 ${isPending ? "animate-spin" : ""}`} />
                                    </button>
                                    <button
                                        disabled={isPending}
                                        onClick={() => handleAction("stop")}
                                        title="Durdur (Stop)"
                                        className="flex h-7 w-7 items-center justify-center rounded-md border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                                    >
                                        <Square className="h-3 w-3" />
                                    </button>
                                </>
                            ) : (
                                <button
                                    disabled={isPending}
                                    onClick={() => handleAction("start")}
                                    title="Başlat (Start)"
                                    className="flex items-center gap-1 h-7 rounded-md border border-primary/40 bg-primary/15 px-2 text-xs font-medium text-primary hover:bg-primary/25 disabled:opacity-50 transition-colors"
                                >
                                    <Play className="h-3 w-3 fill-primary" />
                                    <span>Başlat</span>
                                </button>
                            )}
                        </>
                    )}

                    {!app.systemd_unit && app.binary_name && (
                        <button
                            onClick={() => onSelect(app)}
                            className="flex items-center gap-1 h-7 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 text-xs font-medium text-purple-300 hover:bg-purple-500/20 transition-colors"
                        >
                            <Terminal className="h-3 w-3" />
                            <span>Terminal</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
