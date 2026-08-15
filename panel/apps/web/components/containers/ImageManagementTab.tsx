"use client";

import React, { useState } from "react";
import {
    Disc,
    Download,
    Trash2,
    Search,
    Shield,
    HardDrive,
    Layers,
    Check,
    AlertCircle,
    X,
    RefreshCw,
} from "lucide-react";
import { useImages, useRemoveImage, usePruneImages } from "@/hooks/useContainers";
import { useHostStore } from "@/store/host-store";

export function ImageManagementTab() {
    const [search, setSearch] = useState("");
    const [isPullOpen, setIsPullOpen] = useState(false);
    const [pullImageName, setPullImageName] = useState("");
    const [pullLogs, setPullLogs] = useState<string[]>([]);
    const [isPulling, setIsPulling] = useState(false);

    const host = useHostStore((s) => s.selectedHost);
    const { data, isLoading, refetch } = useImages();
    const removeMutation = useRemoveImage();
    const pruneMutation = usePruneImages();

    const images = data?.images || [];

    const filteredImages = images.filter((img) => {
        if (!search) return true;
        const q = search.toLowerCase();
        const tagMatch = img.repoTags.some((t) => t.toLowerCase().includes(q));
        const idMatch = img.id.toLowerCase().includes(q);
        return tagMatch || idMatch;
    });

    const formatBytes = (bytes: number) => {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const handlePullImage = () => {
        if (!pullImageName.trim()) return;

        setPullLogs([]);
        setIsPulling(true);

        const url = `/api/agent/${encodeURIComponent(host)}/api/v1/containers/images/pull?image=${encodeURIComponent(
            pullImageName.trim()
        )}`;
        const es = new EventSource(url);

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const line = `${data.id ? `[${data.id}] ` : ""}${data.status || ""}${
                    data.progress ? ` ${data.progress}` : ""
                }`;
                setPullLogs((prev) => [...prev, line]);
                if (data.status === "Download complete" || data.status?.includes("complete")) {
                    refetch();
                }
            } catch (err) {
                console.error(err);
            }
        };

        es.onerror = () => {
            setIsPulling(false);
            es.close();
            refetch();
        };
    };

    const handlePrune = () => {
        if (confirm("Kullanılmayan asılı (dangling) imajları temizlemek istiyor musunuz?")) {
            pruneMutation.mutate(true, {
                onSuccess: (res) => {
                    alert(
                        `Temizlik tamamlandı!\nKazanılan Alan: ${formatBytes(res.spaceReclaimed)}\nSilinen İmajlar: ${
                            res.imagesDeleted?.length || 0
                        }`
                    );
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
                        placeholder="İmaj adı veya ID ara..."
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
                        Kullanılmayanları Temizle (Prune)
                    </button>
                    <button
                        onClick={() => setIsPullOpen(true)}
                        className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        İmaj Çek (Pull Image)
                    </button>
                </div>
            </div>

            {/* Images Table */}
            {isLoading ? (
                <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-14 animate-pulse rounded-lg border border-border bg-card/40" />
                    ))}
                </div>
            ) : filteredImages.length === 0 ? (
                <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center">
                    <Disc className="mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm font-semibold text-foreground">Kayıtlı İmaj Yok</p>
                    <p className="text-xs text-muted-foreground">Registry&apos;den yeni bir imaj çekebilirsiniz.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <tr>
                                <th className="p-3">Repository & Tag</th>
                                <th className="p-3">İmaj ID</th>
                                <th className="p-3">Boyut</th>
                                <th className="p-3">Kullanım Durumu</th>
                                <th className="p-3">Oluşturulma</th>
                                <th className="p-3 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredImages.map((img) => (
                                <tr key={img.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <Disc className="h-4 w-4 text-purple-400 shrink-0" />
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground">
                                                    {img.repoTags[0] || "<none>:<none>"}
                                                </span>
                                                {img.repoTags.length > 1 && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        +{img.repoTags.length - 1} diğer etiket
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3 font-mono text-muted-foreground">{img.id}</td>
                                    <td className="p-3 font-mono font-medium text-foreground">
                                        {formatBytes(img.size)}
                                    </td>
                                    <td className="p-3">
                                        {img.inUse ? (
                                            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                                                <Check className="h-3 w-3" />
                                                {img.containers} Kapsayıcıda Aktif
                                            </span>
                                        ) : (
                                            <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                Kullanılmıyor
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 text-muted-foreground">
                                        {img.created ? new Date(img.created * 1000).toLocaleDateString() : "—"}
                                    </td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() => {
                                                if (confirm(`${img.repoTags[0] || img.id} imajını silmek istediğinize emin misiniz?`)) {
                                                    removeMutation.mutate({ id: img.id, force: true });
                                                }
                                            }}
                                            disabled={removeMutation.isPending}
                                            title="İmajı Sil"
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

            {/* Pull Image Modal */}
            {isPullOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                <Download className="h-4 w-4 text-primary" />
                                OCI İmajı Çek (Pull)
                            </h3>
                            <button
                                onClick={() => setIsPullOpen(false)}
                                className="rounded p-1 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-foreground mb-1">
                                İmaj Referansı (Repository:Tag)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Örn: docker.io/library/nginx:latest, ghcr.io/..."
                                    value={pullImageName}
                                    onChange={(e) => setPullImageName(e.target.value)}
                                    className="h-9 flex-1 rounded-md border border-border bg-card px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                                />
                                <button
                                    onClick={handlePullImage}
                                    disabled={isPulling || !pullImageName.trim()}
                                    className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {isPulling ? (
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Download className="h-3.5 w-3.5" />
                                    )}
                                    İndir
                                </button>
                            </div>
                        </div>

                        {pullLogs.length > 0 && (
                            <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-[#0d1117] p-3 font-mono text-xs text-slate-300 space-y-1">
                                {pullLogs.map((log, i) => (
                                    <div key={i} className="text-[11px] leading-tight">
                                        {log}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end pt-2 border-t border-border">
                            <button
                                onClick={() => setIsPullOpen(false)}
                                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
