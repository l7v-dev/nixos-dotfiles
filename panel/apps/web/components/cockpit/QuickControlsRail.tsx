"use client";

import React from "react";
import {
    Wifi, WifiOff,
    Bluetooth, BluetoothOff,
    Shield, ShieldCheck,
    HardDrive,
    Sparkles, Layers,
    ChevronRight, Heart,
    SlidersHorizontal,
} from "lucide-react";
import { useWifi, useBluetooth } from "@/hooks/useMetrics";
import { useMetrics } from "@/hooks/useMetrics";
import { useSecurity } from "@/hooks/useSecurity";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type CockpitModuleId =
    | "vitals"
    | "wifi"
    | "bluetooth"
    | "nixos"
    | "storage"
    | "security"
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
    const { data: security } = useSecurity();
    const { data: metrics } = useMetrics();

    const isWifiOn = wifi?.enabled ?? false;
    const isBtOn = bt?.enabled ?? false;
    const isVpnOn = security?.vpn?.active ?? false;
    const rootDisk = metrics?.disks?.find((d) => d.mount === "/") ?? metrics?.disks?.[0];

    return (
        <aside
            className={cn(
                "instrument-card p-3.5 sm:p-4 space-y-4 font-sans shrink-0 w-full lg:w-[350px] xl:w-[370px]",
                className
            )}
        >
            {/* ── 1. Master HUD Trigger (Foveal Focus) ── */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 font-mono">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        Flight Station
                    </p>
                    <span className="text-xs font-mono text-muted-foreground/80">
                        /dev/sys
                    </span>
                </div>

                {/* Master Heartbeat & Vitals Overview Button */}
                <button
                    onClick={() => onSelect("vitals")}
                    className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group",
                        selectedId === "vitals"
                            ? "border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-[0_0_15px_-3px_rgba(56,189,248,0.15)]"
                            : "border-border/70 bg-card/60 text-muted-foreground hover:bg-white/[0.04] hover:border-white/15 hover:text-foreground"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border/80 shadow-xs">
                            <Heart className={cn("h-4 w-4", selectedId === "vitals" ? "text-primary animate-pulse" : "text-emerald-400")} />
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm font-bold text-foreground">System Vitals HUD</p>
                            <p className="text-xs font-mono text-muted-foreground">
                                Master Avionics Hub
                            </p>
                        </div>
                    </div>
                    <Badge variant={selectedId === "vitals" ? "default" : "outline"} className="text-xs font-mono">
                        Live Flight
                    </Badge>
                </button>
            </div>

            {/* ── 2. Categorized Control Clusters (Miller's Law - 3 Clear Domains) ── */}
            <div className="space-y-4">
                {/* ── Cluster 1: Wireless & Peripherals ── */}
                <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1 font-mono">
                        Wireless & Peripheral Mesh
                    </p>

                    {/* Wi-Fi Station */}
                    <div
                        onClick={() => onSelect("wifi")}
                        className={cn(
                            "group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer select-none",
                            selectedId === "wifi"
                                ? "border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-[0_0_15px_-3px_rgba(56,189,248,0.15)]"
                                : "border-border/70 bg-card/60 hover:bg-white/[0.04] hover:border-white/15 text-muted-foreground hover:text-foreground"
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
                                <p className="text-xs font-semibold leading-tight text-foreground truncate">Wi-Fi Station</p>
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

                    {/* Bluetooth Mesh */}
                    <div
                        onClick={() => onSelect("bluetooth")}
                        className={cn(
                            "group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer select-none",
                            selectedId === "bluetooth"
                                ? "border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-[0_0_15px_-3px_rgba(56,189,248,0.15)]"
                                : "border-border/70 bg-card/60 hover:bg-white/[0.04] hover:border-white/15 text-muted-foreground hover:text-foreground"
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
                                <p className="text-xs font-semibold leading-tight text-foreground truncate">Bluetooth Mesh</p>
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
                </div>

                {/* ── Cluster 2: Declarative Infrastructure ── */}
                <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1 font-mono">
                        Declarative Infrastructure
                    </p>

                    {/* NixOS System */}
                    <div
                        onClick={() => onSelect("nixos")}
                        className={cn(
                            "group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer select-none",
                            selectedId === "nixos"
                                ? "border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-[0_0_15px_-3px_rgba(56,189,248,0.15)]"
                                : "border-border/70 bg-card/60 hover:bg-white/[0.04] hover:border-white/15 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card border border-border/60">
                                <Layers className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold leading-tight text-foreground truncate">NixOS Generations</p>
                                <p className="text-[10px] font-mono text-muted-foreground truncate">
                                    Store & Flake Engine
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
                                ? "border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-[0_0_15px_-3px_rgba(56,189,248,0.15)]"
                                : "border-border/70 bg-card/60 hover:bg-white/[0.04] hover:border-white/15 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card border border-border/60">
                                <HardDrive className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold leading-tight text-foreground truncate">Storage & Snapshots</p>
                                <p className="text-[10px] font-mono text-muted-foreground truncate">
                                    {rootDisk?.usage_pct?.toFixed(0) ?? 0}% Root Used ({rootDisk?.fs_type ?? "ext4"})
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </div>

                    {/* Security & Secrets */}
                    <div
                        onClick={() => onSelect("security")}
                        className={cn(
                            "group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer select-none",
                            selectedId === "security"
                                ? "border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-[0_0_15px_-3px_rgba(56,189,248,0.15)]"
                                : "border-border/70 bg-card/60 hover:bg-white/[0.04] hover:border-white/15 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card border border-border/60">
                                <Shield className="h-3.5 w-3.5 text-emerald-500" strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold leading-tight text-foreground truncate">Security & SOPS</p>
                                <p className="text-[10px] font-mono text-muted-foreground truncate">
                                    {isVpnOn ? "VPN Mesh Active" : "Local Direct"} · Audit
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </div>
                </div>

                {/* ── Cluster 3: Platform Intelligence ── */}
                <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1 font-mono">
                        Platform & Intelligence
                    </p>

                    {/* AI Agent Fleet */}
                    <div
                        onClick={() => onSelect("ai")}
                        className={cn(
                            "group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer select-none",
                            selectedId === "ai"
                                ? "border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-[0_0_15px_-3px_rgba(56,189,248,0.15)]"
                                : "border-border/70 bg-card/60 hover:bg-white/[0.04] hover:border-white/15 text-muted-foreground hover:text-foreground"
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
