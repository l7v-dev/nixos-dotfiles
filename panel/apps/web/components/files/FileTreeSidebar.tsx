"use client";

import React, { useState } from "react";
import {
    Home,
    FolderGit2,
    Settings,
    Boxes,
    FileText,
    HardDrive,
    Trash2,
    ChevronRight,
    ChevronDown,
    Folder,
    FolderOpen,
    Plus,
    X,
    Server,
    Bookmark,
    Database,
} from "lucide-react";
import { useFileStore } from "@/store/file-store";
import { fetchAgent } from "@/lib/agent-client";
import { useHostStore } from "@/store/host-store";
import type { DirectoryListResponse, FileSystemItem } from "@/types/files";

interface TreeNode {
    path: string;
    name: string;
    isOpen: boolean;
    isLoading: boolean;
    children?: TreeNode[];
}

export function FileTreeSidebar({ freeSpace }: { freeSpace?: number }) {
    const { currentPath, navigate, bookmarks, addBookmark, removeBookmark } = useFileStore();
    const selectedHost = useHostStore((s) => s.selectedHost);

    const [tree, setTree] = useState<Record<string, TreeNode>>({
        "/home": { path: "/home", name: "home", isOpen: false, isLoading: false },
        "/etc": { path: "/etc", name: "etc", isOpen: false, isLoading: false },
        "/var": { path: "/var", name: "var", isOpen: false, isLoading: false },
        "/nix": { path: "/nix", name: "nix", isOpen: false, isLoading: false },
    });

    const [isAddingBookmark, setIsAddingBookmark] = useState(false);
    const [bookmarkName, setBookmarkName] = useState("");
    const [bookmarkPath, setBookmarkPath] = useState(currentPath);

    const getBookmarkIcon = (icon?: string) => {
        switch (icon) {
            case "home":
                return <Home className="w-4 h-4 text-sky-400" />;
            case "folder-git":
                return <FolderGit2 className="w-4 h-4 text-emerald-400" />;
            case "settings":
                return <Settings className="w-4 h-4 text-indigo-400" />;
            case "boxes":
                return <Boxes className="w-4 h-4 text-cyan-400" />;
            case "file-text":
                return <FileText className="w-4 h-4 text-amber-400" />;
            case "hard-drive":
                return <HardDrive className="w-4 h-4 text-purple-400" />;
            case "trash-2":
                return <Trash2 className="w-4 h-4 text-rose-400" />;
            default:
                return <Bookmark className="w-4 h-4 text-emerald-400" />;
        }
    };

    const toggleTreeNode = async (path: string) => {
        const node = tree[path];
        if (!node) return;

        if (node.isOpen) {
            setTree((prev) => ({
                ...prev,
                [path]: { ...node, isOpen: false },
            }));
            return;
        }

        // Open and fetch children if not already loaded
        if (node.children) {
            setTree((prev) => ({
                ...prev,
                [path]: { ...node, isOpen: true },
            }));
            return;
        }

        setTree((prev) => ({
            ...prev,
            [path]: { ...node, isLoading: true, isOpen: true },
        }));

        try {
            const data = await fetchAgent<DirectoryListResponse>(
                selectedHost,
                `/api/v1/fs/list?path=${encodeURIComponent(path)}&show_hidden=false`
            );

            const subDirs: TreeNode[] = data.files
                .filter((f) => f.is_dir)
                .map((f) => ({
                    path: f.path,
                    name: f.name,
                    isOpen: false,
                    isLoading: false,
                }));

            setTree((prev) => ({
                ...prev,
                [path]: { ...node, isOpen: true, isLoading: false, children: subDirs },
            }));
        } catch {
            setTree((prev) => ({
                ...prev,
                [path]: { ...node, isOpen: true, isLoading: false, children: [] },
            }));
        }
    };

    const handleCreateBookmark = (e: React.FormEvent) => {
        e.preventDefault();
        if (bookmarkName.trim() && bookmarkPath.trim()) {
            addBookmark(bookmarkName.trim(), bookmarkPath.trim());
            setIsAddingBookmark(false);
            setBookmarkName("");
        }
    };

    const formatBytes = (bytes?: number) => {
        if (!bytes || bytes <= 0) return "—";
        const gib = bytes / (1024 * 1024 * 1024);
        return `${gib.toFixed(1)} GB boş`;
    };

    return (
        <aside className="w-64 shrink-0 flex flex-col gap-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 backdrop-blur-md overflow-hidden">
            {/* Host Banner */}
            <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-950/60 border border-zinc-800/60 rounded-lg">
                <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                        {selectedHost}
                    </span>
                </div>
                {freeSpace !== undefined && (
                    <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                        <Database className="w-3 h-3 text-cyan-400" />
                        <span>{formatBytes(freeSpace)}</span>
                    </div>
                )}
            </div>

            {/* Quick Access Bookmarks */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between px-2 mb-1">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Hızlı Erişim
                    </span>
                    <button
                        onClick={() => {
                            setBookmarkPath(currentPath);
                            setIsAddingBookmark(true);
                        }}
                        title="Kısayol Ekle"
                        className="p-1 text-zinc-500 hover:text-emerald-400 transition"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>

                {isAddingBookmark && (
                    <form
                        onSubmit={handleCreateBookmark}
                        className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-1.5 mb-2"
                    >
                        <input
                            type="text"
                            placeholder="Kısayol Adı"
                            value={bookmarkName}
                            onChange={(e) => setBookmarkName(e.target.value)}
                            className="bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs text-zinc-200 rounded outline-none"
                            autoFocus
                        />
                        <input
                            type="text"
                            placeholder="Dizin Yolu"
                            value={bookmarkPath}
                            onChange={(e) => setBookmarkPath(e.target.value)}
                            className="bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs text-zinc-200 font-mono rounded outline-none"
                        />
                        <div className="flex justify-end gap-1 mt-1">
                            <button
                                type="button"
                                onClick={() => setIsAddingBookmark(false)}
                                className="px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-200"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                className="px-2 py-0.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium"
                            >
                                Ekle
                            </button>
                        </div>
                    </form>
                )}

                <div className="flex flex-col gap-0.5 max-h-[220px] overflow-y-auto no-scrollbar">
                    {bookmarks.map((bm) => {
                        const isActive = currentPath === bm.path;
                        return (
                            <div
                                key={bm.id}
                                onClick={() => navigate(bm.path)}
                                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
                                    isActive
                                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                        : "text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100"
                                }`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    {getBookmarkIcon(bm.icon)}
                                    <span className="truncate">{bm.name}</span>
                                </div>
                                {bm.id.startsWith("bm-") && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeBookmark(bm.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 transition p-0.5"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tree Navigation */}
            <div className="flex-1 flex flex-col gap-1 overflow-hidden min-h-0">
                <div className="px-2 mb-1">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Dizin Ağacı
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-0.5 pr-1">
                    {Object.values(tree).map((node) => (
                        <div key={node.path} className="flex flex-col">
                            <div
                                onClick={() => {
                                    toggleTreeNode(node.path);
                                    navigate(node.path);
                                }}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer transition ${
                                    currentPath === node.path
                                        ? "bg-emerald-500/10 text-emerald-400 font-semibold"
                                        : "text-zinc-300 hover:bg-zinc-800/50"
                                }`}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleTreeNode(node.path);
                                    }}
                                    className="p-0.5 text-zinc-500 hover:text-zinc-300"
                                >
                                    {node.isOpen ? (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                </button>
                                {node.isOpen ? (
                                    <FolderOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                                ) : (
                                    <Folder className="w-4 h-4 text-zinc-400 shrink-0" />
                                )}
                                <span className="truncate">{node.name}</span>
                            </div>

                            {node.isOpen && node.children && (
                                <div className="ml-4 pl-1 border-l border-zinc-800 flex flex-col gap-0.5 my-0.5">
                                    {node.children.length === 0 ? (
                                        <span className="text-[11px] text-zinc-500 px-2 py-0.5 italic">
                                            Boş dizin
                                        </span>
                                    ) : (
                                        node.children.map((child) => (
                                            <div
                                                key={child.path}
                                                onClick={() => navigate(child.path)}
                                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer transition ${
                                                    currentPath === child.path
                                                        ? "bg-emerald-500/10 text-emerald-400 font-semibold"
                                                        : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                                                }`}
                                            >
                                                <Folder className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                <span className="truncate">{child.name}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );
}
