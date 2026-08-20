"use client";

import React, { useState } from "react";
import { useHostStore } from "@/store/host-store";
import { QuickControlsRail, CockpitModuleId } from "@/components/cockpit/QuickControlsRail";
import { SystemVitalsHUD } from "@/components/cockpit/SystemVitalsHUD";
import { WifiCard } from "@/components/cockpit/WifiCard";
import { BluetoothCard } from "@/components/cockpit/BluetoothCard";
import { NixOSCard } from "@/components/cockpit/NixOSCard";
import { SecurityCard } from "@/components/cockpit/SecurityCard";
import { StorageCard } from "@/components/cockpit/StorageCard";
import { AIAgentCard } from "@/components/cockpit/AIAgentCard";
import {
    Heart, LayoutGrid, SlidersHorizontal,
    Wifi, Bluetooth, Shield,
    Layers, HardDrive, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CockpitTab = "all" | "wireless" | "infrastructure" | "ai";
type CockpitViewMode = "station" | "deck";

export default function CockpitPage() {
    const host = useHostStore((s) => s.selectedHost);
    const [selectedModule, setSelectedModule] = useState<CockpitModuleId>("vitals");
    const [viewMode, setViewMode] = useState<CockpitViewMode>("station");
    const [deckTab, setDeckTab] = useState<CockpitTab>("all");

    // Module name map for breadcrumbs and cognitive indexing
    const MODULE_META: Record<CockpitModuleId, { title: string; category: string; icon: React.ComponentType<{ className?: string }> }> = {
        vitals: { title: "System Vitals Master Avionics HUD", category: "Telemetry & Environment", icon: Heart },
        wifi: { title: "Wi-Fi & Wireless Interface", category: "Wireless & Mesh", icon: Wifi },
        bluetooth: { title: "Bluetooth & Peripheral Mesh", category: "Wireless & Mesh", icon: Bluetooth },
        nixos: { title: "NixOS Generations & Store Engine", category: "Declarative Infrastructure", icon: Layers },
        storage: { title: "Storage Volumes & Snapshots", category: "Declarative Infrastructure", icon: HardDrive },
        security: { title: "Security, SOPS & Firewall", category: "Declarative Infrastructure", icon: Shield },
        ai: { title: "AI Agent Hub & Sandboxes", category: "Platform Intelligence", icon: Sparkles },
    };

    return (
        <div className="mx-auto max-w-7xl space-y-4 pb-12 font-sans">
            {/* ── 1. Apparatus Header & View Mode Switcher ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-glow" />
                    <div>
                        <h1 className="text-base font-bold text-foreground">Cockpit Telemetry & Controls</h1>
                        <p className="text-[11px] text-muted-foreground font-mono">
                            Target Node: <strong className="text-foreground">{host}</strong> · Active Avionics Bus
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
                                { id: "all", label: "All Hubs" },
                                { id: "wireless", label: "Wireless" },
                                { id: "infrastructure", label: "Infrastructure" },
                                { id: "ai", label: "AI Fleet" },
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
                        {selectedModule === "vitals" && (
                            <SystemVitalsHUD onSelectModule={(id) => setSelectedModule(id as CockpitModuleId)} />
                        )}
                        {selectedModule === "wifi" && <WifiCard />}
                        {selectedModule === "bluetooth" && <BluetoothCard />}
                        {selectedModule === "nixos" && <NixOSCard />}
                        {selectedModule === "storage" && <StorageCard />}
                        {selectedModule === "security" && <SecurityCard />}
                        {selectedModule === "ai" && <AIAgentCard />}
                    </main>
                </div>
            )}

            {/* ── 3. Alternate Layout: Classic Full Grid Deck ── */}
            {viewMode === "deck" && (
                <div className="space-y-5">
                    {deckTab === "all" && (
                        <div className="space-y-5">
                            <SystemVitalsHUD onSelectModule={(id) => {
                                setViewMode("station");
                                setSelectedModule(id as CockpitModuleId);
                            }} />
                            <div className="grid gap-5 lg:grid-cols-2">
                                <div className="space-y-5">
                                    <NixOSCard />
                                    <StorageCard />
                                    <SecurityCard />
                                </div>
                                <div className="space-y-5">
                                    <WifiCard />
                                    <BluetoothCard />
                                    <AIAgentCard />
                                </div>
                            </div>
                        </div>
                    )}

                    {deckTab === "wireless" && (
                        <div className="grid gap-5 lg:grid-cols-2">
                            <div className="space-y-5">
                                <WifiCard />
                            </div>
                            <div className="space-y-5">
                                <BluetoothCard />
                            </div>
                        </div>
                    )}

                    {deckTab === "infrastructure" && (
                        <div className="grid gap-5 lg:grid-cols-2">
                            <div className="space-y-5">
                                <NixOSCard />
                                <StorageCard />
                            </div>
                            <div className="space-y-5">
                                <SecurityCard />
                            </div>
                        </div>
                    )}

                    {deckTab === "ai" && (
                        <div className="grid gap-5 lg:grid-cols-2">
                            <div className="space-y-5">
                                <AIAgentCard />
                            </div>
                            <div className="space-y-5">
                                <NixOSCard />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
