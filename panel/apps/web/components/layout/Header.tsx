"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useHostStore } from "@/store/host-store";
import { useThemeStore } from "@/store/theme-store";
import { useEffect } from "react";

export function Header() {
    const { selectedHost, availableHosts, setHost } = useHostStore();
    const { theme, setTheme } = useThemeStore();

    // Apply theme class to <html>.
    useEffect(() => {
        const root = document.documentElement;
        if (theme === "dark") {
            root.classList.add("dark");
        } else if (theme === "light") {
            root.classList.remove("dark");
        } else {
            // system
            const mq = window.matchMedia("(prefers-color-scheme: dark)");
            root.classList.toggle("dark", mq.matches);
        }
    }, [theme]);

    const cycleTheme = () => {
        const order: typeof theme[] = ["system", "light", "dark"];
        const next = order[(order.indexOf(theme) + 1) % order.length];
        setTheme(next);
    };

    const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

    return (
        <header className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Host:</span>
                <select
                    value={selectedHost}
                    onChange={(e) => setHost(e.target.value)}
                    className="rounded border border-input bg-background px-2 py-0.5 text-sm"
                >
                    {availableHosts.map((h) => (
                        <option key={h} value={h}>
                            {h}
                        </option>
                    ))}
                </select>
            </div>
            <button
                onClick={cycleTheme}
                aria-label={`Switch theme (current: ${theme})`}
                className="rounded p-1.5 hover:bg-accent"
            >
                <ThemeIcon className="h-4 w-4" />
            </button>
        </header>
    );
}
