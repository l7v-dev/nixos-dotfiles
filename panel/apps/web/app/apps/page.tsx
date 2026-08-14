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
    AppWindow,
    ArrowRight,
    Cpu,
    ExternalLink,
    Sparkles,
    Lock,
    FolderKanban,
} from "lucide-react";
import Link from "next/link";
import { useTerminalStore } from "@/store/terminal-store";

function AppsPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const activeTab = searchParams.get("tab") === "services" ? "services" : "apps";

    const setTab = (tab: "apps" | "services") => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        router.push(`/apps?${params.toString()}`);
    };

    // State for Services tab
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
            // Error is handled in modal
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
        { id: "all", label: "Tüm Servisler", icon: <Server className="h-3.5 w-3.5" /> },
        { id: "ingress_network", label: "Ağ & Ingress", icon: <Globe className="h-3.5 w-3.5" /> },
        { id: "core_platform", label: "Platformlar", icon: <Server className="h-3.5 w-3.5" /> },
        { id: "observability", label: "Gözlemlenebilirlik", icon: <Activity className="h-3.5 w-3.5" /> },
        { id: "database", label: "Veritabanı", icon: <Database className="h-3.5 w-3.5" /> },
        { id: "ai_workload", label: "AI & Sandbox", icon: <Bot className="h-3.5 w-3.5" /> },
        { id: "cicd_automation", label: "CI/CD & Otomasyon", icon: <Terminal className="h-3.5 w-3.5" /> },
        { id: "backup_dr", label: "Yedekleme & DR", icon: <Shield className="h-3.5 w-3.5" /> },
    ];

    return (
        <div className="space-y-6 pb-12">
            {/* Top Navigation Bar: Title & Segmented Button Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        {activeTab === "apps" ? (
                            <AppWindow className="h-6 w-6 text-primary" />
                        ) : (
                            <Server className="h-6 w-6 text-primary" />
                        )}
                        Applications Hub
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {activeTab === "apps"
                            ? "Uzaktan çalıştırılabilir CLI araçları, AI ajanları ve geliştirici yardımcıları"
                            : "Yönetilen sunucu servisleri, cgroup kaynak telemetrisi ve systemd yönetimi"}
                    </p>
                </div>

                {/* Segmented Button Tabs */}
                <div className="inline-flex rounded-xl border border-border/80 bg-muted/40 p-1 shadow-inner self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => setTab("apps")}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                            activeTab === "apps"
                                ? "bg-card text-foreground shadow-sm ring-1 ring-border/50 font-bold"
                                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                        }`}
                    >
                        <Terminal className="h-4 w-4 text-primary" />
                        <span>Uygulamalar (CLI Araçları)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("services")}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                            activeTab === "services"
                                ? "bg-card text-foreground shadow-sm ring-1 ring-border/50 font-bold"
                                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                        }`}
                    >
                        <Server className="h-4 w-4 text-primary" />
                        <span>Servisler (Yönetilen)</span>
                    </button>
                </div>
            </div>

            {/* ─── TAB 1: UYGULAMALAR (CLI ARAÇLARI) ─── */}
            {activeTab === "apps" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Hero Banner */}
                    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background p-6 shadow-sm">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div className="space-y-2 max-w-2xl">
                                <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                                    <Sparkles className="h-3 w-3" />
                                    <span>Kapsamlı CLI & AI Araçları Merkezi</span>
                                </div>
                                <h2 className="text-lg font-bold text-foreground">
                                    Uzaktan Yönetilebilir CLI Araçları & AI Kodlama Ajanları
                                </h2>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    NixOS ortamında deklaratif olarak tanımlanmış AI kodlama ajanlarını (Claude Code, Aider, Codex, Gemini, OpenCode, Qoder),
                                    altyapı otomasyon araçlarını (Colmena, NH, Devenv) ve güvenlik yardımcılarını uzaktan güvenle çalıştırın.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                                <button
                                    onClick={() => useTerminalStore.getState().toggleQuake()}
                                    className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
                                >
                                    <Terminal className="h-4 w-4" />
                                    <span>Quake Terminali Aç</span>
                                </button>
                                <Link
                                    href="/terminal"
                                    className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors shadow-sm"
                                >
                                    <span>Tam Terminale Git</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Category Preview Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Card 1: AI Coding Agents */}
                        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-sm hover:border-primary/40 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                                    <Bot className="h-5 w-5" />
                                </div>
                                <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-500">
                                    AI Workloads
                                </span>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">AI Kodlama Ajanları</h3>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    claude-code, claudebox, aider, codex, gemini-cli, opencode, qoder-cli, cc-sdd
                                </p>
                            </div>
                            <div className="pt-2 border-t border-border/50 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
                                <span>Sandbox: Tier 1 - 3</span>
                                <span className="text-emerald-500 font-semibold">Kurulu</span>
                            </div>
                        </div>

                        {/* Card 2: Infra & Deployment */}
                        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-sm hover:border-primary/40 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                                    <Cpu className="h-5 w-5" />
                                </div>
                                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-500">
                                    Infra & Fleet
                                </span>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Dağıtım & NixOS Ops</h3>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    colmena (fleet deploy), nh (nixos helper), devenv (isolated dev shells)
                                </p>
                            </div>
                            <div className="pt-2 border-t border-border/50 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
                                <span>SSH / Colmena Mesh</span>
                                <span className="text-emerald-500 font-semibold">Aktif</span>
                            </div>
                        </div>

                        {/* Card 3: Security & Secrets */}
                        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-sm hover:border-primary/40 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                                    Zero-Trust
                                </span>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Gizlilik & SOPS</h3>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    sops (Age encryption), age-check.sh, bootstrap.sh, secrets-rotate.sh
                                </p>
                            </div>
                            <div className="pt-2 border-t border-border/50 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
                                <span>Age: /etc/age/key</span>
                                <span className="text-emerald-500 font-semibold">Korumalı</span>
                            </div>
                        </div>

                        {/* Card 4: Dev Tools & Initializers */}
                        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-sm hover:border-primary/40 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                                    <FolderKanban className="h-5 w-5" />
                                </div>
                                <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-500">
                                    Dev Suite
                                </span>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Scaffolding & CI</h3>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    aft-init (Next 16), bpt-init (Polyglot), agent-init, validate.sh
                                </p>
                            </div>
                            <div className="pt-2 border-t border-border/50 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
                                <span>Automated Init</span>
                                <span className="text-emerald-500 font-semibold">Hazır</span>
                            </div>
                        </div>
                    </div>

                    {/* Next Phase Notice Callout */}
                    <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-5 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="space-y-1">
                            <span className="font-semibold text-foreground block">
                                ℹ️ Genişletilmiş CLI Araçları Yürütme & Parametre Arayüzü
                            </span>
                            <span>
                                Komut parametreleri, uzaktan güvenli çalıştırma modalı ve otomatik binary algılama motoru bir sonraki aşamada devreye alınacaktır.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setTab("services")}
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline shrink-0 ml-4"
                        >
                            <span>Yönetilen Servisleri Görüntüle</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* ─── TAB 2: YÖNETİLEN SERVİSLER (NON-SYSTEM MANAGED SERVICES) ─── */}
            {activeTab === "services" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {/* View Controls & Action Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-2">
                            {/* View switchers */}
                            <div className="flex items-center rounded-lg border border-border/60 bg-muted/30 p-1">
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`p-1.5 rounded-md transition-colors ${
                                        viewMode === "grid"
                                            ? "bg-card text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    title="Kart Görünümü"
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode("table")}
                                    className={`p-1.5 rounded-md transition-colors ${
                                        viewMode === "table"
                                            ? "bg-card text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    title="Tablo Görünümü"
                                >
                                    <TableIcon className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode("dependencies")}
                                    className={`p-1.5 rounded-md transition-colors ${
                                        viewMode === "dependencies"
                                            ? "bg-card text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    title="Bağımlılık Topolojisi"
                                >
                                    <Network className="h-4 w-4" />
                                </button>
                            </div>

                            <button
                                onClick={handleRefresh}
                                className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shadow-sm"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${isAppsLoading || isSummaryLoading ? "animate-spin" : ""}`} />
                                <span>Yenile</span>
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative shrink-0 sm:w-72">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Yönetilen servis veya Ingress ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border/60 bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                            />
                        </div>
                    </div>

                    {/* KPI Summary Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="rounded-xl border border-border/60 bg-card/60 p-3.5 backdrop-blur-sm shadow-sm">
                            <span className="text-[11px] font-medium text-muted-foreground block">Yönetilen Servis</span>
                            <span className="text-xl font-bold mt-1 block text-foreground font-mono">
                                {summary?.total_apps ?? apps.length}
                            </span>
                        </div>
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 backdrop-blur-sm shadow-sm">
                            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block">Çalışan</span>
                            <span className="text-xl font-bold mt-1 block text-emerald-600 dark:text-emerald-400 font-mono">
                                {summary?.running_apps ?? 0}
                            </span>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-card/60 p-3.5 backdrop-blur-sm shadow-sm">
                            <span className="text-[11px] font-medium text-muted-foreground block">Durdurulan</span>
                            <span className="text-xl font-bold mt-1 block text-muted-foreground font-mono">
                                {summary?.stopped_apps ?? 0}
                            </span>
                        </div>
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 backdrop-blur-sm shadow-sm">
                            <span className="text-[11px] font-medium text-red-600 dark:text-red-400 block">Arızalı</span>
                            <span className="text-xl font-bold mt-1 block text-red-600 dark:text-red-400 font-mono">
                                {summary?.failed_apps ?? 0}
                            </span>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-card/60 p-3.5 backdrop-blur-sm shadow-sm">
                            <span className="text-[11px] font-medium text-muted-foreground block">Toplam RAM</span>
                            <span className="text-xl font-bold mt-1 block text-foreground font-mono">
                                {summary?.total_memory_mb ?? 0} MB
                            </span>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-card/60 p-3.5 backdrop-blur-sm shadow-sm">
                            <span className="text-[11px] font-medium text-muted-foreground block">Toplam CPU</span>
                            <span className="text-xl font-bold mt-1 block text-foreground font-mono">
                                {(summary?.total_cpu_percent ?? 0).toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                        {categoriesList.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                                    selectedCategory === cat.id
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                            >
                                {cat.icon}
                                <span>{cat.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Main Content Views */}
                    {viewMode === "dependencies" ? (
                        <div className="rounded-xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm shadow-sm">
                            <div className="mb-4">
                                <h2 className="text-sm font-semibold text-foreground">Servis Bağımlılık ve Ingress Topolojisi</h2>
                                <p className="text-xs text-muted-foreground">
                                    Nginx Ingress, PostgreSQL sağlayıcıları ve tüketici servisler arasındaki mimari akış
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
                            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
                                <Server className="h-8 w-8 text-muted-foreground/50 mb-2" />
                                <span>Kriterlere uygun yönetilen servis bulunamadı.</span>
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

                    {/* Detail Slide-over Drawer */}
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
            )}
        </div>
    );
}

export default function AppsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Yükleniyor...</div>}>
            <AppsPageContent />
        </Suspense>
    );
}
