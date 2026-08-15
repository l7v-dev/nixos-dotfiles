"use client";

import React from "react";
import { useHostStore } from "@/store/host-store";
import { useFleetNodes } from "@/hooks/useFleet";
import {
    X,
    Server,
    Laptop,
    Cpu,
    ShieldCheck,
    Network,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Activity,
    Rocket,
} from "lucide-react";

interface FleetDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOpenColmenaDeploy?: () => void;
}

export function FleetDrawer({
    open,
    onOpenChange,
    onOpenColmenaDeploy,
}: FleetDrawerProps) {
    const selectedHost = useHostStore((s) => s.selectedHost);
    const setHost = useHostStore((s) => s.setHost);
    const { data, isLoading, refetch, isFetching } = useFleetNodes();

    if (!open) return null;

    const nodes = data?.nodes ?? [];
    const onlineCount = nodes.filter((n) => n.status === "online" || n.status === "local").length;
    const offlineCount = nodes.filter((n) => n.status === "offline" || n.status === "unreachable").length;

    const getNodeIcon = (id: string) => {
        switch (id) {
            case "laptop":
                return <Laptop className="w-5 h-5 text-primary" />;
            case "server":
                return <Server className="w-5 h-5 text-emerald-400" />;
            case "builder":
                return <Cpu className="w-5 h-5 text-amber-400" />;
            case "backup":
                return <ShieldCheck className="w-5 h-5 text-blue-400" />;
            default:
                return <Server className="w-5 h-5 text-muted-foreground" />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in">
            {/* Drawer Container */}
            <div className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl transition-transform animate-in slide-in-from-right duration-200">
                {/* ── Header ── */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Network className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold">NixOS Filo Yönetimi & Mesh Ağı</h2>
                            <p className="text-xs text-muted-foreground">
                                Colmena topolojisi, şifreli mesh bağlantısı ve çoklu host durumu
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                            Yenile
                        </button>
                        <button
                            onClick={() => onOpenChange(false)}
                            aria-label="Kapat"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* ── Stats Bar ── */}
                <div className="grid grid-cols-3 gap-3 border-b border-border/60 bg-muted/20 px-6 py-3">
                    <div className="flex flex-col p-2.5 rounded-lg border border-border bg-card/60">
                        <span className="text-[11px] text-muted-foreground">Toplam Düğüm</span>
                        <span className="text-lg font-bold">{nodes.length}</span>
                    </div>
                    <div className="flex flex-col p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                        <span className="text-[11px] text-emerald-400">Çevrimiçi / Yerel</span>
                        <span className="text-lg font-bold text-emerald-400">{onlineCount}</span>
                    </div>
                    <div className="flex flex-col p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10">
                        <span className="text-[11px] text-rose-400">Çevrimdışı</span>
                        <span className="text-lg font-bold text-rose-400">{offlineCount}</span>
                    </div>
                </div>

                {/* ── Nodes List ── */}
                <div className="flex flex-col gap-3 flex-1 overflow-y-auto p-6">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Bağlı Düğümler
                        </span>
                        {onOpenColmenaDeploy && (
                            <button
                                onClick={() => {
                                    onOpenChange(false);
                                    onOpenColmenaDeploy();
                                }}
                                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-xs"
                            >
                                <Rocket className="w-3.5 h-3.5" />
                                Colmena Dağıtımı Başlat
                            </button>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
                            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                            Düğümler taranıyor...
                        </div>
                    ) : nodes.length === 0 ? (
                        <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-sm">
                            Tanımlı düğüm bulunamadı.
                        </div>
                    ) : (
                        nodes.map((node) => {
                            const isSelected = selectedHost === node.id;
                            const isOnline = node.status === "online" || node.status === "local";

                            return (
                                <div
                                    key={node.id}
                                    className={`flex flex-col p-4 rounded-xl border transition-all ${
                                        isSelected
                                            ? "border-primary/60 bg-primary/5 shadow-sm"
                                            : "border-border bg-card/60 hover:border-border/80"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-lg bg-muted/60">
                                                {getNodeIcon(node.id)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm text-foreground">
                                                        {node.name}
                                                    </span>
                                                    {node.is_local && (
                                                        <span className="rounded-full bg-primary/10 border border-primary/30 px-2 py-0.2 text-[10px] font-medium text-primary">
                                                            Yerel İş İstasyonu
                                                        </span>
                                                    )}
                                                    {isSelected && (
                                                        <span className="rounded-full bg-primary px-2 py-0.2 text-[10px] font-semibold text-primary-foreground">
                                                            Aktif Panel
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground font-mono">
                                                    <span>{node.target_host}</span>
                                                    {node.mesh_ip && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-primary/80">Mesh: {node.mesh_ip}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isOnline ? (
                                                <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    {node.is_local ? "Local" : `${node.ping_ms}ms`}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-400">
                                                    <XCircle className="w-3 h-3" />
                                                    Offline
                                                </span>
                                            )}

                                            {!isSelected && (
                                                <button
                                                    onClick={() => setHost(node.id)}
                                                    className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
                                                >
                                                    Seç
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Roles & Tags */}
                                    <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-border/50">
                                        <span className="text-[11px] text-muted-foreground mr-1">Roller:</span>
                                        {node.roles?.map((r) => (
                                            <span
                                                key={r}
                                                className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground"
                                            >
                                                {r}
                                            </span>
                                        ))}
                                        {node.tags?.map((t) => (
                                            <span
                                                key={t}
                                                className="px-1.5 py-0.5 rounded bg-primary/10 text-[10px] font-mono text-primary"
                                            >
                                                #{t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* ── Mesh Info Footer ── */}
                <div className="p-4 border-t border-border bg-muted/20 text-xs text-muted-foreground flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <Activity className="w-3.5 h-3.5 text-primary" />
                        Bildirimsel Mesh Ağı (Tailscale / WireGuard)
                    </div>
                    <p className="text-[11px]">
                        Tüm düğümler <code className="text-primary font-mono">l7v.mesh</code> modülü üzerinden şifreli P2P tüneli ile birbirine bağlıdır. MagicDNS sayesinde <code className="text-primary font-mono">*.mesh</code> veya <code className="text-primary font-mono">*.l7v.internal</code> alan adları doğrudan çözümlenir.
                    </p>
                </div>
            </div>
        </div>
    );
}
