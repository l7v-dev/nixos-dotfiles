"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    Moon,
    Sun,
    Monitor,
    PanelLeftOpen,
    Terminal as TerminalIcon,
    Lock,
    Unlock,
    Search,
    Sparkles,
} from "lucide-react";
import { useThemeStore } from "@/store/theme-store";
import { useSidebarStore } from "@/store/sidebar-store";
import { useTerminalStore } from "@/store/terminal-store";
import { useAuthStore } from "@/store/auth-store";
import { useHostStore } from "@/store/host-store";
import { Kbd } from "@/components/ui/kbd";
import { PINLockModal } from "@/components/auth/PINLockModal";
import { Button } from "@/components/ui/button";

const ROUTE_INFO: Record<string, { title: string; section: string }> = {
    "/cockpit": { title: "Cockpit Overview", section: "Overview" },
    "/services": { title: "Services & Daemons", section: "Infrastructure" },
    "/containers": { title: "Containers & Pods", section: "Infrastructure" },
    "/nixos": { title: "NixOS Engine & Generations", section: "Infrastructure" },
    "/monitoring": { title: "Telemetry & Monitoring", section: "Infrastructure" },
    "/logs": { title: "Journald Log Stream", section: "Infrastructure" },
    "/ai": { title: "AI Agent Hub", section: "Developer & AI" },
    "/terminal": { title: "Interactive Terminal", section: "Developer & AI" },
    "/packages": { title: "Packages & Flakes", section: "Developer & AI" },
    "/files": { title: "Filesystem Explorer", section: "Developer & AI" },
    "/fleet": { title: "Fleet Cluster & Colmena", section: "Cluster & Security" },
    "/security": { title: "Security & SOPS Secrets", section: "Cluster & Security" },
    "/storage": { title: "Storage & Snapshots", section: "Cluster & Security" },
    "/settings": { title: "System Settings", section: "System" },
};

export function Header() {
    const { theme, setTheme } = useThemeStore();
    const { collapsed, toggle } = useSidebarStore();
    const { isLocked, lock } = useAuthStore();
    const { selectedHost, getNode } = useHostStore();
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const activeNode = getNode(selectedHost) || { name: "Workstation", target_host: "localhost" };

    const matchingKey = Object.keys(ROUTE_INFO).find(
        (key) => pathname === key || pathname.startsWith(`${key}/`)
    );
    const routeInfo = matchingKey ? ROUTE_INFO[matchingKey] : { title: "Control Center", section: "L7V" };

    // Apply theme class to <html>
    useEffect(() => {
        const root = document.documentElement;
        if (theme === "light") {
            root.classList.add("light");
            root.style.colorScheme = "light";
        } else if (theme === "dark") {
            root.classList.remove("light");
            root.style.colorScheme = "dark";
        } else {
            const mq = window.matchMedia("(prefers-color-scheme: light)");
            if (mq.matches) {
                root.classList.add("light");
                root.style.colorScheme = "light";
            } else {
                root.classList.remove("light");
                root.style.colorScheme = "dark";
            }
        }
    }, [theme]);

    const cycleTheme = () => {
        const order: typeof theme[] = ["dark", "light", "system"];
        const next = order[(order.indexOf(theme) + 1) % order.length];
        setTheme(next);
    };

    const ThemeIcon = theme === "light" ? Sun : theme === "system" ? Monitor : Moon;

    const openCommandPalette = () => {
        window.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", metaKey: true })
        );
    };

    return (
        <>
            <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/70 bg-card px-4 select-none">
                {/* Left: Sidebar Toggle + Breadcrumb */}
                <div className="flex items-center gap-3">
                    {collapsed && (
                        <button
                            onClick={toggle}
                            aria-label="Expand sidebar"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                            <PanelLeftOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                    )}

                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-semibold text-muted-foreground/70">
                            {routeInfo.section}
                        </span>
                        <span className="text-muted-foreground/40 font-mono">/</span>
                        <span className="font-bold text-foreground">
                            {routeInfo.title}
                        </span>
                    </div>

                    {/* Active Host Badge — Hydration Safe */}
                    <div className="hidden md:flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-[11px] text-muted-foreground">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        <span className="font-medium text-foreground" suppressHydrationWarning>
                            {mounted ? activeNode.name : "Workstation"}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground/80" suppressHydrationWarning>
                            ({mounted ? activeNode.target_host : "localhost"})
                        </span>
                    </div>
                </div>

                {/* Right: Search, Quick Rebuild, Quake, Theme, Lock */}
                <div className="flex items-center gap-2">
                    {/* Command Palette Trigger Button */}
                    <button
                        onClick={openCommandPalette}
                        className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                    >
                        <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span className="hidden sm:inline">Search or command...</span>
                        <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
                    </button>

                    {/* Quick Rebuild Action */}
                    <Button
                        size="xs"
                        variant="default"
                        onClick={() => router.push("/nixos?action=rebuild")}
                        className="hidden lg:inline-flex items-center gap-1.5 shadow-sm h-7 text-xs"
                    >
                        <Sparkles className="h-3 w-3" strokeWidth={1.75} />
                        <span>Rebuild</span>
                    </Button>

                    {/* Quake Terminal Toggle */}
                    <button
                        onClick={() => useTerminalStore.getState().toggleQuake()}
                        title="Quake Terminal (`)"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <TerminalIcon className="h-3.5 w-3.5 text-emerald-500" strokeWidth={1.6} />
                    </button>

                    {/* Theme Toggle Button */}
                    <button
                        onClick={cycleTheme}
                        title={`Theme: ${theme} (click to cycle)`}
                        aria-label="Cycle theme"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <ThemeIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>

                    {/* PIN / Lock Button */}
                    <button
                        onClick={lock}
                        title={isLocked ? "Session Locked" : "Lock Session"}
                        aria-label={isLocked ? "Session Locked" : "Lock Session"}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        {isLocked ? (
                            <Lock className="h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />
                        ) : (
                            <Unlock className="h-3.5 w-3.5" strokeWidth={1.5} />
                        )}
                    </button>
                </div>
            </header>

            {/* Global PIN Lock Modal */}
            <PINLockModal />
        </>
    );
}
