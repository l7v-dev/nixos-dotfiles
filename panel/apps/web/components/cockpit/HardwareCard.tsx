"use client";

import { useState } from "react";
import {
    Flame, Zap, Wind,
    ChevronDown, ChevronUp,
    Cpu, Activity,
} from "lucide-react";
import { useHardware } from "@/hooks/useHardware";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function HardwareCard() {
    const { data: hardware, setPowerProfile, isLoading } = useHardware();
    const [showSensors, setShowSensors] = useState(false);

    const cpuTemp = hardware?.cpu_temp_c ?? 45;
    const gpuTemp = hardware?.gpu_temp_c;
    const fans = hardware?.fans ?? [];
    const sensors = hardware?.sensors ?? [];
    const currentProfile = hardware?.power_profile ?? "balanced";

    const tempStatus = (t: number) => {
        if (t >= 85) return { label: "Critical", variant: "destructive" as const, color: "text-destructive" };
        if (t >= 70) return { label: "Elevated", variant: "warning" as const, color: "text-amber-600 dark:text-amber-400" };
        return { label: "Nominal", variant: "success" as const, color: "text-emerald-600 dark:text-emerald-400" };
    };

    const PROFILES = [
        { id: "performance", label: "Performance", icon: "🚀", desc: "Max frequency & power" },
        { id: "balanced", label: "Balanced", icon: "⚖️", desc: "Dynamic clock scaling" },
        { id: "powersave", label: "Powersave", icon: "🍃", desc: "Quiet fan & efficiency" },
    ];

    const cpuStatus = tempStatus(cpuTemp);

    return (
        <div className="instrument-card p-4 sm:p-5 space-y-4">
            {/* ── 1. Header & Status ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
                        <Activity className="h-4 w-4" strokeWidth={1.6} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold leading-tight text-foreground whitespace-nowrap">Thermal & Compute</p>
                        <p className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                            {isLoading ? "Polling telemetry…" : `Governor: ${hardware?.cpu_governor ?? "schedutil"}`}
                        </p>
                    </div>
                </div>
                <Badge variant={cpuStatus.variant} className="font-mono text-[10px] whitespace-nowrap">
                    {cpuStatus.label}
                </Badge>
            </div>

            {/* ── 2. Primary Telemetry Metric Grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {/* CPU Temp */}
                <div className="rounded-lg border border-border/60 bg-background/50 p-3 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
                            <Cpu className="h-3.5 w-3.5" strokeWidth={1.5} /> CPU Core
                        </span>
                        <Flame className={cn("h-3.5 w-3.5", cpuStatus.color)} strokeWidth={1.5} />
                    </div>
                    <div className="flex items-baseline justify-between pt-0.5">
                        <span className="text-xl font-bold font-mono tnum tracking-tight text-foreground whitespace-nowrap">
                            {cpuTemp.toFixed(0)}°C
                        </span>
                        <span className={cn("text-[11px] font-semibold font-mono whitespace-nowrap", cpuStatus.color)}>
                            {cpuTemp < 70 ? "● Calm" : "▲ Hot"}
                        </span>
                    </div>
                </div>

                {/* GPU Temp */}
                <div className="rounded-lg border border-border/60 bg-background/50 p-3 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
                            <Zap className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} /> GPU Core
                        </span>
                        <Activity className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="flex items-baseline justify-between pt-0.5">
                        <span className="text-xl font-bold font-mono tnum tracking-tight text-foreground whitespace-nowrap">
                            {gpuTemp !== undefined ? `${gpuTemp.toFixed(0)}°C` : "N/A"}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                            {gpuTemp !== undefined ? "Active" : "Integrated"}
                        </span>
                    </div>
                </div>

                {/* Fan Speed */}
                <div className="col-span-2 sm:col-span-1 rounded-lg border border-border/60 bg-background/50 p-3 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
                            <Wind className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} /> Cooling Fans
                        </span>
                        <Wind className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="flex items-baseline justify-between pt-0.5">
                        <span className="text-xl font-bold font-mono tnum tracking-tight text-foreground whitespace-nowrap">
                            {fans.length > 0 ? `${fans[0].rpm} RPM` : "Silent"}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                            {fans.length > 0 ? `${fans.length} Active` : "Passive"}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── 3. Tactile Power Profile Switcher ── */}
            <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Hardware Power Profile
                </p>
                <div className="grid grid-cols-3 gap-2">
                    {PROFILES.map((p) => {
                        const active = currentProfile === p.id;
                        return (
                            <button
                                key={p.id}
                                onClick={() => setPowerProfile.mutate(p.id)}
                                disabled={setPowerProfile.isPending}
                                className={cn(
                                    "flex flex-col items-start gap-0.5 rounded-lg border p-2 text-left transition-all",
                                    active
                                        ? "border-primary/50 bg-primary/10 text-foreground ring-1 ring-primary/30"
                                        : "border-border/60 bg-background/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                )}
                            >
                                <div className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap">
                                    <span>{p.icon}</span>
                                    <span>{p.label}</span>
                                </div>
                                <p className="text-[9px] text-muted-foreground/80 leading-tight whitespace-nowrap truncate">
                                    {p.desc}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── 4. Progressive Disclosure (Sensors Extender) ── */}
            {sensors.length > 0 && (
                <div className="border-t border-border/60 pt-2">
                    <button
                        onClick={() => setShowSensors(!showSensors)}
                        className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                        <span className="whitespace-nowrap">Detailed Sensors ({sensors.length} probes)</span>
                        {showSensors ? <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} /> : <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />}
                    </button>

                    {showSensors && (
                        <div className="mt-2 space-y-1 rounded-lg border border-border/60 bg-background/60 p-2 text-xs font-mono">
                            {sensors.map((s, idx) => (
                                <div key={idx} className="flex items-center justify-between text-muted-foreground py-0.5 border-b border-border/30 last:border-0">
                                    <span>{s.name}</span>
                                    <span className="text-foreground font-semibold tnum">
                                        {s.temp_c !== undefined ? `${s.temp_c.toFixed(1)}°C` : "—"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
