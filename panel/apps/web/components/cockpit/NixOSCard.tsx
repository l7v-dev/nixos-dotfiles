"use client";

import { useState } from "react";
import {
    Sparkles, Trash2, HardDrive,
    RotateCcw, CheckCircle2, AlertCircle,
    Layers, Cpu, Clock, Terminal,
    GitBranch, ArrowUpDown, RefreshCw,
} from "lucide-react";
import { useNixOS, useRollback } from "@/hooks/useNixOS";
import { GenerationsDrawer } from "./GenerationsDrawer";
import { RebuildConsoleModal } from "./RebuildConsoleModal";
import { FleetDrawer } from "./FleetDrawer";
import { ColmenaDeployModal } from "./ColmenaDeployModal";
import { Network, Rocket } from "lucide-react";

export function NixOSCard() {
    const { data: nixos, garbageCollect, storeOptimise, isLoading, refetch } = useNixOS();
    const rollback = useRollback();

    const [resultMsg, setResultMsg] = useState<{ ok: boolean; msg: string } | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [rebuildModalOpen, setRebuildModalOpen] = useState(false);
    const [fleetDrawerOpen, setFleetDrawerOpen] = useState(false);
    const [colmenaModalOpen, setColmenaModalOpen] = useState(false);

    const handleGC = () => {
        setResultMsg(null);
        garbageCollect.mutate(
            { deleteOlderThan: "14d" },
            {
                onSuccess: (res) => {
                    const freed = res.freed_mb ? `${res.freed_mb} MB alan temizlendi!` : "Temizlik tamamlandı!";
                    setResultMsg({ ok: true, msg: `Garbage Collection: ${freed}` });
                },
                onError: (err) => {
                    setResultMsg({ ok: false, msg: err.message ?? "GC işlemi başarısız oldu" });
                },
            }
        );
    };

    const handleOptimise = () => {
        setResultMsg(null);
        storeOptimise.mutate(undefined, {
            onSuccess: (res) => {
                const freed = res.freed_mb ? `${res.freed_mb} MB hardlink ile tekilleştirildi!` : "Store optimize edildi!";
                setResultMsg({ ok: true, msg: `Store Optimise: ${freed}` });
            },
            onError: (err) => {
                setResultMsg({ ok: false, msg: err.message ?? "Store optimizasyonu başarısız oldu" });
            },
        });
    };

    const handleQuickRollback = () => {
        setResultMsg(null);
        if (!confirm("Önceki jenerasyona geri dönülecek (Rollback). Devam edilsin mi?")) {
            return;
        }

        rollback.mutate(undefined, {
            onSuccess: (res) => {
                setResultMsg({
                    ok: true,
                    msg: `Rollback tamamlandı → Aktif Jenerasyon: #${res.target_generation || res.current_generation}`,
                });
                refetch();
            },
            onError: (err) => {
                setResultMsg({ ok: false, msg: err.message ?? "Rollback işlemi başarısız oldu" });
            },
        });
    };

    const formatUptime = (sec: number) => {
        const d = Math.floor(sec / 86400);
        const h = Math.floor((sec % 86400) / 3600);
        const m = Math.floor((sec % 3600) / 60);
        if (d > 0) return `${d}g ${h}s`;
        if (h > 0) return `${h}s ${m}d`;
        return `${m} dakika`;
    };

    return (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                        <Layers className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">NixOS ve Sistem Flake</p>
                        <p className="text-[11px] text-muted-foreground">
                            {isLoading ? "Yükleniyor…" : nixos?.version ?? "NixOS Linux"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-500 border border-cyan-500/30">
                        Gen #{nixos?.current_generation ?? 1}
                    </span>
                </div>
            </div>

            {/* System Info Badges */}
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-border/50 bg-background/40 p-2.5 space-y-0.5">
                    <span className="flex items-center gap-1 text-[10px] uppercase font-semibold text-muted-foreground">
                        <Cpu className="h-3 w-3" /> Kernel
                    </span>
                    <p className="font-mono truncate font-medium">{nixos?.kernel_version ?? "Linux"}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/40 p-2.5 space-y-0.5">
                    <span className="flex items-center gap-1 text-[10px] uppercase font-semibold text-muted-foreground">
                        <Clock className="h-3 w-3" /> Uptime
                    </span>
                    <p className="font-mono font-medium">{formatUptime(nixos?.uptime_seconds ?? 0)}</p>
                </div>
            </div>

            {/* ── Flake & Generation Primary Actions ── */}
            <div className="space-y-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] uppercase font-semibold text-cyan-500 tracking-wider">
                        Flake, Jenerasyon & Canlı Rebuild
                    </p>
                    <span className="text-[10px] text-muted-foreground">nh os switch / nix-store</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Open Generations Drawer */}
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted hover:border-border/80 transition-all shadow-xs"
                    >
                        <ArrowUpDown className="h-3.5 w-3.5 text-cyan-500" />
                        Jenerasyonlar & Diff
                    </button>

                    {/* Open Live Rebuild Console */}
                    <button
                        onClick={() => setRebuildModalOpen(true)}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
                    >
                        <Terminal className="h-3.5 w-3.5" />
                        Canlı Rebuild Konsolu
                    </button>
                </div>

                {/* Quick Rollback */}
                <button
                    onClick={handleQuickRollback}
                    disabled={rollback.isPending}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-400 hover:bg-orange-500/20 disabled:opacity-40 transition-colors"
                >
                    {rollback.isPending ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                        <RotateCcw className="h-3 w-3" />
                    )}
                    Önceki Jenerasyona Geri Dön (Rollback)
                </button>
            </div>

            {/* ── Multi-Host Fleet & Mesh Networking ── */}
            <div className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1.5">
                    Filo Yönetimi & Mesh Ağı
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                        onClick={() => setFleetDrawerOpen(true)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                    >
                        <Network className="h-3.5 w-3.5 text-emerald-400" />
                        Filo & Mesh Durumu
                    </button>
                    <button
                        onClick={() => setColmenaModalOpen(true)}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-600/30 transition-colors"
                    >
                        <Rocket className="h-3.5 w-3.5 text-emerald-400" />
                        Colmena Dağıtımı
                    </button>
                </div>
            </div>

            {/* ── Maintenance Actions (GC & Optimise) ── */}
            <div className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1.5">
                    Disk & Store Bakımı
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                    {/* Garbage Collect */}
                    <button
                        onClick={handleGC}
                        disabled={garbageCollect.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                    >
                        {garbageCollect.isPending ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                            <Trash2 className="h-3.5 w-3.5 text-orange-500" />
                        )}
                        Garbage Collect (GC)
                    </button>

                    {/* Store Optimise */}
                    <button
                        onClick={handleOptimise}
                        disabled={storeOptimise.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                    >
                        {storeOptimise.isPending ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                        )}
                        Store Optimize Et
                    </button>
                </div>
            </div>

            {/* Feedback message */}
            {resultMsg && (
                <div
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs ${
                        resultMsg.ok
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                            : "border-destructive/30 bg-destructive/10 text-destructive"
                    }`}
                >
                    {resultMsg.ok ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span className="leading-tight">{resultMsg.msg}</span>
                </div>
            )}

            {/* Drawer & Modal Components */}
            <GenerationsDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onOpenRebuildModal={() => {
                    setDrawerOpen(false);
                    setRebuildModalOpen(true);
                }}
            />

            <RebuildConsoleModal
                open={rebuildModalOpen}
                onClose={() => setRebuildModalOpen(false)}
            />

            <FleetDrawer
                open={fleetDrawerOpen}
                onOpenChange={setFleetDrawerOpen}
                onOpenColmenaDeploy={() => {
                    setFleetDrawerOpen(false);
                    setColmenaModalOpen(true);
                }}
            />

            <ColmenaDeployModal
                open={colmenaModalOpen}
                onOpenChange={setColmenaModalOpen}
            />
        </div>
    );
}
