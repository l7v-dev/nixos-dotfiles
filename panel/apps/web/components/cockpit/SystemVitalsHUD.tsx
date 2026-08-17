"use client";

import React, { useMemo } from "react";
import {
    Activity, Heart, Cpu, HardDrive,
    Wifi, Bluetooth, Volume2, ShieldCheck,
    Zap, Flame, Radio, Layers, Server,
    ArrowUpRight, ArrowDownRight, RefreshCw,
    Sparkles, CheckCircle2, AlertTriangle, AlertCircle,
} from "lucide-react";
import { useMetrics, useServices, usePowerStatus, useWifi, useBluetooth } from "@/hooks/useMetrics";
import { useHardware } from "@/hooks/useHardware";
import { useAudio } from "@/hooks/useAudio";
import { useSecurity } from "@/hooks/useSecurity";
import { useHostStore } from "@/store/host-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SystemVitalsHUDProps {
    onSelectModule?: (moduleId: string) => void;
}

export function SystemVitalsHUD({ onSelectModule }: SystemVitalsHUDProps) {
    const host = useHostStore((s) => s.selectedHost);
    const { data: metrics, isLoading: isMetricsLoading, isFetching: isMetricsFetching } = useMetrics();
    const { data: services } = useServices();
    const { data: hardware } = useHardware();
    const { data: powerStatus } = usePowerStatus();
    const { data: wifi } = useWifi();
    const { data: bt } = useBluetooth();
    const { data: audio } = useAudio();
    const { data: security } = useSecurity();

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
    const powerProfile = hardware?.power_profile ?? "balanced";

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
                            Mode: <strong className="text-primary capitalize">{powerProfile}</strong>
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
                    `Gov: ${hardware?.cpu_governor ?? "schedutil"}`,
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

            {/* ── 4. Core System & Fleet Telemetry Matrix ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Systemd Services Vitality */}
                <div className="rounded-xl border border-border/60 bg-background/40 p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border text-foreground">
                            <Server className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-foreground">Service Daemon</p>
                            <p className="text-[10px] font-mono text-muted-foreground">
                                {runningServices} running · {failedServices} failed
                            </p>
                        </div>
                    </div>
                    <Badge variant={failedServices > 0 ? "destructive" : "success"} className="text-[10px] font-mono">
                        {failedServices === 0 ? "100% Active" : `${failedServices} Alert`}
                    </Badge>
                </div>

                {/* Thermal & Governor Health */}
                <div className="rounded-xl border border-border/60 bg-background/40 p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border text-foreground">
                            <Flame className={cn("h-4 w-4", cpuTemp > 75 ? "text-destructive" : "text-amber-500")} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-foreground">Thermals & Core</p>
                            <p className="text-[10px] font-mono text-muted-foreground">
                                {cpuTemp}°C CPU · {hardware?.fans?.[0]?.rpm ? `${hardware.fans[0].rpm} RPM` : "Silent Fans"}
                            </p>
                        </div>
                    </div>
                    <Badge variant={cpuTemp > 75 ? "warning" : "secondary"} className="text-[10px] font-mono">
                        {cpuTemp < 65 ? "Nominal" : "Warm"}
                    </Badge>
                </div>

                {/* Power & Energy State */}
                <div className="rounded-xl border border-border/60 bg-background/40 p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border text-foreground">
                            <Zap className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-foreground">Power & Battery</p>
                            <p className="text-[10px] font-mono text-muted-foreground">
                                {powerStatus?.ac_online ? "AC Connected" : `${powerStatus?.batteries?.[0]?.capacity_pct ?? 100}% Battery`}
                            </p>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono capitalize">
                        {powerProfile}
                    </Badge>
                </div>
            </div>

            {/* ── 5. Quick Peripheral Jump Links ── */}
            {onSelectModule && (
                <div className="border-t border-border/60 pt-4 space-y-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                        Quick Peripheral Inspect & Direct Controls
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                        {[
                            { id: "wifi", label: "Wi-Fi Card", icon: Wifi, status: wifi?.enabled ? (wifi.ssid ?? "Connected") : "Off" },
                            { id: "bluetooth", label: "Bluetooth", icon: Bluetooth, status: bt?.enabled ? `${bt.devices?.filter(d => d.connected).length ?? 0} paired` : "Off" },
                            { id: "audio", label: "Audio & Vol", icon: Volume2, status: audio?.output_muted ? "Muted" : `${audio?.output_volume ?? 70}%` },
                            { id: "power", label: "Power Engine", icon: Zap, status: powerProfile },
                            { id: "hardware", label: "Thermals", icon: Flame, status: `${cpuTemp}°C` },
                            { id: "vpn", label: "Tailscale VPN", icon: ShieldCheck, status: security?.vpn?.active ? "Active" : "Offline" },
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
        </div>
    );
}
