"use client";

import React, { useState } from "react";
import {
    X,
    HardDrive,
    Cloud,
    Camera,
    Plus,
    Trash2,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    FolderArchive,
    Play,
    Loader2,
    Shield,
    Layers,
    Search,
} from "lucide-react";
import {
    useSnapperSnapshots,
    useCreateSnapshot,
    useDeleteSnapshot,
    useResticStatus,
    useResticSnapshots,
    useTriggerResticBackup,
} from "@/hooks/useStorage";
import type { SnapperSnapshot } from "@/types/api";

interface SnapshotDrawerProps {
    open: boolean;
    onClose: () => void;
}

export function SnapshotDrawer({ open, onClose }: SnapshotDrawerProps) {
    const [activeTab, setActiveTab] = useState<"snapper" | "restic">("snapper");
    const [selectedConfig, setSelectedConfig] = useState<string>("root");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Create snapshot form state
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
    const [newDesc, setNewDesc] = useState<string>("");
    const [newCleanup, setNewCleanup] = useState<string>("number");
    const [actionMsg, setActionMsg] = useState<{ ok: boolean; msg: string } | null>(null);

    // Queries & Mutations
    const {
        data: snapperData,
        isLoading: snapperLoading,
        refetch: refetchSnapper,
        isFetching: snapperFetching,
    } = useSnapperSnapshots(selectedConfig);

    const createMutation = useCreateSnapshot();
    const deleteMutation = useDeleteSnapshot();

    const {
        data: resticStatus,
        isLoading: resticStatusLoading,
        refetch: refetchResticStatus,
    } = useResticStatus();

    const {
        data: resticSnapshotsData,
        isLoading: resticSnapshotsLoading,
        refetch: refetchResticSnapshots,
    } = useResticSnapshots();

    const resticBackupMutation = useTriggerResticBackup();

    if (!open) return null;

    const configs = snapperData?.configs ?? [{ name: "root", subvolume: "/" }];
    const snapshots = snapperData?.snapshots ?? [];

    const filteredSnapshots = snapshots.filter((s: SnapperSnapshot) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            String(s.id).includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.type.toLowerCase().includes(q) ||
            (s.cleanup && s.cleanup.toLowerCase().includes(q))
        );
    });

    const handleCreateSnapshot = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDesc.trim()) return;

        setActionMsg(null);
        try {
            await createMutation.mutateAsync({
                config: selectedConfig,
                description: newDesc.trim(),
                cleanup: newCleanup,
            });
            setNewDesc("");
            setShowCreateModal(false);
            setActionMsg({ ok: true, msg: "Btrfs snapshot başarıyla oluşturuldu!" });
            refetchSnapper();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setActionMsg({ ok: false, msg: `Snapshot oluşturulamadı: ${msg}` });
        }
    };

    const handleDeleteSnapshot = async (id: number) => {
        if (id === 0) {
            alert("Snapshot 0 aktif çalışan subvolume'dur ve silinemez.");
            return;
        }
        if (!confirm(`Snapshot #${id} silinecektir. Emin misiniz?`)) {
            return;
        }

        setActionMsg(null);
        try {
            await deleteMutation.mutateAsync({ config: selectedConfig, id });
            setActionMsg({ ok: true, msg: `Snapshot #${id} silindi.` });
            refetchSnapper();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setActionMsg({ ok: false, msg: `Snapshot silinemedi: ${msg}` });
        }
    };

    const handleTriggerRestic = async () => {
        setActionMsg(null);
        try {
            await resticBackupMutation.mutateAsync();
            setActionMsg({ ok: true, msg: "Restic yedekleme servisi (systemd) başlatıldı!" });
            refetchResticStatus();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setActionMsg({ ok: false, msg: `Yedekleme başlatılamadı: ${msg}` });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in">
            {/* Drawer Container */}
            <div className="flex h-full w-full max-w-3xl flex-col border-l border-border bg-card shadow-2xl transition-transform animate-in slide-in-from-right duration-200">
                {/* ── Header ── */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                            <FolderArchive className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold">Btrfs Snapshot & Restic Yedekleme</h2>
                            <p className="text-xs text-muted-foreground">
                                Btrfs Snapper yerel anlık görüntüleri ve Restic uzak yedekleme merkezi
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (activeTab === "snapper") refetchSnapper();
                                else {
                                    refetchResticStatus();
                                    refetchResticSnapshots();
                                }
                            }}
                            disabled={snapperFetching}
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${snapperFetching ? "animate-spin" : ""}`} />
                            Yenile
                        </button>
                        <button
                            onClick={onClose}
                            aria-label="Kapat"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* ── Tabs Header ── */}
                <div className="flex border-b border-border px-6 bg-muted/10">
                    <button
                        onClick={() => setActiveTab("snapper")}
                        className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors ${
                            activeTab === "snapper"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Camera className="w-4 h-4" />
                        Btrfs Snapper Snapshot&apos;ları ({snapshots.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("restic")}
                        className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors ml-6 ${
                            activeTab === "restic"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Cloud className="w-4 h-4" />
                        Restic Uzak Depo ({resticStatus?.backend?.toUpperCase() ?? "S3"})
                    </button>
                </div>

                {/* ── Action Message Feedback ── */}
                {actionMsg && (
                    <div
                        className={`mx-6 mt-4 flex items-center gap-2 rounded-lg border p-2.5 text-xs ${
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
                        <span>{actionMsg.msg}</span>
                    </div>
                )}

                {/* ── TAB 1: BTRFS SNAPPER ── */}
                {activeTab === "snapper" && (
                    <div className="flex flex-col flex-1 overflow-hidden p-6 gap-4">
                        {/* Controls Bar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Layers className="w-3.5 h-3.5" />
                                    <span>Konfigürasyon:</span>
                                </div>
                                <select
                                    value={selectedConfig}
                                    onChange={(e) => setSelectedConfig(e.target.value)}
                                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium focus:ring-1 focus:ring-primary text-foreground"
                                >
                                    {configs.map((c) => (
                                        <option key={c.name} value={c.name}>
                                            {c.name} ({c.subvolume})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <div className="relative flex-1 sm:w-48">
                                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Snapshot ara..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground"
                                    />
                                </div>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs shrink-0"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Snapshot Al
                                </button>
                            </div>
                        </div>

                        {/* Create Modal Form (Inline Expandable) */}
                        {showCreateModal && (
                            <form
                                onSubmit={handleCreateSnapshot}
                                className="flex flex-col gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5 transition-all animate-in fade-in"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                                        <Camera className="w-3.5 h-3.5" />
                                        Yeni Manuel Btrfs Snapshot Oluştur
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="text-[11px] text-muted-foreground block mb-1">
                                            Açıklama / Başlık
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Örn: Sistem güncellemesi öncesi yedek"
                                            value={newDesc}
                                            onChange={(e) => setNewDesc(e.target.value)}
                                            className="h-8 w-full rounded-lg border border-border bg-background px-3 text-xs focus:ring-1 focus:ring-primary text-foreground"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-muted-foreground block mb-1">
                                            Temizlik Politikası
                                        </label>
                                        <select
                                            value={newCleanup}
                                            onChange={(e) => setNewCleanup(e.target.value)}
                                            className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs focus:ring-1 focus:ring-primary text-foreground"
                                        >
                                            <option value="number">Number (Kota limitli)</option>
                                            <option value="timeline">Timeline (Zaman aşımı)</option>
                                            <option value="">Süresiz (Kalıcı)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="rounded-lg border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createMutation.isPending || !newDesc.trim()}
                                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        {createMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                                        Oluştur
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Snapshots Table */}
                        <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card/60">
                            {snapperLoading ? (
                                <div className="flex items-center justify-center p-12 text-xs text-muted-foreground">
                                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                    Snapshot listesi alınıyor...
                                </div>
                            ) : filteredSnapshots.length === 0 ? (
                                <div className="p-8 text-center text-xs text-muted-foreground">
                                    {searchQuery ? "Aramaya uygun snapshot bulunamadı." : "Henüz oluşturulmuş bir snapshot yok."}
                                </div>
                            ) : (
                                <table className="w-full text-left text-xs">
                                    <thead className="sticky top-0 bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                                        <tr>
                                            <th className="px-4 py-2.5 w-16"># ID</th>
                                            <th className="px-4 py-2.5">Açıklama</th>
                                            <th className="px-4 py-2.5 w-24">Tür</th>
                                            <th className="px-4 py-2.5">Oluşturulma Zamanı</th>
                                            <th className="px-4 py-2.5 w-24">Temizlik</th>
                                            <th className="px-4 py-2.5 w-16 text-right">Eylem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                                        {filteredSnapshots.map((s) => (
                                            <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-2.5 font-bold text-foreground">
                                                    {s.id === 0 ? (
                                                        <span className="text-primary">#0 (Aktif)</span>
                                                    ) : (
                                                        `#${s.id}`
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 font-sans font-medium text-foreground">
                                                    {s.description || "—"}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                                        s.type === "pre"
                                                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                            : s.type === "post"
                                                            ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                                            : "bg-muted text-muted-foreground"
                                                    }`}>
                                                        {s.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-muted-foreground">
                                                    {s.date_string || "—"}
                                                </td>
                                                <td className="px-4 py-2.5 text-muted-foreground">
                                                    {s.cleanup || "kalıcı"}
                                                </td>
                                                <td className="px-4 py-2.5 text-right">
                                                    {s.id > 0 && (
                                                        <button
                                                            onClick={() => handleDeleteSnapshot(s.id)}
                                                            disabled={deleteMutation.isPending}
                                                            title="Snapshot'ı Sil"
                                                            className="p-1 text-muted-foreground hover:text-rose-400 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* ── TAB 2: RESTIC REMOTE BACKUP ── */}
                {activeTab === "restic" && (
                    <div className="flex flex-col flex-1 overflow-y-auto p-6 gap-5">
                        {/* Status Card */}
                        <div className="flex flex-col p-4 rounded-xl border border-border bg-card/60 gap-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                        <Cloud className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-foreground">
                                            Restic Offsite Deposu ({resticStatus?.backend?.toUpperCase() ?? "S3"})
                                        </h3>
                                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                            {resticStatus?.repository || "s3:s3.amazonaws.com/l7v-backups/restic"}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleTriggerRestic}
                                    disabled={resticBackupMutation.isPending}
                                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                                >
                                    {resticBackupMutation.isPending ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                    )}
                                    Şimdi Yedekle
                                </button>
                            </div>

                            {/* Status metrics */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/50">
                                <div className="flex flex-col p-2.5 rounded-lg border border-border bg-background/50">
                                    <span className="text-[11px] text-muted-foreground">Son Çalışma Durumu</span>
                                    <div className="flex items-center gap-1.5 mt-1 font-semibold text-xs">
                                        {resticStatus?.last_run_success ? (
                                            <span className="text-emerald-400 flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Başarılı
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">Servis Aktif</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col p-2.5 rounded-lg border border-border bg-background/50">
                                    <span className="text-[11px] text-muted-foreground">Son Yedekleme Zamanı</span>
                                    <span className="text-xs font-semibold mt-1 text-foreground">
                                        {resticStatus?.last_run_time ? new Date(resticStatus.last_run_time).toLocaleString() : "Günlük Zamanlayıcı"}
                                    </span>
                                </div>

                                <div className="flex flex-col p-2.5 rounded-lg border border-border bg-background/50">
                                    <span className="text-[11px] text-muted-foreground">Yedeklenen Dizinler</span>
                                    <span className="text-xs font-mono text-muted-foreground mt-1">
                                        /var/lib, /var/backup, /etc, /home
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Remote Snapshots List */}
                        <div className="flex flex-col gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Depodaki Uzak Snapshot&apos;lar
                            </span>

                            <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
                                {resticSnapshotsLoading ? (
                                    <div className="p-8 text-center text-xs text-muted-foreground">
                                        <RefreshCw className="w-4 h-4 animate-spin mr-2 inline" />
                                        Restic snapshot&apos;ları taranıyor...
                                    </div>
                                ) : (resticSnapshotsData?.snapshots ?? []).length === 0 ? (
                                    <div className="p-8 text-center text-xs text-muted-foreground">
                                        Depoda henüz kayıtlı snapshot bulunamadı veya erişim zamanlayıcı ile yönetiliyor.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/40">
                                        {resticSnapshotsData?.snapshots.map((snap) => (
                                            <div key={snap.id} className="flex items-center justify-between p-3 text-xs">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="font-mono font-bold text-primary">
                                                        {snap.short_id || snap.id.substring(0, 8)}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {new Date(snap.time).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                                                    <span>{snap.hostname}</span>
                                                    <span>•</span>
                                                    <span>{snap.paths?.join(", ")}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
