"use client";

import React from "react";
import { Application, AccessLevel } from "@/types/apps";
import {
    Play,
    Square,
    RotateCw,
    ExternalLink,
    Lock,
    Globe,
    Shield,
} from "lucide-react";
import { getCategoryIcon } from "./AppCard";

interface AppTableProps {
    apps: Application[];
    onSelect: (app: Application) => void;
    onAction: (app: Application, action: "start" | "stop" | "restart") => void;
    isActionLoading?: boolean;
}

export function AppTable({ apps, onSelect, onAction, isActionLoading }: AppTableProps) {
    return (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
                <thead>
                    <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-medium">
                        <th className="py-3 px-4">Uygulama & Servis</th>
                        <th className="py-3 px-3">Erişim & Ingress</th>
                        <th className="py-3 px-3">Kategori</th>
                        <th className="py-3 px-3">Durum</th>
                        <th className="py-3 px-3">CPU / RAM</th>
                        <th className="py-3 px-3">NixOS Provenance</th>
                        <th className="py-3 px-4 text-right">İşlemler</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                    {apps.map((app) => {
                        const isRunning = app.status === "running";
                        const isFailed = app.status === "failed";
                        const isStandby = app.status === "standby";
                        const primaryEndpoint = app.endpoints?.find(
                            (ep) => ep.type === "https" || ep.type === "http"
                        );

                        return (
                            <tr
                                key={app.id}
                                onClick={() => onSelect(app)}
                                className="group hover:bg-muted/30 cursor-pointer transition-colors"
                            >
                                {/* Name & Unit */}
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                                            {getCategoryIcon(app.category)}
                                        </div>
                                        <div>
                                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors block">
                                                {app.name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                {app.systemd_unit || app.binary_name || app.id}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                {/* Remote Access / Ingress */}
                                <td className="py-3 px-3">
                                    <div className="flex flex-col gap-1">
                                        {getAccessBadge(app.access_level)}
                                        {primaryEndpoint?.url && (
                                            <a
                                                href={primaryEndpoint.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-mono truncate max-w-[140px]"
                                            >
                                                <span>{primaryEndpoint.url.replace("https://", "")}</span>
                                                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                                            </a>
                                        )}
                                    </div>
                                </td>

                                {/* Category */}
                                <td className="py-3 px-3">
                                    <span className="text-[11px] text-muted-foreground font-medium">
                                        {formatCategoryName(app.category)}
                                    </span>
                                </td>

                                {/* Status */}
                                <td className="py-3 px-3">
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={`h-2 w-2 rounded-full ${
                                                isRunning
                                                    ? "bg-emerald-500 animate-pulse"
                                                    : isFailed
                                                    ? "bg-red-500"
                                                    : isStandby
                                                    ? "bg-amber-400"
                                                    : "bg-slate-400"
                                            }`}
                                        />
                                        <span className="font-medium text-[11px]">
                                            {app.status.toUpperCase()}
                                        </span>
                                    </div>
                                </td>

                                {/* Telemetry */}
                                <td className="py-3 px-3 font-mono text-[11px]">
                                    {isRunning ? (
                                        <span className="text-foreground">
                                            {app.metrics.cpu_percent.toFixed(1)}% / {app.metrics.memory_mb} MB
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </td>

                                {/* Nix Provenance */}
                                <td className="py-3 px-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground truncate max-w-[120px]">
                                            {app.provenance.package_name || "nixpkgs"}
                                        </span>
                                        {app.provenance.secret_keys && app.provenance.secret_keys.length > 0 && (
                                            <span
                                                title={`SOPS Secrets: ${app.provenance.secret_keys.join(", ")}`}
                                                className="text-amber-500"
                                            >
                                                <Lock className="h-3 w-3" />
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* Actions */}
                                <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    {app.systemd_unit ? (
                                        <div className="flex items-center justify-end gap-1">
                                            {isRunning ? (
                                                <>
                                                    <button
                                                        disabled={isActionLoading}
                                                        onClick={() => onAction(app, "restart")}
                                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                                        title="Yeniden Başlat"
                                                    >
                                                        <RotateCw className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        disabled={isActionLoading}
                                                        onClick={() => onAction(app, "stop")}
                                                        className="p-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                                                        title="Durdur"
                                                    >
                                                        <Square className="h-3.5 w-3.5" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    disabled={isActionLoading}
                                                    onClick={() => onAction(app, "start")}
                                                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors disabled:opacity-50"
                                                >
                                                    <Play className="h-3 w-3 fill-current" />
                                                    <span>Başlat</span>
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground italic">CLI / Workload</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function getAccessBadge(level: AccessLevel) {
    switch (level) {
        case "public_https":
            return (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono">
                    <Globe className="h-2.5 w-2.5" />
                    Public SSL
                </span>
            );
        case "tailscale_mesh":
            return (
                <span className="inline-flex items-center gap-1 text-[10px] text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.2 rounded font-mono">
                    <Shield className="h-2.5 w-2.5" />
                    Tailscale
                </span>
            );
        case "internal_only":
        default:
            return (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-500/10 border border-slate-500/20 px-1.5 py-0.2 rounded font-mono">
                    <Lock className="h-2.5 w-2.5" />
                    Internal
                </span>
            );
    }
}

function formatCategoryName(category: string) {
    switch (category) {
        case "ingress_network":
            return "Ağ & Ingress";
        case "core_platform":
            return "Platform";
        case "observability":
            return "Gözlemlenebilirlik";
        case "database":
            return "Veritabanı";
        case "ai_workload":
            return "AI & Sandbox";
        case "cicd_automation":
            return "CI/CD";
        case "backup_dr":
            return "Yedekleme";
        default:
            return category;
    }
}
