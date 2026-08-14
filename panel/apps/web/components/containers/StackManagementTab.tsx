"use client";

import React from "react";
import {
    Layers,
    Play,
    Square,
    RotateCw,
    Boxes,
    ChevronRight,
    ExternalLink,
    Shield,
} from "lucide-react";
import { useStacks, useBulkContainerAction } from "@/hooks/useContainers";

interface Props {
    onSelectContainer: (id: string) => void;
}

export function StackManagementTab({ onSelectContainer }: Props) {
    const { data, isLoading } = useStacks();
    const bulkMutation = useBulkContainerAction();

    const stacks = data?.stacks || [];

    const handleStackAction = (containerIds: string[], action: "start" | "stop" | "restart") => {
        if (containerIds.length === 0) return;
        bulkMutation.mutate({ action, ids: containerIds });
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-40 animate-pulse rounded-lg border border-border bg-card/40" />
                ))}
            </div>
        );
    }

    if (stacks.length === 0) {
        return (
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center">
                <Layers className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm font-semibold text-foreground">Gruplanmış Yığın Bulunamadı</p>
                <p className="text-xs text-muted-foreground">Docker Compose veya Podman Pod ile başlatılan servisler burada görünür.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {stacks.map((s) => {
                const isAllRunning = s.runningCount === s.containerCount && s.containerCount > 0;
                const isPartiallyRunning = s.runningCount > 0 && s.runningCount < s.containerCount;
                const containerIds = s.containers.map((c) => c.id);

                return (
                    <div
                        key={s.name}
                        className="rounded-lg border border-border bg-card shadow-sm overflow-hidden"
                    >
                        {/* Stack Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="rounded-md bg-purple-500/10 p-2 text-purple-400">
                                    <Layers className="h-4 w-4" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-foreground">{s.name}</h3>
                                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                                            {s.type}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {s.containerCount} Kapsayıcı • {s.runningCount} Çalışıyor
                                    </p>
                                </div>
                            </div>

                            {/* Stack Actions */}
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => handleStackAction(containerIds, "start")}
                                    disabled={bulkMutation.isPending}
                                    title="Yığındaki Tüm Kapsayıcıları Başlat"
                                    className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-semibold text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                                >
                                    <Play className="h-3.5 w-3.5 fill-emerald-500" />
                                    Başlat
                                </button>
                                <button
                                    onClick={() => handleStackAction(containerIds, "restart")}
                                    disabled={bulkMutation.isPending}
                                    title="Yığını Yeniden Başlat"
                                    className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
                                >
                                    <RotateCw className="h-3.5 w-3.5" />
                                    Yeniden Başlat
                                </button>
                                <button
                                    onClick={() => handleStackAction(containerIds, "stop")}
                                    disabled={bulkMutation.isPending}
                                    title="Yığını Durdur"
                                    className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                    <Square className="h-3.5 w-3.5 fill-destructive" />
                                    Durdur
                                </button>
                            </div>
                        </div>

                        {/* Nested Container Grid / List */}
                        <div className="divide-y divide-border">
                            {s.containers.map((c) => {
                                const isRunning = c.state === "running";
                                const isPaused = c.state === "paused";

                                return (
                                    <div
                                        key={c.id}
                                        className="flex items-center justify-between p-3 px-4 hover:bg-muted/20 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`h-2 w-2 rounded-full ${
                                                    isRunning
                                                        ? "bg-emerald-500"
                                                        : isPaused
                                                        ? "bg-amber-500"
                                                        : "bg-slate-500"
                                                }`}
                                            />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-foreground">
                                                        {c.names[0] || c.id.slice(0, 12)}
                                                    </span>
                                                    {c.isNixos && (
                                                        <span className="flex items-center gap-1 rounded bg-cyan-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-cyan-400">
                                                            <Shield className="h-2 w-2" /> NixOS
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[11px] font-mono text-muted-foreground">
                                                    {c.image}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-muted-foreground capitalize">
                                                {c.status || c.state}
                                            </span>
                                            <button
                                                onClick={() => onSelectContainer(c.id)}
                                                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                            >
                                                İncele <ExternalLink className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
