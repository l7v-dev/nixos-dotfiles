"use client";

import { useState } from "react";
import { useTerminalStore, TerminalTab } from "@/store/terminal-store";
import {
    Plus,
    X,
    Terminal,
    Columns2,
    Rows2,
    LayoutGrid,
    Radio,
    Settings,
    Sparkles,
    Edit2,
    Check,
} from "lucide-react";

interface TerminalTabsProps {
    onOpenSettings: () => void;
    onToggleSnippets: () => void;
    snippetsOpen: boolean;
}

export function TerminalTabs({
    onOpenSettings,
    onToggleSnippets,
    snippetsOpen,
}: TerminalTabsProps) {
    const tabs = useTerminalStore((s) => s.tabs);
    const activeTabId = useTerminalStore((s) => s.activeTabId);
    const addTab = useTerminalStore((s) => s.addTab);
    const closeTab = useTerminalStore((s) => s.closeTab);
    const setActiveTab = useTerminalStore((s) => s.setActiveTab);
    const renameTab = useTerminalStore((s) => s.renameTab);
    const splitPane = useTerminalStore((s) => s.splitPane);
    const broadcastMode = useTerminalStore((s) => s.broadcastMode);
    const toggleBroadcastMode = useTerminalStore((s) => s.toggleBroadcastMode);

    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState<string>("");

    const currentTab = tabs.find((t) => t.id === activeTabId);

    const startRename = (tab: TerminalTab) => {
        setEditingTabId(tab.id);
        setEditTitle(tab.title);
    };

    const saveRename = (tabId: string) => {
        if (editTitle.trim()) {
            renameTab(tabId, editTitle.trim());
        }
        setEditingTabId(null);
    };

    return (
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-card/80 px-2 backdrop-blur-md">
            {/* Left: Tabs List */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[60%]">
                {tabs.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    const isEditing = editingTabId === tab.id;

                    return (
                        <div
                            key={tab.id}
                            onClick={() => !isEditing && setActiveTab(tab.id)}
                            onDoubleClick={() => startRename(tab)}
                            className={`group relative flex h-7 items-center gap-2 rounded-t-md px-3 text-xs transition-all cursor-pointer select-none ${
                                isActive
                                    ? "bg-[#0d1117] text-foreground border-t-2 border-primary shadow-sm"
                                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                            <Terminal className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground/60"}`} />

                            {isEditing ? (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") saveRename(tab.id);
                                            if (e.key === "Escape") setEditingTabId(null);
                                        }}
                                        autoFocus
                                        className="h-5 w-24 rounded bg-background px-1 text-xs text-foreground outline-none ring-1 ring-primary"
                                    />
                                    <button
                                        onClick={() => saveRename(tab.id)}
                                        className="rounded p-0.5 text-primary hover:bg-primary/20"
                                    >
                                        <Check className="h-3 w-3" />
                                    </button>
                                </div>
                            ) : (
                                <span className="max-w-[120px] truncate font-medium">
                                    {tab.title}
                                </span>
                            )}

                            {/* Pane count badge if split */}
                            {tab.panes.length > 1 && (
                                <span className="rounded bg-primary/20 px-1 py-0.2 text-[10px] font-semibold text-primary">
                                    {tab.panes.length}
                                </span>
                            )}

                            {/* Close button */}
                            {tabs.length > 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeTab(tab.id);
                                    }}
                                    title="Sekmeyi Kapat"
                                    className="ml-1 rounded p-0.5 text-muted-foreground/40 opacity-0 transition-opacity hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* Add Tab Button */}
                <button
                    onClick={() => addTab()}
                    title="Yeni Terminal Sekmesi Aç"
                    className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                    <Plus className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Right: Split, Broadcast, Snippet & Settings Tools */}
            <div className="flex items-center gap-1.5 text-muted-foreground">
                {/* Split Panes Actions */}
                <div className="flex items-center rounded-md border border-border/60 bg-background/50 p-0.5">
                    <button
                        onClick={() => splitPane("vertical")}
                        title="Dikey Böl (Side-by-side)"
                        className="rounded p-1 hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <Columns2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => splitPane("horizontal")}
                        title="Yatay Böl (Stacked)"
                        className="rounded p-1 hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <Rows2 className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Broadcast Toggle */}
                <button
                    onClick={toggleBroadcastMode}
                    title={
                        broadcastMode
                            ? "Broadcast Modunu Kapat"
                            : "Broadcast Modunu Aç (Tüm bölmelere aynı komutu gönder)"
                    }
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                        broadcastMode
                            ? "bg-amber-500 text-black shadow-sm font-semibold"
                            : "border border-border/60 hover:bg-accent hover:text-foreground"
                    }`}
                >
                    <Radio className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Broadcast</span>
                </button>

                {/* Snippets Palette Toggle */}
                <button
                    onClick={onToggleSnippets}
                    title="NixOS Komut Paleti"
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                        snippetsOpen
                            ? "bg-primary/20 text-primary border border-primary/40"
                            : "border border-border/60 hover:bg-accent hover:text-foreground"
                    }`}
                >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Komutlar</span>
                </button>

                {/* Settings Modal Button */}
                <button
                    onClick={onOpenSettings}
                    title="Terminal Ayarları"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                    <Settings className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}
