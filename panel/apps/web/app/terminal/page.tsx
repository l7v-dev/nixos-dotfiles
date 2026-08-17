"use client";

import { useState } from "react";
import { useTerminalStore, dispatchTerminalInput } from "@/store/terminal-store";
import { SplitPaneLayout } from "@/components/terminal/SplitPaneLayout";
import { TerminalTabs } from "@/components/terminal/TerminalTabs";
import { BroadcastBar } from "@/components/terminal/BroadcastBar";
import { SnippetPalette } from "@/components/terminal/SnippetPalette";
import { TerminalSettingsModal } from "@/components/terminal/TerminalSettingsModal";
import { MobileVirtualKeyboard } from "@/components/terminal/MobileVirtualKeyboard";

export default function TerminalPage() {
    const tabs = useTerminalStore((s) => s.tabs);
    const activeTabId = useTerminalStore((s) => s.activeTabId);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [snippetsOpen, setSnippetsOpen] = useState(false);

    const currentTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

    const handleRunSnippet = (command: string, autoRun: boolean) => {
        const data = autoRun ? `${command}\n` : command;
        dispatchTerminalInput(data, currentTab?.activePaneId);
    };

    const handleSendVirtualKey = (keyData: string) => {
        dispatchTerminalInput(keyData, currentTab?.activePaneId);
    };

    const handleBroadcast = (data: string) => {
        if (!currentTab) return;
        currentTab.panes.forEach((p) => {
            if (p.id !== currentTab.activePaneId) {
                dispatchTerminalInput(data, p.id);
            }
        });
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-card rounded-2xl border border-border/80 shadow-xs font-sans">
            {/* Tabs Header */}
            <TerminalTabs
                onOpenSettings={() => setSettingsOpen(true)}
                onToggleSnippets={() => setSnippetsOpen((p) => !p)}
                snippetsOpen={snippetsOpen}
            />

            {/* Broadcast Mode Status Bar */}
            <BroadcastBar />

            {/* Main Terminal Workspace */}
            <div className="relative flex flex-1 min-h-0 min-w-0 overflow-hidden bg-background">
                <div className="flex-1 min-h-0 min-w-0 p-2">
                    {currentTab ? (
                        <SplitPaneLayout tab={currentTab} onBroadcastInput={handleBroadcast} />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm font-mono">
                            No active terminal tab.
                        </div>
                    )}
                </div>

                {/* NixOS Snippet Palette Drawer */}
                {snippetsOpen && (
                    <SnippetPalette
                        onRunSnippet={handleRunSnippet}
                        onClose={() => setSnippetsOpen(false)}
                    />
                )}
            </div>

            {/* Mobile Touch Virtual Keyboard */}
            <MobileVirtualKeyboard onSendKey={handleSendVirtualKey} />

            {/* Terminal Settings Modal */}
            <TerminalSettingsModal
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
            />
        </div>
    );
}
