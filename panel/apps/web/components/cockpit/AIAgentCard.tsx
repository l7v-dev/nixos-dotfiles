"use client";

import { useState } from "react";
import {
    Bot,
    Terminal,
    Shield,
    Boxes,
    Play,
    RefreshCw,
    CheckCircle2,
    Clock,
    Plus,
    Activity,
    ExternalLink,
} from "lucide-react";
import { useAITasks, useMicroVMs, useMicroVMHostStatus, useAITools } from "@/hooks/useAIAgents";
import { AgentHubDrawer } from "./AgentHubDrawer";
import { AITaskConsoleModal } from "./AITaskConsoleModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AIAgentCard() {
    const [hubOpen, setHubOpen] = useState(false);
    const [consoleTaskId, setConsoleTaskId] = useState<string | null>(null);

    const { data: tasksData, isLoading: tasksLoading } = useAITasks();
    const { data: vmData } = useMicroVMs();
    const { data: hostStatus } = useMicroVMHostStatus();
    const { data: toolsData } = useAITools();

    const tasks = tasksData?.tasks || [];
    const runningTasks = tasks.filter((t) => t.status === "running");
    const activeVM = vmData?.microvms?.find((vm) => vm.status === "running");
    const totalTools = toolsData?.tools?.length || 0;
    const installedTools = toolsData?.tools?.filter((t) => t.installed).length || 0;

    return (
        <>
            <div className="instrument-card p-4 sm:p-5 space-y-4">
                {/* ── 1. Header & Status ── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
                            <Bot className="h-4 w-4" strokeWidth={1.6} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold leading-tight text-foreground whitespace-nowrap">AI Agent & Sandbox Hub</p>
                            <p className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                                Autonomous Loops · Tier 1–3 Sandboxing
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {runningTasks.length > 0 ? (
                            <Badge variant="ai" className="gap-1 animate-pulse whitespace-nowrap">
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                <span>{runningTasks.length} Active Task{runningTasks.length > 1 ? "s" : ""}</span>
                            </Badge>
                        ) : (
                            <Badge variant="muted" className="whitespace-nowrap">
                                Idle
                            </Badge>
                        )}
                        <Button
                            size="xs"
                            variant="default"
                            onClick={() => setHubOpen(true)}
                            className="gap-1 shadow-sm h-7 text-xs"
                        >
                            <Plus className="h-3 w-3" strokeWidth={1.75} />
                            <span>Launch Task</span>
                        </Button>
                    </div>
                </div>

                {/* ── 2. Primary Telemetry Metric Grid ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Active Tasks */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                            Task Queue
                        </p>
                        <div className="flex items-center gap-1.5 pt-0.5">
                            <Activity className="h-4 w-4 text-primary" strokeWidth={1.6} />
                            <span className="text-lg font-bold font-mono tnum text-foreground whitespace-nowrap truncate">
                                {tasks.length}
                            </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap truncate">
                            {runningTasks.length} in progress
                        </p>
                    </div>

                    {/* Tier 2 MicroVM Sandbox */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                            MicroVM Sandbox
                        </p>
                        <div className="flex items-center gap-1.5 pt-0.5">
                            <Boxes className="h-4 w-4 text-primary" strokeWidth={1.6} />
                            <span className="text-xs font-bold font-mono text-foreground whitespace-nowrap truncate">
                                {activeVM ? "Active VM" : "Ready (kvm)"}
                            </span>
                        </div>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap truncate">
                            {hostStatus?.kvm_enabled ? "● KVM Hardware Accel" : "○ Emulation"}
                        </p>
                    </div>

                    {/* AI Tools Suite */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                            CLI Tools
                        </p>
                        <div className="flex items-center gap-1.5 pt-0.5">
                            <Terminal className="h-4 w-4 text-foreground" strokeWidth={1.6} />
                            <span className="text-sm font-bold font-mono tnum text-foreground whitespace-nowrap truncate">
                                {installedTools} / {totalTools || 11}
                            </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap truncate">
                            ai-tools.nix
                        </p>
                    </div>

                    {/* Autonomous Runner */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                            Tier 3 Worktree
                        </p>
                        <div className="flex items-center gap-1.5 pt-0.5">
                            <Shield className="h-4 w-4 text-foreground" strokeWidth={1.6} />
                            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap truncate">
                                Isolated Git Tree
                            </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap truncate">
                            claude-autonomous.sh
                        </p>
                    </div>
                </div>

                {/* ── 3. Active Tasks Summary Strip ── */}
                {tasks.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Recent Workload Queue
                        </p>
                        <div className="space-y-1">
                            {tasks.slice(0, 3).map((t) => (
                                <div
                                    key={t.id}
                                    className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 p-2 text-xs"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Bot className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                                        <span className="font-semibold text-foreground font-mono truncate">{t.task_slug || t.id}</span>
                                        <span className="text-[10px] text-muted-foreground font-mono">({t.agent_engine || "claude"})</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge
                                            variant={
                                                t.status === "completed"
                                                    ? "success"
                                                    : t.status === "running"
                                                    ? "ai"
                                                    : "destructive"
                                            }
                                            className="text-[10px] font-mono capitalize"
                                        >
                                            {t.status}
                                        </Badge>
                                        <Button
                                            variant="outline"
                                            size="xs"
                                            onClick={() => setConsoleTaskId(t.id)}
                                            className="h-6 text-[10px]"
                                        >
                                            Logs
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── 4. Progressive Disclosure ── */}
                <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <button
                        onClick={() => setHubOpen(true)}
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
                    >
                        <ExternalLink className="h-3.5 w-3.5 text-purple-400" />
                        <span>Open AI Agent Workbench & Task Runner</span>
                    </button>

                    <span className="font-mono text-[10px] text-muted-foreground">
                        llm-agents.nix
                    </span>
                </div>
            </div>

            {/* Drawers & Modals */}
            <AgentHubDrawer open={hubOpen} onOpenChange={setHubOpen} />
            {consoleTaskId && (
                <AITaskConsoleModal
                    taskId={consoleTaskId}
                    open={Boolean(consoleTaskId)}
                    onClose={() => setConsoleTaskId(null)}
                />
            )}
        </>
    );
}
