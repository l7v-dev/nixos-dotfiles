"use client";

import React, { useState } from "react";
import {
    PowerOff, RotateCcw, Moon, BedDouble,
    Zap, Battery, BatteryWarning, BatteryCharging,
    Plug, Clock, X, ChevronDown, ChevronUp,
    AlertTriangle, Server, Activity, Flame, ShieldCheck,
} from "lucide-react";
import {
    usePowerMutation,
    usePowerCapabilities,
    usePowerStatus,
    useScheduledShutdown,
    useWoLHosts,
    useWoLMutation,
} from "@/hooks/useMetrics";
import { useHostStore } from "@/store/host-store";
import type { PowerCapabilities } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PowerAction = "shutdown" | "reboot" | "sleep" | "hibernate" | "hybrid-sleep";

export function PowerCard() {
    const host = useHostStore((s) => s.selectedHost);
    const [confirm, setConfirm] = useState<PowerAction | null>(null);
    const [pending, setPending] = useState<PowerAction | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [advancedTab, setAdvancedTab] = useState<"schedule" | "wol">("schedule");

    const { data: caps } = usePowerCapabilities();
    const { data: powerStatus } = usePowerStatus();
    const { data: scheduled, cancel: cancelSchedule } = useScheduledShutdown();

    const shutdown = usePowerMutation("shutdown");
    const reboot = usePowerMutation("reboot");
    const sleep = usePowerMutation("sleep");
    const hibernate = usePowerMutation("hibernate");
    const hybridSleep = usePowerMutation("hybrid-sleep");

    const mutationFor = (a: PowerAction) => ({
        shutdown, reboot, sleep, hibernate, "hybrid-sleep": hybridSleep,
    }[a]);

    const handleAction = (action: PowerAction) => {
        const m = mutationFor(action);
        setPending(action);
        setConfirm(null);
        m.mutate(undefined, { onSettled: () => setPending(null) });
    };

    const isRunning = pending !== null;

    // Battery summary
    const bat = powerStatus?.batteries?.[0];
    const batPct = bat?.capacity_pct ?? null;
    const batStatus = bat?.status ?? null;
    const acOnline = powerStatus?.ac_online ?? null;
    const livePowerW = bat?.power_w;
    const healthPct = bat?.health_pct;
    const timeRemainingMin = bat?.time_remaining_min;
    const cycleCount = bat?.cycle_count;

    return (
        <div className="instrument-card p-4 sm:p-5 space-y-4 font-sans">
            {/* ── 1. Header & Live Status ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
                        <Server className="h-4 w-4 text-amber-500" strokeWidth={1.6} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold leading-tight text-foreground whitespace-nowrap">Power & Energy Control</p>
                        <p className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                            Node: <strong className="text-foreground">{host}</strong> · ACPI System Bus
                        </p>
                    </div>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-1.5">
                    {acOnline !== null && (
                        <Badge
                            variant={acOnline ? "success" : "warning"}
                            className="gap-1 text-[10px] font-mono whitespace-nowrap"
                        >
                            {acOnline ? <Plug className="h-3 w-3" strokeWidth={1.5} /> : <Zap className="h-3 w-3" strokeWidth={1.5} />}
                            <span>{acOnline ? "AC Connected" : "Battery Mode"}</span>
                        </Badge>
                    )}
                    {batPct !== null && (
                        <Badge
                            variant={batPct <= 15 ? "destructive" : batPct <= 30 ? "warning" : "muted"}
                            className="gap-1 text-[10px] font-mono whitespace-nowrap"
                        >
                            {batPct <= 15 ? <BatteryWarning className="h-3 w-3" strokeWidth={1.5} /> : <Battery className="h-3 w-3" strokeWidth={1.5} />}
                            <span className="tnum">{batPct}%</span>
                        </Badge>
                    )}
                    {scheduled?.scheduled && (
                        <Badge variant="warning" className="gap-1 text-[10px] font-mono animate-pulse whitespace-nowrap">
                            <Clock className="h-3 w-3" strokeWidth={1.5} />
                            <span className="tnum">~{scheduled.remaining_min}m left</span>
                        </Badge>
                    )}
                </div>
            </div>

            {/* ── Active Scheduled Shutdown Banner ── */}
            {scheduled?.scheduled && (
                <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" strokeWidth={1.5} />
                        <span className="font-medium whitespace-nowrap">
                            {scheduled.action?.toUpperCase()} scheduled in ~{scheduled.remaining_min} mins
                        </span>
                    </div>
                    <Button
                        size="xs"
                        variant="outline"
                        onClick={() => cancelSchedule.mutate(undefined)}
                        disabled={cancelSchedule.isPending}
                        className="h-6 text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                    >
                        <X className="h-3 w-3 mr-1" strokeWidth={1.5} />
                        Cancel
                    </Button>
                </div>
            )}

            {/* ── 2. Primary Telemetry Metric Grid (Network I/O Aesthetic) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* 1. Power Source & Delivery */}
                <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-background/50 p-3.5 transition-all hover:border-border hover:bg-background/80 relative overflow-hidden group shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                            Power Source
                        </span>
                        {acOnline ? (
                            <Plug className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                            <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                        )}
                    </div>

                    <div className="space-y-1.5 my-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                <Zap className="h-3 w-3 text-amber-400" /> Supply Bus
                            </span>
                            <span className="text-xs font-bold font-mono text-foreground truncate max-w-[110px] text-right">
                                {acOnline ? "AC Mains Grid" : "DC Battery Rail"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                <Activity className="h-3 w-3 text-sky-400" /> Power Mode
                            </span>
                            <span className={cn("text-xs font-bold font-mono tnum", acOnline ? "text-emerald-400" : "text-amber-400")}>
                                {acOnline ? "Continuous Flow" : (batStatus || "Discharging")}
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-border/40 pt-1.5 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span>ACPI State</span>
                        <span className={cn("font-semibold", acOnline ? "text-emerald-500" : "text-amber-500")}>
                            {acOnline ? "● 230V Mains Synced" : "○ Discharging"}
                        </span>
                    </div>
                </div>

                {/* 2. Power Consumption Rate */}
                <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-background/50 p-3.5 transition-all hover:border-border hover:bg-background/80 relative overflow-hidden group shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                            Power Draw Rate
                        </span>
                        <Zap className="h-3.5 w-3.5 text-sky-400" />
                    </div>

                    <div className="space-y-1.5 my-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                <Flame className="h-3 w-3 text-amber-400" /> Draw Rate
                            </span>
                            <span className="text-xs font-bold font-mono text-primary tnum">
                                {livePowerW !== undefined ? `${livePowerW.toFixed(1)} W` : (acOnline ? "Passthrough" : "Active")}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                <Activity className="h-3 w-3 text-sky-400" /> Voltage
                            </span>
                            <span className="text-xs font-bold font-mono text-foreground tnum">
                                {bat?.voltage_v !== undefined ? `${bat.voltage_v.toFixed(1)} V` : (acOnline ? "230.0 V Nom" : "12.0 V Ref")}
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-border/40 pt-1.5 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span>Power Circuit</span>
                        <span className="text-foreground font-semibold">Regulated Bus</span>
                    </div>
                </div>

                {/* 3. Battery Accumulator & Health */}
                <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-background/50 p-3.5 transition-all hover:border-border hover:bg-background/80 relative overflow-hidden group shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                            Accumulator State
                        </span>
                        {batPct !== null && batPct <= 15 ? (
                            <BatteryWarning className="h-3.5 w-3.5 text-destructive animate-pulse" />
                        ) : (
                            <Battery className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                    </div>

                    <div className="space-y-1.5 my-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                <BatteryCharging className="h-3 w-3 text-emerald-400" /> Charge Level
                            </span>
                            <span className="text-xs font-bold font-mono text-foreground tnum">
                                {batPct !== null ? `${batPct}%` : "AC Mains Only"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                <ShieldCheck className="h-3 w-3 text-sky-400" /> Cell Health
                            </span>
                            <span className="text-xs font-bold font-mono text-emerald-400 tnum">
                                {healthPct !== undefined ? `${healthPct.toFixed(0)}% Health` : "100% Nominal"}
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-border/40 pt-1.5 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span>Charge Cycles</span>
                        <span className="text-muted-foreground font-semibold">
                            {cycleCount !== undefined ? `${cycleCount} Cycles` : "Stationary Node"}
                        </span>
                    </div>
                </div>

                {/* 4. Estimated Runtime & Scheduling */}
                <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-background/50 p-3.5 transition-all hover:border-border hover:bg-background/80 relative overflow-hidden group shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                            Estimated Runtime
                        </span>
                        <Clock className="h-3.5 w-3.5 text-violet-400" />
                    </div>

                    <div className="space-y-1.5 my-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                <Clock className="h-3 w-3 text-violet-400" /> Active Buffer
                            </span>
                            <span className="text-xs font-bold font-mono text-foreground tnum">
                                {timeRemainingMin !== undefined && timeRemainingMin !== null
                                    ? `${Math.floor(timeRemainingMin / 60)}h ${timeRemainingMin % 60}m`
                                    : (acOnline ? "Continuous" : "Calculating…")}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                <Moon className="h-3 w-3 text-amber-400" /> Power Timer
                            </span>
                            <span className={cn("text-xs font-bold font-mono", scheduled?.scheduled ? "text-amber-400 animate-pulse" : "text-muted-foreground")}>
                                {scheduled?.scheduled ? `~${scheduled.remaining_min}m left` : "Standby"}
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-border/40 pt-1.5 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span>System Bus</span>
                        <span className="text-emerald-500 font-semibold">systemd-logind</span>
                    </div>
                </div>
            </div>

            {/* ── 3. Tactile Action Controls ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {/* Shutdown */}
                <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setConfirm("shutdown")}
                    disabled={isRunning || !(caps?.can_power_off ?? true)}
                    className="gap-1.5 justify-start text-xs font-medium h-8 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                    <PowerOff className="h-3.5 w-3.5" />
                    <span>Shutdown</span>
                </Button>

                {/* Reboot */}
                <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setConfirm("reboot")}
                    disabled={isRunning || !(caps?.can_reboot ?? true)}
                    className="gap-1.5 justify-start text-xs font-medium h-8 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reboot</span>
                </Button>

                {/* Sleep */}
                <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setConfirm("sleep")}
                    disabled={isRunning || !(caps?.can_suspend ?? true)}
                    className="gap-1.5 justify-start text-xs font-medium h-8 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                >
                    <Moon className="h-3.5 w-3.5" />
                    <span>Suspend</span>
                </Button>

                {/* Hibernate */}
                <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setConfirm("hibernate")}
                    disabled={isRunning || !caps?.can_hibernate}
                    className="gap-1.5 justify-start text-xs font-medium h-8 text-muted-foreground hover:text-foreground"
                >
                    <BedDouble className="h-3.5 w-3.5" />
                    <span>Hibernate</span>
                </Button>
            </div>

            {/* ── 4. Progressive Disclosure (Schedule & WoL Drawer) ── */}
            <div className="border-t border-border/60 pt-3">
                <button
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    <span className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span>Advanced Power Schedule & Wake-on-LAN (WoL)</span>
                    </span>
                    {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {showAdvanced && (
                    <div className="mt-3 rounded-lg border border-border/60 bg-background/50 p-3 space-y-3">
                        <div className="flex border-b border-border/60 pb-2 gap-2 text-xs">
                            <button
                                onClick={() => setAdvancedTab("schedule")}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                    advancedTab === "schedule" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Delayed Shutdown
                            </button>
                            <button
                                onClick={() => setAdvancedTab("wol")}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                    advancedTab === "wol" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Wake-on-LAN Magic Packet
                            </button>
                        </div>

                        {advancedTab === "schedule" ? <SchedulePanel /> : <WoLPanel />}
                    </div>
                )}
            </div>

            {/* Confirm Dialog */}
            {confirm && (
                <ConfirmModal
                    action={confirm}
                    host={host}
                    onConfirm={() => handleAction(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}
        </div>
    );
}

function SchedulePanel() {
    const { schedule } = useScheduledShutdown();
    const [action, setAction] = useState("shutdown");
    const [delayMin, setDelayMin] = useState("30");
    const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

    const handleSchedule = (min: number) => {
        setFeedback(null);
        schedule.mutate(
            { action, delay_minutes: min },
            {
                onSuccess: () => setFeedback({ ok: true, msg: `Scheduled ${action} in ${min} minutes!` }),
                onError: (err: unknown) => setFeedback({
                    ok: false,
                    msg: (err as { message?: string })?.message ?? "Scheduling failed",
                }),
            }
        );
    };

    return (
        <div className="space-y-2.5 text-xs">
            <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Quick Delay Presets:</span>
                {[15, 30, 60, 120].map((min) => (
                    <Button
                        key={min}
                        size="xs"
                        variant={delayMin === String(min) ? "default" : "outline"}
                        onClick={() => {
                            setDelayMin(String(min));
                            handleSchedule(min);
                        }}
                        disabled={schedule.isPending}
                        className="h-6 text-[10px] font-mono"
                    >
                        {min}m
                    </Button>
                ))}
            </div>

            {feedback && (
                <p className={`text-[11px] font-mono ${feedback.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                    {feedback.msg}
                </p>
            )}
        </div>
    );
}

function WoLPanel() {
    const { data: hosts } = useWoLHosts();
    const wol = useWoLMutation();
    const [feedback, setFeedback] = useState<string | null>(null);

    const handleSend = (mac: string) => {
        setFeedback(null);
        wol.mutate(
            { mac },
            {
                onSuccess: () =>
                    setFeedback(`Magic Packet transmitted to ${mac}`),
                onError: (err: unknown) =>
                    setFeedback((err as { message?: string })?.message ?? "WoL transmission failed"),
            }
        );
    };

    return (
        <div className="space-y-2 text-xs">
            {(!hosts || hosts.length === 0) ? (
                <p className="text-muted-foreground">No Wake-on-LAN target hosts registered in configuration.</p>
            ) : (
                <div className="space-y-1">
                    {hosts.map((h) => (
                        <div key={h.mac} className="flex items-center justify-between rounded-md border border-border/60 bg-background p-2">
                            <span className="font-mono text-foreground font-medium">{h.name} ({h.mac})</span>
                            <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleSend(h.mac)}
                                disabled={wol.isPending}
                                className="h-6 text-[10px]"
                            >
                                Send WoL Packet
                            </Button>
                        </div>
                    ))}
                </div>
            )}
            {feedback && <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">{feedback}</p>}
        </div>
    );
}

function ConfirmModal({
    action, host, onConfirm, onCancel,
}: {
    action: PowerAction;
    host: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-xl border border-border/80 bg-card p-5 space-y-4 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground capitalize">Confirm {action}</h3>
                        <p className="text-xs text-muted-foreground">Target node: {host}</p>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    Are you sure you want to execute <strong className="text-foreground uppercase">{action}</strong> on node <strong className="text-foreground">{host}</strong>? Active connections will be dropped.
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                    <Button size="xs" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button size="xs" variant="destructive" onClick={onConfirm}>
                        Execute {action}
                    </Button>
                </div>
            </div>
        </div>
    );
}
