"use client";

import React from "react";
import {
    Wifi, WifiOff,
    Bluetooth, BluetoothOff,
    Shield, ShieldAlert,
    Volume2, VolumeX,
    Mic, MicOff,
    SunMedium, Moon,
    Zap, Flame,
    Activity, HardDrive,
    Sparkles, Layers,
    ChevronRight, Heart,
    Sliders,
} from "lucide-react";
import { useWifi, useBluetooth } from "@/hooks/useMetrics";
import { useAudio } from "@/hooks/useAudio";
import { useDisplay } from "@/hooks/useDisplay";
import { useSecurity } from "@/hooks/useSecurity";
import { useHardware } from "@/hooks/useHardware";
import { useMetrics } from "@/hooks/useMetrics";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type CockpitModuleId =
    | "vitals"
    | "wifi"
    | "bluetooth"
    | "vpn"
    | "power"
    | "hardware"
    | "display"
    | "audio"
    | "mic"
    | "nixos"
    | "storage"
    | "ai";

interface QuickControlsRailProps {
    selectedId: CockpitModuleId;
    onSelect: (id: CockpitModuleId) => void;
    className?: string;
}

export function QuickControlsRail({
    selectedId,
    onSelect,
    className,
}: QuickControlsRailProps) {
    const { data: wifi, toggle: toggleWifi } = useWifi();
    const { data: bt, toggle: toggleBt } = useBluetooth();
    const { data: audio, setMute: setAudioMute } = useAudio();
    const { data: display, setNightLight } = useDisplay();
    const { data: security, toggleVPN } = useSecurity();
    const { data: hardware, setPowerProfile } = useHardware();
    const { data: metrics } = useMetrics();

    const isWifiOn = wifi?.enabled ?? false;
    const isBtOn = bt?.enabled ?? false;
    const isVpnOn = security?.vpn?.active ?? false;
    const isAudioMuted = audio?.output_muted ?? false;
    const isMicMuted = audio?.input_muted ?? false;
    const isNightLightOn = display?.night_light?.enabled ?? false;
    const currentProfile = hardware?.power_profile ?? "balanced";
    const cpuTemp = hardware?.cpu_temp_c ?? 42;

    const nextProfile = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentProfile === "powersave") setPowerProfile.mutate("balanced");
        else if (currentProfile === "balanced") setPowerProfile.mutate("performance");
        else setPowerProfile.mutate("powersave");
    };

    return (
        <aside
            className={cn(
                "instrument-card p-3 sm:p-4 space-y-4 font-sans shrink-0 w-full lg:w-[310px] xl:w-[330px]",
                className
            )}
        >
            {/* ── 1. Rail Title & Master Vitals Trigger ── */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Quick Controls
                    </p>
                    <span className="text-[10px] font-mono text-muted-foreground">
                        Bus: /dev/sys
                    </span>
                </div>

                {/* Master Heartbeat & Vitals Overview Button */}
                <button
                    onClick={() => onSelect("vitals")}
                    className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group",
                        selectedId === "vitals"
                            ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-xs"
                            : "border-border/60 bg-background/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                >
                    <div className="flex items-center gap-2.5">
                        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border/80 shadow-xs">
                            <Heart className={cn("h-4 w-4", selectedId === "vitals" ? "text-primary animate-pulse" : "text-emerald-500")} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-foreground">System Vitals HUD</p>
                            <p className="text-[10px] font-mono text-muted-foreground">
                                Heartbeat & Telemetry
                            </p>
                        </div>
                    </div>
                    <Badge variant={selectedId === "vitals" ? "default" : "outline"} className="text-[10px] font-mono">
                        Overview
                    </Badge>
                </button>
            </div>

            {/* ── 2. Categorized Control Sections ── */}
            <div className="space-y-4">
                {/* ── Category A: Connectivity & Mesh ── */}
                <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1 font-mono">
                        Connectivity & Mesh
                    </p>

                    {/* Wi-Fi Item */}
                    <div
                        onClick={() => onSelect("wifi")}
                        className={cn(
                            "group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer select-none",
                            selectedId === "wifi"
                                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                                : "border-border/60 bg-background/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card border border-border/60">
                                {isWifiOn ? (
                                    <Wifi className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
                                ) : (
                                    <WifiOff className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold leading-tight text-foreground truncate">Wi-Fi</p>
                                <p className="text-[10px] font-mono text-muted-foreground truncate">
                                    {isWifiOn ? (wifi?.ssid ?? "Connected") : "Disabled"}
                                </p>
                            </div>
                        </div>

                        {/* Inline Quick Toggle */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleWifi.mutate();
                            }}
                            disabled={toggleWifi.isPending}
                            title={isWifiOn ? "Disable Wi-Fi" : "Enable Wi-Fi"}
                            className={cn(
                                "h-6 px-2 rounded-md border text-[10px] font-mono font-medium transition-all shrink-0 active:scale-95",
                                isWifiOn
                                    ? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/25"
                                    : "border-border bg-muted/50 text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {isWifiOn ? "ON" : "OFF"}
                        </button>
                    </div>

                    {/* Bluetooth Item */}
                    <div
                        onClick={() => onSelect("bluetooth")}
                        className={cn(
                            "group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer select-none",
                            selectedId === "bluetooth"
                                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                                : "border-border/60 bg-background/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card border border-border/60">
                                {isBtOn ? (
                                    <Bluetooth className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
                                ) : (
                                    <BluetoothOff className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold leading-tight text-foreground truncate">Bluetooth</p>
                                <p className="text-[10px] font-mono text-muted-foreground truncate">
                                    {isBtOn ? `${bt?.devices?.filter(d => d.connected).length ?? 0} paired` : "Disabled"}
                                </p>
                            </div>
                        </div>

                        {/* Inline Quick Toggle */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleBt.mutate();
                            }}
                            disabled={toggleBt.isPending}
                            title={isBtOn ? "Disable Bluetooth" : "Enable Bluetooth"}
                            className={cn(
                                "h-6 px-2 rounded-md border text-[10px] font-mono font-medium transition-all shrink-0 active:scale-95",
                                isBtOn
                                    ? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/25"
                                    : "border-border bg-muted/50 text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {isBtOn ? "ON" : "OFF"}
                        </button>
                    </div>

                    {/* Tailscale Mesh VPN */}
                    <div
                        onClick={() => onSelect("vpn")}
                        className={cn(
                            "group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer select-none",
                            selectedId === "vpn"
                                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                                : "border-border/60 bg-background/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card border border-border/60">
                                {isVpnOn ? (
                                    <Shield className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
                                ) : (
                                    <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold leading-tight text-foreground truncate">Tailscale Mesh</p>
                                <p className="text-[10px] font-mono text-muted-foreground truncate">
                                    {isVpnOn ? "Active Mesh" : "Offline"}
                                </p>
                            </div>
                        </div>

                        {/* Inline Quick Toggle */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleVPN.mutate();
                            }}
                            disabled={toggleVPN.isPending}
                            title={isVpnOn ? "Disconnect VPN" : "Connect VPN"}
                            className={cn(
                                "h-6 px-2 rounded-md border text-[10px] font-mono font-medium transition-all shrink-0 active:scale-95",
                                isVpnOn
                                    ? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/25"
                                    : "border-border bg-muted/50 text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {isVpnOn ? "UP" : "DOWN"}
                        </button>
                    </div>
                </div>

                {/* ── Category B: Hardware & Environment ── */}
                <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1 font-mono">
                        Hardware & Environment
                    </p>

                    {/* Power Engine Item */}
                    <div
                        onClick={() => onSelect("power")}
                        className={cn(
                            "group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer select-none",
                            selectedId === "power"
                                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                                : "border-border/60 bg-background/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card border border-border/60">
                                <Zap className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold leading-tight text-foreground truncate">Power Engine</p>
                                <p className="text-[10px] font-mono text-muted-foreground capitalize truncate">
                                    {currentProfile} profile
                                </p>
                            </div>
                        </div>

                        {/* Inline Profile Switcher */}
                        <button
                            onClick={nextProfile}
                            disabled={setPowerProfile.isPending}
                            title="Cycle power profile"
                            className="h-6 px-2 rounded-md border border-border bg-muted/50 text-[10px] font-mono text-primary font-semibold hover:border-primary/40 hover:bg-muted transition-all shrink-0 active:scale-95 capitalize"
                        >
                            {currentProfile.slice(0, 4)}
                        </button>
                    </div>

                    {/* Thermals & Compute Item */}
                    <div
                        onClick={() => onSelect("hardware")}
                        className={cn(
                            "group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer select-none",
                            selectedId === "hardware"
                                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                                : "border-border/60 bg-background/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card border border-border/60">
                                <Flame className={cn("h-3.5 w-3.5", cpuTemp > 75 ? "text-destructive" : "text-amber-500")} strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold leading-tight text-foreground truncate">Compute & Thermal</p>
                                <p className="text-[10px] font-mono text-muted-foreground truncate">
                                    {cpuTemp}°C · {hardware?.cpu_governor ?? "schedutil"}
                                </p>
                            </div>
                        </div>

                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                            {cpuTemp}°C
                        </Badge>
                    </div>

                    {/* Display & Night Light Item */}
                    <div
                        onClick={() => onSelect("display")}
                        className={cn(
                            "group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer select-none",
                            selectedId === "display"
                                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                                : "border-border/60 bg-background/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card border border-border/60">
                                {isNightLightOn ? (
                                    <Moon className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
                                ) : (
                                    <SunMedium className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold leading-tight text-foreground truncate">Night Light</p>
                                <p className="text-[10px] font-mono text-muted-foreground truncate">
                                    {isNightLightOn ? `${display?.night_light?.temperature ?? 4500}K` : "Off"}
                                </p>
                            </div>
                        </div>

                        {/* Inline Quick Toggle */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setNightLight.mutate({
                                    enabled: !isNightLightOn,
                                    temperature: display?.night_light?.temperature ?? 4500,
                                });
                            }}
                            disabled={setNightLight.isPending}
                            title={isNightLightOn ? "Disable Night Light" : "Enable Night Light"}
                            className={cn(
                                "h-6 px-2 rounded-md border text-[10px] font-mono font-medium transition-all shrink-0 active:scale-95",
                                isNightLightOn
                                    ? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/25"
                                    : "border-border bg-muted/50 text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {isNightLightOn ? "ON" : "OFF"}
                        </button>
                    </div>
                </div>

                {/* ── Category C: Audio & Media ── */}
                <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1 font-mono">
                        Audio & Streams
                    </p>

                    {/* Audio Output */}
                    <div
                        onClick={() => onSelect("audio")}
                        className={cn(
                            "group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer select-none",
                            selectedId === "audio"
                                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                                : "border-border/60 bg-background/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card border border-border/60">
                                {isAudioMuted ? (
                                    <VolumeX className="h-3.5 w-3.5 text-destructive" strokeWidth={1.8} />
                                ) : (
                                    <Volume2 className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold leading-tight text-foreground truncate">Audio Output</p>
                                <p className="text-[10px] font-mono text-muted-foreground truncate">
                                    {isAudioMuted ? "Muted" : `${audio?.output_volume ?? 70}% Vol`}
                                </p>
                            </div>
                        </div>

                        {/* Inline Mute Toggle */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setAudioMute.mutate({ target: "sink", muted: !isAudioMuted });
                            }}
                            disabled={setAudioMute.isPending}
                            title={isAudioMuted ? "Unmute Audio" : "Mute Audio"}
                            className={cn(
                                "h-6 px-2 rounded-md border text-[10px] font-mono font-medium transition-all shrink-0 active:scale-95",
                                isAudioMuted
                                    ? "border-destructive/40 bg-destructive/15 text-destructive hover:bg-destructive/25"
                                    : "border-border bg-muted/50 text-foreground hover:bg-muted"
                            )}
                        >
                            {isAudioMuted ? "MUTED" : "MUTE"}
                        </button>
                    </div>

                    {/* Microphone Item */}
                    <div
                        onClick={() => onSelect("audio")}
                        className={cn(
                            "group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer select-none",
                            selectedId === "mic"
                                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                                : "border-border/60 bg-background/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card border border-border/60">
                                {isMicMuted ? (
                                    <MicOff className="h-3.5 w-3.5 text-destructive" strokeWidth={1.8} />
                                ) : (
                                    <Mic className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold leading-tight text-foreground truncate">Microphone</p>
                                <p className="text-[10px] font-mono text-muted-foreground truncate">
                                    {isMicMuted ? "Muted" : "Active"}
                                </p>
                            </div>
                        </div>

                        {/* Inline Mic Toggle */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setAudioMute.mutate({ target: "source", muted: !isMicMuted });
                            }}
                            disabled={setAudioMute.isPending}
                            title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
                            className={cn(
                                "h-6 px-2 rounded-md border text-[10px] font-mono font-medium transition-all shrink-0 active:scale-95",
                                isMicMuted
                                    ? "border-destructive/40 bg-destructive/15 text-destructive hover:bg-destructive/25"
                                    : "border-border bg-muted/50 text-foreground hover:bg-muted"
                            )}
                        >
                            {isMicMuted ? "MUTED" : "LIVE"}
                        </button>
                    </div>
                </div>

                {/* ── Category D: System & Platform ── */}
                <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1 font-mono">
                        System & Platform
                    </p>

                    {/* NixOS System */}
                    <div
                        onClick={() => onSelect("nixos")}
                        className={cn(
                            "group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer select-none",
                            selectedId === "nixos"
                                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                                : "border-border/60 bg-background/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card border border-border/60">
                                <Layers className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold leading-tight text-foreground truncate">NixOS System</p>
                                <p className="text-[10px] font-mono text-muted-foreground truncate">
                                    Generations & Store
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </div>

                    {/* Storage Volumes */}
                    <div
                        onClick={() => onSelect("storage")}
                        className={cn(
                            "group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer select-none",
                            selectedId === "storage"
                                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                                : "border-border/60 bg-background/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card border border-border/60">
                                <HardDrive className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold leading-tight text-foreground truncate">Storage Volumes</p>
                                <p className="text-[10px] font-mono text-muted-foreground truncate">
                                    {metrics?.disks?.[0]?.usage_pct?.toFixed(0) ?? 0}% Root Used
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </div>

                    {/* AI Agent Fleet */}
                    <div
                        onClick={() => onSelect("ai")}
                        className={cn(
                            "group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer select-none",
                            selectedId === "ai"
                                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                                : "border-border/60 bg-background/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card border border-border/60">
                                <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold leading-tight text-foreground truncate">AI Agent Hub</p>
                                <p className="text-[10px] font-mono text-muted-foreground truncate">
                                    Claudebox & Sandboxes
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </div>
                </div>
            </div>
        </aside>
    );
}
