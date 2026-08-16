"use client";

import React, { useState } from "react";
import { useHostStore } from "@/store/host-store";
import { QuickTogglesBar } from "@/components/cockpit/QuickTogglesBar";
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

type CockpitTab = "all" | "hardware" | "network" | "system" | "ai";

export default function CockpitPage() {
    const host = useHostStore((s) => s.selectedHost);
    const [tab, setTab] = useState<CockpitTab>("all");

    return (
        <div className="mx-auto max-w-6xl space-y-4 pb-12 font-sans">
            {/* ── Apparatus Header & Telemetry Filter Tabs ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-glow" />
                    <div>
                        <h1 className="text-base font-bold text-foreground">Cockpit Telemetry & Controls</h1>
                        <p className="text-[11px] text-muted-foreground font-mono">
                            Target Node: <strong className="text-foreground">{host}</strong> · Active Telemetry Stream
                        </p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 p-1 text-xs">
                    {[
                        { id: "all", label: "All Telemetry" },
                        { id: "hardware", label: "Compute & Power" },
                        { id: "network", label: "Network & Mesh" },
                        { id: "system", label: "NixOS & Storage" },
                        { id: "ai", label: "AI & Sandbox" },
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id as CockpitTab)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                                tab === t.id
                                    ? "bg-card text-foreground font-semibold shadow-xs ring-1 ring-border/50"
                                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Quick Toggles Bar (Always visible at top) ── */}
            <QuickTogglesBar />

            {/* ── Tabbed / Grid Layout ── */}
            {tab === "all" && (
                <div className="grid gap-5 lg:grid-cols-2">
                    {/* Left Column: Power, Hardware, NixOS Engine, Storage, AI Agent Hub */}
                    <div className="space-y-5">
                        <PowerCard />
                        <HardwareCard />
                        <NixOSCard />
                        <StorageCard />
                        <AIAgentCard />
                    </div>

                    {/* Right Column: Wi-Fi, Bluetooth, Audio, Display, Security */}
                    <div className="space-y-5">
                        <WifiCard />
                        <BluetoothCard />
                        <AudioCard />
                        <DisplayCard />
                        <SecurityCard />
                    </div>
                </div>
            )}

            {tab === "hardware" && (
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

            {tab === "network" && (
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

            {tab === "system" && (
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

            {tab === "ai" && (
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
    );
}
