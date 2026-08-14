"use client";

import { useAppDependencies } from "@/hooks/useApps";
import { Server, ArrowRight, ShieldCheck, Layers, Link as LinkIcon } from "lucide-react";
import type { Application } from "@/types/apps";

interface AppDependencyGraphProps {
    onSelectApp?: (appId: string) => void;
}

export function AppDependencyGraph({ onSelectApp }: AppDependencyGraphProps) {
    const { data: graph, isLoading, error } = useAppDependencies();

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card/40">
                <p className="text-xs text-muted-foreground animate-pulse">
                    Bağımlılık haritası yükleniyor...
                </p>
            </div>
        );
    }

    if (error || !graph) {
        return (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-xs text-destructive">
                Bağımlılık grafiği alınamadı.
            </div>
        );
    }

    // Group edges by provider (source)
    const providerMap: Record<string, string[]> = {};
    graph.edges.forEach((edge) => {
        if (!providerMap[edge.source]) {
            providerMap[edge.source] = [];
        }
        if (!providerMap[edge.source].includes(edge.target)) {
            providerMap[edge.source].push(edge.target);
        }
    });

    const getNode = (id: string) => graph.nodes.find((n) => n.id === id || n.systemd_unit === id);

    return (
        <div className="space-y-6 rounded-2xl border border-border/80 bg-card/50 p-6 backdrop-blur-sm shadow-sm">
            <div>
                <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">
                        Servis ve Altyapı Bağımlılık Topolojisi
                    </h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                    Veritabanı, Proxy, Loglama ve Metrik sağlayıcılarının uygulama tüketim haritası (DAG)
                </p>
            </div>

            {/* Provider Groups Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(providerMap).map(([sourceId, targets]) => {
                    const sourceNode = getNode(sourceId);
                    return (
                        <div
                            key={sourceId}
                            className="rounded-xl border border-border bg-card/80 p-4 space-y-3 hover:border-primary/40 transition-all shadow-sm"
                        >
                            {/* Provider Header */}
                            <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                                        <Server className="h-3.5 w-3.5" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-semibold text-foreground">
                                            {sourceNode?.name || sourceId}
                                        </span>
                                        <p className="text-[10px] font-mono text-muted-foreground">
                                            Sağlayıcı (Provider)
                                        </p>
                                    </div>
                                </div>
                                <span
                                    className={`inline-flex h-2 w-2 rounded-full ${
                                        sourceNode?.status === "running"
                                            ? "bg-emerald-400"
                                            : sourceNode?.status === "failed"
                                            ? "bg-destructive animate-pulse"
                                            : "bg-muted-foreground/50"
                                    }`}
                                />
                            </div>

                            {/* Consumers */}
                            <div className="space-y-2">
                                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                                    <LinkIcon className="h-3 w-3" />
                                    Bağımlı Uygulamalar ({targets.length})
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {targets.map((targetId) => {
                                        const targetNode = getNode(targetId);
                                        const isRunning = targetNode?.status === "running";
                                        return (
                                            <div
                                                key={targetId}
                                                onClick={() => onSelectApp && onSelectApp(targetId)}
                                                className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2 py-1 text-xs hover:border-primary/50 hover:bg-muted cursor-pointer transition-all"
                                            >
                                                <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                                                <span className="font-medium text-foreground">
                                                    {targetNode?.name || targetId}
                                                </span>
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${
                                                        isRunning ? "bg-emerald-400" : "bg-muted-foreground/50"
                                                    }`}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
