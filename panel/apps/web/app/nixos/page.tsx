"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
    useNixOS,
    useNixOSGenerations,
    useGenerationDiff,
    useSwitchGeneration,
    useRollback,
    useFlakeInfo,
} from "@/hooks/useNixOS";
import { RebuildConsoleModal } from "@/components/cockpit/RebuildConsoleModal";
import {
    GitBranch,
    RotateCcw,
    Sparkles,
    CheckCircle2,
    Clock,
    Cpu,
    Search,
    ArrowRight,
    ArrowUpDown,
    Plus,
    Minus,
    RefreshCw,
    Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { NixOSGeneration, PackageDiffItem, FlakeInput } from "@/types/api";

function NixOSPageContent() {
    const searchParams = useSearchParams();
    const initialAction = searchParams.get("action");
    const initialTab = searchParams.get("tab") || "generations";

    const [activeTab, setActiveTab] = useState<string>(initialTab);
    const [rebuildModalOpen, setRebuildModalOpen] = useState(initialAction === "rebuild");

    const { data: nixosStatus, refetch: refetchStatus } = useNixOS();
    const { data: genData, isLoading: loadingGens, refetch: refetchGens } = useNixOSGenerations();
    const { data: flakeInfo, isLoading: loadingFlake, refetch: refetchFlake } = useFlakeInfo();

    const switchGen = useSwitchGeneration();
    const rollback = useRollback();

    // Diff state
    const currentGenNum = nixosStatus?.current_generation ?? 1;
    const [diffToGen, setDiffToGen] = useState<number>(currentGenNum);
    const [diffFromGen, setDiffFromGen] = useState<number>(Math.max(1, currentGenNum - 1));
    const [showRawDiff, setShowRawDiff] = useState(false);

    const { data: diffData, isLoading: loadingDiff } = useGenerationDiff(
        activeTab === "diff" ? diffFromGen : undefined,
        activeTab === "diff" ? diffToGen : undefined
    );

    // Filtered generations
    const [genSearch, setGenSearch] = useState("");
    const generations: NixOSGeneration[] = genData?.generations ?? [];
    const filteredGenerations = generations.filter((g) => {
        if (!genSearch) return true;
        const q = genSearch.toLowerCase();
        return (
            String(g.number).includes(q) ||
            g.nixos_version?.toLowerCase().includes(q) ||
            g.kernel_version?.toLowerCase().includes(q)
        );
    });

    const handleRefreshAll = () => {
        refetchStatus();
        refetchGens();
        refetchFlake();
    };

    const addedItems = diffData?.items?.filter((i) => i.change_type === "added") ?? [];
    const removedItems = diffData?.items?.filter((i) => i.change_type === "removed") ?? [];

    return (
        <div className="space-y-4 pb-12 font-sans">
            {/* ── Top Apparatus Header ── */}
            <div className="instrument-card p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-primary shadow-glow" />
                            <h1 className="text-base font-bold text-foreground">
                                Declarative NixOS Engine & Generations
                            </h1>
                            <Badge variant="success" className="font-mono text-[10px]">
                                Active Gen #{nixosStatus?.current_generation ?? "—"}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Immutable system configuration timeline, sub-second atomic rollback, package delta diffing, and Flake lockfile inspection.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Button
                            variant="destructive"
                            size="xs"
                            disabled={rollback.isPending}
                            onClick={() => rollback.mutate()}
                            className="gap-1.5"
                        >
                            <RotateCcw className={`h-3 w-3 ${rollback.isPending ? "animate-spin" : ""}`} />
                            <span>{rollback.isPending ? "Rolling back…" : "Rollback Gen"}</span>
                        </Button>

                        <Button
                            variant="default"
                            size="xs"
                            onClick={() => setRebuildModalOpen(true)}
                            className="gap-1.5 shadow-sm"
                        >
                            <Sparkles className="h-3 w-3" />
                            <span>Rebuild (nh os switch)</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="xs"
                            onClick={handleRefreshAll}
                            className="gap-1"
                        >
                            <RefreshCw className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-border/60 mt-4">
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Active Generation</span>
                        <p className="text-lg font-bold font-mono tnum text-primary">#{nixosStatus?.current_generation ?? "—"}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Generations</span>
                        <p className="text-lg font-bold font-mono tnum text-foreground">{generations.length}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Kernel Version</span>
                        <p className="text-xs font-bold font-mono text-foreground truncate pt-1">
                            {nixosStatus?.kernel_version || "6.13-zen"}
                        </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Flake Inputs</span>
                        <p className="text-lg font-bold font-mono tnum text-primary">
                            {flakeInfo?.inputs?.length || 0} Locked
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Tabbed Workspace ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
                    <TabsList>
                        <TabsTrigger value="generations" className="gap-1.5 text-xs">
                            <Layers className="h-3.5 w-3.5" strokeWidth={1.5} />
                            <span>Generations Timeline ({generations.length})</span>
                        </TabsTrigger>
                        <TabsTrigger value="diff" className="gap-1.5 text-xs">
                            <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                            <span>Package Diff</span>
                        </TabsTrigger>
                        <TabsTrigger value="flake" className="gap-1.5 text-xs">
                            <GitBranch className="h-3.5 w-3.5" strokeWidth={1.5} />
                            <span>Flake Lockfile</span>
                        </TabsTrigger>
                    </TabsList>

                    {activeTab === "generations" && (
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Filter generations..."
                                value={genSearch}
                                onChange={(e) => setGenSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-border/80 bg-card focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                            />
                        </div>
                    )}
                </div>

                {/* ── TAB 1: GENERATIONS TIMELINE ── */}
                <TabsContent value="generations" className="space-y-2.5">
                    {loadingGens ? (
                        <div className="p-8 text-center text-xs text-muted-foreground font-mono">Loading generations timeline...</div>
                    ) : filteredGenerations.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                            No matching generations found.
                        </div>
                    ) : (
                        filteredGenerations.map((gen) => {
                            const isCurrent = gen.number === nixosStatus?.current_generation;
                            return (
                                <div
                                    key={gen.number}
                                    className={`instrument-card flex flex-col sm:flex-row sm:items-center justify-between p-3.5 transition-all ${
                                        isCurrent ? "border-primary/50 ring-1 ring-primary/30" : ""
                                    }`}
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div
                                            className={`flex h-8 w-8 items-center justify-center rounded-lg font-mono text-xs font-bold shrink-0 ${
                                                isCurrent
                                                    ? "bg-primary text-primary-foreground shadow-xs"
                                                    : "bg-muted/60 text-muted-foreground border border-border/60"
                                            }`}
                                        >
                                            #{gen.number}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-semibold text-foreground truncate">
                                                    NixOS {gen.nixos_version || `Generation ${gen.number}`}
                                                </p>
                                                {isCurrent && (
                                                    <Badge variant="success" className="text-[10px]">Current</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground font-mono">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {gen.date_formatted || "Unknown date"}
                                                </span>
                                                {gen.kernel_version && (
                                                    <span className="flex items-center gap-1">
                                                        <Cpu className="h-3 w-3" />
                                                        {gen.kernel_version}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-2.5 sm:mt-0 shrink-0">
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            onClick={() => {
                                                setDiffToGen(gen.number);
                                                setActiveTab("diff");
                                            }}
                                        >
                                            Diff
                                        </Button>

                                        {!isCurrent && (
                                            <Button
                                                size="xs"
                                                variant="secondary"
                                                disabled={switchGen.isPending}
                                                onClick={() => switchGen.mutate({ generation: gen.number })}
                                            >
                                                Switch to #{gen.number}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </TabsContent>

                {/* ── TAB 2: PACKAGE DIFF VIEWER ── */}
                <TabsContent value="diff" className="space-y-4">
                    <div className="instrument-card p-4 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="text-muted-foreground">From:</span>
                            <select
                                value={diffFromGen}
                                onChange={(e) => setDiffFromGen(Number(e.target.value))}
                                className="rounded-lg border border-border/80 bg-background px-2.5 py-1 text-xs text-foreground"
                            >
                                {generations.map((g) => (
                                    <option key={g.number} value={g.number}>
                                        Gen #{g.number} ({g.date_formatted?.split(" ")[0] || "date"})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <ArrowRight className="h-4 w-4 text-muted-foreground" />

                        <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="text-muted-foreground">To:</span>
                            <select
                                value={diffToGen}
                                onChange={(e) => setDiffToGen(Number(e.target.value))}
                                className="rounded-lg border border-border/80 bg-background px-2.5 py-1 text-xs text-foreground"
                            >
                                {generations.map((g) => (
                                    <option key={g.number} value={g.number}>
                                        Gen #{g.number} ({g.date_formatted?.split(" ")[0] || "date"})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="ml-auto">
                            <Button
                                size="xs"
                                variant="outline"
                                onClick={() => setShowRawDiff((prev) => !prev)}
                            >
                                {showRawDiff ? "Visual Summary" : "Raw Diff"}
                            </Button>
                        </div>
                    </div>

                    {loadingDiff ? (
                        <div className="p-8 text-center text-xs text-muted-foreground font-mono">Computing generation diff…</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Added Packages */}
                            <div className="instrument-card p-4 space-y-3">
                                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                                        <Plus className="h-3.5 w-3.5" /> Added Packages ({addedItems.length})
                                    </span>
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-1 font-mono text-xs text-muted-foreground">
                                    {addedItems.length > 0 ? (
                                        addedItems.map((pkg, idx) => (
                                            <div key={idx} className="flex items-center justify-between py-0.5">
                                                <span className="text-foreground">{pkg.name}</span>
                                                <span className="text-[10px] text-emerald-400">{pkg.new_version || "+new"}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div>No added packages.</div>
                                    )}
                                </div>
                            </div>

                            {/* Removed Packages */}
                            <div className="instrument-card p-4 space-y-3">
                                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                                    <span className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                                        <Minus className="h-3.5 w-3.5" /> Removed Packages ({removedItems.length})
                                    </span>
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-1 font-mono text-xs text-muted-foreground">
                                    {removedItems.length > 0 ? (
                                        removedItems.map((pkg, idx) => (
                                            <div key={idx} className="flex items-center justify-between py-0.5">
                                                <span className="text-foreground">{pkg.name}</span>
                                                <span className="text-[10px] text-destructive">{pkg.old_version || "-removed"}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div>No removed packages.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* ── TAB 3: FLAKE LOCKFILE & INPUTS ── */}
                <TabsContent value="flake" className="space-y-3">
                    <div className="instrument-card p-4">
                        <h3 className="text-xs font-semibold text-foreground">Flake Path: {flakeInfo?.flake_path || "/home/l7v/dev/projects/company/active/nixos"}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                            Lockfile Version: {flakeInfo?.lock_version || 7} · Total Inputs: {flakeInfo?.total_inputs || flakeInfo?.inputs?.length || 0}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {flakeInfo?.inputs?.map((input: FlakeInput) => (
                            <div key={input.name} className="instrument-card p-3.5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground font-mono">{input.name}</span>
                                    <Badge variant="outline">{input.type || "git"}</Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground font-mono truncate">
                                    {input.owner ? `${input.owner}/${input.repo}` : input.url || "local"}
                                </p>
                                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                                    <span>Rev: {input.short_revision || input.revision?.substring(0, 7) || "latest"}</span>
                                    <span className="text-emerald-400 font-semibold">Locked</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Rebuild Console Modal */}
            <RebuildConsoleModal
                open={rebuildModalOpen}
                onClose={() => setRebuildModalOpen(false)}
            />
        </div>
    );
}

export default function NixOSPage() {
    return (
        <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading NixOS Engine...</div>}>
            <NixOSPageContent />
        </Suspense>
    );
}
