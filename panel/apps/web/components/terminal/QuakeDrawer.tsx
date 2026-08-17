"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTerminalStore, dispatchTerminalInput, type TerminalTab } from "@/store/terminal-store";
import { SplitPaneLayout } from "@/components/terminal/SplitPaneLayout";
import { TerminalTabs } from "@/components/terminal/TerminalTabs";
import { BroadcastBar } from "@/components/terminal/BroadcastBar";
import { TerminalSettingsModal } from "@/components/terminal/TerminalSettingsModal";
import { SnippetPalette } from "@/components/terminal/SnippetPalette";
import {
    Minus,
    X,
    GripHorizontal,
    ExternalLink,
    Terminal as TerminalIcon,
} from "lucide-react";

export function QuakeDrawer() {
    const router = useRouter();
    const pathname = usePathname();
    const {
        quakeOpen,
        setQuakeOpen,
        toggleQuake,
        quakeHeight,
        setQuakeHeight,
    } = useTerminalStore();

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [snippetsOpen, setSnippetsOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const startYRef = useRef<number>(0);
    const startHeightRef = useRef<number>(quakeHeight);

    // Global keyboard shortcut listener (Ctrl+` or Cmd+`)
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "`") {
                e.preventDefault();
                toggleQuake();
            }
        };

        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, [toggleQuake]);

    // Handle mouse drag resizing
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const deltaY = e.clientY - startYRef.current;
            const windowHeight = window.innerHeight;
            const deltaPercent = (deltaY / windowHeight) * 100;
            const newHeight = Math.min(90, Math.max(20, startHeightRef.current + deltaPercent));
            setQuakeHeight(newHeight);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, setQuakeHeight]);

    // Don't render floating drawer on /terminal page itself to avoid duplication
    if (pathname === "/terminal" || !quakeOpen) {
        return null;
    }

    const quakeTab: TerminalTab = {
        id: "tab-quake",
        title: "Quake Terminal",
        host: "laptop",
        layout: "single",
        panes: [
            {
                id: "quake-pane-1",
                title: "Quake",
                host: "laptop",
                sessionId: null,
            },
        ],
        activePaneId: "quake-pane-1",
    };

    const handleRunSnippet = (command: string, autoRun: boolean) => {
        const data = autoRun ? `${command}\n` : command;
        dispatchTerminalInput(data, "quake-pane-1");
    };

    const handleBroadcast = (data: string) => {
        dispatchTerminalInput(data, "quake-pane-1");
    };

    return (
        <>
            {/* Backdrop for closing Quake drawer by clicking outside */}
            <div
                onClick={() => setQuakeOpen(false)}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
            />

            {/* Quake Dropdown Container */}
            <div
                style={{ height: `${quakeHeight}vh` }}
                className="fixed top-0 left-0 right-0 z-50 flex flex-col border-b border-border bg-card shadow-2xl transition-all duration-150 ease-out font-sans"
            >
                {/* Top Mini Header */}
                <div className="flex h-7 shrink-0 items-center justify-between border-b border-border bg-muted/40 px-3 text-xs">
                    <div className="flex items-center gap-2">
                        <TerminalIcon className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                        <span className="font-semibold text-foreground">
                            Quake Dropdown Terminal
                        </span>
                        <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                            Ctrl + `
                        </span>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => {
                                setQuakeOpen(false);
                                router.push("/terminal");
                            }}
                            title="Fullscreen (/terminal)"
                            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                            <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                            <span className="hidden sm:inline">Fullscreen</span>
                        </button>
                        <button
                            onClick={() => toggleQuake()}
                            title="Minimize (Ctrl+`)"
                            className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                            <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={() => setQuakeOpen(false)}
                            title="Close"
                            className="rounded-full p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
                        >
                            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                {/* Tabs & Toolbar */}
                <TerminalTabs
                    onOpenSettings={() => setSettingsOpen(true)}
                    onToggleSnippets={() => setSnippetsOpen((p) => !p)}
                    snippetsOpen={snippetsOpen}
                />

                <BroadcastBar />

                {/* Workspace Body */}
                <div className="relative flex flex-1 min-h-0 min-w-0 overflow-hidden bg-background">
                    <div className="flex-1 min-h-0 min-w-0 p-1.5">
                        <SplitPaneLayout
                            tab={quakeTab}
                            onBroadcastInput={handleBroadcast}
                        />
                    </div>

                    {snippetsOpen && (
                        <SnippetPalette
                            onRunSnippet={handleRunSnippet}
                            onClose={() => setSnippetsOpen(false)}
                        />
                    )}
                </div>

                {/* Drag Handle at bottom of drawer */}
                <div
                    onMouseDown={(e) => {
                        setIsDragging(true);
                        startYRef.current = e.clientY;
                        startHeightRef.current = quakeHeight;
                    }}
                    className="flex h-2.5 w-full cursor-row-resize items-center justify-center bg-muted/60 hover:bg-primary/30 transition-colors select-none"
                    title="Drag to resize"
                >
                    <GripHorizontal className="h-3 w-3 text-muted-foreground/50" />
                </div>
            </div>

            {/* Settings Modal */}
            <TerminalSettingsModal
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
            />
        </>
    );
}
