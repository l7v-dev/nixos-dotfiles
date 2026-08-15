"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    X,
    Terminal,
    Bot,
    Square,
    Copy,
    Check,
    Clock,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Trash2,
} from "lucide-react";
import { useAITask, useCancelAITask, useAITaskLogStream } from "@/hooks/useAIAgents";
import type { AgentTask } from "@/types/api";

interface Props {
    open: boolean;
    taskId: string | null;
    onClose: () => void;
}

export function AITaskConsoleModal({ open, taskId, onClose }: Props) {
    const { data: task } = useAITask(taskId || "");
    const cancelMutation = useCancelAITask();
    const [copied, setCopied] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);

    const { lines, connected, clearLogs } = useAITaskLogStream(taskId, open && Boolean(taskId));
    const terminalRef = useRef<HTMLDivElement>(null);

    // Merge static logs from task data if SSE stream has fewer lines initially
    const displayLogs = lines.length > 0 ? lines : task?.logs || [];

    // Auto-scroll effect
    useEffect(() => {
        if (autoScroll && terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [displayLogs, autoScroll]);

    if (!open || !taskId) return null;

    const isRunning = task?.status === "running" || connected;

    const handleCopyLogs = () => {
        navigator.clipboard.writeText(displayLogs.join("\n"));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCancel = () => {
        if (!taskId) return;
        cancelMutation.mutate({ id: taskId, cleanupWorktree: false });
    };

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case "running":
                return (
                    <span className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary animate-pulse">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Çalışıyor
                    </span>
                );
            case "completed":
                return (
                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Tamamlandı
                    </span>
                );
            case "failed":
                return (
                    <span className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-400">
                        <AlertCircle className="h-3 w-3" />
                        Hata
                    </span>
                );
            case "cancelled":
                return (
                    <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                        <Square className="h-3 w-3" />
                        İptal Edildi
                    </span>
                );
            default:
                return (
                    <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {status || "Bilinmiyor"}
                    </span>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="flex h-[88vh] w-full max-w-4xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* ── Modal Header ── */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <Bot className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-semibold text-foreground">
                                    Agent Görev Konsolu
                                </h2>
                                <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                    {task?.task_slug || taskId}
                                </span>
                                {getStatusBadge(task?.status)}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {task?.prompt || "Otonom agent loop canlı terminal log akışı"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isRunning && (
                            <button
                                onClick={handleCancel}
                                disabled={cancelMutation.isPending}
                                className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                            >
                                <Square className="h-3 w-3" />
                                Görevi Durdur
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* ── Task Meta Sub-header ── */}
                {task && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/10 px-6 py-2.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                            <span>
                                Motor: <strong className="font-mono text-foreground">{task.agent_engine}</strong>
                            </span>
                            <span>•</span>
                            <span>
                                İterasyon: <strong className="text-primary">{task.current_iteration || 1}</strong> / {task.max_iterations}
                            </span>
                            {task.branch && (
                                <>
                                    <span>•</span>
                                    <span>
                                        Branch: <code className="font-mono text-primary/80">{task.branch}</code>
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 font-mono">
                                <Clock className="h-3 w-3" />
                                {task.duration_ms ? `${(task.duration_ms / 1000).toFixed(1)}s` : "Devam ediyor"}
                            </span>
                        </div>
                    </div>
                )}

                {/* ── Terminal Console Output ── */}
                <div
                    ref={terminalRef}
                    className="flex-1 overflow-y-auto bg-black p-4 font-mono text-xs text-zinc-300 select-text leading-relaxed"
                >
                    {displayLogs.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-zinc-600">
                            <Terminal className="h-5 w-5 mr-2 animate-pulse" />
                            Log akışı başlatılıyor...
                        </div>
                    ) : (
                        displayLogs.map((log, index) => {
                            let textColor = "text-zinc-300";
                            if (log.includes("[ERROR]") || log.includes("failed") || log.includes("Error")) {
                                textColor = "text-rose-400";
                            } else if (log.includes("[SUCCESS]") || log.includes("passed") || log.includes("completed")) {
                                textColor = "text-emerald-400 font-semibold";
                            } else if (log.includes("[WARN]") || log.includes("warning")) {
                                textColor = "text-amber-400";
                            } else if (log.includes("[INFO]") || log.includes("Iteration")) {
                                textColor = "text-sky-400";
                            }

                            return (
                                <div key={index} className={`whitespace-pre-wrap break-all ${textColor}`}>
                                    {log}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* ── Terminal Footer Controls ── */}
                <div className="flex items-center justify-between border-t border-border px-6 py-3 bg-muted/20">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoScroll}
                                onChange={(e) => setAutoScroll(e.target.checked)}
                                className="rounded border-border"
                            />
                            <span>Otomatik Kaydır</span>
                        </label>
                        <span>•</span>
                        <span>{displayLogs.length} satır log</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={clearLogs}
                            className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <Trash2 className="h-3 w-3" />
                            Temizle
                        </button>
                        <button
                            onClick={handleCopyLogs}
                            className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? "Kopyalandı" : "Logları Kopyala"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
