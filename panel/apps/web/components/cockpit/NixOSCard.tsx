"use client";

import { useState } from "react";
import {
    Sparkles, Trash2, HardDrive,
    RotateCcw, CheckCircle2, AlertCircle,
    Layers, Cpu, Clock, Terminal,
    GitBranch, ArrowUpDown, RefreshCw,
    Network, Rocket,
} from "lucide-react";
import { useNixOS, useNixOSGenerations, useRollback } from "@/hooks/useNixOS";
import { GenerationsDrawer } from "./GenerationsDrawer";
import { RebuildConsoleModal } from "./RebuildConsoleModal";
import { FleetDrawer } from "./FleetDrawer";
import { ColmenaDeployModal } from "./ColmenaDeployModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function NixOSCard() {
    const { data: nixos, garbageCollect, storeOptimise, isLoading, refetch } = useNixOS();
    const { data: genData } = useNixOSGenerations();
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
                    const freed = res.freed_mb ? `${res.freed_mb} MB cleaned!` : "Garbage collection completed!";
                    setResultMsg({ ok: true, msg: `Garbage Collection: ${freed}` });
                },
                onError: (err) => {
                    setResultMsg({ ok: false, msg: err.message ?? "GC failed" });
                },
            }
        );
    };

    const handleOptimise = () => {
        setResultMsg(null);
        storeOptimise.mutate(undefined, {
            onSuccess: (res) => {
                const freed = res.freed_mb ? `${res.freed_mb} MB deduplicated via hardlinks!` : "Store optimised!";
                setResultMsg({ ok: true, msg: `Store Optimise: ${freed}` });
            },
            onError: (err) => {
                setResultMsg({ ok: false, msg: err.message ?? "Store optimisation failed" });
            },
        });
    };

    const handleQuickRollback = () => {
        setResultMsg(null);
        if (!confirm("Revert to previous generation (Rollback)? Proceed?")) {
            return;
        }

        rollback.mutate(undefined, {
            onSuccess: (res) => {
                setResultMsg({
                    ok: true,
                    msg: `Rollback completed → Active Generation: #${res.target_generation || res.current_generation}`,
                });
                refetch();
            },
            onError: (err) => {
                setResultMsg({ ok: false, msg: err.message ?? "Rollback failed" });
            },
        });
    };

    const currentGen = nixos?.current_generation ?? "—";
    const totalGens = genData?.generations?.length ?? 0;
    const kernel = nixos?.kernel_version ?? "Linux";
    const nixVersion = nixos?.version ?? "NixOS";

    return (
        <>
            <div className="instrument-card p-4 sm:p-5 space-y-4">
                {/* ── 1. Header & Status ── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
                            <GitBranch className="h-4 w-4" strokeWidth={1.6} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold leading-tight text-foreground whitespace-nowrap">NixOS System Engine</p>
                            <p className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                                {isLoading ? "Reading system state…" : `Generation #${currentGen} · ${kernel}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant="info" className="whitespace-nowrap">
                            In Sync
                        </Badge>
                        <Button
                            size="xs"
                            variant="default"
                            onClick={() => setRebuildModalOpen(true)}
                            className="gap-1 shadow-sm h-7 text-xs"
                        >
                            <Sparkles className="h-3 w-3" strokeWidth={1.75} />
                            <span>Rebuild</span>
                        </Button>
                    </div>
                </div>

                {/* ── 2. Primary Telemetry Metric Grid ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Active Generation */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                            Active Generation
                        </p>
                        <p className="text-lg font-bold font-mono tnum text-primary whitespace-nowrap truncate">
                            #{currentGen}
                        </p>
                        <p className="text-[10px] text-muted-foreground whitespace-nowrap truncate">
                            {totalGens} stored generations
                        </p>
                    </div>

                    {/* Kernel Version */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                            Linux Kernel
                        </p>
                        <p className="text-xs font-bold font-mono text-foreground whitespace-nowrap truncate">
                            {kernel}
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap truncate">
                            ● Zen Kernel
                        </p>
                    </div>

                    {/* Nix Daemon */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                            Nix Engine
                        </p>
                        <p className="text-xs font-bold font-mono text-foreground whitespace-nowrap truncate">
                            {nixVersion}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap truncate">
                            Flakes Enabled
                        </p>
                    </div>

                    {/* Store Optimization */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                            Nix Store
                        </p>
                        <p className="text-xs font-bold font-mono text-foreground whitespace-nowrap truncate">
                            /nix/store
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap truncate">
                            Auto-optimise on
                        </p>
                    </div>
                </div>

                {/* Status Message Notification */}
                {resultMsg && (
                    <div
                        className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs font-mono ${
                            resultMsg.ok
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "border-destructive/30 bg-destructive/10 text-destructive"
                        }`}
                    >
                        {resultMsg.ok ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                        )}
                        <span className="flex-1">{resultMsg.msg}</span>
                    </div>
                )}

                {/* ── 3. Tactile Action Controls ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <Button
                        variant="outline"
                        size="xs"
                        onClick={handleGC}
                        disabled={garbageCollect.isPending}
                        className="gap-1.5 justify-start text-xs font-medium h-8 text-amber-700 dark:text-amber-400"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Garbage Collect</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="xs"
                        onClick={handleOptimise}
                        disabled={storeOptimise.isPending}
                        className="gap-1.5 justify-start text-xs font-medium h-8 text-blue-600 dark:text-blue-400"
                    >
                        <HardDrive className="h-3.5 w-3.5" />
                        <span>Optimise Store</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="xs"
                        onClick={handleQuickRollback}
                        disabled={rollback.isPending}
                        className="gap-1.5 justify-start text-xs font-medium h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Quick Rollback</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setColmenaModalOpen(true)}
                        className="gap-1.5 justify-start text-xs font-medium h-8 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                    >
                        <Rocket className="h-3.5 w-3.5" />
                        <span>Colmena Deploy</span>
                    </Button>
                </div>

                {/* ── 4. Progressive Disclosure Links ── */}
                <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="flex items-center gap-1 hover:text-foreground transition-colors font-medium"
                    >
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span>Inspect Generations & Diffs ({totalGens})</span>
                    </button>

                    <button
                        onClick={() => setFleetDrawerOpen(true)}
                        className="flex items-center gap-1 hover:text-foreground transition-colors font-medium"
                    >
                        <Network className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Fleet Node Matrix</span>
                    </button>
                </div>
            </div>

            {/* Modals & Drawers */}
            <GenerationsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
            <RebuildConsoleModal open={rebuildModalOpen} onClose={() => setRebuildModalOpen(false)} />
            <FleetDrawer open={fleetDrawerOpen} onOpenChange={setFleetDrawerOpen} />
            <ColmenaDeployModal open={colmenaModalOpen} onOpenChange={setColmenaModalOpen} />
        </>
    );
}
