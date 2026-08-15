"use client";

import { Moon, Sun, Monitor, PanelLeftOpen, Terminal as TerminalIcon, Lock, Unlock } from "lucide-react";
import { useThemeStore } from "@/store/theme-store";
import { useSidebarStore } from "@/store/sidebar-store";
import { useTerminalStore } from "@/store/terminal-store";
import { useAuthStore } from "@/store/auth-store";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { HostSelector } from "@/components/shared/HostSelector";
import { PINLockModal } from "@/components/auth/PINLockModal";

const PAGE_LABELS: Record<string, string> = {
    "/monitoring": "Monitoring",
    "/logs": "Logs",
    "/apps": "Applications",
    "/cockpit": "Cockpit",
    "/terminal": "Terminal",
};

export function Header() {
    const { theme, setTheme } = useThemeStore();
    const { collapsed, toggle } = useSidebarStore();
    const { isLocked, lock } = useAuthStore();
    const pathname = usePathname();

    const pageLabel = PAGE_LABELS[pathname] ?? PAGE_LABELS[
        Object.keys(PAGE_LABELS).find((k) => k !== "/" && pathname.startsWith(k)) ?? "/"
    ] ?? "Panel";

    // Apply theme class to <html>.
    useEffect(() => {
        const root = document.documentElement;
        if (theme === "light") {
            root.classList.add("light");
            root.style.colorScheme = "light";
        } else if (theme === "dark") {
            root.classList.remove("light");
            root.style.colorScheme = "dark";
        } else {
            // system
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

    return (
        <>
            <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
                {/* Left: expand button (when collapsed) + breadcrumb */}
                <div className="flex items-center gap-3 text-sm">
                    {collapsed && (
                        <button
                            onClick={toggle}
                            aria-label="Expand sidebar"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground/60 hover:bg-accent hover:text-foreground transition-colors"
                        >
                            <PanelLeftOpen className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground/50">l7v-panel</span>
                        <span className="text-muted-foreground/30">/</span>
                        <span className="font-medium text-foreground">{pageLabel}</span>
                    </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                    {/* Host selector */}
                    <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <HostSelector />
                    </div>

                    {/* Quick Lock / PIN Button */}
                    <button
                        onClick={lock}
                        title={isLocked ? "Panel Kilitli" : "Paneli Kilitle"}
                        aria-label="Toggle Panel Lock"
                        className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                            isLocked
                                ? "border-destructive/40 bg-destructive/10 text-destructive"
                                : "border-border bg-background text-muted-foreground hover:border-border/80 hover:bg-accent hover:text-foreground"
                        }`}
                    >
                        {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    </button>

                    {/* Quake Terminal Toggle */}
                    <button
                        onClick={() => useTerminalStore.getState().toggleQuake()}
                        title="Quake Terminal (Ctrl+`)"
                        aria-label="Toggle Quake Terminal"
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-border/80 hover:bg-accent hover:text-foreground"
                    >
                        <TerminalIcon className="h-3.5 w-3.5" />
                    </button>

                    {/* Theme toggle */}
                    <button
                        onClick={cycleTheme}
                        aria-label={`Switch theme (current: ${theme})`}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-border/80 hover:bg-accent hover:text-foreground"
                    >
                        <ThemeIcon className="h-3.5 w-3.5" />
                    </button>
                </div>
            </header>

            {/* PIN Lock Keypad Modal */}
            <PINLockModal />
        </>
    );
}
