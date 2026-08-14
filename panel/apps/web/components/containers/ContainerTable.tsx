"use client";

import React, { useState, useMemo } from "react";
import {
    Play,
    Square,
    RotateCw,
    Trash2,
    Terminal,
    ScrollText,
    Search,
    Filter,
    Shield,
    Layers,
    MoreVertical,
    CheckSquare,
    Square as EmptySquare,
    ExternalLink,
    Boxes,
    Plus,
    Pause,
    PlayCircle,
} from "lucide-react";
import type { ContainerSummary } from "@/types/containers";
import { useContainerAction, useRemoveContainer, useBulkContainerAction } from "@/hooks/useContainers";

interface Props {
    containers: ContainerSummary[];
    isLoading: boolean;
    onSelectContainer: (id: string) => void;
    onOpenCreateModal: () => void;
}

export function ContainerTable({
    containers,
    isLoading,
    onSelectContainer,
    onOpenCreateModal,
}: Props) {
    const [search, setSearch] = useState("");
    const [stateFilter, setStateFilter] = useState<string>("all");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const actionMutation = useContainerAction();
    const removeMutation = useRemoveContainer();
    const bulkMutation = useBulkContainerAction();

    // Filter containers
    const filteredContainers = useMemo(() => {
        return containers.filter((c) => {
            if (stateFilter !== "all") {
                if (stateFilter === "running" && c.state !== "running") return false;
                if (stateFilter === "stopped" && c.state === "running") return false;
                if (stateFilter === "paused" && c.state !== "paused") return false;
            }
            if (search) {
                const q = search.toLowerCase();
                const nameMatch = c.names.some((n) => n.toLowerCase().includes(q));
                const imageMatch = c.image.toLowerCase().includes(q);
                const idMatch = c.id.toLowerCase().includes(q);
                const stackMatch = c.stack?.toLowerCase().includes(q);
                const portMatch = c.ports.some((p) => String(p.publicPort).includes(q) || String(p.privatePort).includes(q));
                return nameMatch || imageMatch || idMatch || stackMatch || portMatch;
            }
            return true;
        });
    }, [containers, stateFilter, search]);

    const handleSelectAll = () => {
        if (selectedIds.length === filteredContainers.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredContainers.map((c) => c.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleBulkAction = (action: "start" | "stop" | "restart" | "remove") => {
        if (selectedIds.length === 0) return;
        if (action === "remove" && !confirm(`${selectedIds.length} kapsayıcıyı silmek istediğinize emin misiniz?`)) {
            return;
        }
        bulkMutation.mutate(
            { action, ids: selectedIds, force: action === "remove" },
            {
                onSuccess: () => setSelectedIds([]),
            }
        );
    };

    if (isLoading && containers.length === 0) {
        return (
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-card/40" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search Input */}
                    <div className="relative flex items-center">
                        <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Kapsayıcı adı, imaj, port veya ID ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 w-64 rounded-md border border-border bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:w-80"
                        />
                    </div>

                    {/* State Filter Buttons */}
                    <div className="flex items-center rounded-md border border-border bg-card p-0.5 text-xs">
                        <button
                            onClick={() => setStateFilter("all")}
                            className={`rounded px-2.5 py-1 font-medium transition-colors ${
                                stateFilter === "all"
                                    ? "bg-accent text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Tümü ({containers.length})
                        </button>
                        <button
                            onClick={() => setStateFilter("running")}
                            className={`rounded px-2.5 py-1 font-medium transition-colors ${
                                stateFilter === "running"
                                    ? "bg-emerald-500/15 text-emerald-500 font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Çalışan ({containers.filter((c) => c.state === "running").length})
                        </button>
                        <button
                            onClick={() => setStateFilter("stopped")}
                            className={`rounded px-2.5 py-1 font-medium transition-colors ${
                                stateFilter === "stopped"
                                    ? "bg-accent text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Durdurulan ({containers.filter((c) => c.state !== "running").length})
                        </button>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Bulk Action Bar (when selected) */}
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-1 text-xs">
                            <span className="font-semibold text-foreground mr-1">
                                {selectedIds.length} Seçili:
                            </span>
                            <button
                                onClick={() => handleBulkAction("start")}
                                title="Seçilenleri Başlat"
                                className="rounded p-1 text-emerald-500 hover:bg-emerald-500/10"
                            >
                                <Play className="h-3.5 w-3.5 fill-emerald-500" />
                            </button>
                            <button
                                onClick={() => handleBulkAction("restart")}
                                title="Seçilenleri Yeniden Başlat"
                                className="rounded p-1 text-foreground hover:bg-accent"
                            >
                                <RotateCw className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => handleBulkAction("stop")}
                                title="Seçilenleri Durdur"
                                className="rounded p-1 text-amber-500 hover:bg-amber-500/10"
                            >
                                <Square className="h-3.5 w-3.5 fill-amber-500" />
                            </button>
                            <button
                                onClick={() => handleBulkAction("remove")}
                                title="Seçilenleri Sil"
                                className="rounded p-1 text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={onOpenCreateModal}
                        className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4" />
                        Yeni Kapsayıcı
                    </button>
                </div>
            </div>

            {/* Containers Table */}
            {filteredContainers.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
                    <Boxes className="mb-3 h-10 w-10 text-muted-foreground/30" />
                    <h3 className="text-sm font-semibold text-foreground">Kapsayıcı Bulunamadı</h3>
                    <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                        {search || stateFilter !== "all"
                            ? "Arama kriterlerinize uyan bir kapsayıcı bulunamadı."
                            : "Sistemde henüz oluşturulmuş bir kapsayıcı bulunmuyor."}
                    </p>
                    {!search && stateFilter === "all" && (
                        <button
                            onClick={onOpenCreateModal}
                            className="mt-4 flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            İlk Kapsayıcıyı Başlat
                        </button>
                    )}
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <tr>
                                <th className="w-10 p-3 text-center">
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        {selectedIds.length === filteredContainers.length &&
                                        filteredContainers.length > 0 ? (
                                            <CheckSquare className="h-4 w-4 text-primary" />
                                        ) : (
                                            <EmptySquare className="h-4 w-4" />
                                        )}
                                    </button>
                                </th>
                                <th className="p-3">Kapsayıcı Adı & İmaj</th>
                                <th className="p-3">Durum</th>
                                <th className="p-3">Portlar</th>
                                <th className="p-3">Oluşturulma</th>
                                <th className="p-3 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredContainers.map((c) => {
                                const isRunning = c.state === "running";
                                const isPaused = c.state === "paused";
                                const isSelected = selectedIds.includes(c.id);
                                const displayName = c.names[0] || c.id.slice(0, 12);

                                return (
                                    <tr
                                        key={c.id}
                                        className={`transition-colors hover:bg-muted/30 ${
                                            isSelected ? "bg-primary/5" : ""
                                        }`}
                                    >
                                        {/* Checkbox */}
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={() => toggleSelect(c.id)}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                {isSelected ? (
                                                    <CheckSquare className="h-4 w-4 text-primary" />
                                                ) : (
                                                    <EmptySquare className="h-4 w-4" />
                                                )}
                                            </button>
                                        </td>

                                        {/* Name & Image */}
                                        <td className="p-3">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => onSelectContainer(c.id)}
                                                        className="font-semibold text-foreground hover:text-primary transition-colors text-left"
                                                    >
                                                        {displayName}
                                                    </button>
                                                    {c.isNixos && (
                                                        <span className="flex items-center gap-1 rounded bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-400">
                                                            <Shield className="h-2.5 w-2.5" />
                                                            NixOS
                                                        </span>
                                                    )}
                                                    {c.stack && (
                                                        <span className="flex items-center gap-1 rounded bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-medium text-purple-400">
                                                            <Layers className="h-2.5 w-2.5" />
                                                            {c.stack}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="font-mono text-[11px] text-muted-foreground truncate max-w-xs">
                                                    {c.image}
                                                </span>
                                            </div>
                                        </td>

                                        {/* State */}
                                        <td className="p-3">
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className={`h-2 w-2 rounded-full ${
                                                        isRunning
                                                            ? "bg-emerald-500"
                                                            : isPaused
                                                            ? "bg-amber-500"
                                                            : "bg-slate-500"
                                                    }`}
                                                />
                                                <span
                                                    className={`font-medium capitalize ${
                                                        isRunning
                                                            ? "text-emerald-500"
                                                            : isPaused
                                                            ? "text-amber-500"
                                                            : "text-muted-foreground"
                                                    }`}
                                                >
                                                    {c.status || c.state}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Ports */}
                                        <td className="p-3">
                                            {c.ports && c.ports.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {c.ports.slice(0, 3).map((p, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                                                        >
                                                            {p.publicPort
                                                                ? `${p.publicPort}➔${p.privatePort}`
                                                                : p.privatePort}
                                                        </span>
                                                    ))}
                                                    {c.ports.length > 3 && (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            +{c.ports.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground/60">—</span>
                                            )}
                                        </td>

                                        {/* Created */}
                                        <td className="p-3 text-muted-foreground">
                                            {c.created
                                                ? new Date(c.created * 1000).toLocaleDateString()
                                                : "—"}
                                        </td>

                                        {/* Quick Actions */}
                                        <td className="p-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {isRunning ? (
                                                    <>
                                                        <button
                                                            onClick={() =>
                                                                actionMutation.mutate({
                                                                    id: c.id,
                                                                    action: "restart",
                                                                })
                                                            }
                                                            title="Yeniden Başlat"
                                                            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                        >
                                                            <RotateCw className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                actionMutation.mutate({
                                                                    id: c.id,
                                                                    action: "stop",
                                                                })
                                                            }
                                                            title="Durdur"
                                                            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                                        >
                                                            <Square className="h-3.5 w-3.5" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() =>
                                                            actionMutation.mutate({
                                                                id: c.id,
                                                                action: "start",
                                                            })
                                                        }
                                                        title="Başlat"
                                                        className="rounded p-1.5 text-emerald-500 transition-colors hover:bg-emerald-500/10"
                                                    >
                                                        <Play className="h-3.5 w-3.5 fill-emerald-500" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => onSelectContainer(c.id)}
                                                    title="Detay & Loglar & Terminal"
                                                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
