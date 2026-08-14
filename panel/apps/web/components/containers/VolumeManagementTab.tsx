"use client";

import React, { useState } from "react";
import {
    HardDrive,
    Plus,
    Trash2,
    Search,
    Check,
    Boxes,
    X,
    Database,
} from "lucide-react";
import { useVolumes, useCreateVolume, useRemoveVolume, usePruneVolumes } from "@/hooks/useContainers";

export function VolumeManagementTab() {
    const [search, setSearch] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [volumeName, setVolumeName] = useState("");
    const [driver, setDriver] = useState("local");

    const { data, isLoading } = useVolumes();
    const createMutation = useCreateVolume();
    const removeMutation = useRemoveVolume();
    const pruneMutation = usePruneVolumes();

    const volumes = data?.volumes || [];

    const filteredVolumes = volumes.filter((v) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return v.name.toLowerCase().includes(q) || v.mountpoint.toLowerCase().includes(q);
    });

    const handleCreateVolume = () => {
        if (!volumeName.trim()) return;
        createMutation.mutate(
            { name: volumeName.trim(), driver },
            {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    setVolumeName("");
                },
            }
        );
    };

    const handlePrune = () => {
        if (confirm("Kullanılmayan yetim (orphan) kalıcı diskleri temizlemek istiyor musunuz?")) {
            pruneMutation.mutate(undefined as any, {
                onSuccess: (res) => {
                    alert(`Yetim disk temizliği tamamlandı!\nSilinen Disk Sayısı: ${res.volumesDeleted?.length || 0}`);
                },
            });
        }
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex items-center">
                    <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Volume adı veya mountpoint ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9 w-64 rounded-md border border-border bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:w-80"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrune}
                        disabled={pruneMutation.isPending}
                        className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Yetimleri Temizle (Prune)
                    </button>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Birim Oluştur (Create Volume)
                    </button>
                </div>
            </div>

            {/* Volumes Table */}
            {isLoading ? (
                <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-14 animate-pulse rounded-lg border border-border bg-card/40" />
                    ))}
                </div>
            ) : filteredVolumes.length === 0 ? (
                <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center">
                    <HardDrive className="mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm font-semibold text-foreground">Kayıtlı Volume Bulunamadı</p>
                    <p className="text-xs text-muted-foreground">Kalıcı veri saklamak için yeni bir volume oluşturun.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <tr>
                                <th className="p-3">Birim Adı</th>
                                <th className="p-3">Sürücü & Scope</th>
                                <th className="p-3">Mountpoint</th>
                                <th className="p-3">Bağlı Kapsayıcılar</th>
                                <th className="p-3 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredVolumes.map((v) => (
                                <tr key={v.name} className="hover:bg-muted/30 transition-colors">
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <HardDrive className="h-4 w-4 text-cyan-400 shrink-0" />
                                            <span className="font-semibold text-foreground">{v.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-muted-foreground">
                                        {v.driver} ({v.scope || "local"})
                                    </td>
                                    <td className="p-3 font-mono text-muted-foreground truncate max-w-xs">
                                        {v.mountpoint}
                                    </td>
                                    <td className="p-3">
                                        {v.inUse ? (
                                            <div className="flex flex-wrap gap-1">
                                                {v.containers?.map((cName, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500"
                                                    >
                                                        <Boxes className="h-2.5 w-2.5" />
                                                        {cName}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                Bağlı Değil (Yetim)
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() => {
                                                if (confirm(`${v.name} diskini silmek istediğinize emin misiniz?`)) {
                                                    removeMutation.mutate({ name: v.name, force: true });
                                                }
                                            }}
                                            disabled={removeMutation.isPending}
                                            title="Volume'ü Sil"
                                            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Volume Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                <HardDrive className="h-4 w-4 text-primary" />
                                Yeni Volume Oluştur
                            </h3>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="rounded p-1 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-foreground mb-1">
                                Volume Adı <span className="text-destructive">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Örn: postgres_data, web_static"
                                value={volumeName}
                                onChange={(e) => setVolumeName(e.target.value)}
                                className="h-9 w-full rounded-md border border-border bg-card px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-foreground mb-1">
                                Depolama Sürücüsü (Driver)
                            </label>
                            <select
                                value={driver}
                                onChange={(e) => setDriver(e.target.value)}
                                className="h-9 w-full rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none"
                            >
                                <option value="local">local (Varsayılan Yerel Disk)</option>
                            </select>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-border">
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleCreateVolume}
                                disabled={createMutation.isPending || !volumeName.trim()}
                                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                                {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
