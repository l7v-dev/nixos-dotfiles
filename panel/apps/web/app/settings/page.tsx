"use client";

import React, { useState, Suspense } from "react";
import { useThemeStore } from "@/store/theme-store";
import { useAuthStore } from "@/store/auth-store";
import { useHostStore } from "@/store/host-store";
import {
    Settings,
    Moon,
    Sun,
    Monitor,
    Lock,
    Key,
    Terminal,
    Sparkles,
    Check,
    Keyboard,
    Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";

function SettingsPageContent() {
    const { theme, setTheme } = useThemeStore();
    const { isLocked, lock } = useAuthStore();
    const { selectedHost, nodes } = useHostStore();

    const activeNode = nodes.find((n) => n.id === selectedHost) || nodes[0];

    const shortcuts = [
        { keys: ["⌘", "K"], desc: "Global Command Palette & Instant Search" },
        { keys: ["`"], desc: "Toggle Quake Web Terminal Dropdown" },
        { keys: ["⌘", "R"], desc: "Rebuild NixOS (nh os switch)" },
        { keys: ["⌘", "A"], desc: "Launch Autonomous AI Coding Task" },
        { keys: ["G", "C"], desc: "Navigate to Cockpit Overview" },
        { keys: ["G", "S"], desc: "Navigate to Services & Daemons" },
        { keys: ["G", "D"], desc: "Navigate to Containers & Stacks" },
        { keys: ["G", "N"], desc: "Navigate to NixOS Engine" },
        { keys: ["G", "A"], desc: "Navigate to AI Agent Hub" },
        { keys: ["G", "T"], desc: "Navigate to Interactive Terminal" },
        { keys: ["G", "F"], desc: "Navigate to File Explorer" },
        { keys: ["G", "P"], desc: "Navigate to Packages Explorer" },
    ];

    return (
        <div className="space-y-6 max-w-4xl pb-12">
            {/* ── Header ── */}
            <div className="border-b border-border/60 pb-4">
                <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                    <Settings className="h-5 w-5 text-primary" />
                    <span>Control Center Preferences</span>
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Configure interface themes, security locks, and view global keyboard shortcuts
                </p>
            </div>

            {/* ── Theme Selection Section ── */}
            <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-4 shadow-xs">
                <div>
                    <h2 className="text-sm font-bold text-foreground">Interface Theme</h2>
                    <p className="text-xs text-muted-foreground">Select color palette and visual mode</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                        onClick={() => setTheme("dark")}
                        className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                            theme === "dark"
                                ? "border-primary bg-primary/10 ring-1 ring-primary"
                                : "border-border/70 bg-muted/20 hover:bg-muted/40"
                        }`}
                    >
                        <Moon className="h-5 w-5 text-primary" />
                        <div>
                            <p className="text-xs font-bold text-foreground">Linear Dark</p>
                            <p className="text-[11px] text-muted-foreground">Default high-contrast</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setTheme("light")}
                        className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                            theme === "light"
                                ? "border-primary bg-primary/10 ring-1 ring-primary"
                                : "border-border/70 bg-muted/20 hover:bg-muted/40"
                        }`}
                    >
                        <Sun className="h-5 w-5 text-amber-500" />
                        <div>
                            <p className="text-xs font-bold text-foreground">Pure Light</p>
                            <p className="text-[11px] text-muted-foreground">Clean light canvas</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setTheme("system")}
                        className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                            theme === "system"
                                ? "border-primary bg-primary/10 ring-1 ring-primary"
                                : "border-border/70 bg-muted/20 hover:bg-muted/40"
                        }`}
                    >
                        <Monitor className="h-5 w-5 text-foreground" strokeWidth={1.5} />
                        <div>
                            <p className="text-xs font-bold text-foreground">System Sync</p>
                            <p className="text-[11px] text-muted-foreground">Follow OS preference</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* ── Keyboard Shortcuts Cheat Sheet ── */}
            <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                        <Keyboard className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-bold text-foreground">Global Keyboard Shortcuts</h2>
                    </div>
                    <Badge variant="outline">Linear Navigation</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {shortcuts.map((sc, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 text-xs"
                        >
                            <span className="text-muted-foreground">{sc.desc}</span>
                            <div className="flex items-center gap-1">
                                {sc.keys.map((k, j) => (
                                    <Kbd key={j}>{k}</Kbd>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Security & Lock Keypad Section ── */}
            <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-foreground">Panel PIN Security Lock</h2>
                        <p className="text-xs text-muted-foreground">Lock dashboard with 4-digit PIN protection</p>
                    </div>
                    <Button
                        size="sm"
                        variant={isLocked ? "destructive" : "outline"}
                        onClick={lock}
                        className="gap-1.5"
                    >
                        <Lock className="h-3.5 w-3.5" />
                        <span>{isLocked ? "Panel is Locked" : "Lock Panel Now"}</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading settings...</div>}>
            <SettingsPageContent />
        </Suspense>
    );
}
