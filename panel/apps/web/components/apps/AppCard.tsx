"use client";

import React from "react";
import { Application, AccessLevel } from "@/types/apps";
import {
    Activity,
    ExternalLink,
    Play,
    Square,
    RotateCw,
    Shield,
    Lock,
    Globe,
    Server,
    Cpu,
    Database,
    Bot,
    Network,
    Terminal,
} from "lucide-react";

interface AppCardProps {
    app: Application;
    onSelect: (app: Application) => void;
    onAction: (app: Application, action: "start" | "stop" | "restart") => void;
    isActionLoading?: boolean;
}

export function AppCard({ app, onSelect, onAction, isActionLoading }: AppCardProps) {
    const isRunning = app.status === "running";
    const isFailed = app.status === "failed";
    const isStandby = app.status === "standby";

    const primaryEndpoint = app.endpoints?.find(
        (ep) => ep.type === "https" || ep.type === "http"
    );

    return (
        <div
            onClick={() => onSelect(app)}
            className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:bg-card/90 hover:shadow-lg cursor-pointer"
        >
            <div>
                {/* Header: Title & Badges */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                            {getCategoryIcon(app.category)}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-sm leading-tight truncate text-foreground group-hover:text-primary transition-colors">
                                {app.name}
                            </h3>
                            <span className="text-[11px] text-muted-foreground font-mono truncate block mt-0.5">
                                {app.systemd_unit || app.binary_name || app.id}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {/* Status Badge */}
                        <div
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusBadgeClass(
                                app.status
                            )}`}
                        >
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                    isRunning
                                        ? "bg-emerald-500 animate-pulse"
                                        : isFailed
                                        ? "bg-red-500"
                                        : isStandby
                                        ? "bg-amber-400"
                                        : "bg-slate-400"
                                }`}
                            />
                            {app.status.toUpperCase()}
                        </div>

                        {/* Access Level Badge */}
                        {getAccessLevelBadge(app.access_level)}
                    </div>
                </div>

                {/* Description */}
                <p className="mt-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {app.description}
                </p>
            </div>

            {/* Middle: Telemetry & Ingress */}
            <div className="mt-4 pt-3 border-t border-border/40">
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Cpu className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                        <span className="font-mono">
                            {isRunning ? `${app.metrics.cpu_percent.toFixed(1)}%` : "0.0%"}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Activity className="h-3.5 w-3.5 shrink-0 text-emerald-500/70" />
                        <span className="font-mono">
                            {isRunning ? `${app.metrics.memory_mb} MB` : "0 MB"}
                        </span>
                    </div>
                </div>

                {primaryEndpoint?.url && (
                    <div className="mt-2.5 flex items-center justify-between text-[11px] bg-muted/40 rounded px-2 py-1">
                        <span className="truncate font-mono text-muted-foreground">
                            {primaryEndpoint.url}
                        </span>
                        <a
                            href={primaryEndpoint.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="ml-1 text-primary hover:underline flex items-center gap-0.5 shrink-0"
                        >
                            <span>Aç</span>
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="mt-4 flex items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-1.5">
                    {app.sandbox_tier > 0 && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-medium">
                            Tier {app.sandbox_tier} Sandbox
                        </span>
                    )}
                    {app.provenance.secret_keys && app.provenance.secret_keys.length > 0 && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 font-medium flex items-center gap-0.5">
                            <Lock className="h-2.5 w-2.5" />
                            SOPS
                        </span>
                    )}
                </div>

                {app.systemd_unit && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {isRunning ? (
                            <>
                                <button
                                    disabled={isActionLoading}
                                    onClick={() => onAction(app, "restart")}
                                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                    title="Yeniden Başlat"
                                >
                                    <RotateCw className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    disabled={isActionLoading}
                                    onClick={() => onAction(app, "stop")}
                                    className="p-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                                    title="Durdur"
                                >
                                    <Square className="h-3.5 w-3.5" />
                                </button>
                            </>
                        ) : (
                            <button
                                disabled={isActionLoading}
                                onClick={() => onAction(app, "start")}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors disabled:opacity-50 shadow-sm"
                            >
                                <Play className="h-3 w-3 fill-current" />
                                <span>Başlat</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function getStatusBadgeClass(status: string) {
    switch (status) {
        case "running":
            return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
        case "failed":
            return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
        case "standby":
            return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
        default:
            return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    }
}

function getAccessLevelBadge(level: AccessLevel) {
    switch (level) {
        case "public_https":
            return (
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                    <Globe className="h-2.5 w-2.5" />
                    Public SSL
                </span>
            );
        case "tailscale_mesh":
            return (
                <span className="flex items-center gap-1 text-[10px] text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded font-mono">
                    <Shield className="h-2.5 w-2.5" />
                    Tailscale
                </span>
            );
        case "internal_only":
        default:
            return (
                <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-500/10 border border-slate-500/20 px-1.5 py-0.5 rounded font-mono">
                    <Lock className="h-2.5 w-2.5" />
                    Internal
                </span>
            );
    }
}

export function getCategoryIcon(category: string) {
    switch (category) {
        case "ingress_network":
            return <Network className="h-5 w-5" />;
        case "core_platform":
            return <Server className="h-5 w-5" />;
        case "observability":
            return <Activity className="h-5 w-5" />;
        case "database":
            return <Database className="h-5 w-5" />;
        case "ai_workload":
            return <Bot className="h-5 w-5" />;
        case "cicd_automation":
            return <Terminal className="h-5 w-5" />;
        case "backup_dr":
            return <Shield className="h-5 w-5" />;
        default:
            return <Server className="h-5 w-5" />;
    }
}
