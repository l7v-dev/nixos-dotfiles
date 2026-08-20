"use client";

import React, { useMemo, useState } from "react";
import {
    Activity, Heart, Cpu, HardDrive,
    Wifi, Bluetooth, Volume2, Volume1, VolumeX, ShieldCheck,
    Mic, MicOff, Speaker, Headphones, Monitor, Lock, Shield, ShieldAlert, Network,
    Zap, Flame, Radio, Layers, Server,
    ArrowUpRight, ArrowDownRight, RefreshCw,
    Sparkles, CheckCircle2, AlertTriangle, AlertCircle,
    PowerOff, RotateCcw, Moon, BedDouble, Plug,
    Battery, BatteryWarning, BatteryCharging, Clock, X,
    SlidersHorizontal, Compass, Wind, ChevronDown, ChevronUp,
    Thermometer, Gauge, SunMedium,
} from "lucide-react";
import {
    useMetrics,
    useServices,
    usePowerStatus,
    usePowerCapabilities,
    usePowerMutation,
    useScheduledShutdown,
    useWifi,
    useBluetooth,
} from "@/hooks/useMetrics";
import { useHardware } from "@/hooks/useHardware";
import { useAudio } from "@/hooks/useAudio";
import { useSecurity, useSecurityAudit } from "@/hooks/useSecurity";
import { useDisplay } from "@/hooks/useDisplay";
import { useHostStore } from "@/store/host-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type PowerAction = "shutdown" | "reboot" | "sleep" | "hibernate" | "hybrid-sleep";

interface SystemVitalsHUDProps {
    onSelectModule?: (moduleId: string) => void;
}

