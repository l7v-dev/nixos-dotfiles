"use client";

import dynamic from "next/dynamic";
import { useTerminalStore, TerminalTab, TerminalPane } from "@/store/terminal-store";
import { X, Maximize2 } from "lucide-react";

const XTermView = dynamic(
    () => import("@/components/terminal/XTermView").then((mod) => mod.XTermView),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-full w-full items-center justify-center bg-background text-xs text-muted-foreground font-mono">
                <span className="h-2 w-2 rounded-full bg-primary animate-ping mr-2" />
                Loading terminal…
            </div>
        ),
    }
);

interface SplitPaneLayoutProps {
    tab: TerminalTab;
    onBroadcastInput?: (data: string) => void;
}

export function SplitPaneLayout({ tab, onBroadcastInput }: SplitPaneLayoutProps) {
    const setActivePane = useTerminalStore((s) => s.setActivePane);
    const closePane = useTerminalStore((s) => s.closePane);
    const setTabLayout = useTerminalStore((s) => s.setTabLayout);

    const renderPane = (pane: TerminalPane, totalPanes: number) => {
        const isActive = tab.activePaneId === pane.id;

        return (
            <div
                key={pane.id}
                className="relative flex h-full w-full flex-col min-h-0 min-w-0 bg-background"
            >
                {/* Pane Mini Header if multi-pane */}
                {totalPanes > 1 && (
                    <div className="flex h-7 shrink-0 items-center justify-between border-b border-border/40 bg-muted/40 px-3 text-xs">
                        <div className="flex items-center gap-2">
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                    isActive ? "bg-primary" : "bg-muted-foreground/40"
                                }`}
                            />
                            <span
                                className={`font-mono text-[11px] truncate ${
                                    isActive ? "font-semibold text-foreground" : "text-muted-foreground"
                                }`}
                            >
                                {pane.title} ({pane.host})
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setTabLayout(tab.id, "single")}
                                title="Maximize this pane"
                                className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            >
                                <Maximize2 className="h-3 w-3" strokeWidth={1.5} />
                            </button>
                            <button
                                onClick={() => closePane(tab.id, pane.id)}
                                title="Close pane"
                                className="rounded p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
                            >
                                <X className="h-3 w-3" strokeWidth={1.5} />
                            </button>
                        </div>
                    </div>
                )}

                {/* XTerm Body */}
                <div className="flex-1 min-h-0 min-w-0">
                    <XTermView
                        paneId={pane.id}
                        host={pane.host}
                        sessionId={pane.sessionId}
                        isActive={isActive}
                        onFocus={() => setActivePane(pane.id)}
                        onBroadcastInput={onBroadcastInput}
                    />
                </div>
            </div>
        );
    };

    const panes = tab.panes;

    if (panes.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm font-sans">
                No active terminal panes.
            </div>
        );
    }

    if (panes.length === 1 || tab.layout === "single") {
        return renderPane(panes[0], 1);
    }

    if (tab.layout === "split-vertical" || panes.length === 2) {
        return (
            <div className="grid h-full w-full grid-cols-2 gap-1 bg-border/40 min-h-0 min-w-0">
                {panes.slice(0, 2).map((p) => renderPane(p, panes.length))}
            </div>
        );
    }

    if (tab.layout === "split-horizontal") {
        return (
            <div className="grid h-full w-full grid-rows-2 gap-1 bg-border/40 min-h-0 min-w-0">
                {panes.slice(0, 2).map((p) => renderPane(p, panes.length))}
            </div>
        );
    }

    if (tab.layout === "grid-2x2" || panes.length >= 3) {
        return (
            <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-1 bg-border/40 min-h-0 min-w-0">
                {panes.slice(0, 4).map((p) => renderPane(p, panes.length))}
            </div>
        );
    }

    return renderPane(panes[0], 1);
}
