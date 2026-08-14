"use client";

import { useState } from "react";
import {
    X,
    Play,
    Square,
    RotateCw,
    ExternalLink,
    Terminal,
    Server,
    FileCode,
    Key,
    Shield,
    Layers,
    Activity,
    ScrollText,
    Copy,
    Check,
    Box,
    Sparkles,
} from "lucide-react";
import type { Application } from "@/types/apps";
import { useAppActions } from "@/hooks/useApps";
import { AppMetricsView } from "./AppMetricsView";
import { AppLogViewer } from "./AppLogViewer";

interface AppDetailDrawerProps {
    app: Application | null;
    onClose: () => void;
    onActionConfirm?: (app: Application, action: "start" | "stop" | "restart") => void;
}

type TabType = "overview" | "metrics" | "logs" | "nix" | "dependencies";

export function AppDetailDrawer({ app, onClose, onActionConfirm }: AppDetailDrawerProps) {
    const [activeTab, setActiveTab] = useState<TabType>("overview");
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const { start, stop, restart, runAction } = useAppActions(app?.id ?? "");

    if (!app) return null;

    const isRunning = app.status === "running";
    const isPending = runAction.isPending;

    const handleCopy = (text: string, keyId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(keyId);
        setTimeout(() => setCopiedKey(null), 2000);
    };

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

    const primaryEndpoint = app.endpoints?.find((e) => e.type === "https" || e.type === "http");

    return (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div
                className="relative flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ─── Drawer Header ─── */}
                <div className="flex items-start justify-between border-b border-border p-5">
                    <div className="space-y-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-foreground truncate">{app.name}</h2>
                            <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                    isRunning
                                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                        : app.status === "failed"
                                        ? "bg-destructive/15 text-destructive border border-destructive/30"
                                        : "bg-muted text-muted-foreground border border-border"
                                }`}
                            >
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                        isRunning ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/60"
                                    }`}
                                />
                                {app.status}
                            </span>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground truncate">
                            {app.systemd_unit || app.binary_name || app.id}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {primaryEndpoint?.url && (
                            <a
                                href={primaryEndpoint.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                            >
                                <span>Web UI</span>
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* ─── Quick Actions Toolbar ─── */}
                <div className="flex items-center justify-between border-b border-border/50 bg-muted/20 px-5 py-2.5">
                    <div className="flex items-center gap-2">
                        {app.systemd_unit ? (
                            <>
                                {isRunning ? (
                                    <>
                                        <button
                                            disabled={isPending}
                                            onClick={() => handleAction("restart")}
                                            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50 transition-colors shadow-xs"
                                        >
                                            <RotateCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
                                            <span>Yeniden Başlat</span>
                                        </button>
                                        <button
                                            disabled={isPending}
                                            onClick={() => handleAction("stop")}
                                            className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors shadow-xs"
                                        >
                                            <Square className="h-3.5 w-3.5" />
                                            <span>Durdur</span>
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        disabled={isPending}
                                        onClick={() => handleAction("start")}
                                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs"
                                    >
                                        <Play className="h-3.5 w-3.5 fill-primary-foreground" />
                                        <span>Servisi Başlat</span>
                                    </button>
                                )}
                            </>
                        ) : (
                            <a
                                href={`/terminal`}
                                className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-500/20 transition-colors"
                            >
                                <Terminal className="h-3.5 w-3.5" />
                                <span>Web Terminalinde Aç</span>
                            </a>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        {app.sandbox_tier === 1 && (
                            <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-1 text-[11px] font-mono text-purple-300 border border-purple-500/20">
                                <Sparkles className="h-3 w-3" /> Tier 1: Claudebox
                            </span>
                        )}
                        {app.sandbox_tier === 2 && (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-[11px] font-mono text-emerald-300 border border-emerald-500/20">
                                <Box className="h-3 w-3" /> Tier 2: MicroVM
                            </span>
                        )}
                    </div>
                </div>

                {/* ─── Navigation Tabs ─── */}
                <div className="flex border-b border-border bg-card px-5 text-xs font-medium">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition-colors ${
                            activeTab === "overview"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Server className="h-3.5 w-3.5" />
                        Genel Bakış
                    </button>
                    <button
                        onClick={() => setActiveTab("metrics")}
                        className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition-colors ${
                            activeTab === "metrics"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Activity className="h-3.5 w-3.5" />
                        Telemetri & Kaynaklar
                    </button>
                    <button
                        onClick={() => setActiveTab("logs")}
                        className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition-colors ${
                            activeTab === "logs"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <ScrollText className="h-3.5 w-3.5" />
                        Canlı Loglar
                    </button>
                    <button
                        onClick={() => setActiveTab("nix")}
                        className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition-colors ${
                            activeTab === "nix"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <FileCode className="h-3.5 w-3.5" />
                        Nix & Güvenlik
                    </button>
                    <button
                        onClick={() => setActiveTab("dependencies")}
                        className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition-colors ${
                            activeTab === "dependencies"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Layers className="h-3.5 w-3.5" />
                        Bağımlılıklar
                    </button>
                </div>

                {/* ─── Tab Contents ─── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* 1. Overview Tab */}
                    {activeTab === "overview" && (
                        <div className="space-y-5">
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Açıklama
                                </h4>
                                <p className="mt-1 text-sm text-foreground leading-relaxed">
                                    {app.description}
                                </p>
                            </div>

                            {/* Endpoints & URLs */}
                            {app.endpoints && app.endpoints.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        Erişim Noktaları (Endpoints & Ports)
                                    </h4>
                                    <div className="space-y-2">
                                        {app.endpoints.map((ep, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 text-xs"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary uppercase">
                                                        {ep.type}
                                                    </span>
                                                    <span className="font-mono text-foreground font-medium">
                                                        {ep.url || `Port :${ep.port}`}
                                                    </span>
                                                    {ep.internal && (
                                                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                                            Internal
                                                        </span>
                                                    )}
                                                </div>
                                                {ep.url && (
                                                    <a
                                                        href={ep.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline flex items-center gap-1 font-medium"
                                                    >
                                                        Aç ↗
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tags */}
                            {app.tags && app.tags.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        Etiketler
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {app.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground"
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 2. Metrics Tab */}
                    {activeTab === "metrics" && <AppMetricsView app={app} />}

                    {/* 3. Logs Tab */}
                    {activeTab === "logs" && <AppLogViewer app={app} />}

                    {/* 4. Nix & Secrets Tab */}
                    {activeTab === "nix" && (
                        <div className="space-y-5">
                            {/* Nix Provenance Box */}
                            <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <FileCode className="h-4 w-4 text-primary" />
                                    <h4 className="text-sm font-semibold text-foreground">
                                        Deklaratif NixOS Modül Kaynağı
                                    </h4>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                                        <span className="text-muted-foreground">Tanımlandığı Dosya:</span>
                                        <div className="flex items-center gap-1.5 font-mono text-foreground font-medium">
                                            <span>{app.provenance.declared_in || "NixOS Base Module"}</span>
                                            {app.provenance.declared_in && (
                                                <button
                                                    onClick={() => handleCopy(app.provenance.declared_in!, "declared_in")}
                                                    className="text-muted-foreground hover:text-foreground"
                                                >
                                                    {copiedKey === "declared_in" ? (
                                                        <Check className="h-3 w-3 text-emerald-400" />
                                                    ) : (
                                                        <Copy className="h-3 w-3" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                                        <span className="text-muted-foreground">Paket Adı & Input:</span>
                                        <span className="font-mono text-foreground font-medium">
                                            {app.provenance.package_name || app.id} ({app.provenance.flake_input || "nixpkgs"})
                                        </span>
                                    </div>

                                    {app.provenance.version && (
                                        <div className="flex items-center justify-between border-b border-border/40 pb-2">
                                            <span className="text-muted-foreground">Sürüm:</span>
                                            <span className="font-mono text-foreground">{app.provenance.version}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SOPS Secrets Mapping */}
                            <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Key className="h-4 w-4 text-amber-400" />
                                    <h4 className="text-sm font-semibold text-foreground">
                                        SOPS / Age Şifreli Sır Eşlemesi
                                    </h4>
                                </div>

                                {app.provenance.secret_keys && app.provenance.secret_keys.length > 0 ? (
                                    <div className="space-y-2">
                                        {app.provenance.secret_keys.map((sec) => (
                                            <div
                                                key={sec}
                                                className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-2.5 text-xs font-mono"
                                            >
                                                <div className="flex items-center gap-2 text-foreground">
                                                    <Shield className="h-3.5 w-3.5 text-emerald-400" />
                                                    <span>sops.secrets.&quot;{sec}&quot;</span>
                                                </div>
                                                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                                                    Şifrelenmiş (Age)
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        Bu uygulama için harici SOPS sır anahtarı tanımlanmamıştır.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 5. Dependencies Tab */}
                    {activeTab === "dependencies" && (
                        <div className="space-y-5">
                            {/* Prerequisites */}
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Gerekli Önkoşul Servisleri (Requires)
                                </h4>
                                {app.dependencies && app.dependencies.length > 0 ? (
                                    <div className="space-y-2">
                                        {app.dependencies.map((dep) => (
                                            <div
                                                key={dep}
                                                className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-3 text-xs font-mono"
                                            >
                                                <span className="font-medium text-foreground">{dep}</span>
                                                <span className="text-muted-foreground">Zorunlu Bağımlılık</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">Bağımlılık bulunmuyor.</p>
                                )}
                            </div>

                            {/* Dependents */}
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Bu Servise Bağımlı Olanlar (Dependents)
                                </h4>
                                {app.dependents && app.dependents.length > 0 ? (
                                    <div className="space-y-2">
                                        {app.dependents.map((dep) => (
                                            <div
                                                key={dep}
                                                className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-mono text-amber-300"
                                            >
                                                <span className="font-medium">{dep}</span>
                                                <span className="text-[11px] opacity-80">Etkilenir</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        Bu servisi doğrudan tüketen başka bir servis kaydedilmemiş.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
