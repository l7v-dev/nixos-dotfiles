"use client";

import React, { useState } from "react";
import {
    X,
    Bot,
    Terminal,
    Shield,
    Boxes,
    Play,
    Square,
    RotateCcw,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Copy,
    Check,
    Cpu,
    HardDrive,
    Layers,
    Search,
    ExternalLink,
    Clock,
    Plus,
    Activity,
} from "lucide-react";
import {
    useAITasks,
    useStartAITask,
    useCancelAITask,
    useAITools,
    useMicroVMs,
    useMicroVMHostStatus,
    useMicroVMAction,
} from "@/hooks/useAIAgents";
import type { AgentTask, StartTaskRequest, AIToolCategory } from "@/types/api";
import { AITaskConsoleModal } from "@/components/cockpit/AITaskConsoleModal";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AgentHubDrawer({ open, onOpenChange }: Props) {
    const [activeTab, setActiveTab] = useState<"tasks" | "microvm" | "tools">("tasks");
    const [consoleTaskId, setConsoleTaskId] = useState<string | null>(null);
    const [showNewTaskModal, setShowNewTaskModal] = useState(false);
    const [toolSearch, setToolSearch] = useState("");
    const [toolCategory, setToolCategory] = useState<string>("all");
    const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

    // Queries & Mutations
    const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks, isFetching: tasksFetching } = useAITasks();
    const { data: toolsData, isLoading: toolsLoading } = useAITools();
    const { data: vmData, isLoading: vmLoading, refetch: refetchVMs } = useMicroVMs();
    const { data: hostStatus } = useMicroVMHostStatus();

    const startTaskMutation = useStartAITask();
    const cancelTaskMutation = useCancelAITask();
    const vmActionMutation = useMicroVMAction();

    // New task form state
    const [taskSlug, setTaskSlug] = useState("");
    const [prompt, setPrompt] = useState("");
    const [agentEngine, setAgentEngine] = useState("claude");
    const [maxIter, setMaxIter] = useState(5);
    const [workingDir, setWorkingDir] = useState("/home/l7v/dev/projects/company/active/nixos");

    if (!open) return null;

    const tasks = tasksData?.tasks || [];
    const runningTasksCount = tasks.filter((t) => t.status === "running").length;
    const microvms = vmData?.microvms || [];
    const tools = toolsData?.tools || [];

    const filteredTools = tools.filter((t) => {
        const matchesSearch =
            t.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
            t.binary_name.toLowerCase().includes(toolSearch.toLowerCase()) ||
            t.description.toLowerCase().includes(toolSearch.toLowerCase());
        const matchesCat = toolCategory === "all" || t.category === toolCategory;
        return matchesSearch && matchesCat;
    });

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedCmd(id);
        setTimeout(() => setCopiedCmd(null), 2000);
    };

    const handleStartTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskSlug || !prompt) return;

        startTaskMutation.mutate(
            {
                task_slug: taskSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                prompt: prompt.trim(),
                agent_engine: agentEngine,
                max_iterations: maxIter,
                working_dir: workingDir,
            },
            {
                onSuccess: (task) => {
                    setShowNewTaskModal(false);
                    setTaskSlug("");
                    setPrompt("");
                    setConsoleTaskId(task.id);
                },
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="flex h-full w-full max-w-3xl flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200">
                {/* ── Header ── */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <Bot className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-semibold text-foreground">
                                    AI Agent & Sandbox Yönetim Merkezi
                                </h2>
                                {runningTasksCount > 0 && (
                                    <span className="rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary animate-pulse">
                                        {runningTasksCount} Aktif Görev
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Otonom agent döngüleri, Tier 2 MicroVM sandbox&apos;ları ve AI araç ekosistemi
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                refetchTasks();
                                refetchVMs();
                            }}
                            disabled={tasksFetching}
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${tasksFetching ? "animate-spin" : ""}`} />
                            Yenile
                        </button>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* ── Navigation Tabs ── */}
                <div className="flex border-b border-border/80 bg-muted/20 px-6 gap-6 text-xs font-medium">
                    <button
                        onClick={() => setActiveTab("tasks")}
                        className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${
                            activeTab === "tasks"
                                ? "border-primary text-primary font-semibold"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Terminal className="h-4 w-4" />
                        <span>Aktif Görevler & Döngü</span>
                        {runningTasksCount > 0 && (
                            <span className="rounded-full bg-primary text-primary-foreground px-1.5 py-0.2 text-[10px] font-bold">
                                {runningTasksCount}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab("microvm")}
                        className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${
                            activeTab === "microvm"
                                ? "border-primary text-primary font-semibold"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Shield className="h-4 w-4" />
                        <span>MicroVM Ephemeral Sandbox</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("tools")}
                        className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${
                            activeTab === "tools"
                                ? "border-primary text-primary font-semibold"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Boxes className="h-4 w-4" />
                        <span>AI Araç Envanteri ({tools.length})</span>
                    </button>
                </div>

                {/* ── Tab Content ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* TAB 1: TASKS */}
                    {activeTab === "tasks" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Otonom Agent Görevleri
                                </span>
                                <button
                                    onClick={() => setShowNewTaskModal(true)}
                                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Yeni Görev Başlat
                                </button>
                            </div>

                            {tasksLoading ? (
                                <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
                                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                    Görevler yükleniyor...
                                </div>
                            ) : tasks.length === 0 ? (
                                <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground text-sm space-y-2">
                                    <p className="font-medium">Henüz aktif veya kayıtlı otonom görev bulunmuyor.</p>
                                    <p className="text-xs">
                                        Yukarıdaki &quot;Yeni Görev Başlat&quot; butonuna tıklayarak izole git worktree üzerinde otonom agent döngüsü başlatabilirsiniz.
                                    </p>
                                </div>
                            ) : (
                                tasks.map((task) => {
                                    const isRunning = task.status === "running";
                                    return (
                                        <div
                                            key={task.id}
                                            className={`flex flex-col p-4 rounded-xl border transition-all ${
                                                isRunning
                                                    ? "border-primary/50 bg-primary/5 shadow-xs"
                                                    : "border-border bg-card/60"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-sm text-foreground font-mono">
                                                            {task.task_slug}
                                                        </span>
                                                        <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                                                            {task.agent_engine}
                                                        </span>
                                                        {task.is_external && (
                                                            <span className="rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 px-1.5 py-0.2 text-[9px]">
                                                                CLI Session
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                        {task.prompt}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {task.status === "running" && (
                                                        <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                                            <RefreshCw className="h-3 w-3 animate-spin" />
                                                            İter: {task.current_iteration || 1}/{task.max_iterations}
                                                        </span>
                                                    )}
                                                    {task.status === "completed" && (
                                                        <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            Tamamlandı
                                                        </span>
                                                    )}
                                                    {task.status === "failed" && (
                                                        <span className="flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400">
                                                            <AlertCircle className="h-3 w-3" />
                                                            Hata ({task.exit_code})
                                                        </span>
                                                    )}
                                                    {task.status === "cancelled" && (
                                                        <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                                                            <Square className="h-3 w-3" />
                                                            İptal
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Details & Actions Footer */}
                                            <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
                                                <div className="flex items-center gap-3 font-mono">
                                                    {task.branch && <span>Branch: {task.branch}</span>}
                                                    {task.duration_ms > 0 && (
                                                        <span>Süre: {(task.duration_ms / 1000).toFixed(1)}s</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setConsoleTaskId(task.id)}
                                                        className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
                                                    >
                                                        <Terminal className="h-3.5 w-3.5" />
                                                        Canlı Konsol
                                                    </button>

                                                    {isRunning && (
                                                        <button
                                                            onClick={() => cancelTaskMutation.mutate({ id: task.id })}
                                                            disabled={cancelTaskMutation.isPending}
                                                            className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition-colors"
                                                        >
                                                            <Square className="h-3 w-3" />
                                                            Durdur
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* TAB 2: MICROVM */}
                    {activeTab === "microvm" && (
                        <div className="space-y-4">
                            {/* Host virtualization status banner */}
                            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <Cpu className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-foreground">
                                            KVM & MicroVM Host Desteği
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            {hostStatus?.kvm_enabled
                                                ? "KVM donanım hızlandırma devrede (/dev/kvm hazır)"
                                                : "KVM desteği tespit edilemedi"}
                                        </p>
                                    </div>
                                </div>

                                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 text-xs font-medium">
                                    Tier 2 Hazır
                                </span>
                            </div>

                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Tanımlı MicroVM Sandboxes
                            </span>

                            {vmLoading ? (
                                <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                    MicroVM durumları sorgulanıyor...
                                </div>
                            ) : (
                                microvms.map((vm) => {
                                    const isRunning = vm.status === "running";
                                    return (
                                        <div
                                            key={vm.name}
                                            className="p-5 rounded-xl border border-border bg-card/60 space-y-4"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 rounded-lg bg-muted">
                                                        <Shield className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold text-sm text-foreground">
                                                                {vm.name}
                                                            </h4>
                                                            <span className="rounded bg-primary/10 text-primary px-2 py-0.2 text-[10px] font-mono">
                                                                Tier 2 Ephemeral VM
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            İzole donanım sanallaştırması ile güvenli agent yürütücüsü
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {isRunning ? (
                                                        <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            Çalışıyor
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                                            Durduruldu
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Hardware Specs & Shares */}
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                                                    <span className="text-[10px] text-muted-foreground block">Donanım Kaynakları</span>
                                                    <span className="font-semibold font-mono">
                                                        {vm.vcpu} vCPU · {vm.memory_mb} MB RAM
                                                    </span>
                                                </div>
                                                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                                                    <span className="text-[10px] text-muted-foreground block">virtiofs Mount Paylaşımları</span>
                                                    <span className="font-semibold font-mono text-[11px]">
                                                        {vm.shares?.map((s) => s.tag).join(", ") || "ro-store, workspace"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Control Actions */}
                                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50">
                                                <div className="flex items-center gap-2">
                                                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded text-foreground">
                                                        {vm.ssh_command || `ssh ${vm.name}`}
                                                    </code>
                                                    <button
                                                        onClick={() => handleCopy(vm.ssh_command || `ssh ${vm.name}`, vm.name)}
                                                        className="p-1 rounded text-muted-foreground hover:text-foreground"
                                                        title="SSH komutunu kopyala"
                                                    >
                                                        {copiedCmd === vm.name ? (
                                                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                                                        ) : (
                                                            <Copy className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {isRunning ? (
                                                        <>
                                                            <button
                                                                onClick={() => vmActionMutation.mutate({ name: vm.name, action: "restart" })}
                                                                disabled={vmActionMutation.isPending}
                                                                className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
                                                            >
                                                                <RotateCcw className="h-3 w-3" />
                                                                Yeniden Başlat
                                                            </button>
                                                            <button
                                                                onClick={() => vmActionMutation.mutate({ name: vm.name, action: "stop" })}
                                                                disabled={vmActionMutation.isPending}
                                                                className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition-colors"
                                                            >
                                                                <Square className="h-3 w-3" />
                                                                Durdur
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => vmActionMutation.mutate({ name: vm.name, action: "start" })}
                                                            disabled={vmActionMutation.isPending}
                                                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-xs"
                                                        >
                                                            <Play className="h-3 w-3" />
                                                            MicroVM Başlat
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* TAB 3: TOOLS CATALOG */}
                    {activeTab === "tools" && (
                        <div className="space-y-4">
                            {/* Search and Category Filter Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="AI aracı veya komut ara (örn: claude, codex, aider)..."
                                        value={toolSearch}
                                        onChange={(e) => setToolSearch(e.target.value)}
                                        className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>

                                <select
                                    value={toolCategory}
                                    onChange={(e) => setToolCategory(e.target.value)}
                                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="all">Tüm Kategoriler</option>
                                    <option value="coding_agent">Kodlama Agentları</option>
                                    <option value="workflow_management">İş Akışı & Kanban</option>
                                    <option value="code_review">Kod İnceleme & Diff</option>
                                    <option value="memory_intelligence">Hafıza & Kod Zekası</option>
                                    <option value="sandboxing_isolation">Sandbox & Güvenlik</option>
                                </select>
                            </div>

                            {/* Tools Grid */}
                            <div className="grid gap-3 sm:grid-cols-2">
                                {filteredTools.map((tool) => (
                                    <div
                                        key={tool.name}
                                        className="p-3.5 rounded-xl border border-border bg-card/60 flex flex-col justify-between hover:border-primary/40 transition-colors"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-xs text-foreground">
                                                    {tool.name}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {tool.installed ? (
                                                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.2 text-[9px] font-medium">
                                                            Kurulu
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-muted border border-border text-muted-foreground px-1.5 py-0.2 text-[9px]">
                                                            Talep Üzerine
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                                                {tool.description}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border/40 text-[10px]">
                                            <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                {tool.binary_name}
                                            </code>
                                            <span className="text-muted-foreground font-mono">
                                                {tool.source}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── New Task Modal Dialog ── */}
                {showNewTaskModal && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
                        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div className="flex items-center gap-2">
                                    <Bot className="h-5 w-5 text-primary" />
                                    <h3 className="font-semibold text-sm text-foreground">
                                        Yeni Otonom Agent Görevi Başlat
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowNewTaskModal(false)}
                                    className="p-1 rounded text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <form onSubmit={handleStartTask} className="space-y-3.5 text-xs">
                                <div>
                                    <label className="block font-medium text-muted-foreground mb-1">
                                        Görev Kodu (Slug) *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="örn: add-oauth, fix-perf, refactor-api"
                                        value={taskSlug}
                                        onChange={(e) => setTaskSlug(e.target.value)}
                                        required
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Otomatik olarak <code className="text-primary font-mono">agent/{taskSlug || "slug"}</code> dalı ve izole worktree açılacaktır.
                                    </p>
                                </div>

                                <div>
                                    <label className="block font-medium text-muted-foreground mb-1">
                                        Yönerge (Prompt) *
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="Agent'a verilecek detaylı talimat..."
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        required
                                        className="w-full rounded-lg border border-border bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block font-medium text-muted-foreground mb-1">
                                            AI Motoru
                                        </label>
                                        <select
                                            value={agentEngine}
                                            onChange={(e) => setAgentEngine(e.target.value)}
                                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                        >
                                            <option value="claude">Claude Code (Anthropic)</option>
                                            <option value="codex">OpenAI Codex</option>
                                            <option value="gemini">Google Gemini</option>
                                            <option value="opencode">OpenCode</option>
                                            <option value="aider">Aider Multi-Model</option>
                                            <option value="claudebox">Claudebox (Tier 1 Sandbox)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block font-medium text-muted-foreground mb-1">
                                            Maksimum İterasyon: {maxIter}
                                        </label>
                                        <input
                                            type="range"
                                            min={1}
                                            max={10}
                                            value={maxIter}
                                            onChange={(e) => setMaxIter(parseInt(e.target.value, 10))}
                                            className="w-full mt-2 accent-primary cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-medium text-muted-foreground mb-1">
                                        Çalışma Dizini
                                    </label>
                                    <input
                                        type="text"
                                        value={workingDir}
                                        onChange={(e) => setWorkingDir(e.target.value)}
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                                    <button
                                        type="button"
                                        onClick={() => setShowNewTaskModal(false)}
                                        className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={startTaskMutation.isPending || !taskSlug || !prompt}
                                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                                    >
                                        <Play className="h-3.5 w-3.5" />
                                        {startTaskMutation.isPending ? "Başlatılıyor..." : "Döngüyü Başlat"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── Live Task Console Modal ── */}
                <AITaskConsoleModal
                    open={Boolean(consoleTaskId)}
                    taskId={consoleTaskId}
                    onClose={() => setConsoleTaskId(null)}
                />
            </div>
        </div>
    );
}
