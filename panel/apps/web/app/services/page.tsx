"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    useApps,
    useAppsSummary,
    useAppActions,
} from "@/hooks/useApps";
import { Application, AppCategory } from "@/types/apps";
import { AppCard } from "@/components/apps/AppCard";
import { AppTable } from "@/components/apps/AppTable";
import { AppDetailDrawer } from "@/components/apps/AppDetailDrawer";
import { AppActionModal } from "@/components/apps/AppActionModal";
import { AppDependencyGraph } from "@/components/apps/AppDependencyGraph";
import {
    LayoutGrid,
    Table as TableIcon,
    Network,
    Search,
    RefreshCw,
    Activity,
    Server,
    Shield,
    Bot,
    Database,
    Globe,
    Terminal,
    Cpu,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function ServicesPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [selectedCategory, setSelectedCategory] = useState<AppCategory | "all">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "table" | "dependencies">("grid");
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [actionModalState, setActionModalState] = useState<{
        isOpen: boolean;
        app: Application | null;
        action: "start" | "stop" | "restart" | null;
    }>({
        isOpen: false,
        app: null,
        action: null,
    });

    const { data: apps = [], isLoading: isAppsLoading, refetch: refetchApps } = useApps({
        category: selectedCategory !== "all" ? selectedCategory : undefined,
    });

    const { data: summary, isLoading: isSummaryLoading, refetch: refetchSummary } = useAppsSummary();
    const modalAppActions = useAppActions(actionModalState.app?.id ?? "");

    const handleRefresh = () => {
        refetchApps();
        refetchSummary();
    };

    const handleOpenAction = (app: Application, action: "start" | "stop" | "restart") => {
        setActionModalState({
            isOpen: true,
            app,
            action,
        });
    };

    const handleConfirmAction = async (force: boolean) => {
        if (!actionModalState.app || !actionModalState.action) return;
        const act = actionModalState.action;

        try {
            if (act === "start") {
                await modalAppActions.start(force);
            } else if (act === "stop") {
                await modalAppActions.stop(force);
            } else if (act === "restart") {
                await modalAppActions.restart(force);
            }
            setActionModalState({ isOpen: false, app: null, action: null });
            handleRefresh();
        } catch {
            // Handled in modal
        }
    };

    const filteredApps = apps.filter((app) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            app.name.toLowerCase().includes(q) ||
            app.description.toLowerCase().includes(q) ||
            app.id.toLowerCase().includes(q) ||
            app.systemd_unit?.toLowerCase().includes(q) ||
            app.access_level.toLowerCase().includes(q) ||
            app.tags?.some((t) => t.toLowerCase().includes(q)) ||
            app.endpoints?.some((e) => e.url?.toLowerCase().includes(q))
        );
    });

    const categoriesList: { id: AppCategory | "all"; label: string; icon: React.ReactNode }[] = [
        { id: "all", label: "All Services", icon: <Server className="h-3.5 w-3.5" /> },
        { id: "ingress_network", label: "Network & Ingress", icon: <Globe className="h-3.5 w-3.5" /> },
        { id: "core_platform", label: "Core Platform", icon: <Server className="h-3.5 w-3.5" /> },
        { id: "observability", label: "Observability", icon: <Activity className="h-3.5 w-3.5" /> },
        { id: "database", label: "Database", icon: <Database className="h-3.5 w-3.5" /> },
        { id: "ai_workload", label: "AI & Sandbox", icon: <Bot className="h-3.5 w-3.5" /> },
        { id: "cicd_automation", label: "CI/CD & Automation", icon: <Terminal className="h-3.5 w-3.5" /> },
        { id: "backup_dr", label: "Backup & DR", icon: <Shield className="h-3.5 w-3.5" /> },
    ];

    return (
        <div className="space-y-6 pb-12">
            {/* Header & KPI Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                        <Server className="h-5 w-5 text-primary" />
                        <span>Services & Managed Daemons</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Systemd service units, background daemons, cgroup telemetry, and reverse-proxy routing
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switchers */}
                    <div className="flex items-center rounded-xl border border-border/80 bg-muted/30 p-1">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded-lg transition-colors ${
                                viewMode === "grid"
                                    ? "bg-card text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                            title="Grid View"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("table")}
                            className={`p-1.5 rounded-lg transition-colors ${
                                viewMode === "table"
                                    ? "bg-card text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                            title="Table View"
                        >
                            <TableIcon className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("dependencies")}
                            className={`p-1.5 rounded-lg transition-colors ${
                                viewMode === "dependencies"
                                    ? "bg-card text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                            title="Dependency Topology"
                        >
                            <Network className="h-4 w-4" />
                        </button>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        className="gap-1.5"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isAppsLoading || isSummaryLoading ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-xs">
                    <span className="text-[11px] font-medium text-muted-foreground block">Total Services</span>
                    <span className="text-xl font-bold mt-1 block text-foreground font-mono">
                        {summary?.total_apps ?? apps.length}
                    </span>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 shadow-xs">
                    <span className="text-[11px] font-medium text-emerald-500 block">Running</span>
                    <span className="text-xl font-bold mt-1 block text-emerald-500 font-mono">
                        {summary?.running_apps ?? 0}
                    </span>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-xs">
                    <span className="text-[11px] font-medium text-muted-foreground block">Stopped</span>
                    <span className="text-xl font-bold mt-1 block text-muted-foreground font-mono">
                        {summary?.stopped_apps ?? 0}
                    </span>
                </div>
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 shadow-xs">
                    <span className="text-[11px] font-medium text-destructive block">Failed</span>
                    <span className="text-xl font-bold mt-1 block text-destructive font-mono">
                        {summary?.failed_apps ?? 0}
                    </span>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-xs">
                    <span className="text-[11px] font-medium text-muted-foreground block">Total Memory</span>
                    <span className="text-xl font-bold mt-1 block text-foreground font-mono">
                        {summary?.total_memory_mb ?? 0} MB
                    </span>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-xs">
                    <span className="text-[11px] font-medium text-muted-foreground block">Total CPU</span>
                    <span className="text-xl font-bold mt-1 block text-foreground font-mono">
                        {(summary?.total_cpu_percent ?? 0).toFixed(1)}%
                    </span>
                </div>
            </div>

            {/* Category Filter Chips & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    {categoriesList.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                                selectedCategory === cat.id
                                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                            {cat.icon}
                            <span>{cat.label}</span>
                        </button>
                    ))}
                </div>

                <div className="relative shrink-0 md:w-72">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search service, unit or endpoint..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border/80 bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                    />
                </div>
            </div>

            {/* Main Content Views */}
            {viewMode === "dependencies" ? (
                <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
                    <div className="mb-4">
                        <h2 className="text-sm font-semibold text-foreground">Service Dependency & Ingress Topology</h2>
                        <p className="text-xs text-muted-foreground">
                            Nginx Ingress, PostgreSQL providers, and dependent consumer daemons
                        </p>
                    </div>
                    <AppDependencyGraph
                        onSelectApp={(appId) => {
                            const found = apps.find((a) => a.id === appId);
                            if (found) setSelectedApp(found);
                        }}
                    />
                </div>
            ) : viewMode === "grid" ? (
                filteredApps.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
                        <Server className="h-8 w-8 text-muted-foreground/40 mb-2" />
                        <span>No services matching your filter criteria.</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredApps.map((app) => (
                            <AppCard
                                key={app.id}
                                app={app}
                                onSelect={setSelectedApp}
                                onAction={handleOpenAction}
                                isActionLoading={modalAppActions.runAction.isPending}
                            />
                        ))}
                    </div>
                )
            ) : (
                <AppTable
                    apps={filteredApps}
                    onSelect={setSelectedApp}
                    onAction={handleOpenAction}
                    isActionLoading={modalAppActions.runAction.isPending}
                />
            )}

            {/* Slide-over Detail Drawer */}
            <AppDetailDrawer
                app={selectedApp}
                onClose={() => setSelectedApp(null)}
                onActionConfirm={handleOpenAction}
            />

            {/* Action Confirmation Modal */}
            <AppActionModal
                isOpen={actionModalState.isOpen}
                app={actionModalState.app}
                action={actionModalState.action}
                onClose={() => setActionModalState({ isOpen: false, app: null, action: null })}
                onConfirm={handleConfirmAction}
                isPending={modalAppActions.runAction.isPending}
            />
        </div>
    );
}

export default function ServicesPage() {
    return (
        <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading services...</div>}>
            <ServicesPageContent />
        </Suspense>
    );
}
