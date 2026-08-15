"use client";

import React, { useState } from "react";
import {
    X,
    Play,
    Square,
    RotateCw,
    Pause,
    PlayCircle,
    Trash2,
    Activity,
    ScrollText,
    Terminal as TerminalIcon,
    FileCode,
    Info,
    Check,
    Copy,
    Shield,
    ExternalLink,
    Clock,
    HardDrive,
    Network,
    KeyRound,
} from "lucide-react";
import { useContainer, useContainerAction, useRemoveContainer } from "@/hooks/useContainers";
import { ContainerMetricsTab } from "./ContainerMetricsTab";
import { ContainerLogViewer } from "./ContainerLogViewer";
import { ContainerTerminal } from "./ContainerTerminal";

interface Props {
    containerId: string | null;
    onClose: () => void;
}

export function ContainerDetailDrawer({ containerId, onClose }: Props) {
    const [activeTab, setActiveTab] = useState<"overview" | "metrics" | "logs" | "terminal" | "raw">("overview");
    const [copied, setCopied] = useState(false);

    const { data: container, isLoading } = useContainer(containerId);
    const actionMutation = useContainerAction();
    const removeMutation = useRemoveContainer();

    if (!containerId) return null;

    const isRunning = container?.state?.running ?? false;
    const isPaused = container?.state?.paused ?? false;

    const handleAction = (action: "start" | "stop" | "restart" | "pause" | "unpause" | "kill") => {
        if (!containerId) return;
        actionMutation.mutate({ id: containerId, action });
    };

    const handleRemove = () => {
        if (!containerId) return;
        if (confirm("Bu kapsayıcıyı silmek istediğinize emin misiniz?")) {
            removeMutation.mutate({ id: containerId, force: true }, {
                onSuccess: () => onClose(),
            });
        }
    };

    const handleCopyJSON = () => {
        if (container) {
            navigator.clipboard.writeText(JSON.stringify(container, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
            <div className="relative flex h-full w-full max-w-4xl flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-300">
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-foreground">
                                    {container?.name || containerId.slice(0, 12)}
                                </h2>
                                {container?.isNixos && (
                                    <span className="flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400">
                                        <Shield className="h-3 w-3" />
                                        NixOS Declarative
                                    </span>
                                )}
                                <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                        isRunning
                                            ? "bg-emerald-500/15 text-emerald-500"
                                            : isPaused
                                            ? "bg-amber-500/15 text-amber-500"
                                            : "bg-muted text-muted-foreground"
                                    }`}
                                >
                                    {container?.state?.status || (isLoading ? "Yükleniyor..." : "Exited")}
                                </span>
                            </div>
                            <p className="mt-0.5 text-xs font-mono text-muted-foreground">
                                {container?.image || "—"} • ID: {containerId.slice(0, 12)}
                            </p>
                        </div>
                    </div>

                    {/* Quick Action Buttons & Close */}
                    <div className="flex items-center gap-2">
                        {isRunning ? (
                            <>
                                <button
                                    onClick={() => handleAction("restart")}
                                    disabled={actionMutation.isPending}
                                    title="Yeniden Başlat"
                                    className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                                >
                                    <RotateCw className={`h-3.5 w-3.5 ${actionMutation.isPending ? "animate-spin" : ""}`} />
                                    Yeniden Başlat
                                </button>
                                <button
                                    onClick={() => handleAction(isPaused ? "unpause" : "pause")}
                                    disabled={actionMutation.isPending}
                                    title={isPaused ? "Devam Ettir" : "Duraklat"}
                                    className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                                >
                                    {isPaused ? <PlayCircle className="h-3.5 w-3.5 text-amber-500" /> : <Pause className="h-3.5 w-3.5" />}
                                    {isPaused ? "Devam" : "Duraklat"}
                                </button>
                                <button
                                    onClick={() => handleAction("stop")}
                                    disabled={actionMutation.isPending}
                                    title="Durdur"
                                    className="flex h-8 items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                                >
                                    <Square className="h-3.5 w-3.5 fill-destructive" />
                                    Durdur
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => handleAction("start")}
                                disabled={actionMutation.isPending}
                                title="Başlat"
                                className="flex h-8 items-center gap-1.5 rounded-md bg-emerald-500/15 px-3 text-xs font-medium text-emerald-500 transition-colors hover:bg-emerald-500/25"
                            >
                                <Play className="h-3.5 w-3.5 fill-emerald-500" />
                                Başlat
                            </button>
                        )}

                        {!container?.isNixos && (
                            <button
                                onClick={handleRemove}
                                disabled={removeMutation.isPending}
                                title="Kapsayıcıyı Sil"
                                className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}

                        <div className="mx-1 h-5 w-px bg-border" />

                        <button
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex border-b border-border bg-muted/10 px-6">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                            activeTab === "overview"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Info className="h-3.5 w-3.5" />
                        Genel Bakış
                    </button>
                    <button
                        onClick={() => setActiveTab("metrics")}
                        className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                            activeTab === "metrics"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Activity className="h-3.5 w-3.5" />
                        Canlı Metrikler
                    </button>
                    <button
                        onClick={() => setActiveTab("logs")}
                        className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                            activeTab === "logs"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <ScrollText className="h-3.5 w-3.5" />
                        Loglar
                    </button>
                    <button
                        onClick={() => setActiveTab("terminal")}
                        className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                            activeTab === "terminal"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <TerminalIcon className="h-3.5 w-3.5" />
                        Web Terminali
                    </button>
                    <button
                        onClick={() => setActiveTab("raw")}
                        className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                            activeTab === "raw"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <FileCode className="h-3.5 w-3.5" />
                        JSON Inspect
                    </button>
                </div>

                {/* Tab Content Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* 1. Overview Tab */}
                    {activeTab === "overview" && (
                        <div className="space-y-6">
                            {/* Summary Metadata Grid */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-lg border border-border bg-card/60 p-3">
                                    <span className="text-[11px] text-muted-foreground">Oluşturulma</span>
                                    <p className="mt-1 text-xs font-medium text-foreground">
                                        {container?.created
                                            ? new Date(container.created).toLocaleString()
                                            : "—"}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border bg-card/60 p-3">
                                    <span className="text-[11px] text-muted-foreground">Yeniden Başlatma</span>
                                    <p className="mt-1 text-xs font-medium text-foreground">
                                        {container?.restartCount ?? 0} kez
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border bg-card/60 p-3">
                                    <span className="text-[11px] text-muted-foreground">Sürücü / Platform</span>
                                    <p className="mt-1 text-xs font-medium text-foreground">
                                        {container?.driver || "overlay2"} ({container?.platform || "linux/amd64"})
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border bg-card/60 p-3">
                                    <span className="text-[11px] text-muted-foreground">Çalışma Dizini</span>
                                    <p className="mt-1 text-xs font-mono font-medium text-foreground truncate">
                                        {container?.config?.workingDir || "/"}
                                    </p>
                                </div>
                            </div>

                            {/* Ports & Networking */}
                            <div className="space-y-2">
                                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <Network className="h-3.5 w-3.5" />
                                    Ağ & Port Eşlemeleri
                                </h3>
                                <div className="rounded-lg border border-border bg-card overflow-hidden">
                                    <div className="p-3 text-xs space-y-2">
                                        <div className="flex items-center justify-between text-muted-foreground">
                                            <span>IP Adresi:</span>
                                            <span className="font-mono text-foreground font-medium">
                                                {container?.networkSettings?.ipAddress || "Host Network / Yok"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-muted-foreground">
                                            <span>Gateway:</span>
                                            <span className="font-mono text-foreground">
                                                {container?.networkSettings?.gateway || "—"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-muted-foreground">
                                            <span>MAC Adresi:</span>
                                            <span className="font-mono text-foreground">
                                                {container?.networkSettings?.macAddress || "—"}
                                            </span>
                                        </div>
                                    </div>
                                    {container?.networkSettings?.ports && Object.keys(container.networkSettings.ports).length > 0 && (
                                        <div className="border-t border-border bg-muted/20 p-3">
                                            <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
                                                Yönlendirilen Portlar (Port Bindings):
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(container.networkSettings.ports).map(([cPort, bindings]) => (
                                                    <span
                                                        key={cPort}
                                                        className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-mono font-medium text-blue-400"
                                                    >
                                                        {bindings && bindings.length > 0
                                                            ? `${bindings.map((b) => `${b.hostPort}`).join(", ")} ➔ ${cPort}`
                                                            : cPort}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Mounts / Volumes */}
                            <div className="space-y-2">
                                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <HardDrive className="h-3.5 w-3.5" />
                                    Bağlanan Diskler & Volume&apos;ler ({container?.mounts?.length || 0})
                                </h3>
                                {container?.mounts && container.mounts.length > 0 ? (
                                    <div className="rounded-lg border border-border bg-card overflow-hidden">
                                        <table className="w-full text-left text-xs">
                                            <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                                                <tr>
                                                    <th className="p-2.5">Tür</th>
                                                    <th className="p-2.5">Kaynak (Host Path / Volume)</th>
                                                    <th className="p-2.5">Hedef (Container Path)</th>
                                                    <th className="p-2.5">İzin</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {container.mounts.map((m, idx) => (
                                                    <tr key={idx} className="hover:bg-muted/20">
                                                        <td className="p-2.5 font-medium uppercase text-[10px] text-muted-foreground">
                                                            {m.type}
                                                        </td>
                                                        <td className="p-2.5 font-mono text-foreground break-all">
                                                            {m.name || m.source}
                                                        </td>
                                                        <td className="p-2.5 font-mono text-muted-foreground break-all">
                                                            {m.destination}
                                                        </td>
                                                        <td className="p-2.5">
                                                            <span
                                                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                                                    m.rw
                                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                                        : "bg-amber-500/10 text-amber-400"
                                                                }`}
                                                            >
                                                                {m.rw ? "RW" : "RO"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">Bağlı kalıcı disk bulunmuyor.</p>
                                )}
                            </div>

                            {/* Environment Variables */}
                            <div className="space-y-2">
                                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <KeyRound className="h-3.5 w-3.5" />
                                    Ortam Değişkenleri (Environment Variables)
                                </h3>
                                {container?.config?.env && container.config.env.length > 0 ? (
                                    <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-[#0d1117] p-3 font-mono text-xs">
                                        {container.config.env.map((envLine, idx) => {
                                            const [key, ...rest] = envLine.split("=");
                                            return (
                                                <div key={idx} className="flex gap-1.5 py-0.5 text-slate-300">
                                                    <span className="font-semibold text-blue-400">{key}=</span>
                                                    <span className="text-slate-400 break-all">{rest.join("=")}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">Tanımlı ortam değişkeni yok.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 2. Metrics Tab */}
                    {activeTab === "metrics" && (
                        <ContainerMetricsTab containerId={containerId} isRunning={isRunning} />
                    )}

                    {/* 3. Logs Tab */}
                    {activeTab === "logs" && (
                        <ContainerLogViewer containerId={containerId} />
                    )}

                    {/* 4. Terminal Tab */}
                    {activeTab === "terminal" && (
                        <ContainerTerminal containerId={containerId} isRunning={isRunning} />
                    )}

                    {/* 5. Raw JSON Inspect */}
                    {activeTab === "raw" && (
                        <div className="space-y-2">
                            <div className="flex justify-end">
                                <button
                                    onClick={handleCopyJSON}
                                    className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                                >
                                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                    {copied ? "Kopyalandı" : "JSON Kopyala"}
                                </button>
                            </div>
                            <pre className="max-h-[500px] overflow-auto rounded-lg border border-border bg-[#0d1117] p-4 font-mono text-xs text-slate-300 select-text">
                                {JSON.stringify(container, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
