"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TerminalLayoutType = "single" | "split-vertical" | "split-horizontal" | "grid-2x2";

export interface TerminalPane {
    id: string;
    title: string;
    host: string;
    sessionId: string | null;
}

export const dispatchTerminalInput = (data: string, targetPaneId?: string) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
        new CustomEvent("l7v-terminal-input", {
            detail: { data, paneId: targetPaneId },
        })
    );
};

export interface TerminalTab {
    id: string;
    title: string;
    host: string;
    layout: TerminalLayoutType;
    panes: TerminalPane[];
    activePaneId: string;
}

export interface TerminalSettings {
    theme: string;
    fontSize: number;
    fontFamily: string;
    cursorStyle: "block" | "underline" | "bar";
    cursorBlink: boolean;
    bellStyle: "sound" | "visual" | "none";
    scrollback: number;
}

interface TerminalState {
    tabs: TerminalTab[];
    activeTabId: string;
    broadcastMode: boolean;
    quakeOpen: boolean;
    quakeHeight: number;
    settings: TerminalSettings;

    // Actions
    addTab: (host?: string, title?: string) => string;
    closeTab: (tabId: string) => void;
    setActiveTab: (tabId: string) => void;
    renameTab: (tabId: string, title: string) => void;

    splitPane: (direction: "horizontal" | "vertical") => void;
    closePane: (tabId: string, paneId: string) => void;
    setActivePane: (paneId: string) => void;
    setTabLayout: (tabId: string, layout: TerminalLayoutType) => void;
    setPaneSessionId: (paneId: string, sessionId: string) => void;

    setBroadcastMode: (enabled: boolean) => void;
    toggleBroadcastMode: () => void;

    setQuakeOpen: (open: boolean) => void;
    toggleQuake: () => void;
    setQuakeHeight: (height: number) => void;

    updateSettings: (settings: Partial<TerminalSettings>) => void;
}

const defaultSettings: TerminalSettings = {
    theme: "adaptive",
    fontSize: 14,
    fontFamily: "JetBrains Mono, Fira Code, Menlo, Monaco, 'Courier New', monospace",
    cursorStyle: "block",
    cursorBlink: true,
    bellStyle: "visual",
    scrollback: 10000,
};

const initialPaneId = "pane-init-1";
const initialTabId = "tab-init-1";

const initialTabs: TerminalTab[] = [
    {
        id: initialTabId,
        title: "Terminal 1",
        host: "laptop",
        layout: "single",
        panes: [
            {
                id: initialPaneId,
                title: "Terminal 1",
                host: "laptop",
                sessionId: null,
            },
        ],
        activePaneId: initialPaneId,
    },
];

