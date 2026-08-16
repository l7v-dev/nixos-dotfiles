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
    Sparkles,
    Play,
    RotateCcw,
    Terminal,
    Cpu,
    Shield,
    CheckCircle2,
    Clock,
    AlertCircle,
    Copy,
    Search,
    Layers,
    Server,
    ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTerminalStore } from "@/store/terminal-store";
import type { AgentTask, SandboxTier } from "@/types/api";

function AIPageContent() {
    const searchParams = useSearchParams();
    const initialAction = searchParams.get("action");

    const [activeTab, setActiveTab] = useState<string>("tasks");
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [consoleModalOpen, setConsoleModalOpen] = useState(false);

    // New task form state
    const [taskPrompt, setTaskPrompt] = useState("");
    const [taskSlug, setTaskSlug] = useState("");
    const [selectedAgent, setSelectedAgent] = useState("claude");
    const [maxIterations, setMaxIterations] = useState(10);
    const [sandboxTier, setSandboxTier] = useState<"1" | "2" | "3">("3");

    const { data: tasksData, isLoading: loadingTasks, refetch: refetchTasks } = useAITasks();
    const { data: toolsData } = useAITools();
    const { data: microvmData } = useMicroVMHostStatus();
    const runTaskMutation = useStartAITask();
    const cancelTaskMutation = useCancelAITask();

    const tasks = tasksData?.tasks || [];

    const handleStartTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskPrompt) return;

        const slug = taskSlug || `task-${Date.now().toString().slice(-4)}`;
        runTaskMutation.mutate(
            {
                task_slug: slug,
                prompt: taskPrompt,
                agent_engine: selectedAgent,
                max_iterations: maxIterations,
                sandbox_tier: Number(sandboxTier) as SandboxTier,
            },
            {
                onSuccess: (res: AgentTask) => {
                    setTaskPrompt("");
                    setTaskSlug("");
                    if (res?.id) {
                        setSelectedTaskId(res.id);
                        setConsoleModalOpen(true);
                    }
                    refetchTasks();
                },
            }
        );
    };

    const handleOpenConsole = (id: string) => {
        setSelectedTaskId(id);
        setConsoleModalOpen(true);
    };

    const installedTools = [
        { name: "claude-code", desc: "Anthropic Claude Code CLI with tools & REPL", tier: "Tier 1-3", category: "Coding Agent" },
        { name: "claudebox", desc: "Sandboxed Claude runner in isolated bubblewrap", tier: "Tier 1", category: "Sandbox" },
        { name: "aider-chat", desc: "Multi-model pair programming terminal agent", tier: "Tier 1", category: "Pair Programmer" },
        { name: "codex", desc: "OpenAI Codex CLI execution harness", tier: "Tier 1-3", category: "Coding Agent" },
        { name: "gemini-cli", desc: "Google Gemini 2.5 Flash & Pro CLI tool", tier: "Tier 1-3", category: "CLI Assistant" },
        { name: "opencode", desc: "Multi-model terminal autonomous agent", tier: "Tier 1-3", category: "Coding Agent" },
        { name: "goose-cli", desc: "Block / Square autonomous terminal agent", tier: "Tier 1-3", category: "Autonomous" },
        { name: "cc-sdd", desc: "Spec-driven development workflow harness", tier: "Tier 3", category: "Workflow" },
        { name: "vibe-kanban", desc: "Multi-agent collaborative Kanban board", tier: "Tier 1", category: "Orchestration" },
        { name: "kiro-cli", desc: "Kiro autonomous AI IDE CLI runner", tier: "Tier 1-3", category: "Autonomous" },
        { name: "qoder-cli", desc: "Qoder AI engine command-line interface", tier: "Tier 1-3", category: "Autonomous" },
        { name: "openskills", desc: "Universal skills & tools loader", tier: "Tier 1", category: "Tooling" },
    ];

    return (
        <div className="space-y-6 pb-12">
            {/* ── Top Hero Card ── */}
            <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-card to-background p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold text-indigo-400">
                            <Bot className="h-3.5 w-3.5" />
                            <span>AI Agent Hub & Autonomous Engine</span>
                        </div>
                        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <span>Autonomous Coding Sandbox & Fleet</span>
                            <Badge variant="info">Tier 1 - 3</Badge>
                        </h1>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Run autonomous coding loops in isolated git worktrees, execute Claude Code / Codex / Gemini tasks, and orchestrate MicroVM sandboxes safely.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => setActiveTab("new-task")}
                            className="gap-1.5 shadow-md bg-indigo-600 hover:bg-indigo-500 text-white"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>New Autonomous Task</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => useTerminalStore.getState().toggleQuake()}
                            className="gap-1.5"
                        >
                            <Terminal className="h-3.5 w-3.5" />
                            <span>Quake Terminal</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Tabs Workspace ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="tasks" className="gap-2">
                        <Clock className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Active & Recent Tasks ({tasks.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="new-task" className="gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <span>Launch Task</span>
                    </TabsTrigger>
                    <TabsTrigger value="tools" className="gap-2">
                        <Bot className="h-3.5 w-3.5 text-emerald-400" />
                        <span>100+ Installed AI Tools</span>
                    </TabsTrigger>
                    <TabsTrigger value="microvm" className="gap-2">
                        <Cpu className="h-3.5 w-3.5 text-amber-400" />
                        <span>MicroVM Sandboxes</span>
                    </TabsTrigger>
                </TabsList>

                {/* ── TAB 1: ACTIVE & RECENT TASKS ── */}
                <TabsContent value="tasks" className="space-y-4">
                    {loadingTasks ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">Loading AI tasks...</div>
                    ) : tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-border/70 text-center space-y-3">
                            <Bot className="h-10 w-10 text-muted-foreground/40" />
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-foreground">No tasks executed yet</p>
                                <p className="text-[11px] text-muted-foreground">
                                    Launch an autonomous coding loop to generate code in an isolated git worktree.
                                </p>
                            </div>
                            <Button
                                size="xs"
                                variant="default"
                                onClick={() => setActiveTab("new-task")}
                            >
                                Launch First Task
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {tasks.map((task: any) => {
                                const isRunning = task.status === "running";
                                return (
                                    <div
                                        key={task.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/70 bg-card hover:border-border transition-all"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-mono text-xs shrink-0 ${
                                                isRunning ? "bg-indigo-500/20 text-indigo-400 animate-pulse" : "bg-muted/60 text-muted-foreground"
                                            }`}>
                                                <Bot className="h-4 w-4" />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-semibold text-foreground truncate">
                                                        {task.task_slug || task.id}
                                                    </p>
                                                    <Badge variant={isRunning ? "info" : task.status === "completed" ? "success" : "destructive"}>
                                                        {task.status}
                                                    </Badge>
                                                    <span className="text-[10px] font-mono text-muted-foreground">
                                                        Engine: {task.agent_engine || task.agent || "claude"}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-xl">
                                                    {task.prompt || "No prompt recorded"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mt-3 sm:mt-0 shrink-0">
                                            <Button
                                                size="xs"
                                                variant="outline"
                                                onClick={() => handleOpenConsole(task.id)}
                                                className="gap-1"
                                            >
                                                <Terminal className="h-3 w-3" />
                                                <span>Console</span>
                                            </Button>

                                            {isRunning && (
                                                <Button
                                                    size="xs"
                                                    variant="destructive"
                                                    onClick={() => cancelTaskMutation.mutate({ id: task.id, cleanupWorktree: false })}
                                                >
                                                    Stop
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* ── TAB 2: LAUNCH NEW TASK ── */}
                <TabsContent value="new-task" className="space-y-4">
                    <form onSubmit={handleStartTask} className="rounded-2xl border border-border/70 bg-card p-6 space-y-5">
                        <div className="space-y-1 border-b border-border/60 pb-3">
                            <h2 className="text-sm font-bold text-foreground">Launch Autonomous Agent Loop</h2>
                            <p className="text-xs text-muted-foreground">
                                Spawns an isolated git worktree branch and runs the agent autonomously with automated commit & tests.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-foreground block">
                                Task Prompt & Objective
                            </label>
                            <textarea
                                rows={4}
                                placeholder="Describe the feature, bugfix, or refactoring in detail..."
                                value={taskPrompt}
                                onChange={(e) => setTaskPrompt(e.target.value)}
                                className="w-full rounded-xl border border-border/80 bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Task Slug / Branch</label>
                                <input
                                    type="text"
                                    placeholder="e.g. feat-panel-redesign"
                                    value={taskSlug}
                                    onChange={(e) => setTaskSlug(e.target.value)}
                                    className="w-full rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">AI Model Agent</label>
                                <select
                                    value={selectedAgent}
                                    onChange={(e) => setSelectedAgent(e.target.value)}
                                    className="w-full rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="claude">Claude Code (Anthropic Sonnet 3.7)</option>
                                    <option value="codex">OpenAI Codex</option>
                                    <option value="gemini">Google Gemini 2.5 Flash</option>
                                    <option value="aider">Aider Multi-Model</option>
                                    <option value="opencode">OpenCode Terminal</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Sandbox Security Tier</label>
                                <select
                                    value={sandboxTier}
                                    onChange={(e) => setSandboxTier(e.target.value as any)}
                                    className="w-full rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="3">Tier 3: Worktree + Tmux Loop (Recommended)</option>
                                    <option value="1">Tier 1: Claudebox Sandbox (Bubblewrap)</option>
                                    <option value="2">Tier 2: MicroVM Host Sandbox (Ephemeral)</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-2.5">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setActiveTab("tasks")}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="default"
                                disabled={runTaskMutation.isPending || !taskPrompt}
                                className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>{runTaskMutation.isPending ? "Starting Loop..." : "Start Autonomous Loop"}</span>
                            </Button>
                        </div>
                    </form>
                </TabsContent>

                {/* ── TAB 3: INSTALLED AI TOOLS CATALOG ── */}
                <TabsContent value="tools" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {installedTools.map((tool) => (
                            <div key={tool.name} className="rounded-xl border border-border/70 bg-card p-4 space-y-2.5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs font-bold text-foreground">{tool.name}</span>
                                    <Badge variant="outline">{tool.tier}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {tool.desc}
                                </p>
                                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                                    <span className="font-semibold text-primary">{tool.category}</span>
                                    <span className="text-emerald-500 font-semibold">Ready</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>

                {/* ── TAB 4: MICROVM SANDBOXES ── */}
                <TabsContent value="microvm" className="space-y-4">
                    <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4">
                        <div className="space-y-1 border-b border-border/60 pb-3">
                            <h3 className="text-sm font-bold text-foreground">MicroVM Ephemeral Sandbox Fleet</h3>
                            <p className="text-xs text-muted-foreground">
                                Isolated virtual machines managed via microvm.nix for untrusted code execution.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground font-mono">coding-agent-vm</span>
                                    <Badge variant="success">Standby</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1 font-mono">
                                    <div>vCPU: 4 cores</div>
                                    <div>RAM: 8192 MB</div>
                                    <div>Hypervisor: Cloud-Hypervisor</div>
                                </div>
                                <Button size="xs" variant="outline" className="w-full">
                                    Launch Sandbox Session
                                </Button>
                            </div>

                            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground font-mono">test-runner-vm</span>
                                    <Badge variant="outline">Stopped</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1 font-mono">
                                    <div>vCPU: 2 cores</div>
                                    <div>RAM: 4096 MB</div>
                                    <div>Hypervisor: QEMU KVM</div>
                                </div>
                                <Button size="xs" variant="secondary" className="w-full">
                                    Start Runner
                                </Button>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* ── Live Streaming Task Console Modal ── */}
            <AITaskConsoleModal
                open={consoleModalOpen}
                taskId={selectedTaskId}
                onClose={() => setConsoleModalOpen(false)}
            />
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
