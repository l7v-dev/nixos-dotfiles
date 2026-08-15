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
} from "lucide-react";
import { useAITasks, useMicroVMs, useMicroVMHostStatus, useAITools } from "@/hooks/useAIAgents";
import { AgentHubDrawer } from "./AgentHubDrawer";
import { AITaskConsoleModal } from "./AITaskConsoleModal";

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
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <Bot className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">AI Agent & Sandbox Hub</p>
                            <p className="text-[11px] text-muted-foreground">
                                Otonom Döngüler · Tier 2 MicroVM · {installedTools}/{totalTools} Araç
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {runningTasks.length > 0 ? (
                            <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary animate-pulse">
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                {runningTasks.length} Görev Aktif
                            </span>
                        ) : (
                            <span className="rounded-full bg-muted border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                Beklemede
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Metrics & Status Badges ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {/* Active Tasks Metric */}
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 flex flex-col justify-between">
                        <span className="text-[10px] text-muted-foreground">Aktif Görevler</span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-base font-bold font-mono">{runningTasks.length}</span>
                            <span className="text-[10px] text-muted-foreground">/ {tasks.length} toplam</span>
                        </div>
                    </div>

                    {/* MicroVM Sandbox Status */}
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 flex flex-col justify-between">
                        <span className="text-[10px] text-muted-foreground">MicroVM Sandbox</span>
                        <div className="flex items-center gap-1.5 mt-1">
                            {activeVM ? (
                                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {activeVM.name}
                                </span>
                            ) : (
                                <span className="text-xs font-medium text-muted-foreground">
                                    {hostStatus?.kvm_enabled ? "Tier 2 Hazır" : "Durduruldu"}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* AI Tools Installed */}
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 flex flex-col justify-between col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-muted-foreground">Kayıtlı AI Araçları</span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-base font-bold font-mono">{installedTools}</span>
                            <span className="text-[10px] text-muted-foreground">/ {totalTools || 40} yüklü</span>
                        </div>
                    </div>
                </div>

                {/* ── Running Task Preview (if any) ── */}
                {runningTasks.length > 0 && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-primary">
                                    {runningTasks[0].task_slug}
                                </span>
                                <span className="rounded bg-primary/20 px-1.5 py-0.2 text-[10px] font-mono text-primary">
                                    İter: {runningTasks[0].current_iteration || 1}/{runningTasks[0].max_iterations}
                                </span>
                            </div>
                            <button
                                onClick={() => setConsoleTaskId(runningTasks[0].id)}
                                className="text-[11px] font-semibold text-primary hover:underline"
                            >
                                Konsolu Aç →
                            </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {runningTasks[0].prompt}
                        </p>
                    </div>
                )}

                {/* ── Quick Action Buttons ── */}
                <div className="flex items-center gap-2 pt-1">
                    <button
                        onClick={() => setHubOpen(true)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-xs"
                    >
                        <Bot className="h-3.5 w-3.5" />
                        Agent Hub&apos;ı Aç
                    </button>
                </div>
            </div>

            {/* ── Agent Hub Slide-over Drawer ── */}
            <AgentHubDrawer open={hubOpen} onOpenChange={setHubOpen} />

            {/* ── Live Console Modal ── */}
            <AITaskConsoleModal
                open={Boolean(consoleTaskId)}
                taskId={consoleTaskId}
                onClose={() => setConsoleTaskId(null)}
            />
        </>
    );
}
