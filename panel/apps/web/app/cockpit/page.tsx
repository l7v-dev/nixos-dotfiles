"use client";

import React, { useState } from "react";
import { useHostStore } from "@/store/host-store";
import { QuickControlsRail, CockpitModuleId } from "@/components/cockpit/QuickControlsRail";
import { SystemVitalsHUD } from "@/components/cockpit/SystemVitalsHUD";
import { PowerCard } from "@/components/cockpit/PowerCard";
import { WifiCard } from "@/components/cockpit/WifiCard";
import { BluetoothCard } from "@/components/cockpit/BluetoothCard";
import { AudioCard } from "@/components/cockpit/AudioCard";
import { DisplayCard } from "@/components/cockpit/DisplayCard";
import { HardwareCard } from "@/components/cockpit/HardwareCard";
import { NixOSCard } from "@/components/cockpit/NixOSCard";
import { SecurityCard } from "@/components/cockpit/SecurityCard";
import { StorageCard } from "@/components/cockpit/StorageCard";
import { AIAgentCard } from "@/components/cockpit/AIAgentCard";
import {
    Heart, LayoutGrid, SlidersHorizontal,
    ChevronLeft, Radio, ArrowLeft,
    Wifi, Bluetooth, Volume2, Zap, Flame, Shield,
    Layers, HardDrive, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CockpitTab = "all" | "hardware" | "network" | "system" | "ai";
type CockpitViewMode = "station" | "deck";

export default function CockpitPage() {
    const host = useHostStore((s) => s.selectedHost);
    const [selectedModule, setSelectedModule] = useState<CockpitModuleId>("vitals");
    const [viewMode, setViewMode] = useState<CockpitViewMode>("station");
    const [deckTab, setDeckTab] = useState<CockpitTab>("all");

    // Module name map for breadcrumb
    const MODULE_META: Record<CockpitModuleId, { title: string; category: string; icon: React.ComponentType<{ className?: string }> }> = {
        vitals: { title: "System Vitals & Heartbeat HUD", category: "Telemetry", icon: Heart },
        wifi: { title: "Wi-Fi & Wireless Interface", category: "Connectivity", icon: Wifi },
        bluetooth: { title: "Bluetooth & Peripheral Mesh", category: "Connectivity", icon: Bluetooth },
        vpn: { title: "Tailscale Mesh & Security", category: "Connectivity", icon: Shield },
        power: { title: "Power Management & Batteries", category: "Hardware", icon: Zap },
        hardware: { title: "Thermal & Compute Telemetry", category: "Hardware", icon: Flame },
        display: { title: "Display & Night Light Engine", category: "Hardware", icon: SlidersHorizontal },
        audio: { title: "Audio & PipeWire Streams", category: "Media", icon: Volume2 },
        mic: { title: "Microphone & Input Streams", category: "Media", icon: Volume2 },
        nixos: { title: "NixOS Generations & Store Engine", category: "System", icon: Layers },
        storage: { title: "Storage Volumes & Snapshots", category: "System", icon: HardDrive },
        ai: { title: "AI Agent Hub & Sandboxes", category: "Platform", icon: Sparkles },
    };

    const currentMeta = MODULE_META[selectedModule] ?? MODULE_META.vitals;
    const CurrentIcon = currentMeta.icon;

    return (
        <div className="mx-auto max-w-7xl space-y-4 pb-12 font-sans">
            {/* ── 1. Apparatus Header & View Mode Switcher ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-glow" />
                    <div>
                        <h1 className="text-base font-bold text-foreground">Cockpit Telemetry & Controls</h1>
                        <p className="text-[11px] text-muted-foreground font-mono">
                            Target Node: <strong className="text-foreground">{host}</strong> · Live Telemetry Bus
                        </p>
                    </div>
                </div>

                {/* View Mode & Deck Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 p-1 text-xs">
                        <button
                            onClick={() => setViewMode("station")}
                            className={cn(
                                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                                viewMode === "station"
                                    ? "bg-card text-foreground font-semibold shadow-xs ring-1 ring-border/50"
                                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                            )}
                        >
                            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                            Control Station
                        </button>
                        <button
                            onClick={() => setViewMode("deck")}
                            className={cn(
                                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                                viewMode === "deck"
                                    ? "bg-card text-foreground font-semibold shadow-xs ring-1 ring-border/50"
                                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                            )}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            Grid Deck
                        </button>
                    </div>

                    {/* Deck Filters (shown when in Deck mode) */}
                    {viewMode === "deck" && (
                        <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 p-1 text-xs">
                            {[
                                { id: "all", label: "All" },
                                { id: "hardware", label: "Compute" },
                                { id: "network", label: "Network" },
                                { id: "system", label: "System" },
                                { id: "ai", label: "AI" },
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setDeckTab(t.id as CockpitTab)}
                                    className={cn(
                                        "rounded-lg px-2 py-0.5 text-xs font-medium transition-all",
                                        deckTab === t.id
                                            ? "bg-card text-foreground font-semibold shadow-xs ring-1 ring-border/50"
                                            : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                                    )}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── 2. Primary Layout: Control Station Mode (Vertical Rail + Companion View) ── */}
            {viewMode === "station" && (
                <div className="flex flex-col lg:flex-row gap-5 items-start">
                    {/* Left Column: Vertical Quick Controls Rail */}
                    <QuickControlsRail
                        selectedId={selectedModule}
                        onSelect={(id) => setSelectedModule(id)}
                    />

                    {/* Right Column: Companion Card Stage / Embedded Vitals HUD */}
                    <main className="flex-1 min-w-0 w-full space-y-4">
                        {/* Stage Top Navigation Bar (When a peripheral card is active) */}
                        {selectedModule !== "vitals" && (
                            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/70 p-3 shadow-xs">
                                <div className="flex items-center gap-3 min-w-0">
                                    <button
                                        onClick={() => setSelectedModule("vitals")}
                                        className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/60 px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-95 shrink-0"
                                    >
                                        <ArrowLeft className="h-3.5 w-3.5 text-primary" />
                                        Back to Vitals HUD
                                    </button>

                                    <div className="h-4 w-px bg-border/60 hidden sm:block" />

                                    <div className="flex items-center gap-2 min-w-0">
                                        <CurrentIcon className="h-4 w-4 text-primary shrink-0" />
                                        <span className="text-xs font-bold text-foreground truncate">
                                            {currentMeta.title}
                                        </span>
                                        <Badge variant="outline" className="text-[10px] font-mono hidden md:inline-flex">
                                            {currentMeta.category}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Quick Switch Pills */}
                                <div className="flex items-center gap-1 shrink-0">
                                    {[
                                        { id: "wifi", icon: Wifi, label: "Wi-Fi" },
                                        { id: "bluetooth", icon: Bluetooth, label: "BT" },
                                        { id: "audio", icon: Volume2, label: "Audio" },
                                        { id: "power", icon: Zap, label: "Power" },
                                    ].map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelectedModule(p.id as CockpitModuleId)}
                                            className={cn(
                                                "flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-mono transition-all",
                                                selectedModule === p.id
                                                    ? "bg-primary text-primary-foreground font-bold"
                                                    : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                                            )}
                                        >
                                            <p.icon className="h-3 w-3" />
                                            <span className="hidden sm:inline">{p.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Active Companion Stage Content */}
                        {selectedModule === "vitals" && (
                            <SystemVitalsHUD onSelectModule={(id) => setSelectedModule(id as CockpitModuleId)} />
                        )}
                        {selectedModule === "wifi" && <WifiCard />}
                        {selectedModule === "bluetooth" && <BluetoothCard />}
                        {selectedModule === "vpn" && <SecurityCard />}
                        {selectedModule === "power" && <PowerCard />}
                        {selectedModule === "hardware" && <HardwareCard />}
                        {selectedModule === "display" && <DisplayCard />}
                        {(selectedModule === "audio" || selectedModule === "mic") && <AudioCard />}
                        {selectedModule === "nixos" && <NixOSCard />}
                        {selectedModule === "storage" && <StorageCard />}
                        {selectedModule === "ai" && <AIAgentCard />}
                    </main>
                </div>
            )}

            {/* ── 3. Alternate Layout: Classic Full Grid Deck ── */}
            {viewMode === "deck" && (
                <div className="space-y-5">
                    {deckTab === "all" && (
                        <div className="grid gap-5 lg:grid-cols-2">
                            {/* Left Column */}
                            <div className="space-y-5">
                                <PowerCard />
                                <HardwareCard />
                                <NixOSCard />
                                <StorageCard />
                                <AIAgentCard />
                            </div>

                            {/* Right Column */}
                            <div className="space-y-5">
                                <WifiCard />
                                <BluetoothCard />
                                <AudioCard />
                                <DisplayCard />
                                <SecurityCard />
                            </div>
                        </div>
                    )}

                    {deckTab === "hardware" && (
                        <div className="grid gap-5 lg:grid-cols-2">
                            <div className="space-y-5">
                                <PowerCard />
                                <HardwareCard />
                            </div>
                            <div className="space-y-5">
                                <AudioCard />
                                <DisplayCard />
                            </div>
                        </div>
                    )}

                    {deckTab === "network" && (
                        <div className="grid gap-5 lg:grid-cols-2">
                            <div className="space-y-5">
                                <WifiCard />
                                <SecurityCard />
                            </div>
                            <div className="space-y-5">
                                <BluetoothCard />
                            </div>
                        </div>
                    )}

                    {deckTab === "system" && (
                        <div className="grid gap-5 lg:grid-cols-2">
                            <div className="space-y-5">
                                <NixOSCard />
                                <StorageCard />
                            </div>
                            <div className="space-y-5">
                                <PowerCard />
                            </div>
                        </div>
                    )}

                    {deckTab === "ai" && (
                        <div className="grid gap-5 lg:grid-cols-2">
                            <div className="space-y-5">
                                <AIAgentCard />
                            </div>
                            <div className="space-y-5">
                                <HardwareCard />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
