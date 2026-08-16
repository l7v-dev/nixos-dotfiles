"use client";

import React, { useState, Suspense } from "react";
import {
    useStorage,
    useSnapperSnapshots,
    useCreateSnapshot,
    useDeleteSnapshot,
    useResticStatus,
    useTriggerResticBackup,
} from "@/hooks/useStorage";
import {
    HardDrive,
    Camera,
    RefreshCw,
    Plus,
    Clock,
    Shield,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Disc,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { SnapperSnapshot, RemovableDisk } from "@/types/api";

function StoragePageContent() {
    const [activeTab, setActiveTab] = useState<string>("snapshots");
    const [newSnapshotDesc, setNewSnapshotDesc] = useState("");

    const { data: snapData, isLoading: loadingSnaps, refetch: refetchSnaps } = useSnapperSnapshots();
    const { data: storageDisks, refetch: refetchDisks } = useStorage();
    const { data: resticData, refetch: refetchRestic } = useResticStatus();

    const createMutation = useCreateSnapshot();
    const deleteMutation = useDeleteSnapshot();
    const triggerBackupMutation = useTriggerResticBackup();

    const snapshots = snapData?.snapshots || [];

    const handleCreateSnapshot = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSnapshotDesc) return;
        createMutation.mutate(
            { description: newSnapshotDesc, config: "root" },
            {
                onSuccess: () => {
                    setNewSnapshotDesc("");
                    refetchSnaps();
                },
            }
        );
    };

    const handleRefreshAll = () => {
        refetchSnaps();
        refetchDisks();
        refetchRestic();
    };

    return (
        <div className="space-y-4 pb-12 font-sans">
            {/* ── Top Apparatus Header ── */}
            <div className="instrument-card p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-amber-500 shadow-glow" />
                            <h1 className="text-base font-bold text-foreground">
                                Storage, Btrfs Snapshots & Restic
                            </h1>
                            <Badge variant="outline" className="font-mono text-[10px]">
                                {snapshots.length} Snapshots
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Btrfs subvolume timelines, declarative Snapper snapshots, and encrypted Restic offsite backups.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Button
                            variant="default"
                            size="xs"
                            onClick={() => setActiveTab("new-snapshot")}
                            className="gap-1.5 shadow-sm"
                        >
                            <Camera className="h-3 w-3" />
                            <span>Create Snapshot</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="xs"
                            onClick={handleRefreshAll}
                            className="gap-1"
                        >
                            <RefreshCw className="h-3 w-3" />
                            <span>Refresh</span>
                        </Button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-border/60 mt-4">
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Root Filesystem</span>
                        <p className="text-sm font-bold font-mono text-foreground pt-0.5">Btrfs Subvolumes</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Timeline Snapshots</span>
                        <p className="text-lg font-bold font-mono tnum text-primary">{snapshots.length}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Restic Service</span>
                        <p className="text-sm font-bold font-mono text-emerald-400 pt-0.5">
                            {resticData?.service_active ? "● Active" : "○ Standby"}
                        </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Removable Media</span>
                        <p className="text-lg font-bold font-mono tnum text-foreground">
                            {storageDisks?.length || 0} Connected
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Tabs Workspace ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="snapshots" className="gap-1.5 text-xs">
                        <Camera className="h-3.5 w-3.5" />
                        <span>Snapshots ({snapshots.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="new-snapshot" className="gap-1.5 text-xs">
                        <Plus className="h-3.5 w-3.5" />
                        <span>Take Snapshot</span>
                    </TabsTrigger>
                    <TabsTrigger value="restic" className="gap-1.5 text-xs">
                        <Shield className="h-3.5 w-3.5" />
                        <span>Restic Backup</span>
                    </TabsTrigger>
                    <TabsTrigger value="devices" className="gap-1.5 text-xs">
                        <Disc className="h-3.5 w-3.5" />
                        <span>Block Devices</span>
                    </TabsTrigger>
                </TabsList>

                {/* 1. Snapshots Table */}
                <TabsContent value="snapshots">
                    <div className="instrument-card p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-foreground">
                                Snapper Subvolume Snapshot History
                            </p>
                            <span className="text-[10px] font-mono text-muted-foreground">
                                Config: root
                            </span>
                        </div>

                        {loadingSnaps ? (
                            <div className="p-8 text-center text-xs text-muted-foreground font-mono">
                                Loading snapshot metadata…
                            </div>
                        ) : snapshots.length === 0 ? (
                            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                                No Snapper snapshots recorded on this host.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-border/60">
                                <table className="w-full text-left text-xs font-mono">
                                    <thead className="bg-muted/60 text-muted-foreground border-b border-border/60">
                                        <tr>
                                            <th className="p-2.5 font-semibold">#</th>
                                            <th className="p-2.5 font-semibold">Type</th>
                                            <th className="p-2.5 font-semibold">Description</th>
                                            <th className="p-2.5 font-semibold">Timestamp</th>
                                            <th className="p-2.5 font-semibold">Cleanup</th>
                                            <th className="p-2.5 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {snapshots.map((snap: SnapperSnapshot) => (
                                            <tr key={snap.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="p-2.5 font-bold text-primary tnum">#{snap.id}</td>
                                                <td className="p-2.5">
                                                    <Badge variant="outline" className="text-[10px] capitalize">
                                                        {snap.type || "single"}
                                                    </Badge>
                                                </td>
                                                <td className="p-2.5 font-sans font-medium text-foreground truncate max-w-xs">
                                                    {snap.description || "Manual checkpoint"}
                                                </td>
                                                <td className="p-2.5 text-muted-foreground tnum">
                                                    {snap.date || "Recent"}
                                                </td>
                                                <td className="p-2.5 text-muted-foreground">
                                                    {snap.cleanup || "number"}
                                                </td>
                                                <td className="p-2.5 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="xs"
                                                        onClick={() => deleteMutation.mutate({ id: snap.id, config: "root" })}
                                                        disabled={deleteMutation.isPending}
                                                        className="text-destructive hover:bg-destructive/10 h-6 px-1.5"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* 2. New Snapshot Form */}
                <TabsContent value="new-snapshot">
                    <div className="instrument-card p-4 sm:p-5 max-w-lg space-y-4">
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">Create Btrfs Snapshot</h3>
                            <p className="text-xs text-muted-foreground">
                                Capture an instant read-only subvolume checkpoint with Snapper.
                            </p>
                        </div>

                        <form onSubmit={handleCreateSnapshot} className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-foreground">
                                    Snapshot Description
                                </label>
                                <input
                                    type="text"
                                    value={newSnapshotDesc}
                                    onChange={(e) => setNewSnapshotDesc(e.target.value)}
                                    placeholder="e.g. Before system flake update..."
                                    className="w-full rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                                />
                            </div>

                            <Button
                                type="submit"
                                size="xs"
                                variant="default"
                                disabled={!newSnapshotDesc || createMutation.isPending}
                                className="gap-1.5 shadow-sm"
                            >
                                <Camera className="h-3 w-3" />
                                <span>{createMutation.isPending ? "Creating…" : "Save Snapshot"}</span>
                            </Button>
                        </form>
                    </div>
                </TabsContent>

                {/* 3. Restic Backup Status */}
                <TabsContent value="restic">
                    <div className="instrument-card p-4 sm:p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Restic Backup Posture</h3>
                                <p className="text-xs text-muted-foreground">
                                    Encrypted deduplicated backups to remote target.
                                </p>
                            </div>
                            <Button
                                size="xs"
                                variant="default"
                                onClick={() => triggerBackupMutation.mutate()}
                                disabled={triggerBackupMutation.isPending}
                                className="gap-1.5 shadow-sm"
                            >
                                <Shield className="h-3 w-3" />
                                <span>{triggerBackupMutation.isPending ? "Running…" : "Trigger Backup"}</span>
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div className="rounded-lg border border-border/60 bg-background/50 p-3 space-y-1">
                                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Status</span>
                                <p className="text-xs font-bold font-mono text-emerald-400">
                                    {resticData?.service_active ? "● Service Running" : "○ Idle"}
                                </p>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-background/50 p-3 space-y-1">
                                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Target</span>
                                <p className="text-xs font-bold font-mono text-foreground truncate">
                                    {resticData?.repository || "S3 Encrypted Bucket"}
                                </p>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-background/50 p-3 space-y-1">
                                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Schedule</span>
                                <p className="text-xs font-bold font-mono text-muted-foreground">
                                    Daily via systemd.timer
                                </p>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* 4. Block Devices */}
                <TabsContent value="devices">
                    <div className="instrument-card p-4 sm:p-5 space-y-3">
                        <p className="text-xs font-semibold text-foreground">
                            Connected Storage Media & Disks
                        </p>
                        {(!storageDisks || storageDisks.length === 0) ? (
                            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                                No external block devices detected.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {storageDisks.map((d: RemovableDisk) => (
                                    <div key={d.device} className="rounded-lg border border-border/60 bg-background/50 p-3 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold font-mono text-foreground">{d.device}</span>
                                            <Badge variant="outline" className="text-[10px]">{d.size_gib} GiB</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{d.label || "Storage Volume"}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function StoragePage() {
    return (
        <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading Storage Dashboard...</div>}>
            <StoragePageContent />
        </Suspense>
    );
}