export const useTerminalStore = create<TerminalState>()(
    persist(
        (set, get) => ({
            tabs: initialTabs,
            activeTabId: initialTabId,
            broadcastMode: false,
            quakeOpen: false,
            quakeHeight: 45,
            settings: defaultSettings,

            addTab: (host = "laptop", title) => {
                const state = get();
                const newTabNum = state.tabs.length + 1;
                const tabTitle = title || `Terminal ${newTabNum}`;
                const newTabId = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                const newPaneId = `pane-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

                const newTab: TerminalTab = {
                    id: newTabId,
                    title: tabTitle,
                    host,
                    layout: "single",
                    panes: [
                        {
                            id: newPaneId,
                            title: tabTitle,
                            host,
                            sessionId: null,
                        },
                    ],
                    activePaneId: newPaneId,
                };

                set({
                    tabs: [...state.tabs, newTab],
                    activeTabId: newTabId,
                });

                return newTabId;
            },

            closeTab: (tabId) => {
                const state = get();
                if (state.tabs.length <= 1) {
                    // Do not close last tab, just reset it
                    const newPaneId = `pane-${Date.now()}`;
                    set({
                        tabs: [
                            {
                                id: `tab-${Date.now()}`,
                                title: "Terminal 1",
                                host: "laptop",
                                layout: "single",
                                panes: [{ id: newPaneId, title: "Terminal 1", host: "laptop", sessionId: null }],
                                activePaneId: newPaneId,
                            },
                        ],
                        activeTabId: `tab-${Date.now()}`,
                    });
                    return;
                }

                const newTabs = state.tabs.filter((t) => t.id !== tabId);
                let nextActiveTabId = state.activeTabId;
                if (state.activeTabId === tabId) {
                    const idx = state.tabs.findIndex((t) => t.id === tabId);
                    nextActiveTabId = newTabs[Math.max(0, idx - 1)].id;
                }

                set({
                    tabs: newTabs,
                    activeTabId: nextActiveTabId,
                });
            },

            setActiveTab: (tabId) => set({ activeTabId: tabId }),

            renameTab: (tabId, title) => {
                const { tabs } = get();
                set({
                    tabs: tabs.map((t) => (t.id === tabId ? { ...t, title } : t)),
                });
            },

            splitPane: (direction) => {
                const { tabs, activeTabId } = get();
                const currentTab = tabs.find((t) => t.id === activeTabId);
                if (!currentTab) return;

                // Max 4 panes per tab
                if (currentTab.panes.length >= 4) return;

                const newPaneId = `pane-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                const newPane: TerminalPane = {
                    id: newPaneId,
                    title: `${currentTab.title} [${currentTab.panes.length + 1}]`,
                    host: currentTab.host,
                    sessionId: null,
                };

                let newLayout: TerminalLayoutType = direction === "horizontal" ? "split-horizontal" : "split-vertical";
                if (currentTab.panes.length === 2) {
                    newLayout = "grid-2x2";
                }

                const updatedTabs = tabs.map((t) => {
                    if (t.id === activeTabId) {
                        return {
                            ...t,
                            layout: newLayout,
                            panes: [...t.panes, newPane],
                            activePaneId: newPaneId,
                        };
                    }
                    return t;
                });

                set({ tabs: updatedTabs });
            },

            closePane: (tabId, paneId) => {
                const { tabs } = get();
                const tab = tabs.find((t) => t.id === tabId);
                if (!tab || tab.panes.length <= 1) return;

                const remainingPanes = tab.panes.filter((p) => p.id !== paneId);
                const newLayout: TerminalLayoutType = remainingPanes.length === 1 ? "single" : tab.layout;
                const nextActivePaneId = tab.activePaneId === paneId ? remainingPanes[0].id : tab.activePaneId;

                set({
                    tabs: tabs.map((t) =>
                        t.id === tabId
                            ? {
                                  ...t,
                                  layout: newLayout,
                                  panes: remainingPanes,
                                  activePaneId: nextActivePaneId,
                              }
                            : t
                    ),
                });
            },

            setActivePane: (paneId) => {
                const { tabs, activeTabId } = get();
                set({
                    tabs: tabs.map((t) =>
                        t.id === activeTabId
                            ? {
                                  ...t,
                                  activePaneId: paneId,
                              }
                            : t
                    ),
                });
            },

            setTabLayout: (tabId, layout) => {
                const { tabs } = get();
                set({
                    tabs: tabs.map((t) => (t.id === tabId ? { ...t, layout } : t)),
                });
            },

            setPaneSessionId: (paneId, sessionId) => {
                const { tabs } = get();
                set({
                    tabs: tabs.map((t) => ({
                        ...t,
                        panes: t.panes.map((p) => (p.id === paneId ? { ...p, sessionId } : p)),
                    })),
                });
            },

            setBroadcastMode: (enabled) => set({ broadcastMode: enabled }),
            toggleBroadcastMode: () => set((s) => ({ broadcastMode: !s.broadcastMode })),

            setQuakeOpen: (open) => set({ quakeOpen: open }),
            toggleQuake: () => set((s) => ({ quakeOpen: !s.quakeOpen })),
            setQuakeHeight: (height) => set({ quakeHeight: Math.min(90, Math.max(20, height)) }),

            updateSettings: (newSettings) =>
                set((s) => ({
                    settings: { ...s.settings, ...newSettings },
                })),
        }),
        {
            name: "l7v-panel-terminal",
            partialize: (state) => ({
                settings: state.settings,
                quakeHeight: state.quakeHeight,
            }),
        }
    )
);
