"use client";

import React, { useState, Suspense } from "react";
import { useHostStore } from "@/store/host-store";
import { useFleetNodes } from "@/hooks/useFleet";
import { ColmenaDeployModal } from "@/components/cockpit/ColmenaDeployModal";
import {
    Layers,
    Server,
    Laptop,
    Cpu,
    ShieldCheck,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Activity,
    Rocket,
    Check,
    Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function FleetPageContent() {
    const { selectedHost, setHost } = useHostStore();
    const { data, isLoading, refetch, isFetching } = useFleetNodes();
    const [deployModalOpen, setDeployModalOpen] = useState(false);

    const nodes = data?.nodes ?? [];
    const onlineCount = nodes.filter((n) => n.status === "online" || n.status === "local").length;
    const offlineCount = nodes.filter((n) => n.status === "offline" || n.status === "unreachable").length;

    const getNodeIcon = (id: string) => {
        switch (id) {
            case "laptop":
                return <Laptop className="w-5 h-5 text-primary" />;
            case "server":
                return <Server className="w-5 h-5 text-emerald-400" />;
            case "builder":
                return <Cpu className="w-5 h-5 text-amber-400" />;
            case "backup":
                return <ShieldCheck className="w-5 h-5 text-blue-400" />;
            default:
                return <Server className="w-5 h-5 text-muted-foreground" />;
        }
    };

    return (
        <div className="space-y-6 pb-12">
            {/* ── Top Hero Banner ── */}
            <div className="relative overflow-hidden rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 via-card to-background p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-[11px] font-semibold text-pink-400">
                            <Layers className="h-3.5 w-3.5" />
                            <span>Colmena Multi-Node Cluster</span>
                        </div>
                        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <span>Declarative Fleet Topology & Deployment</span>
                        </h1>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Centrally manage NixOS host nodes, execute parallel SSH builds with Colmena, and monitor Tailscale mesh connectivity across all nodes.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => setDeployModalOpen(true)}
                            className="gap-1.5 shadow-md bg-pink-600 hover:bg-pink-500 text-white"
                        >
                            <Rocket className="h-3.5 w-3.5" />
                            <span>Colmena Fleet Deploy</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            className="gap-1"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                            <span>Refresh</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Summary KPI Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
                    <span className="text-[11px] text-muted-foreground">Total Fleet Nodes</span>
                    <p className="text-xl font-bold mt-1 font-mono text-foreground">{nodes.length}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-xs">
                    <span className="text-[11px] text-emerald-500">Online & Local</span>
                    <p className="text-xl font-bold mt-1 font-mono text-emerald-500">{onlineCount}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
                    <span className="text-[11px] text-muted-foreground">Offline / Awaiting Boot</span>
                    <p className="text-xl font-bold mt-1 font-mono text-muted-foreground">{offlineCount}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
                    <span className="text-[11px] text-muted-foreground">Active Target</span>
                    <p className="text-xl font-bold mt-1 font-mono text-primary truncate">{selectedHost}</p>
                </div>
            </div>

            {/* ── Node Cards Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nodes.map((node) => {
                    const isSelected = selectedHost === node.id;
                    const isOnline = node.status === "online" || node.status === "local";

                    return (
                        <div
                            key={node.id}
                            className={`rounded-2xl border p-5 space-y-4 transition-all ${
                                isSelected
                                    ? "border-primary/50 bg-primary/5 shadow-xs"
                                    : "border-border/70 bg-card hover:border-border"
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3.5">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 border border-border/60 shrink-0">
                                        {getNodeIcon(node.id)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xs font-bold text-foreground">{node.name}</h3>
                                            {isSelected && <Badge variant="success">Active View</Badge>}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                            {node.target_host} · {node.mesh_ip || "100.64.0.x"}
                                        </p>
                                    </div>
                                </div>

                                <Badge variant={isOnline ? "success" : "muted"}>
                                    {node.status}
                                </Badge>
                            </div>

                            {/* Node Roles Badges */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                {node.roles.map((role) => (
                                    <span
                                        key={role}
                                        className="rounded-md bg-muted/60 border border-border/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                                    >
                                        {role}
                                    </span>
                                ))}
                            </div>

                            {/* Ping & Target Switcher Footer */}
                            <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                                    <Activity className="h-3.5 w-3.5" />
                                    <span>Latency: {node.ping_ms >= 0 ? `${node.ping_ms} ms` : "Unreachable"}</span>
                                </div>

                                {!isSelected ? (
                                    <Button
                                        size="xs"
                                        variant="secondary"
                                        onClick={() => setHost(node.id)}
                                    >
                                        Set as Active Node
                                    </Button>
                                ) : (
                                    <span className="text-xs font-semibold text-primary flex items-center gap-1">
                                        <Check className="h-3.5 w-3.5" /> Target Active
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Colmena Deployment Live Modal ── */}
            <ColmenaDeployModal
                open={deployModalOpen}
                onOpenChange={setDeployModalOpen}
            />
        </div>
    );
}

export default function FleetPage() {
    return (
        <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading Fleet Cluster...</div>}>
            <FleetPageContent />
        </Suspense>
    );
}
