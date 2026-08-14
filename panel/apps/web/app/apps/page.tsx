"use client";

import { useState, useDeferredValue } from "react";
import {
    LayoutGrid,
    List,
    Network,
    Search,
    Server,
    Bot,
    Box,
    Wrench,
    Layers,
    Cpu,
    HardDrive,
    ShieldCheck,
    AlertCircle,
    RotateCcw,
} from "lucide-react";
import { useApps, useAppsSummary, useAppActions } from "@/hooks/useApps";
import type { Application, AppCategory, AppStatus } from "@/types/apps";
import { AppCard } from "@/components/apps/AppCard";
import { AppTable } from "@/components/apps/AppTable";
import { AppDetailDrawer } from "@/components/apps/AppDetailDrawer";
import { AppActionModal } from "@/components/apps/AppActionModal";
import { AppDependencyGraph } from "@/components/apps/AppDependencyGraph";

type ViewMode = "grid" | "table" | "topology";

export default function AppsPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const deferredSearch = useDeferredValue(searchQuery);
    const [viewMode, setViewMode] = useState<ViewMode>("grid");

    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        app: Application | null;
        action: "start" | "stop" | "restart" | null;
    }>({ app: null, action: null });

    const { data: summary, isLoading: isSummaryLoading } = useAppsSummary();
    const { data: apps, isLoading: isAppsLoading, error, refetch } = useApps({
        category: selectedCategory,
        status: selectedStatus,
        q: deferredSearch,
    });

    const activeAppActions = useAppActions(confirmModal.app?.id ?? "");

    const handleActionConfirmTrigger = (
        app: Application,
        action: "start" | "stop" | "restart"
    ) => {
        setConfirmModal({ app, action });
    };

    const handleConfirmAction = async (force: boolean) => {
        if (!confirmModal.app || !confirmModal.action) return;
        try {
            await activeAppActions.runAction.mutateAsync({
                action: confirmModal.action,
                force,
            });
            setConfirmModal({ app: null, action: null });
        } catch {
            // Handled by react-query / error state
        }
    };

    return (
        <div className="space-y-6">
            {/* ─── Page Title & Subtitle ─── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-foreground tracking-tight">
                        Uygulama ve Servis Yöneticisi
                    </h1>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Sistem servisleri, AI ajanları, MicroVM iş yükleri ve geliştirici ekosistemi kontrol düzlemi
                    </p>
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center gap-1 rounded-xl border border-border bg-card/80 p-1 shadow-xs">
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            viewMode === "grid"
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span>Kartlar</span>
                    </button>
                    <button
                        onClick={() => setViewMode("table")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            viewMode === "table"
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <List className="h-3.5 w-3.5" />
                        <span>Tablo</span>
                    </button>
                    <button
                        onClick={() => setViewMode("topology")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            viewMode === "topology"
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Network className="h-3.5 w-3.5" />
                        <span>Topoloji</span>
                    </button>
                </div>
            </div>

            {/* ─── KPI Summary Cards ─── */}
            {summary && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {/* Total Apps */}
                    <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 backdrop-blur-sm shadow-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-medium">Toplam İş Yükü</span>
                            <Server className="h-4 w-4 text-blue-400" />
                        </div>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                            {summary.total_apps}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Kayıtlı uygulama & servis</p>
                    </div>

                    {/* Running */}
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 backdrop-blur-sm shadow-xs">
                        <div className="flex items-center justify-between text-emerald-400">
                            <span className="text-xs font-medium">Çalışan Servisler</span>
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-400">
                            {summary.running_apps}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Aktif ve yanıt veriyor</p>
                    </div>

                    {/* Failed / Degraded */}
                    <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 backdrop-blur-sm shadow-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-medium">Sorunlu (Failed)</span>
                            <AlertCircle
                                className={`h-4 w-4 ${
                                    summary.failed_apps > 0 ? "text-destructive" : "text-muted-foreground/60"
                                }`}
                            />
                        </div>
                        <p
                            className={`mt-1 text-2xl font-bold tabular-nums ${
                                summary.failed_apps > 0 ? "text-destructive" : "text-foreground"
                            }`}
                        >
                            {summary.failed_apps}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            {summary.failed_apps > 0 ? "İnceleme gerekli" : "Tüm servisler sağlıklı"}
                        </p>
                    </div>

                    {/* AI Agents Count */}
                    <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3.5 backdrop-blur-sm shadow-xs">
                        <div className="flex items-center justify-between text-purple-400">
                            <span className="text-xs font-medium">AI Ajan Havuzu</span>
                            <Bot className="h-4 w-4 text-purple-400" />
                        </div>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-purple-300">
                            {summary.categories.find((c) => c.category === "ai_agent")?.total ?? 0}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Claudebox, Aider, Vibe...</p>
                    </div>

                    {/* Resource Usage */}
                    <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 backdrop-blur-sm shadow-xs col-span-2 sm:col-span-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-medium">Kullanılan Bellek</span>
                            <HardDrive className="h-4 w-4 text-amber-400" />
                        </div>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                            {summary.total_memory_mb > 1024
                                ? `${(summary.total_memory_mb / 1024).toFixed(1)} GB`
                                : `${summary.total_memory_mb} MB`}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Cgroups v2 RAM toplamı</p>
                    </div>
                </div>
            )}

            {/* ─── Filter Bar & Category Tabs ─── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/60 pb-3">
                {/* Categories */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        onClick={() => setSelectedCategory("")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            selectedCategory === ""
                                ? "bg-primary text-primary-foreground"
                                : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border"
                        }`}
                    >
                        Tümü
                    </button>
                    <button
                        onClick={() => setSelectedCategory("core_service")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            selectedCategory === "core_service"
                                ? "bg-primary text-primary-foreground"
                                : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border"
                        }`}
                    >
                        <Server className="h-3 w-3" />
                        <span>Sistem Servisleri</span>
                    </button>
                    <button
                        onClick={() => setSelectedCategory("ai_agent")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            selectedCategory === "ai_agent"
                                ? "bg-primary text-primary-foreground"
                                : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border"
                        }`}
                    >
                        <Bot className="h-3 w-3" />
                        <span>AI Ajanları</span>
                    </button>
                    <button
                        onClick={() => setSelectedCategory("microvm")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            selectedCategory === "microvm"
                                ? "bg-primary text-primary-foreground"
                                : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border"
                        }`}
                    >
                        <Box className="h-3 w-3" />
                        <span>MicroVM Sandbox</span>
                    </button>
                    <button
                        onClick={() => setSelectedCategory("dev_tool")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            selectedCategory === "dev_tool"
                                ? "bg-primary text-primary-foreground"
                                : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border"
                        }`}
                    >
                        <Wrench className="h-3 w-3" />
                        <span>Geliştirici Araçları</span>
                    </button>
                </div>

                {/* Search & Status Controls */}
                <div className="flex items-center gap-2">
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                        <option value="">Durum: Tümü</option>
                        <option value="running">Çalışıyor (Running)</option>
                        <option value="stopped">Durduruldu (Stopped)</option>
                        <option value="failed">Hatalı (Failed)</option>
                        <option value="standby">Hazır (Standby)</option>
                    </select>

                    <div className="relative min-w-[200px]">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Uygulama veya servis ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-border bg-card py-1.5 pl-8 pr-3 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>
            </div>

            {/* ─── Main Content Views ─── */}
            {isAppsLoading && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-44 rounded-xl border border-border bg-card/40 animate-pulse" />
                    ))}
                </div>
            )}

            {error && (
                <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
                    <span>Uygulamalar yüklenirken bir hata oluştu: {(error as Error).message}</span>
                    <button
                        onClick={() => refetch()}
                        className="flex items-center gap-1 rounded-md border border-destructive/40 bg-card px-2.5 py-1 text-xs text-foreground hover:bg-accent"
                    >
                        <RotateCcw className="h-3 w-3" />
                        Tekrar Dene
                    </button>
                </div>
            )}

            {apps && (
                <>
                    {viewMode === "grid" && (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {apps.map((app) => (
                                <AppCard
                                    key={app.id}
                                    app={app}
                                    onSelect={(a) => setSelectedApp(a)}
                                    onActionConfirm={handleActionConfirmTrigger}
                                />
                            ))}
                            {apps.length === 0 && (
                                <div className="col-span-full py-16 text-center text-xs text-muted-foreground">
                                    Arama veya filtre kriterleriyle eşleşen uygulama bulunamadı.
                                </div>
                            )}
                        </div>
                    )}

                    {viewMode === "table" && (
                        <AppTable
                            apps={apps}
                            onSelect={(a) => setSelectedApp(a)}
                            onActionConfirm={handleActionConfirmTrigger}
                        />
                    )}

                    {viewMode === "topology" && (
                        <AppDependencyGraph
                            onSelectApp={(appId) => {
                                const found = apps.find((a) => a.id === appId || a.systemd_unit === appId);
                                if (found) setSelectedApp(found);
                            }}
                        />
                    )}
                </>
            )}

            {/* ─── Detail Drawer ─── */}
            <AppDetailDrawer
                app={selectedApp}
                onClose={() => setSelectedApp(null)}
                onActionConfirm={handleActionConfirmTrigger}
            />

            {/* ─── Safety Action Confirmation Modal ─── */}
            <AppActionModal
                isOpen={Boolean(confirmModal.app && confirmModal.action)}
                app={confirmModal.app}
                action={confirmModal.action}
                onClose={() => setConfirmModal({ app: null, action: null })}
                onConfirm={handleConfirmAction}
                isPending={activeAppActions.runAction.isPending}
            />
        </div>
    );
}
