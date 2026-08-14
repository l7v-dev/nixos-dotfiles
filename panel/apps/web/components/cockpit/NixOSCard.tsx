"use client";

import { useState } from "react";
import {
    Sparkles, Trash2, HardDrive,
    RotateCcw, CheckCircle2, AlertCircle,
    Layers, Cpu, Clock,
} from "lucide-react";
import { useNixOS } from "@/hooks/useNixOS";

export function NixOSCard() {
    const { data: nixos, garbageCollect, storeOptimise, isLoading } = useNixOS();
    const [resultMsg, setResultMsg] = useState<{ ok: boolean; msg: string } | null>(null);

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
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
                        <Layers className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">NixOS ve Sistem Bakımı</p>
                        <p className="text-[11px] text-muted-foreground">
                            {isLoading ? "Yükleniyor…" : nixos?.version ?? "NixOS Linux"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-500 border border-cyan-500/20">
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

            {/* Maintenance Actions */}
            <div className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3.5">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-2">
                    Tek Tıkla Disk & Store Bakımı
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                    {/* Garbage Collect */}
                    <button
                        onClick={handleGC}
                        disabled={garbageCollect.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
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
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                        {storeOptimise.isPending ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                            <Sparkles className="h-3.5 w-3.5" />
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
        </div>
    );
}
