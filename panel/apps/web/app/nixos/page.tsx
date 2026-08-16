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
    FileText,
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
        <div className="space-y-6 pb-12">
            {/* ── Top Hero Status Card ── */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                            <GitBranch className="h-3.5 w-3.5" />
                            <span>Declarative NixOS Engine</span>
                        </div>
                        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <span>Generation #{nixosStatus?.current_generation ?? "—"}</span>
                            <Badge variant="success">Active System</Badge>
                        </h1>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            NixOS {nixosStatus?.version || "26.11"} · Kernel: {nixosStatus?.kernel_version || "6.13-zen"} · Uptime: {Math.floor((nixosStatus?.uptime_seconds || 0) / 3600)}h
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={rollback.isPending}
                            onClick={() => rollback.mutate()}
                            className="gap-1.5"
                        >
                            <RotateCcw className={`h-3.5 w-3.5 ${rollback.isPending ? "animate-spin" : ""}`} />
                            <span>{rollback.isPending ? "Rolling back..." : "Rollback Generation"}</span>
                        </Button>

                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => setRebuildModalOpen(true)}
                            className="gap-1.5 shadow-md"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Rebuild System (nh os switch)</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefreshAll}
                            className="gap-1"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Tabbed Workspace ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <TabsList>
                        <TabsTrigger value="generations" className="gap-2">
                            <Layers className="h-3.5 w-3.5 text-primary" />
                            <span>Generations Timeline ({generations.length})</span>
                        </TabsTrigger>
                        <TabsTrigger value="diff" className="gap-2">
                            <ArrowUpDown className="h-3.5 w-3.5 text-amber-500" />
                            <span>Package Diff Viewer</span>
                        </TabsTrigger>
                        <TabsTrigger value="flake" className="gap-2">
                            <GitBranch className="h-3.5 w-3.5 text-purple-400" />
                            <span>Flake Lockfile & Inputs</span>
                        </TabsTrigger>
                    </TabsList>

                    {activeTab === "generations" && (
                        <div className="relative w-64 hidden sm:block">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Filter generations..."
                                value={genSearch}
                                onChange={(e) => setGenSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-border/80 bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    )}
                </div>

                {/* ── TAB 1: GENERATIONS TIMELINE ── */}
                <TabsContent value="generations" className="space-y-4">
                    {loadingGens ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">Loading generations timeline...</div>
                    ) : filteredGenerations.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">No matching generations found.</div>
                    ) : (
                        <div className="space-y-2.5">
                            {filteredGenerations.map((gen) => {
                                const isCurrent = gen.number === nixosStatus?.current_generation;
                                return (
                                    <div
                                        key={gen.number}
                                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${
                                            isCurrent
                                                ? "border-primary/50 bg-primary/5 shadow-xs"
                                                : "border-border/70 bg-card hover:border-border"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div
                                                className={`flex h-9 w-9 items-center justify-center rounded-xl font-mono text-xs font-bold shrink-0 ${
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
                                                        <Badge variant="success">Current</Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {gen.date_formatted || "Unknown date"}
                                                    </span>
                                                    {gen.kernel_version && (
                                                        <span className="flex items-center gap-1 font-mono">
                                                            <Cpu className="h-3 w-3" />
                                                            {gen.kernel_version}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mt-3 sm:mt-0 shrink-0">
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
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* ── TAB 2: PACKAGE DIFF VIEWER ── */}
                <TabsContent value="diff" className="space-y-4">
                    {/* Select Generation Comparators */}
                    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border/70 bg-card">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Compare from:</span>
                            <select
                                value={diffFromGen}
                                onChange={(e) => setDiffFromGen(Number(e.target.value))}
                                className="rounded-lg border border-border/80 bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                {generations.map((g) => (
                                    <option key={g.number} value={g.number}>
                                        Gen #{g.number} ({g.date_formatted?.split(" ")[0] || "date"})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <ArrowRight className="h-4 w-4 text-muted-foreground" />

                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">To:</span>
                            <select
                                value={diffToGen}
                                onChange={(e) => setDiffToGen(Number(e.target.value))}
                                className="rounded-lg border border-border/80 bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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

                    {/* Diff Content Results */}
                    {loadingDiff ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">Computing generation diff...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Added Packages */}
                            <div className="rounded-xl border border-emerald-500/20 bg-card p-4 space-y-3">
                                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                                    <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
                                        <Plus className="h-3.5 w-3.5" /> Added Packages ({addedItems.length})
                                    </span>
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-1 font-mono text-xs text-muted-foreground">
                                    {addedItems.length > 0 ? (
                                        addedItems.map((pkg, idx) => (
                                            <div key={idx} className="flex items-center justify-between py-0.5">
                                                <span className="text-foreground">{pkg.name}</span>
                                                <span className="text-[10px] text-emerald-500">{pkg.new_version || "+new"}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div>No added packages.</div>
                                    )}
                                </div>
                            </div>

                            {/* Removed Packages */}
                            <div className="rounded-xl border border-destructive/20 bg-card p-4 space-y-3">
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
                <TabsContent value="flake" className="space-y-4">
                    {loadingFlake ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">Inspecting flake inputs...</div>
                    ) : (
                        <div className="space-y-3">
                            <div className="rounded-xl border border-border/70 bg-card p-4">
                                <h3 className="text-xs font-semibold text-foreground">Flake Path: {flakeInfo?.flake_path || "/home/l7v/dev/projects/company/active/nixos"}</h3>
                                <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                                    Lockfile Version: {flakeInfo?.lock_version || 7} · Total Inputs: {flakeInfo?.total_inputs || flakeInfo?.inputs?.length || 0}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {flakeInfo?.inputs?.map((input: FlakeInput) => (
                                    <div key={input.name} className="rounded-xl border border-border/60 bg-card p-3.5 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-foreground font-mono">{input.name}</span>
                                            <Badge variant="outline">{input.type || "git"}</Badge>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground font-mono truncate">
                                            {input.owner ? `${input.owner}/${input.repo}` : input.url || "local"}
                                        </p>
                                        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                                            <span>Rev: {input.short_revision || input.revision?.substring(0, 7) || "latest"}</span>
                                            <span className="text-emerald-500 font-semibold">Locked</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* ── Rebuild Live Console Modal ── */}
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
