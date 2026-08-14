"use client";

import { useState } from "react";
import {
    Flame, Zap, Wind,
    Gauge, ChevronDown, ChevronUp,
    Cpu, Activity,
} from "lucide-react";
import { useHardware } from "@/hooks/useHardware";

export function HardwareCard() {
    const { data: hardware, setPowerProfile, isLoading } = useHardware();
    const [showSensors, setShowSensors] = useState(false);

    const cpuTemp = hardware?.cpu_temp_c ?? 45;
    const gpuTemp = hardware?.gpu_temp_c;
    const fans = hardware?.fans ?? [];
    const sensors = hardware?.sensors ?? [];
    const currentProfile = hardware?.power_profile ?? "balanced";

    const tempColor = (t: number) => {
        if (t >= 85) return "text-destructive border-destructive/30 bg-destructive/10";
        if (t >= 70) return "text-orange-500 border-orange-500/30 bg-orange-500/10";
        return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
    };

    const PROFILES = [
        { id: "performance", label: "Performans", icon: "🚀", desc: "Maksimum güç ve frekans" },
        { id: "balanced", label: "Dengeli", icon: "⚖️", desc: "Optimum pil ve hız" },
        { id: "powersave", label: "Tasarruf", icon: "🍃", desc: "Sessiz fan ve düşük tüketim" },
    ];

    return (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                        <Activity className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Termal ve Performans</p>
                        <p className="text-[11px] text-muted-foreground">
                            {isLoading ? "Yükleniyor…" : `CPU Governor: ${hardware?.cpu_governor ?? "auto"}`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Metrics Badges */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {/* CPU Temp */}
                <div className="rounded-lg border border-border/50 bg-background/40 p-3 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1 text-xs">
                            <Cpu className="h-3.5 w-3.5" /> CPU
                        </span>
                        <Flame className="h-3.5 w-3.5 text-orange-500" />
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold font-mono tabular-nums">
                            {cpuTemp.toFixed(0)}°C
                        </span>
                        <span className={`rounded px-1 text-[10px] font-medium border ${tempColor(cpuTemp)}`}>
                            {cpuTemp < 70 ? "Normal" : cpuTemp < 85 ? "Sıcak" : "Kritik"}
                        </span>
                    </div>
                </div>

                {/* GPU Temp */}
                <div className="rounded-lg border border-border/50 bg-background/40 p-3 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1 text-xs">
                            <Gauge className="h-3.5 w-3.5" /> GPU
                        </span>
                        <Flame className="h-3.5 w-3.5 text-red-500" />
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold font-mono tabular-nums">
                            {gpuTemp != null ? `${gpuTemp.toFixed(0)}°C` : "—"}
                        </span>
                        {gpuTemp != null && (
                            <span className={`rounded px-1 text-[10px] font-medium border ${tempColor(gpuTemp)}`}>
                                {gpuTemp < 70 ? "Normal" : "Sıcak"}
                            </span>
                        )}
                    </div>
                </div>

                {/* Fan Speed */}
                <div className="rounded-lg border border-border/50 bg-background/40 p-3 space-y-1 col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1 text-xs">
                            <Wind className="h-3.5 w-3.5" /> Fan
                        </span>
                        <Wind className="h-3.5 w-3.5 text-cyan-500" />
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold font-mono tabular-nums">
                            {fans.length > 0 ? `${fans[0].rpm} RPM` : "Otomatik"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Power Profile Selector */}
            <div className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3.5">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                    Güç ve Performans Profili
                </p>
                <div className="grid grid-cols-3 gap-2">
                    {PROFILES.map((p) => {
                        const isSelected = currentProfile === p.id;
                        return (
                            <button
                                key={p.id}
                                onClick={() => setPowerProfile.mutate(p.id)}
                                disabled={setPowerProfile.isPending}
                                className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2.5 text-center transition-all ${
                                    isSelected
                                        ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                                        : "border-border/60 hover:border-primary/40 hover:bg-muted text-muted-foreground"
                                }`}
                            >
                                <span className="text-base">{p.icon}</span>
                                <span className="text-xs">{p.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Thermal sensors expandable detail */}
            {sensors.length > 0 && (
                <div className="border-t border-border/40 pt-2">
                    <button
                        onClick={() => setShowSensors(!showSensors)}
                        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground py-1"
                    >
                        <span>Tüm Sensörler ({sensors.length})</span>
                        {showSensors ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    {showSensors && (
                        <div className="mt-2 divide-y divide-border/30 rounded-lg border border-border/40 bg-background/50 max-h-40 overflow-y-auto">
                            {sensors.map((s, idx) => (
                                <div key={idx} className="flex items-center justify-between px-3 py-1.5 text-xs">
                                    <span className="truncate max-w-[200px] text-muted-foreground">{s.name}</span>
                                    <span className="font-mono font-medium">{s.temp_c.toFixed(1)} °C</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
