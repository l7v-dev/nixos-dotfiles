"use client";

import {
    Play,
    Square,
    RotateCw,
    ExternalLink,
    Terminal,
    Server,
    Bot,
    Box,
    Layers,
    Wrench,
    Sparkles,
} from "lucide-react";
import type { Application } from "@/types/apps";
import { useAppActions } from "@/hooks/useApps";

interface AppTableProps {
    apps: Application[];
    onSelect: (app: Application) => void;
    onActionConfirm?: (app: Application, action: "start" | "stop" | "restart") => void;
}

export function AppTable({ apps, onSelect, onActionConfirm }: AppTableProps) {
    return (
        <div className="rounded-xl border border-border bg-card/60 overflow-hidden shadow-sm backdrop-blur-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/40 text-left">
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Uygulama / Servis
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Kategori
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Durum
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Kaynak Tüketimi
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                İzolasyon
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Endpoint / Port
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                                İşlemler
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                        {apps.map((app) => (
                            <AppTableRow
                                key={app.id}
                                app={app}
                                onSelect={onSelect}
                                onActionConfirm={onActionConfirm}
                            />
                        ))}
                        {apps.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-xs text-muted-foreground">
                                    Filtreyle eşleşen uygulama bulunamadı.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function AppTableRow({
    app,
    onSelect,
    onActionConfirm,
}: {
    app: Application;
    onSelect: (app: Application) => void;
    onActionConfirm?: (app: Application, action: "start" | "stop" | "restart") => void;
}) {
    const { start, stop, restart, runAction } = useAppActions(app.id);

    const isRunning = app.status === "running";
    const isFailed = app.status === "failed";
    const isDegraded = app.status === "degraded";
    const isStandby = app.status === "standby";
    const isPending = runAction.isPending;

    const getCategoryBadge = () => {
        switch (app.category) {
            case "core_service":
                return (
                    <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/20">
                        <Server className="h-3 w-3" /> Servis
                    </span>
                );
            case "ai_agent":
                return (
                    <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-400 border border-purple-500/20">
                        <Bot className="h-3 w-3" /> AI Ajan
                    </span>
                );
            case "microvm":
                return (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                        <Box className="h-3 w-3" /> MicroVM
                    </span>
                );
            case "dev_tool":
                return (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">
                        <Wrench className="h-3 w-3" /> Dev Tool
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        <Layers className="h-3 w-3" /> {app.category}
                    </span>
                );
        }
    };

    const getStatusPill = () => {
        if (isRunning) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Çalışıyor
                </span>
            );
        }
        if (isFailed) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive border border-destructive/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    Failed
                </span>
            );
        }
        if (isDegraded) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Degraded
                </span>
            );
        }
        if (isStandby) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                    Standby
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                Durduruldu
            </span>
        );
    };

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
        <tr className="hover:bg-accent/30 transition-colors group cursor-pointer" onClick={() => onSelect(app)}>
            {/* App name + ID */}
            <td className="px-4 py-3">
                <div className="flex flex-col">
                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {app.name}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                        {app.systemd_unit || app.binary_name || app.id}
                    </span>
                </div>
            </td>

            {/* Category */}
            <td className="px-4 py-3">{getCategoryBadge()}</td>

            {/* Status */}
            <td className="px-4 py-3">{getStatusPill()}</td>

            {/* Resources */}
            <td className="px-4 py-3">
                {isRunning ? (
                    <div className="flex flex-col text-xs tabular-nums">
                        <span className="font-medium text-foreground">
                            {app.metrics.memory_mb > 0 ? `${app.metrics.memory_mb} MB RAM` : "—"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                            CPU: %{app.metrics.cpu_percent.toFixed(1)}
                        </span>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground/60">—</span>
                )}
            </td>

            {/* Sandbox */}
            <td className="px-4 py-3">
                {app.sandbox_tier === 1 && (
                    <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-1.5 py-0.5 text-[11px] font-mono text-purple-300 border border-purple-500/20">
                        <Sparkles className="h-2.5 w-2.5" /> Tier 1
                    </span>
                )}
                {app.sandbox_tier === 2 && (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-mono text-emerald-300 border border-emerald-500/20">
                        <Box className="h-2.5 w-2.5" /> Tier 2
                    </span>
                )}
                {app.sandbox_tier === 3 && (
                    <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-mono text-blue-300 border border-blue-500/20">
                        <Terminal className="h-2.5 w-2.5" /> Tier 3
                    </span>
                )}
                {app.sandbox_tier === 0 && (
                    <span className="text-xs text-muted-foreground">Host Native</span>
                )}
            </td>

            {/* Endpoints */}
            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                {primaryEndpoint?.url ? (
                    <a
                        href={primaryEndpoint.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                        {primaryEndpoint.url.replace(/^https?:\/\//, "")}
                        <ExternalLink className="h-3 w-3" />
                    </a>
                ) : (
                    <span className="text-xs text-muted-foreground/60">—</span>
                )}
            </td>

            {/* Actions */}
            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1">
                    {app.systemd_unit && (
                        <>
                            {isRunning ? (
                                <>
                                    <button
                                        disabled={isPending}
                                        onClick={() => handleAction("restart")}
                                        title="Restart"
                                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 transition-colors"
                                    >
                                        <RotateCw className={`h-3 w-3 ${isPending ? "animate-spin" : ""}`} />
                                    </button>
                                    <button
                                        disabled={isPending}
                                        onClick={() => handleAction("stop")}
                                        title="Stop"
                                        className="flex h-7 w-7 items-center justify-center rounded-md border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                                    >
                                        <Square className="h-3 w-3" />
                                    </button>
                                </>
                            ) : (
                                <button
                                    disabled={isPending}
                                    onClick={() => handleAction("start")}
                                    title="Start"
                                    className="flex items-center gap-1 h-7 rounded-md border border-primary/40 bg-primary/15 px-2 text-xs font-medium text-primary hover:bg-primary/25 disabled:opacity-50 transition-colors"
                                >
                                    <Play className="h-3 w-3 fill-primary" />
                                    <span>Başlat</span>
                                </button>
                            )}
                        </>
                    )}

                    {!app.systemd_unit && (
                        <button
                            onClick={() => onSelect(app)}
                            className="flex items-center gap-1 h-7 rounded-md border border-border bg-muted/60 px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                            <span>Detay</span>
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
}
