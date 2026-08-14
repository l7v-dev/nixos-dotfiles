import { describe, it, expect, beforeEach } from "vitest";
import { useTerminalStore } from "../terminal-store";

describe("useTerminalStore", () => {
    beforeEach(() => {
        // Reset state before each test
        const state = useTerminalStore.getState();
        state.updateSettings({ theme: "nixos", fontSize: 14 });
    });

    it("should add a new tab and make it active", () => {
        const store = useTerminalStore.getState();
        const initialCount = store.tabs.length;
        const newTabId = store.addTab("server", "Build Server");

        const updated = useTerminalStore.getState();
        expect(updated.tabs.length).toBe(initialCount + 1);
        expect(updated.activeTabId).toBe(newTabId);

        const newTab = updated.tabs.find((t) => t.id === newTabId);
        expect(newTab).toBeDefined();
        expect(newTab?.title).toBe("Build Server");
        expect(newTab?.host).toBe("server");
        expect(newTab?.panes.length).toBe(1);
    });

    it("should split pane vertically and switch layout", () => {
        const store = useTerminalStore.getState();
        const activeTab = store.tabs.find((t) => t.id === store.activeTabId);
        expect(activeTab).toBeDefined();

        store.splitPane("vertical");
        const updated = useTerminalStore.getState();
        const tabAfter = updated.tabs.find((t) => t.id === store.activeTabId);

        expect(tabAfter?.panes.length).toBe(2);
        expect(tabAfter?.layout).toBe("split-vertical");
    });

    it("should toggle broadcast mode", () => {
        const store = useTerminalStore.getState();
        expect(store.broadcastMode).toBe(false);

        store.toggleBroadcastMode();
        expect(useTerminalStore.getState().broadcastMode).toBe(true);

        store.toggleBroadcastMode();
        expect(useTerminalStore.getState().broadcastMode).toBe(false);
    });

    it("should toggle quake drawer", () => {
        const store = useTerminalStore.getState();
        expect(store.quakeOpen).toBe(false);

        store.toggleQuake();
        expect(useTerminalStore.getState().quakeOpen).toBe(true);

        store.toggleQuake();
        expect(useTerminalStore.getState().quakeOpen).toBe(false);
    });

    it("should update settings", () => {
        const store = useTerminalStore.getState();
        store.updateSettings({
            theme: "catppuccin",
            fontSize: 16,
            cursorStyle: "bar",
        });

        const updated = useTerminalStore.getState();
        expect(updated.settings.theme).toBe("catppuccin");
        expect(updated.settings.fontSize).toBe(16);
        expect(updated.settings.cursorStyle).toBe("bar");
    });
});
