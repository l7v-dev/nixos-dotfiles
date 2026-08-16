"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
    FileViewMode,
    FileSortField,
    FileSortOrder,
    FileBookmark,
} from "@/types/files";

const DEFAULT_BOOKMARKS: FileBookmark[] = [
    { id: "home", name: "Ev Dizini (Home)", path: "/home/l7v", icon: "home" },
    { id: "projects", name: "Projeler", path: "/home/l7v/dev/projects", icon: "folder-git" },
    { id: "nixos", name: "NixOS Config", path: "/etc/nixos", icon: "settings" },
    { id: "nix-store", name: "Nix Store (RO)", path: "/nix/store", icon: "boxes" },
    { id: "logs", name: "Sistem Logları", path: "/var/log", icon: "file-text" },
    { id: "media", name: "Harici Diskler", path: "/run/media/l7v", icon: "hard-drive" },
    { id: "tmp", name: "Geçici Dizin (Tmp)", path: "/tmp", icon: "trash-2" },
];

interface FileState {
    currentPath: string;
    history: string[];
    historyIndex: number;
    selectedPaths: string[];
    clipboard: { mode: "copy" | "cut"; paths: string[] } | null;
    showHidden: boolean;
    viewMode: FileViewMode;
    sortField: FileSortField;
    sortOrder: FileSortOrder;
    bookmarks: FileBookmark[];

    // Navigation actions
    navigate: (path: string) => void;
    goBack: () => void;
    goForward: () => void;
    goUp: () => void;

    // Selection actions
    selectPath: (path: string, options?: { multi?: boolean; range?: boolean; allVisiblePaths?: string[] }) => void;
    selectAll: (allVisiblePaths: string[]) => void;
    clearSelection: () => void;

    // Clipboard actions
    copySelected: (paths?: string[]) => void;
    cutSelected: (paths?: string[]) => void;
    clearClipboard: () => void;

    // View toggles
    toggleHidden: () => void;
    setViewMode: (mode: FileViewMode) => void;
    setSorting: (field: FileSortField, order?: FileSortOrder) => void;
    addBookmark: (name: string, path: string) => void;
    removeBookmark: (id: string) => void;
}

export const useFileStore = create<FileState>()(
    persist(
        (set, get) => ({
            currentPath: "/home/l7v",
            history: ["/home/l7v"],
            historyIndex: 0,
            selectedPaths: [],
            clipboard: null,
            showHidden: false,
            viewMode: "grid",
            sortField: "name",
            sortOrder: "asc",
            bookmarks: DEFAULT_BOOKMARKS,

            navigate: (path: string) => {
                const { history, historyIndex, currentPath } = get();
                if (path === currentPath) return;

                // Truncate forward history and append new path
                const newHistory = history.slice(0, historyIndex + 1);
                newHistory.push(path);

                set({
                    currentPath: path,
                    history: newHistory,
                    historyIndex: newHistory.length - 1,
                    selectedPaths: [],
                });
            },

            goBack: () => {
                const { history, historyIndex } = get();
                if (historyIndex > 0) {
                    const newIndex = historyIndex - 1;
                    set({
                        historyIndex: newIndex,
                        currentPath: history[newIndex],
                        selectedPaths: [],
                    });
                }
            },

            goForward: () => {
                const { history, historyIndex } = get();
                if (historyIndex < history.length - 1) {
                    const newIndex = historyIndex + 1;
                    set({
                        historyIndex: newIndex,
                        currentPath: history[newIndex],
                        selectedPaths: [],
                    });
                }
            },

            goUp: () => {
                const { currentPath, navigate } = get();
                if (currentPath === "/" || currentPath === "") return;
                const segments = currentPath.split("/").filter(Boolean);
                segments.pop();
                const parent = "/" + segments.join("/");
                navigate(parent === "" ? "/" : parent);
            },

            selectPath: (path: string, options) => {
                const { selectedPaths } = get();
                if (!options?.multi && !options?.range) {
                    set({ selectedPaths: [path] });
                    return;
                }

                if (options.multi) {
                    if (selectedPaths.includes(path)) {
                        set({ selectedPaths: selectedPaths.filter((p) => p !== path) });
                    } else {
                        set({ selectedPaths: [...selectedPaths, path] });
                    }
                    return;
                }

                if (options.range && options.allVisiblePaths) {
                    const all = options.allVisiblePaths;
                    const lastSelected = selectedPaths[selectedPaths.length - 1] || path;
                    const startIdx = all.indexOf(lastSelected);
                    const endIdx = all.indexOf(path);

                    if (startIdx !== -1 && endIdx !== -1) {
                        const [min, max] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
                        const rangePaths = all.slice(min, max + 1);
                        set({ selectedPaths: Array.from(new Set([...selectedPaths, ...rangePaths])) });
                    }
                }
            },

            selectAll: (allVisiblePaths: string[]) => {
                set({ selectedPaths: allVisiblePaths });
            },

            clearSelection: () => {
                set({ selectedPaths: [] });
            },

            copySelected: (paths) => {
                const target = paths || get().selectedPaths;
                if (target.length > 0) {
                    set({ clipboard: { mode: "copy", paths: target } });
                }
            },

            cutSelected: (paths) => {
                const target = paths || get().selectedPaths;
                if (target.length > 0) {
                    set({ clipboard: { mode: "cut", paths: target } });
                }
            },

            clearClipboard: () => {
                set({ clipboard: null });
            },

            toggleHidden: () => {
                set((s) => ({ showHidden: !s.showHidden }));
            },

            setViewMode: (viewMode) => {
                set({ viewMode });
            },

            setSorting: (field, order) => {
                const { sortField, sortOrder } = get();
                if (!order) {
                    if (sortField === field) {
                        order = sortOrder === "asc" ? "desc" : "asc";
                    } else {
                        order = "asc";
                    }
                }
                set({ sortField: field, sortOrder: order });
            },

            addBookmark: (name, path) => {
                const id = "bm-" + Date.now();
                set((s) => ({
                    bookmarks: [...s.bookmarks, { id, name, path, icon: "bookmark" }],
                }));
            },

            removeBookmark: (id) => {
                set((s) => ({
                    bookmarks: s.bookmarks.filter((b) => b.id !== id),
                }));
            },
        }),
        {
            name: "l7v-file-explorer-store",
            partialize: (s) => ({
                viewMode: s.viewMode,
                showHidden: s.showHidden,
                sortField: s.sortField,
                sortOrder: s.sortOrder,
                bookmarks: s.bookmarks,
            }),
        }
    )
);
