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
    Activity,
    Rocket,
    Check,
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
                return <Laptop className="w-5 h-5 text-foreground" strokeWidth={1.5} />;
            case "server":
                return <Server className="w-5 h-5 text-foreground" strokeWidth={1.5} />;
            case "builder":
                return <Cpu className="w-5 h-5 text-foreground" strokeWidth={1.5} />;
            case "backup":
                return <ShieldCheck className="w-5 h-5 text-foreground" strokeWidth={1.5} />;
            default:
                return <Server className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />;
        }
    };

    return (
        <div className="space-y-4 pb-12 font-sans">
            {/* ── Top Apparatus Header ── */}
            <div className="instrument-card p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-primary" />
                            <h1 className="text-base font-bold text-foreground">
                                Fleet Topology & Colmena Cluster
                            </h1>
                            <Badge variant="outline" className="font-mono text-[10px]">
                                {nodes.length} Nodes Configured
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Declarative multi-node orchestration, parallel Nix builds with Colmena, and Tailscale mesh telemetry.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Button
                            variant="default"
                            size="xs"
                            onClick={() => setDeployModalOpen(true)}
                            className="gap-1.5 shadow-sm"
                        >
                            <Rocket className="h-3 w-3" />
                            <span>Colmena Deploy</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="xs"
                            onClick={() => refetch()}
                            className="gap-1"
                        >
                            <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
                            <span>Refresh</span>
                        </Button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-border/60 mt-4">
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Nodes</span>
                        <p className="text-lg font-bold font-mono tnum text-foreground">{nodes.length}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Online & Mesh</span>
                        <p className="text-lg font-bold font-mono tnum text-emerald-400">{onlineCount}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Offline / Standby</span>
                        <p className="text-lg font-bold font-mono tnum text-muted-foreground">{offlineCount}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Active Target</span>
                        <p className="text-sm font-bold font-mono text-primary truncate pt-0.5">{selectedHost}</p>
                    </div>
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
                            className={`instrument-card p-4 sm:p-5 space-y-3.5 transition-all ${
                                isSelected ? "border-primary/50 ring-1 ring-primary/30" : ""
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 border border-border/60 shrink-0">
                                        {getNodeIcon(node.id)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xs font-bold text-foreground">{node.name}</h3>
                                            {isSelected && <Badge variant="info">Active View</Badge>}
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
                                    <Activity className="h-3.5 w-3.5 text-emerald-400" />
                                    <span className="tnum">Ping: {node.ping_ms >= 0 ? `${node.ping_ms} ms` : "Unreachable"}</span>
                                </div>

                                {!isSelected ? (
                                    <Button
                                        size="xs"
                                        variant="outline"
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
