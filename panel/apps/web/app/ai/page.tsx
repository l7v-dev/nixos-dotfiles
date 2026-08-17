"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
    useAITasks,
    useStartAITask,
    useCancelAITask,
    useAITools,
    useMicroVMHostStatus,
} from "@/hooks/useAIAgents";
import { AITaskConsoleModal } from "@/components/cockpit/AITaskConsoleModal";
import {
    Bot,
    Play,
    Terminal,
    Boxes,
    Shield,
    CheckCircle2,
    Clock,
    AlertCircle,
    Plus,
    RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { AgentTask, SandboxTier } from "@/types/api";

function AIPageContent() {
    const searchParams = useSearchParams();
    const initialAction = searchParams.get("action");

    const [activeTab, setActiveTab] = useState<string>(initialAction === "new" ? "new-task" : "tasks");
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [consoleModalOpen, setConsoleModalOpen] = useState(false);

    // New task form state
    const [taskPrompt, setTaskPrompt] = useState("");
    const [taskSlug, setTaskSlug] = useState("");
    const [selectedAgent, setSelectedAgent] = useState("claude");
    const [maxIterations, setMaxIterations] = useState(10);
    const [sandboxTier, setSandboxTier] = useState<"1" | "2" | "3">("3");

    const { data: tasksData, isLoading: loadingTasks, refetch: refetchTasks } = useAITasks();
    const { data: toolsData, refetch: refetchTools } = useAITools();
    const { data: microvmData } = useMicroVMHostStatus();
    const runTaskMutation = useStartAITask();
    const cancelTaskMutation = useCancelAITask();

    const tasks = tasksData?.tasks || [];
    const runningTasks = tasks.filter((t) => t.status === "running");
    const tools = toolsData?.tools || [];

    const handleStartTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskPrompt || !taskSlug) return;

        runTaskMutation.mutate(
            {
                task_slug: taskSlug,
                prompt: taskPrompt,
                agent_engine: selectedAgent,
                max_iterations: maxIterations,
                sandbox_tier: Number(sandboxTier) as SandboxTier,
            },
            {
                onSuccess: (res) => {
                    setTaskPrompt("");
                    setTaskSlug("");
                    setActiveTab("tasks");
                    setSelectedTaskId(res.id);
                    setConsoleModalOpen(true);
                    refetchTasks();
                },
            }
        );
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
                                AI Agent Hub & Autonomous Sandbox
                            </h1>
                            <Badge variant="ai" className="font-mono text-[10px]">
                                {runningTasks.length} Active Loops
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Multi-model autonomous development agents, Tier 1–3 sandboxed environments, and system tools suite.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Button
                            variant="default"
                            size="xs"
                            onClick={() => setActiveTab("new-task")}
                            className="gap-1.5 shadow-sm"
                        >
                            <Plus className="h-3 w-3" />
                            <span>Launch Agent Task</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                                refetchTasks();
                                refetchTools();
                            }}
                            className="gap-1"
                        >
                            <RefreshCw className="h-3 w-3" />
                            <span>Refresh</span>
                        </Button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-border/60 mt-4">
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Tasks</span>
                        <p className="text-lg font-bold font-mono tnum text-foreground">{tasks.length}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Active Loops</span>
                        <p className="text-lg font-bold font-mono tnum text-primary">{runningTasks.length}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Tier 2 MicroVM</span>
                        <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 pt-0.5">
                            {microvmData?.kvm_enabled ? "● KVM Ready" : "○ Soft Emulation"}
                        </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Installed Tools</span>
                        <p className="text-lg font-bold font-mono tnum text-primary">
                            {tools.filter((t) => t.installed).length} / {tools.length || 11}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Tabs Workspace ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="tasks" className="gap-1.5 text-xs">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Task Queue ({tasks.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="new-task" className="gap-1.5 text-xs">
                        <Plus className="h-3.5 w-3.5" />
                        <span>Launch Task</span>
                    </TabsTrigger>
                    <TabsTrigger value="sandboxes" className="gap-1.5 text-xs">
                        <Boxes className="h-3.5 w-3.5" />
                        <span>Sandbox Tiers</span>
                    </TabsTrigger>
                    <TabsTrigger value="tools" className="gap-1.5 text-xs">
                        <Terminal className="h-3.5 w-3.5" />
                        <span>AI CLI Suite</span>
                    </TabsTrigger>
                </TabsList>

                {/* 1. Tasks Queue */}
                <TabsContent value="tasks">
                    <div className="instrument-card p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-foreground">Autonomous Execution Log</h3>
                            <span className="text-xs font-mono text-muted-foreground">{tasks.length} runs recorded</span>
                        </div>

                        {loadingTasks ? (
                            <div className="p-8 text-center text-xs text-muted-foreground font-mono">
                                Loading autonomous tasks…
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                                No agent tasks dispatched yet. Click &quot;Launch Agent Task&quot; to run.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-border/60">
                                <table className="w-full text-left text-xs font-mono">
                                    <thead className="bg-muted/60 text-muted-foreground border-b border-border/60">
                                        <tr>
                                            <th className="p-2.5 font-semibold">Task ID</th>
                                            <th className="p-2.5 font-semibold">Agent</th>
                                            <th className="p-2.5 font-semibold">Prompt</th>
                                            <th className="p-2.5 font-semibold">Duration</th>
                                            <th className="p-2.5 font-semibold">Status</th>
                                            <th className="p-2.5 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {tasks.map((t: AgentTask) => (
                                            <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="p-2.5 font-bold text-foreground">{t.task_slug || t.id}</td>
                                                <td className="p-2.5 text-primary font-semibold">{t.agent_engine || "claude"}</td>
                                                <td className="p-2.5 font-sans text-muted-foreground truncate max-w-xs">{t.prompt}</td>
                                                <td className="p-2.5 text-muted-foreground tnum">
                                                    {t.duration_ms ? `${(t.duration_ms / 1000).toFixed(1)}s` : "Running"}
                                                </td>
                                                <td className="p-2.5">
                                                    <Badge
                                                        variant={
                                                            t.status === "completed"
                                                                ? "success"
                                                                : t.status === "running"
                                                                ? "ai"
                                                                : "destructive"
                                                        }
                                                        className="text-[10px] capitalize"
                                                    >
                                                        {t.status}
                                                    </Badge>
                                                </td>
                                                <td className="p-2.5 text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="xs"
                                                        onClick={() => {
                                                            setSelectedTaskId(t.id);
                                                            setConsoleModalOpen(true);
                                                        }}
                                                        className="h-6 text-[10px]"
                                                    >
                                                        Console
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* 2. New Task Form */}
                <TabsContent value="new-task">
                    <div className="instrument-card p-4 sm:p-5 max-w-2xl space-y-4">
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">Launch Autonomous Agent Loop</h3>
                            <p className="text-xs text-muted-foreground">
                                Dispatches <code className="font-mono text-primary">scripts/claude-autonomous.sh</code> in an isolated worktree.
                            </p>
                        </div>

                        <form onSubmit={handleStartTask} className="space-y-3.5">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-foreground">Task Slug / Identifier</label>
                                <input
                                    type="text"
                                    value={taskSlug}
                                    onChange={(e) => setTaskSlug(e.target.value)}
                                    placeholder="e.g. fix-auth-tokens"
                                    className="w-full rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground font-mono"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-foreground">Prompt / Task Objective</label>
                                <textarea
                                    value={taskPrompt}
                                    onChange={(e) => setTaskPrompt(e.target.value)}
                                    placeholder="Describe the coding or infrastructure task..."
                                    rows={3}
                                    className="w-full rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground font-sans"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-foreground">Model Agent</label>
                                    <select
                                        value={selectedAgent}
                                        onChange={(e) => setSelectedAgent(e.target.value)}
                                        className="w-full rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-xs text-foreground"
                                    >
                                        <option value="claude">Claude 3.7 Sonnet</option>
                                        <option value="codex">OpenAI Codex</option>
                                        <option value="gemini">Google Gemini 2.5</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-foreground">Sandbox Tier</label>
                                    <select
                                        value={sandboxTier}
                                        onChange={(e) => setSandboxTier(e.target.value as "1" | "2" | "3")}
                                        className="w-full rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-xs text-foreground"
                                    >
                                        <option value="1">Tier 1: Claudebox</option>
                                        <option value="2">Tier 2: MicroVM</option>
                                        <option value="3">Tier 3: Worktree (Default)</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-foreground">Max Iterations</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={maxIterations}
                                        onChange={(e) => setMaxIterations(parseInt(e.target.value, 10))}
                                        className="w-full rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground font-mono"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                size="xs"
                                variant="default"
                                disabled={!taskSlug || !taskPrompt || runTaskMutation.isPending}
                                className="gap-1.5 shadow-sm"
                            >
                                <Play className="h-3 w-3" />
                                <span>{runTaskMutation.isPending ? "Starting Loop…" : "Dispatch Autonomous Run"}</span>
                            </Button>
                        </form>
                    </div>
                </TabsContent>

                {/* 3. Sandbox Tiers */}
                <TabsContent value="sandboxes">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="instrument-card p-4 space-y-2">
                            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Tier 1</span>
                            <h4 className="text-sm font-bold text-foreground">Claudebox Sandbox</h4>
                            <p className="text-xs text-muted-foreground">Host filesystem isolation for trusted daily coding.</p>
                        </div>
                        <div className="instrument-card p-4 space-y-2">
                            <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Tier 2</span>
                            <h4 className="text-sm font-bold text-foreground">MicroVM Ephemeral</h4>
                            <p className="text-xs text-muted-foreground">High risk isolation inside lightweight QEMU/KVM guest.</p>
                        </div>
                        <div className="instrument-card p-4 space-y-2">
                            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Tier 3</span>
                            <h4 className="text-sm font-bold text-foreground">Autonomous Worktree</h4>
                            <p className="text-xs text-muted-foreground">Dedicated isolated git branch with automated rollback.</p>
                        </div>
                    </div>
                </TabsContent>

                {/* 4. AI CLI Suite */}
                <TabsContent value="tools">
                    <div className="instrument-card p-4 sm:p-5 space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Declarative AI Tools Matrix</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                            {tools.map((tool) => (
                                <div key={tool.name} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 p-2.5">
                                    <span className="text-foreground font-semibold">{tool.name}</span>
                                    <Badge variant={tool.installed ? "success" : "muted"} className="text-[10px]">
                                        {tool.installed ? "Installed" : "Available"}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Console Modal */}
            {selectedTaskId && (
                <AITaskConsoleModal
                    taskId={selectedTaskId}
                    open={consoleModalOpen}
                    onClose={() => setConsoleModalOpen(false)}
                />
            )}
        </div>
    );
}

export default function AIPage() {
    return (
        <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading AI Agent Hub...</div>}>
            <AIPageContent />
        </Suspense>
    );
}
