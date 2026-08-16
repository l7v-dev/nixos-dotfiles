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
    RotateCcw,
    RefreshCw,
    Plus,
    Clock,
    Database,
    Shield,
    Trash2,
    CheckCircle2,
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
        <div className="space-y-6 pb-12">
            {/* ── Top Hero Banner ── */}
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-background p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-400">
                            <HardDrive className="h-3.5 w-3.5" />
                            <span>Storage, Snapper & Restic</span>
                        </div>
                        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <span>Btrfs Timeline Snapshots & Offsite Backups</span>
                        </h1>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Create instant pre/post system snapshots with Snapper, restore filesystem states, and track encrypted Restic backups to AWS S3 & SFTP.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => setActiveTab("new-snapshot")}
                            className="gap-1.5 shadow-md bg-amber-600 hover:bg-amber-500 text-white"
                        >
                            <Camera className="h-3.5 w-3.5" />
                            <span>Create Snapshot</span>
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

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
                    <span className="text-[11px] text-muted-foreground">Total Snapshots</span>
                    <p className="text-xl font-bold mt-1 font-mono text-foreground">{snapshots.length}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-xs">
                    <span className="text-[11px] text-emerald-500">Root Filesystem</span>
                    <p className="text-xl font-bold mt-1 font-mono text-emerald-500">Btrfs Subvolume</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
                    <span className="text-[11px] text-muted-foreground">Restic Repositories</span>
                    <p className="text-xl font-bold mt-1 font-mono text-foreground">S3 & SFTP</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
                    <span className="text-[11px] text-muted-foreground">Auto Cleanup</span>
                    <p className="text-xl font-bold mt-1 font-mono text-primary">Hourly / Daily</p>
                </div>
            </div>

            {/* ── Tabs Workspace ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="snapshots" className="gap-2">
                        <Camera className="h-3.5 w-3.5 text-amber-500" />
                        <span>Btrfs Snapshots ({snapshots.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="new-snapshot" className="gap-2">
                        <Plus className="h-3.5 w-3.5 text-primary" />
                        <span>Take Snapshot</span>
                    </TabsTrigger>
                    <TabsTrigger value="disks" className="gap-2">
                        <HardDrive className="h-3.5 w-3.5 text-blue-400" />
                        <span>Removable Disks</span>
                    </TabsTrigger>
                    <TabsTrigger value="restic" className="gap-2">
                        <Shield className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Restic Offsite Backups</span>
                    </TabsTrigger>
                </TabsList>

                {/* ── TAB 1: SNAPSHOTS LIST ── */}
                <TabsContent value="snapshots" className="space-y-4">
                    {loadingSnaps ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">Loading snapshots...</div>
                    ) : snapshots.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">No snapshots recorded yet.</div>
                    ) : (
                        <div className="space-y-2.5">
                            {snapshots.map((snap: SnapperSnapshot) => (
                                <div
                                    key={snap.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/70 bg-card hover:border-border transition-all"
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono text-xs font-bold shrink-0">
                                            #{snap.id}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-semibold text-foreground truncate">
                                                    {snap.description || `Snapshot #${snap.id}`}
                                                </p>
                                                <Badge variant="outline">{snap.type || "single"}</Badge>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {snap.date || snap.date_string || "Recent"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-3 sm:mt-0 shrink-0">
                                        <Button
                                            size="xs"
                                            variant="ghost"
                                            disabled={deleteMutation.isPending}
                                            onClick={() => deleteMutation.mutate({ config: snap.config || "root", id: snap.id })}
                                            className="text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ── TAB 2: TAKE SNAPSHOT ── */}
                <TabsContent value="new-snapshot" className="space-y-4">
                    <form onSubmit={handleCreateSnapshot} className="rounded-2xl border border-border/70 bg-card p-6 space-y-4 max-w-xl">
                        <div className="space-y-1 border-b border-border/60 pb-3">
                            <h3 className="text-sm font-bold text-foreground">Create Btrfs Snapshot</h3>
                            <p className="text-xs text-muted-foreground">
                                Captures an atomic copy-on-write snapshot of root subvolumes.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground">Snapshot Description</label>
                            <input
                                type="text"
                                placeholder="e.g. Pre-upgrade backup before kernel bump"
                                value={newSnapshotDesc}
                                onChange={(e) => setNewSnapshotDesc(e.target.value)}
                                className="w-full rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                required
                            />
                        </div>

                        <div className="pt-2 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setActiveTab("snapshots")}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="default"
                                disabled={createMutation.isPending || !newSnapshotDesc}
                                className="bg-amber-600 hover:bg-amber-500 text-white gap-1.5"
                            >
                                <Camera className="h-3.5 w-3.5" />
                                <span>{createMutation.isPending ? "Creating..." : "Save Snapshot"}</span>
                            </Button>
                        </div>
                    </form>
                </TabsContent>

                {/* ── TAB 3: REMOVABLE DISKS ── */}
                <TabsContent value="disks" className="space-y-4">
                    <div className="space-y-3">
                        {storageDisks && storageDisks.length > 0 ? (
                            storageDisks.map((disk: RemovableDisk) => (
                                <div key={disk.device} className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-card">
                                    <div>
                                        <p className="text-xs font-bold text-foreground">{disk.name || disk.label || disk.device}</p>
                                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                            {disk.mount_point || "Not mounted"} · {disk.fs_type} · {disk.size_gib} GiB
                                        </p>
                                    </div>
                                    <Badge variant={disk.is_mounted ? "success" : "muted"}>
                                        {disk.is_mounted ? "Mounted" : "Unmounted"}
                                    </Badge>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-xs text-muted-foreground">No external removable drives detected.</div>
                        )}
                    </div>
                </TabsContent>

                {/* ── TAB 4: RESTIC OFFSITE ── */}
                <TabsContent value="restic" className="space-y-4">
                    <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <div>
                                <h3 className="text-xs font-bold text-foreground">Encrypted Offsite Backup Repositories</h3>
                                <p className="text-xs text-muted-foreground">Target: {resticData?.repository || "AWS S3 / SFTP"}</p>
                            </div>
                            <Badge variant={resticData?.service_active ? "success" : "muted"}>
                                {resticData?.service_active ? "Service Active" : "Standby"}
                            </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-2">
                            <p>Daily backups run via systemd timer: <code className="font-mono text-foreground">restic-backups-system.service</code></p>
                            <p>Backend: <span className="font-mono font-semibold text-foreground uppercase">{resticData?.backend || "S3"}</span></p>
                            <p>Last Successful Run: <span className="font-mono text-foreground">{resticData?.last_run_time || "Recent"}</span></p>
                            <p>Next Scheduled Run: <span className="font-mono text-foreground">{resticData?.next_run_time || "Tomorrow 04:00"}</span></p>
                        </div>
                        <div className="pt-2">
                            <Button
                                size="xs"
                                variant="default"
                                disabled={triggerBackupMutation.isPending}
                                onClick={() => triggerBackupMutation.mutate()}
                                className="gap-1.5"
                            >
                                <Shield className="h-3.5 w-3.5" />
                                <span>{triggerBackupMutation.isPending ? "Starting Backup..." : "Trigger Manual Backup"}</span>
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function StoragePage() {
    return (
        <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading Storage & Snapshots...</div>}>
            <StoragePageContent />
        </Suspense>
    );
}
