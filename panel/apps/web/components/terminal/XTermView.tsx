"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { CanvasAddon } from "@xterm/addon-canvas";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import "@xterm/xterm/css/xterm.css";

import { useTerminal, ConnectionStatus } from "@/hooks/useTerminal";
import { useTerminalStore } from "@/store/terminal-store";
import { TERMINAL_THEMES } from "@/lib/terminal-themes";
import {
    Search,
    X,
    ChevronUp,
    ChevronDown,
    Copy,
    Trash2,
    Download,
    RefreshCw,
    Activity,
    Wifi,
    WifiOff,
} from "lucide-react";

interface XTermViewProps {
    paneId: string;
    host: string;
    sessionId?: string | null;
    isActive: boolean;
    onFocus?: () => void;
    onBroadcastInput?: (data: string) => void;
}

export function XTermView({
    paneId,
    host,
    sessionId,
    isActive,
    onFocus,
    onBroadcastInput,
}: XTermViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const searchAddonRef = useRef<SearchAddon | null>(null);

    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [matchIndex, setMatchIndex] = useState<number>(0);
    const [totalMatches, setTotalMatches] = useState<number>(0);
    const [bellFlashing, setBellFlashing] = useState(false);

    const settings = useTerminalStore((s) => s.settings);
    const broadcastMode = useTerminalStore((s) => s.broadcastMode);

    // History handler (resets terminal buffer on reconnect to prevent duplicates)
    const handleHistory = useCallback((data: string) => {
        if (terminalRef.current) {
            terminalRef.current.reset();
            terminalRef.current.write(data);
        }
    }, []);

    // Hook output handler
    const handleOutput = useCallback((data: string) => {
        if (terminalRef.current) {
            terminalRef.current.write(data);
        }
    }, []);

    const {
        status,
        latencyMs,
        retryCount,
        sendInput,
        sendResize,
        sendSignal,
        reconnect,
    } = useTerminal({
        paneId,
        host,
        sessionId,
        onOutput: handleOutput,
        onHistory: handleHistory,
    });

    const sendInputRef = useRef(sendInput);
    sendInputRef.current = sendInput;
    const sendResizeRef = useRef(sendResize);
    sendResizeRef.current = sendResize;
    const broadcastModeRef = useRef(broadcastMode);
    broadcastModeRef.current = broadcastMode;
    const onBroadcastInputRef = useRef(onBroadcastInput);
    onBroadcastInputRef.current = onBroadcastInput;

    // Initialize xterm instance
    useEffect(() => {
        if (!containerRef.current) return;

        const currentTheme =
            TERMINAL_THEMES[settings.theme]?.theme || TERMINAL_THEMES.nixos.theme;

        const term = new Terminal({
            cursorBlink: settings.cursorBlink,
            cursorStyle: settings.cursorStyle,
            fontSize: settings.fontSize,
            fontFamily: settings.fontFamily,
            theme: currentTheme,
            scrollback: settings.scrollback,
            allowProposedApi: true,
            drawBoldTextInBrightColors: true,
        });

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();
        const searchAddon = new SearchAddon();
        const unicode11Addon = new Unicode11Addon();

        try {
            term.loadAddon(fitAddon);
        } catch {}
        try {
            term.loadAddon(searchAddon);
        } catch {}
        try {
            term.loadAddon(unicode11Addon);
            term.unicode.activeVersion = "11";
        } catch {}

        term.open(containerRef.current);

        // Try Canvas addon for GPU acceleration
        try {
            const canvasAddon = new CanvasAddon();
            term.loadAddon(canvasAddon);
        } catch {}

        try {
            fitAddon.fit();
        } catch {}

        // Register event handlers
        const dataDispose = term.onData((data) => {
            sendInputRef.current(data);
            if (broadcastModeRef.current && onBroadcastInputRef.current) {
                onBroadcastInputRef.current(data);
            }
        });

        const bellDispose = term.onBell(() => {
            if (settings.bellStyle === "visual") {
                setBellFlashing(true);
                setTimeout(() => setBellFlashing(false), 200);
            }
        });

        terminalRef.current = term;
        fitAddonRef.current = fitAddon;
        searchAddonRef.current = searchAddon;

        // Resize observer with debounce and dimension equality check
        let lastCols = term.cols;
        let lastRows = term.rows;
        let resizeTimer: ReturnType<typeof setTimeout> | null = null;

        const resizeObserver = new ResizeObserver(() => {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (fitAddonRef.current && terminalRef.current) {
                    try {
                        fitAddonRef.current.fit();
                        const { cols, rows } = terminalRef.current;
                        if (cols > 0 && rows > 0 && (cols !== lastCols || rows !== lastRows)) {
                            lastCols = cols;
                            lastRows = rows;
                            sendResizeRef.current(cols, rows);
                        }
                    } catch {}
                }
            }, 100);
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            if (resizeTimer) clearTimeout(resizeTimer);
            try {
                resizeObserver.disconnect();
            } catch {}
            try {
                dataDispose.dispose();
            } catch {}
            try {
                bellDispose.dispose();
            } catch {}
            try {
                term.dispose();
            } catch {}
            terminalRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Listen to external input dispatch (Snippets, Virtual Keyboard, Quake)
    useEffect(() => {
        const handleExternalInput = (e: Event) => {
            const customEvent = e as CustomEvent<{ data: string; paneId?: string }>;
            if (!customEvent.detail) return;
            const { data, paneId: targetPaneId } = customEvent.detail;
            if (targetPaneId && targetPaneId !== paneId) return;
            if (!targetPaneId && !isActive) return;

            sendInput(data);
            terminalRef.current?.focus();
        };

        window.addEventListener("l7v-terminal-input", handleExternalInput);
        return () => {
            window.removeEventListener("l7v-terminal-input", handleExternalInput);
        };
    }, [isActive, paneId, sendInput]);

    // Update terminal settings dynamically
    useEffect(() => {
        if (!terminalRef.current) return;
        const currentTheme =
            TERMINAL_THEMES[settings.theme]?.theme || TERMINAL_THEMES.nixos.theme;

        terminalRef.current.options.theme = currentTheme;
        terminalRef.current.options.fontSize = settings.fontSize;
        terminalRef.current.options.fontFamily = settings.fontFamily;
        terminalRef.current.options.cursorStyle = settings.cursorStyle;
        terminalRef.current.options.cursorBlink = settings.cursorBlink;

        if (fitAddonRef.current) {
            fitAddonRef.current.fit();
        }
    }, [settings]);

    // Handle search query
    const performSearch = useCallback(
        (query: string, direction: "next" | "prev" = "next") => {
            if (!searchAddonRef.current || !query) return;
            if (direction === "next") {
                searchAddonRef.current.findNext(query, {
                    caseSensitive: false,
                    incremental: true,
                });
            } else {
                searchAddonRef.current.findPrevious(query, {
                    caseSensitive: false,
                });
            }
        },
        []
    );

    // Keyboard shortcuts for search (Ctrl+F / Cmd+F)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f" && isActive) {
                e.preventDefault();
                setIsSearching((prev) => !prev);
            } else if (e.key === "Escape" && isSearching) {
                setIsSearching(false);
                searchAddonRef.current?.clearDecorations();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isActive, isSearching]);

    // Copy all scrollback buffer
    const copyScrollback = () => {
        if (!terminalRef.current) return;
        const buf = terminalRef.current.buffer.active;
        let text = "";
        for (let i = 0; i < buf.length; i++) {
            const line = buf.getLine(i);
            if (line) text += line.translateToString(true) + "\n";
        }
        navigator.clipboard.writeText(text.trimEnd());
    };

    // Download terminal log file
    const downloadLog = () => {
        if (!terminalRef.current) return;
        const buf = terminalRef.current.buffer.active;
        let text = "";
        for (let i = 0; i < buf.length; i++) {
            const line = buf.getLine(i);
            if (line) text += line.translateToString(true) + "\n";
        }
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `terminal-${host}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.log`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Clear buffer and screen
    const clearTerminal = () => {
        sendInput("\x0c");
        terminalRef.current?.clear();
    };

    return (
        <div
            className={`relative flex h-full w-full flex-col overflow-hidden rounded-md bg-[#0d1117] transition-all ${
                isActive ? "ring-1 ring-primary shadow-sm" : "border border-border/40"
            }`}
            onClick={onFocus}
        >
            {/* Visual Bell Flash Overlay */}
            {bellFlashing && (
                <div className="pointer-events-none absolute inset-0 z-50 bg-primary/20 animate-fade-out" />
            )}

            {/* In-Terminal Search Bar */}
            {isSearching && (
                <div className="absolute right-3 top-2 z-40 flex items-center gap-1.5 rounded-lg border border-border/80 bg-card/95 px-2.5 py-1.5 shadow-xl backdrop-blur-md">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Ara… (Enter / Shift+Enter)"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            performSearch(e.target.value, "next");
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                performSearch(searchQuery, e.shiftKey ? "prev" : "next");
                            }
                        }}
                        autoFocus
                        className="w-44 rounded bg-background px-2 py-0.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                        onClick={() => performSearch(searchQuery, "prev")}
                        title="Önceki"
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                        <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => performSearch(searchQuery, "next")}
                        title="Sonraki"
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                        <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => {
                            setIsSearching(false);
                            searchAddonRef.current?.clearDecorations();
                        }}
                        title="Kapat"
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* Top Toolbar Overlay */}
            <div className="flex items-center justify-between border-b border-border/20 bg-[#0d1117]/80 px-3 py-1.5 text-[11px] backdrop-blur-sm">
                {/* Left: Host & Status */}
                <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-mono font-medium text-foreground">{host}</span>
                    <span className="text-border">/</span>
                    <div className="flex items-center gap-1">
                        {status === "connected" ? (
                            <span className="flex items-center gap-1 text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Canlı
                            </span>
                        ) : status === "reconnecting" ? (
                            <span className="flex items-center gap-1 text-amber-400">
                                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                                Yeniden bağlanıyor ({retryCount}/10)
                            </span>
                        ) : status === "exited" ? (
                            <span className="text-muted-foreground">Sonlandı</span>
                        ) : (
                            <span className="flex items-center gap-1 text-destructive">
                                <WifiOff className="h-2.5 w-2.5" />
                                Bağlantı kesik
                            </span>
                        )}
                    </div>
                    {latencyMs !== null && status === "connected" && (
                        <span className="text-[10px] text-muted-foreground/60">
                            {latencyMs}ms
                        </span>
                    )}
                </div>

                {/* Right: Quick actions */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsSearching((p) => !p)}
                        title="Metin Ara (Ctrl+F)"
                        className="rounded p-1 text-muted-foreground/70 hover:bg-white/10 hover:text-foreground transition-colors"
                    >
                        <Search className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={copyScrollback}
                        title="Tüm Çıktıyı Kopyala"
                        className="rounded p-1 text-muted-foreground/70 hover:bg-white/10 hover:text-foreground transition-colors"
                    >
                        <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={downloadLog}
                        title="Log Olarak İndir (.log)"
                        className="rounded p-1 text-muted-foreground/70 hover:bg-white/10 hover:text-foreground transition-colors"
                    >
                        <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={clearTerminal}
                        title="Ekranı Temizle"
                        className="rounded p-1 text-muted-foreground/70 hover:bg-white/10 hover:text-foreground transition-colors"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {status === "disconnected" && (
                        <button
                            onClick={reconnect}
                            title="Yeniden Bağlan"
                            className="rounded p-1 text-primary hover:bg-primary/20 transition-colors"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Terminal Container */}
            <div
                ref={containerRef}
                className="flex-1 w-full h-full p-2 overflow-hidden cursor-text"
            />
        </div>
    );
}
