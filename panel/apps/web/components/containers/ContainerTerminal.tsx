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
    Wifi,
    WifiOff,
    AlertCircle,
} from "lucide-react";
import { useContainerTerminal } from "@/hooks/useContainerTerminal";

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

        const term = new Terminal({
            cursorBlink: true,
            fontSize: 13,
            fontFamily: "JetBrains Mono, Menlo, Monaco, 'Courier New', monospace",
            theme: {
                background: "#0d1117",
                foreground: "#c9d1d9",
                cursor: "#58a6ff",
                black: "#484f58",
                red: "#ff7b72",
                green: "#3fb950",
                yellow: "#d29922",
                blue: "#58a6ff",
                magenta: "#bc8cff",
                cyan: "#39c5cf",
                white: "#b1bac4",
                brightBlack: "#6e7681",
                brightRed: "#ffa198",
                brightGreen: "#56d364",
                brightYellow: "#e3b341",
                brightBlue: "#79c0ff",
                brightMagenta: "#d2a8ff",
                brightCyan: "#56d4dd",
                brightWhite: "#f0f6fc",
            },
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
    }, [isRunning, sendInput, sendResize]);

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
            <div className="flex h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
                <TerminalIcon className="mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">Kapsayıcı çalışmıyor</p>
                <p className="text-xs text-muted-foreground/70">
                    İnteraktif bir kabuk açmak için kapsayıcının çalışır durumda olması gerekir.
                </p>
            </div>
        );
    }

    return (
        <div
            className={`flex flex-col rounded-lg border border-border bg-[#0d1117] transition-all ${
                isFullscreen
                    ? "fixed inset-4 z-50 shadow-2xl"
                    : "h-[520px] w-full"
            }`}
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#161b22] px-3 py-2 text-xs">
                {/* Left: Shell Selector & Status */}
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-300">Kabuk:</span>
                    <select
                        value={shell}
                        onChange={(e) => setShell(e.target.value)}
                        className="h-6 rounded bg-slate-900 px-2 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="/bin/sh">/bin/sh</option>
                        <option value="/bin/bash">/bin/bash</option>
                        <option value="/bin/zsh">/bin/zsh</option>
                        <option value="/bin/ash">/bin/ash</option>
                    </select>

                    {/* Status badge */}
                    {status === "connected" && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Bağlandı
                        </span>
                    )}
                    {status === "creating" && (
                        <span className="flex items-center gap-1 text-[11px] text-amber-400">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Oturum Başlatılıyor...
                        </span>
                    )}
                    {status === "disconnected" && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <WifiOff className="h-3 w-3" />
                            Bağlantı Kapandı
                        </span>
                    )}
                    {status === "error" && (
                        <span className="flex items-center gap-1 text-[11px] text-red-400">
                            <AlertCircle className="h-3 w-3" />
                            Hata
                        </span>
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {errorMessage && (
                        <span className="text-[11px] text-red-400">{errorMessage}</span>
                    )}
                    <button
                        onClick={reconnect}
                        title="Oturumu Yeniden Başlat"
                        className="flex h-6 items-center gap-1 rounded bg-slate-800 px-2 text-[11px] text-slate-300 transition-colors hover:bg-slate-700"
                    >
                        <RefreshCw className="h-3 w-3" />
                        Yeniden Bağlan
                    </button>
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        title={isFullscreen ? "Küçült" : "Tam Ekran"}
                        className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700"
                    >
                        {isFullscreen ? (
                            <Minimize2 className="h-3.5 w-3.5" />
                        ) : (
                            <Maximize2 className="h-3.5 w-3.5" />
                        )}
                    </button>
                </div>
            </div>

            {/* xterm.js container */}
            <div ref={containerRef} className="flex-1 overflow-hidden p-2" />
        </div>
    );
}
