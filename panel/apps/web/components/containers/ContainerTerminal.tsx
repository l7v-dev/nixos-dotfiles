"use client";

import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import {
    Terminal as TerminalIcon,
    RefreshCw,
    Maximize2,
    Minimize2,
    WifiOff,
    AlertCircle,
} from "lucide-react";
import { useContainerTerminal } from "@/hooks/useContainerTerminal";
import { useTerminalStore } from "@/store/terminal-store";
import { useThemeStore } from "@/store/theme-store";
import { resolveTerminalTheme } from "@/lib/terminal-themes";

interface Props {
    containerId: string;
    isRunning: boolean;
}

export function ContainerTerminal({ containerId, isRunning }: Props) {
    const [shell, setShell] = useState("/bin/sh");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);

    const terminalSettings = useTerminalStore((s) => s.settings);
    const currentAppTheme = useThemeStore((s) => s.theme);

    const [isLightMode, setIsLightMode] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        if (currentAppTheme === "light") return true;
        if (currentAppTheme === "dark") return false;
        return window.matchMedia("(prefers-color-scheme: light)").matches;
    });

    useEffect(() => {
        const checkLight = () => {
            if (currentAppTheme === "light") return true;
            if (currentAppTheme === "dark") return false;
            return window.matchMedia("(prefers-color-scheme: light)").matches;
        };
        setIsLightMode(checkLight());

        const mq = window.matchMedia("(prefers-color-scheme: light)");
        const handler = () => {
            if (currentAppTheme === "system") {
                setIsLightMode(mq.matches);
            }
        };
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [currentAppTheme]);

    const {
        status,
        errorMessage,
        sendInput,
        sendResize,
        reconnect,
    } = useContainerTerminal({
        containerId,
        shell,
        enabled: isRunning,
        onData: (data) => {
            terminalRef.current?.write(data);
        },
    });

    useEffect(() => {
        if (!containerRef.current || !isRunning) return;

        const currentTheme = resolveTerminalTheme(terminalSettings.theme, isLightMode);

        const term = new Terminal({
            cursorBlink: true,
            fontSize: terminalSettings.fontSize || 13,
            fontFamily: terminalSettings.fontFamily || "JetBrains Mono, Menlo, Monaco, monospace",
            theme: currentTheme,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(new WebLinksAddon());

        term.open(containerRef.current);
        fitAddon.fit();

        terminalRef.current = term;
        fitAddonRef.current = fitAddon;

        // Terminal input listener
        const disposable = term.onData((data) => {
            sendInput(data);
        });

        // Resize listener
        const handleResize = () => {
            if (fitAddonRef.current && terminalRef.current) {
                fitAddonRef.current.fit();
                sendResize(terminalRef.current.cols, terminalRef.current.rows);
            }
        };

        window.addEventListener("resize", handleResize);
        const timer = setTimeout(handleResize, 100);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", handleResize);
            disposable.dispose();
            term.dispose();
            terminalRef.current = null;
            fitAddonRef.current = null;
        };
    }, [isRunning, sendInput, sendResize]); // eslint-disable-line react-hooks/exhaustive-deps

    // Dynamically update theme
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.options.theme = resolveTerminalTheme(terminalSettings.theme, isLightMode);
        }
    }, [terminalSettings.theme, isLightMode]);

    // Re-fit on fullscreen toggle
    useEffect(() => {
        const timer = setTimeout(() => {
            if (fitAddonRef.current && terminalRef.current) {
                fitAddonRef.current.fit();
                sendResize(terminalRef.current.cols, terminalRef.current.rows);
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [isFullscreen, sendResize]);

    if (!isRunning) {
        return (
            <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-muted-foreground font-sans">
                <TerminalIcon className="mb-2 h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
                <p className="text-sm font-medium text-foreground">Container is not running</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                    An interactive TTY session requires the container to be in running state.
                </p>
            </div>
        );
    }

    return (
        <div
            className={`flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all font-sans ${
                isFullscreen
                    ? "fixed inset-4 z-50 shadow-2xl"
                    : "h-[520px] w-full"
            }`}
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2 text-xs">
                {/* Left: Shell Selector & Status */}
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-muted-foreground">Shell:</span>
                    <select
                        value={shell}
                        onChange={(e) => setShell(e.target.value)}
                        className="h-6 rounded-md border border-border bg-background px-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                        <option value="/bin/sh">/bin/sh</option>
                        <option value="/bin/bash">/bin/bash</option>
                        <option value="/bin/zsh">/bin/zsh</option>
                        <option value="/bin/ash">/bin/ash</option>
                    </select>

                    {/* Status badge */}
                    {status === "connected" && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Connected
                        </span>
                    )}
                    {status === "creating" && (
                        <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-mono">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Starting Session...
                        </span>
                    )}
                    {status === "disconnected" && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                            <WifiOff className="h-3 w-3" />
                            Disconnected
                        </span>
                    )}
                    {status === "error" && (
                        <span className="flex items-center gap-1 text-[11px] text-destructive font-mono">
                            <AlertCircle className="h-3 w-3" />
                            Error
                        </span>
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {errorMessage && (
                        <span className="text-[11px] text-destructive font-mono">{errorMessage}</span>
                    )}
                    <button
                        onClick={reconnect}
                        title="Restart Session"
                        className="flex h-6 items-center gap-1 rounded-full border border-border bg-background px-2.5 text-[11px] font-medium text-foreground transition-colors hover:bg-accent"
                    >
                        <RefreshCw className="h-3 w-3" strokeWidth={1.5} />
                        <span>Reconnect</span>
                    </button>
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-accent"
                    >
                        {isFullscreen ? (
                            <Minimize2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        ) : (
                            <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        )}
                    </button>
                </div>
            </div>

            {/* xterm.js container */}
            <div ref={containerRef} className="flex-1 overflow-hidden p-2 bg-card" />
        </div>
    );
}
