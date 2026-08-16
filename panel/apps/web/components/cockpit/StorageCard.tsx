"use client";

import { useState } from "react";
import {
    HardDrive,
    Disc,
    CheckCircle2,
    AlertCircle,
    FolderArchive,
    Camera,
    Play,
    Loader2,
} from "lucide-react";
import {
    useStorage,
    useSnapperSnapshots,
    useResticStatus,
    useTriggerResticBackup,
} from "@/hooks/useStorage";
import { SnapshotDrawer } from "./SnapshotDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function StorageCard() {
    const { data: drives, unmount, isLoading } = useStorage();
    const { data: snapperData } = useSnapperSnapshots("root");
    const { data: resticStatus } = useResticStatus();
    const resticBackup = useTriggerResticBackup();

    const [actionMsg, setActionMsg] = useState<{ ok: boolean; msg: string } | null>(null);
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

    const handleUnmount = (device: string) => {
        setActionMsg(null);
        unmount.mutate(device, {
            onSuccess: () => {
                setActionMsg({ ok: true, msg: `${device} safely unmounted!` });
            },
            onError: (err) => {
                setActionMsg({ ok: false, msg: err.message ?? "Unmount failed" });
            },
        });
    };

    const handleQuickRestic = () => {
        setActionMsg(null);
        resticBackup.mutate(undefined, {
            onSuccess: () => {
                setActionMsg({ ok: true, msg: "Restic backup service triggered successfully!" });
            },
            onError: (err) => {
                setActionMsg({ ok: false, msg: err.message ?? "Failed to trigger backup" });
            },
        });
    };

    const removableDrives = drives ?? [];
    const snapshotCount = snapperData?.snapshots?.length ?? 0;
    const isResticActive = resticStatus?.service_active ?? false;

    return (
        <>
            <div className="instrument-card p-4 sm:p-5 space-y-4">
                {/* ── 1. Header & Status ── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
                            <HardDrive className="h-4 w-4" strokeWidth={1.6} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold leading-tight text-foreground whitespace-nowrap">Storage & Snapshots</p>
                            <p className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                                {isLoading ? "Querying block devices…" : "Btrfs Subvolumes & Restic"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant={isResticActive ? "success" : "muted"} className="whitespace-nowrap">
                            {isResticActive ? "Backup Active" : "Standby"}
                        </Badge>
                        <Button
                            size="xs"
                            variant="default"
                            onClick={handleQuickRestic}
                            disabled={resticBackup.isPending}
                            className="gap-1 shadow-sm h-7 text-xs"
                        >
                            {resticBackup.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Play className="h-3 w-3" strokeWidth={1.75} />
                            )}
                            <span>Run Backup</span>
                        </Button>
                    </div>
                </div>

                {/* ── 2. Primary Telemetry Metric Grid ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {/* Btrfs Root */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                            Filesystem
                        </p>
                        <p className="text-sm font-bold font-mono text-foreground whitespace-nowrap truncate">
                            Btrfs Subvolumes
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap truncate">
                            @root · @home · @nix
                        </p>
                    </div>

                    {/* Snapper Snapshots */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                            Snapper Timeline
                        </p>
                        <p className="text-lg font-bold font-mono tnum text-primary whitespace-nowrap truncate">
                            {snapshotCount}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap truncate">
                            Root Config Snapshots
                        </p>
                    </div>

                    {/* Restic Repository */}
                    <div className="col-span-2 sm:col-span-1 rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                            Restic Remote
                        </p>
                        <p className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap truncate">
                            {resticStatus?.service_active ? "● Systemd Active" : "○ Idle"}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap truncate">
                            Encrypted S3 Repo
                        </p>
                    </div>
                </div>

                {/* Status Message Notification */}
                {actionMsg && (
                    <div
                        className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs font-mono ${
                            actionMsg.ok
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border-destructive/30 bg-destructive/10 text-destructive"
                        }`}
                    >
                        {actionMsg.ok ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        ) : (
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                        )}
                        <span className="flex-1">{actionMsg.msg}</span>
                    </div>
                )}

                {/* ── 3. Removable Disks Strip (if any) ── */}
                {removableDrives.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Removable USB Media
                        </p>
                        <div className="space-y-1">
                            {removableDrives.map((d) => (
                                <div
                                    key={d.device}
                                    className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 p-2 text-xs"
                                >
                                    <div className="flex items-center gap-2">
                                        <Disc className="h-3.5 w-3.5 text-primary" />
                                        <span className="font-semibold text-foreground">{d.label || d.device}</span>
                                        <span className="font-mono text-[10px] text-muted-foreground">({d.size_gib} GiB)</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="xs"
                                        onClick={() => handleUnmount(d.device)}
                                        className="h-6 text-[10px]"
                                    >
                                        Eject
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── 4. Progressive Disclosure (Snapshot Drawer Trigger) ── */}
                <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
                    >
                        <Camera className="h-3.5 w-3.5 text-primary" />
                        <span>Manage Snapper Snapshots & Diffs ({snapshotCount})</span>
                    </button>

                    <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                        <FolderArchive className="h-3 w-3" />
                        <span>Subvolume @root</span>
                    </div>
                </div>
            </div>

            {/* Snapshot Drawer */}
            <SnapshotDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </>
    );
}