export function SystemVitalsHUD({ onSelectModule }: SystemVitalsHUDProps) {
    const host = useHostStore((s) => s.selectedHost);
    const { data: metrics, isLoading: isMetricsLoading, isFetching: isMetricsFetching } = useMetrics();
    const { data: services } = useServices();
    const { data: hardware, setPowerProfile, isLoading: isHardwareLoading } = useHardware();
    const { data: powerStatus } = usePowerStatus();
    const { data: caps } = usePowerCapabilities();
    const { data: scheduled, cancel: cancelSchedule } = useScheduledShutdown();
    const { data: wifi } = useWifi();
    const { data: bt } = useBluetooth();
    const { data: audio, setVolume: setAudioVolume, setMute: setAudioMute, setDefaultDevice: setAudioDefaultDevice } = useAudio();
    const { data: security, toggleVPN } = useSecurity();
    const { data: audit } = useSecurityAudit();
    const { data: display, setBrightness, setNightLight, lockSession } = useDisplay();

    // Disclosure states
    const [showSensors, setShowSensors] = useState(false);
    const [showAudioDevices, setShowAudioDevices] = useState(false);

    // Local Slider optimistic states
    const [localOutputVol, setLocalOutputVol] = useState<number | null>(null);
    const [localInputVol, setLocalInputVol] = useState<number | null>(null);
    const [localBrightness, setLocalBrightness] = useState<number | null>(null);

    // Power Action Confirmation State
    const [confirmAction, setConfirmAction] = useState<PowerAction | null>(null);
    const [pendingAction, setPendingAction] = useState<PowerAction | null>(null);

    const shutdownMutation = usePowerMutation("shutdown");
    const rebootMutation = usePowerMutation("reboot");
    const sleepMutation = usePowerMutation("sleep");
    const hibernateMutation = usePowerMutation("hibernate");
    const hybridSleepMutation = usePowerMutation("hybrid-sleep");

    const getMutation = (action: PowerAction) => {
        switch (action) {
            case "shutdown": return shutdownMutation;
            case "reboot": return rebootMutation;
            case "sleep": return sleepMutation;
            case "hibernate": return hibernateMutation;
            case "hybrid-sleep": return hybridSleepMutation;
        }
    };

    const handleExecutePowerAction = (action: PowerAction) => {
        const m = getMutation(action);
        setPendingAction(action);
        setConfirmAction(null);
        m.mutate(undefined, {
            onSettled: () => setPendingAction(null),
        });
    };

    // Telemetry calculations
    const cpuUsage = metrics?.cpu?.usage_pct ?? 0;
    const memUsage = metrics?.memory?.usage_pct ?? 0;
    const memUsedGb = ((metrics?.memory?.used_mib ?? 0) / 1024).toFixed(1);
    const memTotalGb = ((metrics?.memory?.total_mib ?? 0) / 1024).toFixed(1);

    const rootDisk = metrics?.disks?.find((d) => d.mount === "/") ?? metrics?.disks?.[0];
    const diskUsage = rootDisk?.usage_pct ?? 0;
    const diskAvailGb = rootDisk?.avail_gib?.toFixed(0) ?? "0";

    const netRx = metrics?.network?.reduce((acc, curr) => acc + curr.rx_kbps, 0) ?? 0;
    const netTx = metrics?.network?.reduce((acc, curr) => acc + curr.tx_kbps, 0) ?? 0;

    const cpuTemp = hardware?.cpu_temp_c ?? 42;
    const cpuGov = hardware?.cpu_governor ?? "schedutil";

    // Battery & Power calculations
    const primaryBat = powerStatus?.batteries?.[0];
    const batPct = primaryBat?.capacity_pct ?? null;
    const batStatus = primaryBat?.status ?? "Unknown";
    const acOnline = powerStatus?.ac_online ?? true;
    const livePowerW = primaryBat?.power_w;
    const healthPct = primaryBat?.health_pct;
    const timeRemainingMin = primaryBat?.time_remaining_min;
    const cycleCount = primaryBat?.cycle_count;

    // Systemd services health
    const totalServices = services?.length ?? 0;
    const failedServices = services?.filter((s) => s.active_state === "failed").length ?? 0;
    const runningServices = services?.filter((s) => s.active_state === "active").length ?? 0;

    // Calculate Composite Vitality Score (0 - 100)
    const vitalityScore = useMemo(() => {
        let score = 100;
        // CPU penalty
        if (cpuUsage > 80) score -= 25;
        else if (cpuUsage > 50) score -= 10;

        // Memory penalty
        if (memUsage > 85) score -= 20;
        else if (memUsage > 70) score -= 8;

        // Disk penalty
        if (diskUsage > 90) score -= 20;
        else if (diskUsage > 80) score -= 8;

        // Thermal penalty
        if (cpuTemp > 85) score -= 25;
        else if (cpuTemp > 70) score -= 10;

        // Failed service penalty
        if (failedServices > 0) score -= Math.min(failedServices * 5, 20);

        return Math.max(15, Math.min(100, Math.round(score)));
    }, [cpuUsage, memUsage, diskUsage, cpuTemp, failedServices]);

    // Calculate Dynamic Heart Rate (BPM) based on load
    const dynamicBpm = useMemo(() => {
        const baseBpm = 68;
        const loadFactor = (cpuUsage * 0.45) + ((cpuTemp - 35) * 0.5);
        return Math.min(148, Math.max(60, Math.round(baseBpm + Math.max(0, loadFactor))));
    }, [cpuUsage, cpuTemp]);

    // Status category
    const statusCategory = useMemo(() => {
        if (vitalityScore >= 88) {
            return {
                label: "OPTIMAL VITALITY",
                variant: "success" as const,
                color: "text-emerald-500",
                glowClass: "ecg-glow",
                strokeColor: "#10b981",
                pulseDesc: "Nominal Sinus Rhythm · Low Jitter",
            };
        }
        if (vitalityScore >= 65) {
            return {
                label: "ELEVATED LOAD",
                variant: "warning" as const,
                color: "text-amber-500",
                glowClass: "ecg-glow-warn",
                strokeColor: "#f59e0b",
                pulseDesc: "Elevated Rhythm · High Activity",
            };
        }
        return {
            label: "CRITICAL STRAIN",
            variant: "destructive" as const,
            color: "text-destructive",
            glowClass: "ecg-glow-crit",
            strokeColor: "#ef4444",
            pulseDesc: "Tachycardic Strain · High Thermal Load",
        };
    }, [vitalityScore]);

    // Helper for radial progress circle
    const renderRadialGauge = (
        percent: number,
        label: string,
        valueStr: string,
        subStr: string,
        icon: React.ReactNode,
        colorClass = "text-primary",
        strokeHex = "#38bdf8"
    ) => {
        const radius = 38;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

        return (
            <div className="flex flex-col items-center rounded-xl border border-border/80 bg-card/60 p-4 transition-all hover:border-white/20 hover:bg-white/[0.04] relative overflow-hidden group shadow-xs">
                <div className="absolute top-2.5 right-2.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    {icon}
                </div>

                {/* SVG Radial Gauge */}
                <div className="relative flex items-center justify-center my-1">
                    <svg className="w-24 h-24 transform -rotate-90">
                        {/* Background track */}
                        <circle
                            cx="48"
                            cy="48"
                            r={radius}
                            className="stroke-muted/40"
                            strokeWidth="6"
                            fill="transparent"
                        />
                        {/* Progress ring */}
                        <circle
                            cx="48"
                            cy="48"
                            r={radius}
                            stroke={strokeHex}
                            strokeWidth="6"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            fill="transparent"
                            className="transition-all duration-700 ease-out"
                        />
                    </svg>

                    {/* Value in Center */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-lg font-bold font-mono tracking-tight text-foreground tnum">
                            {percent.toFixed(0)}%
                        </span>
                        <span className="text-[9px] uppercase font-semibold tracking-wider text-muted-foreground font-mono">
                            {label}
                        </span>
                    </div>
                </div>

                <div className="text-center mt-1 space-y-0.5 w-full">
                    <p className="text-xs font-semibold text-foreground truncate">{valueStr}</p>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">{subStr}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="recessed-hud p-5 sm:p-6 space-y-6">
            {/* ── 1. Top Avionics HUD Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs">
                        <Heart className={cn("h-5 w-5 animate-pulse", statusCategory.color)} strokeWidth={2} />
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", statusCategory.color.replace("text-", "bg-"))} />
                            <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", statusCategory.color.replace("text-", "bg-"))} />
                        </span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-foreground tracking-tight">System Vitals & Heartbeat Telemetry</h2>
                            <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground">
                                HUD-01
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                            Node: <strong className="text-foreground">{host}</strong> · Cadence: {dynamicBpm} BPM ({statusCategory.pulseDesc})
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Badge variant={statusCategory.variant} className="font-mono text-xs px-2.5 py-1 tracking-wider">
                        {vitalityScore}% · {statusCategory.label}
                    </Badge>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-card/60 border border-border/60 text-muted-foreground" title={isMetricsFetching ? "Streaming telemetry..." : "Telemetry synced"}>
                        <RefreshCw className={cn("h-3.5 w-3.5", isMetricsFetching && "animate-spin text-primary")} />
                    </div>
                </div>
            </div>

            {/* ── 2. Live ECG Heartbeat Monitor Waveform ── */}
            <div className="rounded-xl border border-border/80 bg-black/40 dark:bg-black/60 p-4 sm:p-5 relative overflow-hidden backdrop-blur-md">
                {/* Background Grid Pattern */}
                <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                        backgroundImage: "linear-gradient(to right, #34d399 1px, transparent 1px), linear-gradient(to bottom, #34d399 1px, transparent 1px)",
                        backgroundSize: "20px 20px",
                    }}
                />

                {/* Scanning Radar Laser Line */}
                <div className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent pointer-events-none animate-ecg-scan" />

                <div className="flex items-center justify-between mb-2 relative z-10">
                    <div className="flex items-center gap-2">
                        <Activity className={cn("h-4 w-4", statusCategory.color)} />
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                            Live Electro-Systemic Rhythm Waveform
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-muted-foreground">
                            Pulse: <strong className={cn("tnum font-bold", statusCategory.color)}>{dynamicBpm} BPM</strong>
                        </span>
                        <span className="text-muted-foreground hidden sm:inline">
                            Temp: <strong className="text-foreground tnum">{cpuTemp}°C</strong>
                        </span>
                        <span className="text-muted-foreground hidden sm:inline">
                            Supply: <strong className={cn("capitalize font-mono", acOnline ? "text-emerald-400" : "text-amber-400")}>{acOnline ? "AC Mains Grid" : `${batPct ?? 0}% Battery`}</strong>
                        </span>
                    </div>
                </div>

                {/* Continuous ECG Waveform SVG */}
                <div className="w-full h-24 sm:h-28 relative flex items-center">
                    <svg
                        className={cn("w-full h-full", statusCategory.glowClass)}
                        viewBox="0 0 900 120"
                        preserveAspectRatio="none"
                    >
                        {/* Isoelectric Baseline */}
                        <line x1="0" y1="60" x2="900" y2="60" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />

                        {/* Animated Heartbeat ECG Multi-Cycle Path */}
                        <path
                            d="
                                M 0 60
                                L 40 60
                                Q 50 55, 60 60
                                L 75 60
                                L 82 72
                                L 95 12
                                L 108 98
                                L 118 60
                                L 135 60
                                Q 150 48, 165 60
                                L 225 60
                                Q 235 55, 245 60
                                L 260 60
                                L 267 72
                                L 280 12
                                L 293 98
                                L 303 60
                                L 320 60
                                Q 335 48, 350 60
                                L 410 60
                                Q 420 55, 430 60
                                L 445 60
                                L 452 72
                                L 465 12
                                L 478 98
                                L 488 60
                                L 505 60
                                Q 520 48, 535 60
                                L 595 60
                                Q 605 55, 615 60
                                L 630 60
                                L 637 72
                                L 650 12
                                L 663 98
                                L 673 60
                                L 690 60
                                Q 705 48, 720 60
                                L 780 60
                                Q 790 55, 800 60
                                L 815 60
                                L 822 72
                                L 835 12
                                L 848 98
                                L 858 60
                                L 900 60
                            "
                            fill="none"
                            stroke={statusCategory.strokeColor}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>

                {/* Bottom ticker bar inside ECG */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span>SYNCHRONIZED SYSTEM TICK · 60Hz DYNAMIC SAMPLING</span>
                    </div>
                    <span>VOLTAGE STABILITY: NOMINAL</span>
                </div>
            </div>

            {/* ── 3. Four Orbital Telemetry Gauges ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                {/* 1. CPU Load */}
                {renderRadialGauge(
                    cpuUsage,
                    "CPU Load",
                    `${cpuUsage.toFixed(1)}% Active`,
                    `Gov: ${cpuGov}`,
                    <Cpu className="h-4 w-4 text-primary" />,
                    "text-primary",
                    "#38bdf8"
                )}

                {/* 2. Memory Pool */}
                {renderRadialGauge(
                    memUsage,
                    "RAM Usage",
                    `${memUsedGb} / ${memTotalGb} GB`,
                    `${metrics?.memory?.used_mib ?? 0} MiB resident`,
                    <Layers className="h-4 w-4 text-sky-400" />,
                    "text-sky-400",
                    "#38bdf8"
                )}

                {/* 3. Primary Disk Capacity */}
                {renderRadialGauge(
                    diskUsage,
                    "Storage Root",
                    `${diskAvailGb} GB Available`,
                    `Mount: ${rootDisk?.mount ?? "/"} (${rootDisk?.fs_type ?? "ext4"})`,
                    <HardDrive className="h-4 w-4 text-emerald-400" />,
                    "text-emerald-400",
                    "#34d399"
                )}

                {/* 4. Network Mesh Throughput */}
                <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-background/50 p-4 transition-all hover:border-border hover:bg-background/80 relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                            Network I/O
                        </span>
                        <Radio className="h-4 w-4 text-violet-400" />
                    </div>

                    <div className="space-y-2 my-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                <ArrowDownRight className="h-3.5 w-3.5 text-emerald-400" /> RX Rate
                            </span>
                            <span className="text-xs font-bold font-mono text-foreground tnum">
                                {netRx >= 1024 ? `${(netRx / 1024).toFixed(1)} MB/s` : `${netRx.toFixed(0)} KB/s`}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                <ArrowUpRight className="h-3.5 w-3.5 text-sky-400" /> TX Rate
                            </span>
                            <span className="text-xs font-bold font-mono text-foreground tnum">
                                {netTx >= 1024 ? `${(netTx / 1024).toFixed(1)} MB/s` : `${netTx.toFixed(0)} KB/s`}
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-border/40 pt-1.5 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span>Mesh Traffic</span>
                        <span className="text-emerald-500 font-semibold">Live Socket</span>
                    </div>
                </div>
            </div>

            {/* ── 4. INTEGRATED: Power & Energy Control Station ── */}
            <div className="rounded-xl border border-border/80 bg-card/60 p-4 sm:p-5 space-y-4">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
                            <Zap className="h-4 w-4 text-amber-500" strokeWidth={1.8} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-foreground">Power & Energy Control</h3>
                                <Badge
                                    variant={acOnline ? "success" : "warning"}
                                    className="gap-1 text-[10px] font-mono"
                                >
                                    {acOnline ? <Plug className="h-3 w-3" /> : <Battery className="h-3 w-3" />}
                                    {acOnline ? "AC Mains Supply" : "Internal Battery Mode"}
                                </Badge>
                                {batPct !== null && (
                                    <Badge
                                        variant={batPct <= 20 ? "destructive" : batPct <= 40 ? "warning" : "secondary"}
                                        className="text-[10px] font-mono"
                                    >
                                        {batPct}% ({batStatus})
                                    </Badge>
                                )}
                            </div>
                            <p className="text-[11px] text-muted-foreground font-mono">
                                System Bus: <strong className="text-foreground">systemd-logind</strong> · ACPI Power & Energy Telemetry
                            </p>
                        </div>
                    </div>

                    {scheduled?.scheduled && (
                        <Badge variant="warning" className="gap-1 text-[10px] font-mono animate-pulse self-start sm:self-auto">
                            <Clock className="h-3 w-3" />
                            <span>Shutdown scheduled in ~{scheduled.remaining_min}m</span>
                        </Badge>
                    )}
                </div>

                {/* Scheduled Shutdown Banner if active */}
                {scheduled?.scheduled && (
                    <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-300">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                            <span className="font-medium">
                                Host will {scheduled.action?.toUpperCase()} in approximately <strong>~{scheduled.remaining_min} minutes</strong> ({scheduled.execute_at ? new Date(scheduled.execute_at).toLocaleTimeString() : "Pending"}).
                            </span>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelSchedule.mutate(undefined)}
                            disabled={cancelSchedule.isPending}
                            className="h-7 text-xs border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500/20"
                        >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Abort Schedule
                        </Button>
                    </div>
                )}

                {/* High-Density Telemetry Matrix (Network I/O Aesthetic) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* 1. Power Source & Delivery */}
                    <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-background/50 p-4 transition-all hover:border-border hover:bg-background/80 relative overflow-hidden group shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                                Power Source
                            </span>
                            {acOnline ? (
                                <Plug className="h-4 w-4 text-emerald-400" />
                            ) : (
                                <Zap className="h-4 w-4 text-amber-400 animate-pulse" />
                            )}
                        </div>

                        <div className="space-y-2 my-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                    <Zap className="h-3.5 w-3.5 text-amber-400" /> Supply Line
                                </span>
                                <span className="text-xs font-bold font-mono text-foreground truncate max-w-[120px] text-right">
                                    {acOnline ? "AC Mains Grid" : "DC Battery Rail"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                    <Activity className="h-3.5 w-3.5 text-sky-400" /> Power Mode
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
                    <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-background/50 p-4 transition-all hover:border-border hover:bg-background/80 relative overflow-hidden group shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                                Power Draw Rate
                            </span>
                            <Zap className="h-4 w-4 text-sky-400" />
                        </div>

                        <div className="space-y-2 my-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                    <Flame className="h-3.5 w-3.5 text-amber-400" /> Draw Rate
                                </span>
                                <span className="text-xs font-bold font-mono text-primary tnum">
                                    {livePowerW !== undefined ? `${livePowerW.toFixed(1)} W` : (acOnline ? "Passthrough" : "Active")}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                    <Activity className="h-3.5 w-3.5 text-sky-400" /> Rail Voltage
                                </span>
                                <span className="text-xs font-bold font-mono text-foreground tnum">
                                    {primaryBat?.voltage_v !== undefined ? `${primaryBat.voltage_v.toFixed(1)} V` : (acOnline ? "230.0 V Nom" : "12.0 V Ref")}
                                </span>
                            </div>
                        </div>

                        <div className="border-t border-border/40 pt-1.5 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                            <span>Thermal Dissipation</span>
                            <span className="text-foreground font-semibold">{cpuTemp}°C Heat Flux</span>
                        </div>
                    </div>

                    {/* 3. Battery Accumulator & Health */}
                    <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-background/50 p-4 transition-all hover:border-border hover:bg-background/80 relative overflow-hidden group shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                                Accumulator State
                            </span>
                            {batPct !== null && batPct <= 20 ? (
                                <BatteryWarning className="h-4 w-4 text-destructive animate-pulse" />
                            ) : (
                                <Battery className="h-4 w-4 text-emerald-400" />
                            )}
                        </div>

                        <div className="space-y-2 my-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                    <BatteryCharging className="h-3.5 w-3.5 text-emerald-400" /> Charge Level
                                </span>
                                <span className="text-xs font-bold font-mono text-foreground tnum">
                                    {batPct !== null ? `${batPct}%` : "AC Mains Only"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                    <ShieldCheck className="h-3.5 w-3.5 text-sky-400" /> Cell Health
                                </span>
                                <span className="text-xs font-bold font-mono text-emerald-400 tnum">
                                    {healthPct !== undefined ? `${healthPct.toFixed(0)}% Health` : "100% Nominal"}
                                </span>
                            </div>
                        </div>

                        <div className="border-t border-border/40 pt-1.5 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                            <span>Accumulator Cycles</span>
                            <span className="text-muted-foreground font-semibold">
                                {cycleCount !== undefined ? `${cycleCount} Cycles` : "Stationary Node"}
                            </span>
                        </div>
                    </div>

                    {/* 4. Estimated Runtime & Scheduling */}
                    <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-background/50 p-4 transition-all hover:border-border hover:bg-background/80 relative overflow-hidden group shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                                Estimated Runtime
                            </span>
                            <Clock className="h-4 w-4 text-violet-400" />
                        </div>

                        <div className="space-y-2 my-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                    <Clock className="h-3.5 w-3.5 text-violet-400" /> Active Buffer
                                </span>
                                <span className="text-xs font-bold font-mono text-foreground tnum">
                                    {timeRemainingMin !== undefined && timeRemainingMin !== null
                                        ? `${Math.floor(timeRemainingMin / 60)}h ${timeRemainingMin % 60}m`
                                        : (acOnline ? "Continuous" : "Calculating…")}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                    <Moon className="h-3.5 w-3.5 text-amber-400" /> Power Timer
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

                {/* Direct ACPI Power Operations */}
                <div className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                            Direct ACPI System Operations
                        </p>
                        <span className="text-[10px] font-mono text-muted-foreground/70">
                            Hardware Bus Protected · Confirmation Required
                        </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {/* Shutdown Trigger */}
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={pendingAction !== null || (caps && !caps.can_power_off)}
                            onClick={() => setConfirmAction("shutdown")}
                            className="h-9 gap-1.5 font-medium text-xs justify-start px-3 shadow-xs active:scale-[0.98] transition-transform"
                        >
                            <PowerOff className="h-4 w-4" />
                            <span>Power Off</span>
                        </Button>

                        {/* Reboot Trigger */}
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pendingAction !== null || (caps && !caps.can_reboot)}
                            onClick={() => setConfirmAction("reboot")}
                            className="h-9 gap-1.5 font-medium text-xs justify-start px-3 border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/10 text-amber-600 dark:text-amber-300 active:scale-[0.98] transition-transform"
                        >
                            <RotateCcw className="h-4 w-4" />
                            <span>Restart Node</span>
                        </Button>

                        {/* Suspend / Sleep Trigger */}
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pendingAction !== null || (caps && !caps.can_suspend)}
                            onClick={() => setConfirmAction("sleep")}
                            className="h-9 gap-1.5 font-medium text-xs justify-start px-3 border-sky-500/30 hover:border-sky-500/60 hover:bg-sky-500/10 text-sky-600 dark:text-sky-300 active:scale-[0.98] transition-transform"
                        >
                            <Moon className="h-4 w-4" />
                            <span>Suspend (Sleep)</span>
                        </Button>

                        {/* Hibernate Trigger */}
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pendingAction !== null || (caps && !caps.can_hibernate)}
                            onClick={() => setConfirmAction("hibernate")}
                            className="h-9 gap-1.5 font-medium text-xs justify-start px-3 border-violet-500/30 hover:border-violet-500/60 hover:bg-violet-500/10 text-violet-600 dark:text-violet-300 active:scale-[0.98] transition-transform"
                        >
                            <BedDouble className="h-4 w-4" />
                            <span>Hibernate</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── 5. INTEGRATED: Compute, Thermals & Silicon Governance Station ── */}
            <div className="rounded-xl border border-border/80 bg-card/60 p-4 sm:p-5 space-y-4">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
                            <Flame className={cn("h-4 w-4", cpuTemp >= 80 ? "text-destructive" : cpuTemp >= 65 ? "text-amber-500" : "text-emerald-500")} strokeWidth={1.8} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-foreground">Compute, Thermals & Silicon Governance</h3>
                                <Badge
                                    variant={cpuTemp >= 80 ? "destructive" : cpuTemp >= 68 ? "warning" : "success"}
                                    className="text-[10px] font-mono"
                                >
                                    {cpuTemp >= 80 ? "Critical Load" : cpuTemp >= 68 ? "Elevated Flux" : "Nominal Cooling"}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                    Profile: <span className="font-semibold text-primary capitalize ml-1">{hardware?.power_profile ?? "balanced"}</span>
                                </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-mono">
                                Silicon Governor: <strong className="text-foreground">{cpuGov}</strong> · {hardware?.epp ? `EPP: ${hardware.epp}` : "Autonomous Frequency Scaling"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <span className="text-[11px] font-mono text-muted-foreground mr-1 hidden sm:inline">Active Policy:</span>
                        {(["performance", "balanced", "powersave"] as const).map((p) => {
                            const isActive = (hardware?.power_profile ?? "balanced") === p;
                            return (
                                <Button
                                    key={p}
                                    size="sm"
                                    variant={isActive ? "default" : "outline"}
                                    disabled={setPowerProfile.isPending}
                                    onClick={() => setPowerProfile.mutate(p)}
                                    className={cn(
                                        "h-7 text-[10px] font-mono uppercase px-2.5 transition-all active:scale-95",
                                        isActive && "ring-1 ring-primary/50 shadow-xs"
                                    )}
                                >
                                    {p === "performance" && <Zap className="h-3 w-3 mr-1 text-amber-400" />}
                                    {p === "balanced" && <SlidersHorizontal className="h-3 w-3 mr-1 text-sky-400" />}
                                    {p === "powersave" && <Moon className="h-3 w-3 mr-1 text-emerald-400" />}
                                    {p}
                                </Button>
                            );
                        })}
                    </div>
                </div>

                {/* 4-Metric Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* 1. CPU Package Core */}
                    <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-background/50 p-4 transition-all hover:border-border hover:bg-background/80 relative overflow-hidden group shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                                CPU Package
                            </span>
                            <Cpu className="h-4 w-4 text-primary" />
                        </div>

                        <div className="space-y-2 my-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                    <Flame className={cn("h-3.5 w-3.5", cpuTemp > 75 ? "text-destructive" : "text-amber-400")} /> Core Junction
                                </span>
                                <span className="text-xs font-bold font-mono text-foreground tnum">
                                    {cpuTemp.toFixed(1)}°C
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                    <Activity className="h-3.5 w-3.5 text-sky-400" /> State
                                </span>
                                <span className={cn("text-xs font-bold font-mono", cpuTemp >= 80 ? "text-destructive" : cpuTemp >= 68 ? "text-amber-400" : "text-emerald-400")}>
                                    {cpuTemp >= 80 ? "▲ Throttling Risk" : cpuTemp >= 68 ? "● Warm Activity" : "● Calm Nominal"}
                                </span>
                            </div>
                        </div>

                        <div className="border-t border-border/40 pt-1.5 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                            <span>Governor Mode</span>
                            <span className="text-foreground font-semibold truncate max-w-[110px] text-right">{cpuGov}</span>
                        </div>
                    </div>

                    {/* 2. GPU Processing Core */}
                    <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-background/50 p-4 transition-all hover:border-border hover:bg-background/80 relative overflow-hidden group shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                                GPU Graphics
                            </span>
                            <Zap className="h-4 w-4 text-sky-400" />
                        </div>

                        <div className="space-y-2 my-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                    <Flame className="h-3.5 w-3.5 text-sky-400" /> Raster Core
                                </span>
                                <span className="text-xs font-bold font-mono text-foreground tnum">
                                    {hardware?.gpu_temp_c !== undefined ? `${hardware.gpu_temp_c.toFixed(1)}°C` : "Integrated"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                    <Activity className="h-3.5 w-3.5 text-sky-400" /> Architecture
                                </span>
                                <span className="text-xs font-bold font-mono text-primary">
                                    {hardware?.gpu_temp_c !== undefined ? "Discrete Core" : "SoC Integrated"}
                                </span>
                            </div>
                        </div>

                        <div className="border-t border-border/40 pt-1.5 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                            <span>Vulkan / OpenGL</span>
                            <span className="text-emerald-500 font-semibold">Active Pipeline</span>
                        </div>
                    </div>

                    {/* 3. Cooling Fan & Acoustics */}
                    <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-background/50 p-4 transition-all hover:border-border hover:bg-background/80 relative overflow-hidden group shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                                Cooling Fans
                            </span>
                            <Wind className={cn("h-4 w-4 text-emerald-400", ((hardware?.fans?.[0]?.rpm ?? 0) > 0) && "animate-spin")} />
                        </div>

                        <div className="space-y-2 my-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                    <Wind className="h-3.5 w-3.5 text-emerald-400" /> Fan Speed
                                </span>
                                <span className="text-xs font-bold font-mono text-foreground tnum">
                                    {hardware?.fans && hardware.fans.length > 0 && hardware.fans[0].rpm > 0 ? `${hardware.fans[0].rpm} RPM` : "0 RPM (Silent)"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                    <Gauge className="h-3.5 w-3.5 text-sky-400" /> Probes
                                </span>
                                <span className="text-xs font-bold font-mono text-foreground">
                                    {hardware?.fans && hardware.fans.length > 0 ? `${hardware.fans.length} Active Tach` : "Passive Heatpipe"}
                                </span>
                            </div>
                        </div>

                        <div className="border-t border-border/40 pt-1.5 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                            <span>Acoustics Mode</span>
                            <span className="text-foreground font-semibold">
                                {hardware?.fans && hardware.fans.length > 0 && hardware.fans[0].rpm > 3000 ? "Active Turbo" : "0dB Zero-RPM"}
                            </span>
                        </div>
                    </div>

                    {/* 4. Platform Power Mode */}
                    <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-background/50 p-4 transition-all hover:border-border hover:bg-background/80 relative overflow-hidden group shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                                Silicon Governor
                            </span>
                            <SlidersHorizontal className="h-4 w-4 text-amber-400" />
                        </div>

                        <div className="space-y-2 my-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                    <Zap className="h-3.5 w-3.5 text-amber-400" /> Active Policy
                                </span>
                                <span className="text-xs font-bold font-mono text-primary uppercase">
                                    {hardware?.power_profile ?? "balanced"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                    <Layers className="h-3.5 w-3.5 text-sky-400" /> Scaling D-Bus
                                </span>
                                <span className="text-xs font-bold font-mono text-emerald-400">
                                    power-profiles
                                </span>
                            </div>
                        </div>

                        <div className="border-t border-border/40 pt-1.5 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                            <span>Dynamic EPP</span>
                            <span className="text-muted-foreground font-semibold truncate max-w-[110px] text-right">
                                {hardware?.epp ?? "schedutil"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Progressive Disclosure: Detailed Hardware Thermal Probes */}
                {hardware?.sensors && hardware.sensors.length > 0 && (
                    <div className="border-t border-border/50 pt-2">
                        <button
                            onClick={() => setShowSensors(!showSensors)}
                            className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-1 rounded-lg hover:bg-white/[0.03]"
                        >
                            <span className="flex items-center gap-2 font-mono">
                                <Thermometer className="h-3.5 w-3.5 text-primary" />
                                Detailed Hardware Thermal Probes ({hardware.sensors.length} sensors detected)
                            </span>
                            <div className="flex items-center gap-1 text-[11px] font-mono">
                                <span>{showSensors ? "Collapse telemetry" : "Expand all sensors"}</span>
                                {showSensors ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </div>
                        </button>

                        {showSensors && (
                            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3 rounded-xl border border-border/70 bg-background/60">
                                {hardware.sensors.map((s, idx) => {
                                    const isCrit = s.critical ? s.temp_c >= s.critical : s.temp_c >= 85;
                                    const isWarm = s.temp_c >= 70;
                                    return (
                                        <div
                                            key={idx}
                                            className="flex flex-col justify-between p-2.5 rounded-lg border border-border/50 bg-card/40 space-y-1.5"
                                        >
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-medium text-foreground truncate max-w-[160px]" title={s.name}>
                                                    {s.name}
                                                </span>
                                                <span className={cn("font-mono font-bold tnum", isCrit ? "text-destructive" : isWarm ? "text-amber-400" : "text-emerald-400")}>
                                                    {s.temp_c.toFixed(1)}°C
                                                </span>
                                            </div>

                                            {/* Mini Visual Thermal Bar */}
                                            <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-500",
                                                        isCrit ? "bg-destructive" : isWarm ? "bg-amber-400" : "bg-emerald-400"
                                                    )}
                                                    style={{ width: `${Math.min(100, Math.max(8, (s.temp_c / (s.critical ?? 100)) * 100))}%` }}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                                                <span>Limit: {s.critical ? `${s.critical.toFixed(0)}°C Crit` : "100°C Ref"}</span>
                                                <span className={cn(isCrit ? "text-destructive" : isWarm ? "text-amber-400" : "text-muted-foreground")}>
                                                    {isCrit ? "CRITICAL" : isWarm ? "WARM" : "NOMINAL"}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── 6. INTEGRATED: Audio & Microphone Acoustic Station ── */}
            <div className="rounded-xl border border-border/80 bg-card/60 p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
                            <Volume2 className="h-4 w-4 text-sky-400" strokeWidth={1.8} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-foreground">Audio & PipeWire Streams</h3>
                                <Badge variant={audio?.output_muted ? "destructive" : "info"} className="text-[10px] font-mono">
                                    {audio?.output_muted ? "Master Muted" : `${localOutputVol !== null ? localOutputVol : (audio?.output_volume ?? 70)}% Output`}
                                </Badge>
                                <Badge variant={audio?.input_muted ? "destructive" : "success"} className="text-[10px] font-mono">
                                    {audio?.input_muted ? "Mic Muted" : `${localInputVol !== null ? localInputVol : (audio?.input_volume ?? 80)}% Input`}
                                </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-mono">
                                Daemon: <strong className="text-foreground">PipeWire / WirePlumber</strong> · Low-latency Spatial Routing
                            </p>
                        </div>
                    </div>

                    {((audio?.sinks?.length ?? 0) > 1 || (audio?.sources?.length ?? 0) > 1) && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowAudioDevices(!showAudioDevices)}
                            className="h-7 text-xs font-mono text-muted-foreground hover:text-foreground self-start sm:self-auto"
                        >
                            <span>Routing Devices</span>
                            {showAudioDevices ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Master Output Sink */}
                    <div className="rounded-xl border border-border/70 bg-background/50 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground font-mono">
                                <Speaker className="h-3.5 w-3.5 text-primary" /> Master Speaker Output
                            </span>
                            <button
                                onClick={() => setAudioMute.mutate({ target: "sink", muted: !(audio?.output_muted ?? false) })}
                                disabled={setAudioMute.isPending}
                                className={cn(
                                    "flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono font-medium transition-all active:scale-95",
                                    audio?.output_muted
                                        ? "bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30"
                                        : "bg-muted text-foreground hover:bg-muted/80 border border-border"
                                )}
                            >
                                {audio?.output_muted ? <VolumeX className="h-3 w-3" /> : <Volume1 className="h-3 w-3" />}
                                <span>{audio?.output_muted ? "MUTED" : "MUTE"}</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                            <input
                                type="range"
                                min="0"
                                max="150"
                                value={localOutputVol !== null ? localOutputVol : (audio?.output_volume ?? 70)}
                                disabled={audio?.output_muted ?? false}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setLocalOutputVol(val);
                                    setAudioVolume.mutate({ target: "sink", volume: val });
                                }}
                                onMouseUp={() => setLocalOutputVol(null)}
                                onTouchEnd={() => setLocalOutputVol(null)}
                                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary disabled:opacity-50"
                            />
                            <span className="w-12 text-right font-mono text-xs font-bold tnum text-foreground">
                                {localOutputVol !== null ? localOutputVol : (audio?.output_volume ?? 70)}%
                            </span>
                        </div>
                    </div>

                    {/* Microphone Input Source */}
                    <div className="rounded-xl border border-border/70 bg-background/50 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground font-mono">
                                <Mic className="h-3.5 w-3.5 text-emerald-400" /> Microphone Input
                            </span>
                            <button
                                onClick={() => setAudioMute.mutate({ target: "source", muted: !(audio?.input_muted ?? false) })}
                                disabled={setAudioMute.isPending}
                                className={cn(
                                    "flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono font-medium transition-all active:scale-95",
                                    audio?.input_muted
                                        ? "bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30"
                                        : "bg-muted text-foreground hover:bg-muted/80 border border-border"
                                )}
                            >
                                {audio?.input_muted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                                <span>{audio?.input_muted ? "MUTED" : "LIVE"}</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={localInputVol !== null ? localInputVol : (audio?.input_volume ?? 80)}
                                disabled={audio?.input_muted ?? false}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setLocalInputVol(val);
                                    setAudioVolume.mutate({ target: "source", volume: val });
                                }}
                                onMouseUp={() => setLocalInputVol(null)}
                                onTouchEnd={() => setLocalInputVol(null)}
                                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary disabled:opacity-50"
                            />
                            <span className="w-12 text-right font-mono text-xs font-bold tnum text-foreground">
                                {localInputVol !== null ? localInputVol : (audio?.input_volume ?? 80)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Progressive Disclosure: Audio Sinks / Sources Dropdowns */}
                {showAudioDevices && (
                    <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl border border-border/70 bg-background/60 text-xs">
                        {(audio?.sinks?.length ?? 0) > 0 && (
                            <div>
                                <label className="text-[10px] uppercase font-semibold text-muted-foreground font-mono mb-1 block">
                                    Default Audio Sink
                                </label>
                                <select
                                    value={audio?.default_sink ?? ""}
                                    onChange={(e) => setAudioDefaultDevice.mutate({ target: "sink", id: e.target.value })}
                                    className="w-full rounded-lg border border-border/80 bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                                >
                                    {audio?.sinks?.map((s) => (
                                        <option key={s.id} value={s.id}>{s.description || s.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {(audio?.sources?.length ?? 0) > 0 && (
                            <div>
                                <label className="text-[10px] uppercase font-semibold text-muted-foreground font-mono mb-1 block">
                                    Default Input Source
                                </label>
                                <select
                                    value={audio?.default_source ?? ""}
                                    onChange={(e) => setAudioDefaultDevice.mutate({ target: "source", id: e.target.value })}
                                    className="w-full rounded-lg border border-border/80 bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                                >
                                    {audio?.sources?.map((s) => (
                                        <option key={s.id} value={s.id}>{s.description || s.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── 7. INTEGRATED: Display Luminance, Night Light & Optical Shield ── */}
            <div className="rounded-xl border border-border/80 bg-card/60 p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
                            <SunMedium className="h-4 w-4 text-amber-400" strokeWidth={1.8} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-foreground">Display & Night Light Engine</h3>
                                <Badge variant={display?.night_light?.enabled ? "warning" : "secondary"} className="text-[10px] font-mono">
                                    {display?.night_light?.enabled ? `${display.night_light.temperature}K Warm Shield` : "Daylight Normal"}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                    {localBrightness !== null ? localBrightness : (display?.brightness_pct ?? 100)}% Luminance
                                </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-mono">
                                Compositor: <strong className="text-foreground">{display?.device_name || "Wayland / Niri Engine"}</strong> · Gamma & Backlight Bus
                            </p>
                        </div>
                    </div>

                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => lockSession.mutate()}
                        disabled={lockSession.isPending}
                        className="h-7 text-xs font-mono gap-1 text-muted-foreground hover:text-foreground self-start sm:self-auto border-border hover:border-primary/40"
                    >
                        <Lock className="h-3 w-3" />
                        <span>Lock Session</span>
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Backlight Luminance */}
                    <div className="rounded-xl border border-border/70 bg-background/50 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground font-mono">
                                <SunMedium className="h-3.5 w-3.5 text-amber-400" /> Backlight Luminance
                            </span>
                            <span className="font-mono text-xs font-bold tnum text-foreground">
                                {localBrightness !== null ? localBrightness : (display?.brightness_pct ?? 100)}%
                            </span>
                        </div>
                        <div className="flex items-center gap-3 pt-1">
                            <input
                                type="range"
                                min="5"
                                max="100"
                                value={localBrightness !== null ? localBrightness : (display?.brightness_pct ?? 100)}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setLocalBrightness(val);
                                    setBrightness.mutate(val);
                                }}
                                onMouseUp={() => setLocalBrightness(null)}
                                onTouchEnd={() => setLocalBrightness(null)}
                                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                            />
                        </div>
                    </div>

                    {/* Night Light Warmth */}
                    <div className="rounded-xl border border-border/70 bg-background/50 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground font-mono">
                                <Moon className="h-3.5 w-3.5 text-primary" /> Night Light / Blue Shield
                            </span>
                            <button
                                onClick={() => setNightLight.mutate({
                                    enabled: !(display?.night_light?.enabled ?? false),
                                    temperature: display?.night_light?.temperature ?? 4500,
                                })}
                                disabled={setNightLight.isPending}
                                className={cn(
                                    "flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[11px] font-mono font-medium transition-all active:scale-95",
                                    display?.night_light?.enabled
                                        ? "bg-primary/15 text-primary border border-primary/40 font-semibold"
                                        : "bg-muted text-foreground hover:bg-muted/80 border border-border"
                                )}
                            >
                                <span>{display?.night_light?.enabled ? "ACTIVE" : "OFF"}</span>
                            </button>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pt-1">
                            <span>Color Temperature Spectrum:</span>
                            <span className="text-amber-500 font-bold tnum">{display?.night_light?.temperature ?? 4500}K Warm</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 8. INTEGRATED: Tailscale Mesh & System Security Rail ── */}
            <div className="rounded-xl border border-border/80 bg-card/60 p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
                            <Shield className="h-4 w-4 text-emerald-500" strokeWidth={1.8} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-foreground">Tailscale Mesh & Perimeter Security</h3>
                                <Badge variant={security?.vpn?.active ? "success" : "destructive"} className="text-[10px] font-mono">
                                    {security?.vpn?.active ? "Tailscale Mesh Active" : "VPN Offline"}
                                </Badge>
                                <Badge variant={security?.firewall_on ? "success" : "destructive"} className="text-[10px] font-mono">
                                    {security?.firewall_on ? "Firewall 100%" : "Firewall Off"}
                                </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-mono">
                                Overlay: <strong className="text-foreground">WireGuard Mesh (100.x.y.z)</strong> · Zero-Trust Routing Bus
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => toggleVPN.mutate()}
                        disabled={toggleVPN.isPending}
                        className={cn(
                            "h-7 px-3 rounded-lg border text-xs font-mono font-semibold transition-all shrink-0 active:scale-95 self-start sm:self-auto",
                            security?.vpn?.active
                                ? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/25"
                                : "border-border bg-muted text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {security?.vpn?.active ? "VPN UP (CONNECTED)" : "VPN DOWN (CONNECT)"}
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs font-mono">
                    <div className="rounded-xl border border-border/70 bg-background/50 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Network className="h-4 w-4 text-primary" />
                            <div>
                                <p className="text-muted-foreground text-[10px] uppercase font-semibold">Open Ports</p>
                                <p className="text-foreground font-bold">{security?.open_ports?.length ?? 0} Listening</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">TCP/UDP</Badge>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/50 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            <div>
                                <p className="text-muted-foreground text-[10px] uppercase font-semibold">SOPS / Age Key</p>
                                <p className={cn("font-bold", audit?.sops_report?.decryption_ok ? "text-emerald-400" : "text-destructive")}>
                                    {audit?.sops_report?.decryption_ok ? "Verified Ok" : "Missing Key"}
                                </p>
                            </div>
                        </div>
                        <Badge variant={audit?.sops_report?.decryption_ok ? "success" : "destructive"} className="text-[10px]">/etc/age</Badge>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/50 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-sky-400" />
                            <div>
                                <p className="text-muted-foreground text-[10px] uppercase font-semibold">Services Daemon</p>
                                <p className="text-foreground font-bold">{runningServices} running · {failedServices} failed</p>
                            </div>
                        </div>
                        <Badge variant={failedServices === 0 ? "success" : "destructive"} className="text-[10px]">
                            {failedServices === 0 ? "Nominal" : `${failedServices} Alert`}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* ── 9. Quick Subsystem Jump Links (Neurodesign Focus Hub) ── */}
            {onSelectModule && (
                <div className="border-t border-border/60 pt-4 space-y-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                        Deep Subsystem Management & Diagnostic Cards
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {[
                            { id: "wifi", label: "Wi-Fi Station", icon: Wifi, status: wifi?.enabled ? (wifi.ssid ?? "Connected") : "Off" },
                            { id: "bluetooth", label: "Bluetooth Mesh", icon: Bluetooth, status: bt?.enabled ? `${bt.devices?.filter(d => d.connected).length ?? 0} paired` : "Off" },
                            { id: "nixos", label: "NixOS Engine", icon: Layers, status: "Generations" },
                            { id: "storage", label: "Storage Volumes", icon: HardDrive, status: `${diskUsage.toFixed(0)}% Root` },
                            { id: "security", label: "Security & SOPS", icon: ShieldCheck, status: "Audit Hub" },
                            { id: "ai", label: "AI Agent Hub", icon: Sparkles, status: "Sandboxes" },
                        ].map((m) => (
                            <button
                                key={m.id}
                                onClick={() => onSelectModule(m.id)}
                                className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/60 p-2.5 text-left transition-all hover:border-primary/50 hover:bg-card active:scale-[0.98]"
                            >
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-foreground">
                                    <m.icon className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-foreground truncate">{m.label}</p>
                                    <p className="text-[10px] font-mono text-muted-foreground truncate">{m.status}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── 8. Two-Step Safety Confirmation Dialog Modal ── */}
            <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <DialogContent className="sm:max-w-md bg-card border-border/80">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            <DialogTitle className="text-base font-bold">
                                Confirm {confirmAction?.toUpperCase()} Operation
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground pt-2">
                            You are requesting to <strong>{confirmAction}</strong> the host machine <strong>{host}</strong>.
                            Active processes, unsaved files, and daemon connections will be terminated immediately or suspended.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:justify-end pt-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmAction(null)}
                            className="text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={confirmAction === "shutdown" ? "destructive" : "default"}
                            size="sm"
                            onClick={() => confirmAction && handleExecutePowerAction(confirmAction)}
                            className="text-xs font-semibold"
                        >
                            Confirm {confirmAction?.toUpperCase()}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
