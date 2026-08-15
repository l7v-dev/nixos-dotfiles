"use client";

import { useState } from "react";
import {
    HardDrive,
    Disc,
    CheckCircle2,
    AlertCircle,
    FileBox,
    FolderArchive,
    Camera,
    Cloud,
    ExternalLink,
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
                setActionMsg({ ok: true, msg: `${device} güvenli şekilde çıkarıldı!` });
            },
            onError: (err) => {
                setActionMsg({ ok: false, msg: err.message ?? "Çıkarma başarısız" });
            },
        });
    };

    const handleQuickRestic = () => {
        setActionMsg(null);
        resticBackup.mutate(undefined, {
            onSuccess: () => {
                setActionMsg({ ok: true, msg: "Restic yedekleme servisi tetiklendi!" });
            },
            onError: (err) => {
                setActionMsg({ ok: false, msg: err.message ?? "Yedekleme başlatılamadı" });
            },
        });
    };

    const removableDrives = drives ?? [];
    const snapshotCount = snapperData?.snapshots?.length ?? 0;

    return (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        <FolderArchive className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Depolama, Snapshot & Yedekleme</p>
                        <p className="text-[11px] text-muted-foreground">
                            {isLoading ? "Yükleniyor…" : `Btrfs Snapper (${snapshotCount} snapshot) · Restic (${resticStatus?.backend?.toUpperCase() ?? "S3"})`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-bold text-teal-400 border border-teal-500/30">
                        {snapshotCount} Anlık Görüntü
                    </span>
                </div>
            </div>

            {/* ── Snapshot & Backup Quick Actions ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                    onClick={() => setDrawerOpen(true)}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                    <Camera className="h-3.5 w-3.5 text-teal-400" />
                    Btrfs & Restic Merkezi
                </button>

                <button
                    onClick={handleQuickRestic}
                    disabled={resticBackup.isPending}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-teal-600/20 border border-teal-500/30 px-3 py-2 text-xs font-semibold text-teal-400 hover:bg-teal-600/30 disabled:opacity-50 transition-colors"
                >
                    {resticBackup.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Cloud className="h-3.5 w-3.5" />
                    )}
                    Şimdi Yedekle
                </button>
            </div>

            {/* ── Removable Disks List ── */}
            <div className="space-y-2">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                    Çıkarılabilir USB & Harici Diskler
                </p>

                {removableDrives.length > 0 ? (
                    <div className="divide-y divide-border/40 rounded-lg border border-border/50 bg-background/40">
                        {removableDrives.map((d) => (
                            <div key={d.device} className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                        <Disc className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold">
                                            {d.label || d.name || d.device}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground font-mono">
                                            {d.size_gib ? `${d.size_gib.toFixed(1)} GB` : ""} {d.fs_type ? `· ${d.fs_type}` : ""}
                                            {d.mount_point ? ` · ${d.mount_point}` : " · Bağlı Değil"}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    {d.is_mounted ? (
                                        <button
                                            onClick={() => handleUnmount(d.device)}
                                            disabled={unmount.isPending}
                                            className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                                        >
                                            Güvenli Çıkar
                                        </button>
                                    ) : (
                                        <span className="text-[11px] text-muted-foreground">Bağlı Değil</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-3 text-center text-muted-foreground rounded-lg border border-dashed border-border/60">
                        <FileBox className="h-5 w-5 stroke-1 mb-1 opacity-50" />
                        <p className="text-xs">Bağlı harici USB ortam bulunamadı.</p>
                    </div>
                )}
            </div>

            {/* Action Feedback */}
            {actionMsg && (
                <div
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs ${
                        actionMsg.ok
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-destructive/30 bg-destructive/10 text-destructive"
                    }`}
                >
                    {actionMsg.ok ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span className="leading-tight">{actionMsg.msg}</span>
                </div>
            )}

            {/* Snapshot Drawer */}
            <SnapshotDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            />
        </div>
    );
}
