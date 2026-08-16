"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    ChevronRight,
    ChevronLeft,
    ArrowUp,
    RotateCw,
    FolderPlus,
    FilePlus,
    Upload,
    Terminal,
    Search,
    Eye,
    EyeOff,
    LayoutGrid,
    Table as TableIcon,
    GitBranch,
    Copy,
    Check,
} from "lucide-react";
import { useFileStore } from "@/store/file-store";
import { useTerminalStore, dispatchTerminalInput } from "@/store/terminal-store";
import { useHostStore } from "@/store/host-store";
import { useRouter } from "next/navigation";
import type { GitInfo } from "@/types/files";

interface FileBreadcrumbsProps {
    git?: GitInfo;
    onNewFile: () => void;
    onNewFolder: () => void;
    onUpload: () => void;
    onToggleSearch: () => void;
    isSearching: boolean;
    onRefresh: () => void;
    isRefreshing: boolean;
}

export function FileBreadcrumbs({
    git,
    onNewFile,
    onNewFolder,
    onUpload,
    onToggleSearch,
    isSearching,
    onRefresh,
    isRefreshing,
}: FileBreadcrumbsProps) {
    const {
        currentPath,
        history,
        historyIndex,
        navigate,
        goBack,
        goForward,
        goUp,
        showHidden,
        toggleHidden,
        viewMode,
        setViewMode,
    } = useFileStore();

    const selectedHost = useHostStore((s) => s.selectedHost);
    const { addTab } = useTerminalStore();
    const router = useRouter();

    const [isEditing, setIsEditing] = useState(false);
    const [pathInput, setPathInput] = useState(currentPath);
    const [copied, setCopied] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setPathInput(currentPath);
    }, [currentPath]);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const handlePathSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pathInput.trim()) {
            navigate(pathInput.trim());
            setIsEditing(false);
        }
    };

    const handleCopyPath = () => {
        navigator.clipboard.writeText(currentPath);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleOpenTerminal = () => {
        addTab(selectedHost, `shell: ${currentPath.split("/").pop() || "root"}`);
        setTimeout(() => {
            dispatchTerminalInput(`cd ${currentPath}\n`);
        }, 300);
        router.push("/terminal");
    };

    // Segments for breadcrumbs
    const segments = currentPath.split("/").filter(Boolean);

    return (
        <div className="flex flex-col gap-2 p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl backdrop-blur-md">
            {/* Top Toolbar Row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                {/* Navigation History & Path Bar */}
                <div className="flex items-center gap-1.5 flex-1 min-w-[280px]">
                    <button
                        onClick={goBack}
                        disabled={historyIndex <= 0}
                        title="Geri"
                        className="p-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 disabled:opacity-30 disabled:hover:bg-zinc-800/50 text-zinc-300 transition"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={goForward}
                        disabled={historyIndex >= history.length - 1}
                        title="İleri"
                        className="p-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 disabled:opacity-30 disabled:hover:bg-zinc-800/50 text-zinc-300 transition"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={goUp}
                        disabled={currentPath === "/" || currentPath === ""}
                        title="Üst Dizine Çık"
                        className="p-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 disabled:opacity-30 disabled:hover:bg-zinc-800/50 text-zinc-300 transition"
                    >
                        <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onRefresh}
                        title="Yenile"
                        className={`p-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 transition ${
                            isRefreshing ? "animate-spin text-emerald-400" : ""
                        }`}
                    >
                        <RotateCw className="w-4 h-4" />
                    </button>

                    {/* Breadcrumbs / Path Input */}
                    <div className="flex-1 ml-1 bg-zinc-950/80 border border-zinc-800 rounded-lg px-2.5 py-1 flex items-center min-w-[180px] overflow-hidden">
                        {isEditing ? (
                            <form onSubmit={handlePathSubmit} className="flex-1 flex items-center">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={pathInput}
                                    onChange={(e) => setPathInput(e.target.value)}
                                    onBlur={() => setIsEditing(false)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") {
                                            setPathInput(currentPath);
                                            setIsEditing(false);
                                        }
                                    }}
                                    className="w-full bg-transparent text-sm text-zinc-100 outline-none font-mono"
                                />
                            </form>
                        ) : (
                            <div
                                onClick={() => setIsEditing(true)}
                                className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar cursor-text py-0.5"
                                title="Yolu düzenlemek için tıklayın (Ctrl+L)"
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate("/");
                                    }}
                                    className="text-xs font-semibold text-zinc-400 hover:text-emerald-400 transition shrink-0"
                                >
                                    /
                                </button>
                                {segments.map((seg, idx) => {
                                    const segPath = "/" + segments.slice(0, idx + 1).join("/");
                                    const isLast = idx === segments.length - 1;
                                    return (
                                        <React.Fragment key={segPath}>
                                            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(segPath);
                                                }}
                                                className={`text-xs font-medium shrink-0 hover:text-emerald-400 transition truncate max-w-[160px] ${
                                                    isLast ? "text-emerald-400 font-semibold" : "text-zinc-300"
                                                }`}
                                            >
                                                {seg}
                                            </button>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        )}

                        <button
                            onClick={handleCopyPath}
                            title="Yolu Kopyala"
                            className="p-1 text-zinc-500 hover:text-zinc-200 transition shrink-0 ml-1"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>

                {/* Right Action Tools */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Git Badge if Repo */}
                    {git?.is_repo && (
                        <div
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                                git.is_dirty
                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            }`}
                            title={git.is_dirty ? `${git.modified_count} değiştirilmiş dosya` : "Temiz çalışma ağacı"}
                        >
                            <GitBranch className="w-3.5 h-3.5" />
                            <span>{git.branch || git.commit || "git"}</span>
                            {git.is_dirty && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            )}
                        </div>
                    )}

                    {/* New File */}
                    <button
                        onClick={onNewFile}
                        title="Yeni Dosya"
                        className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 transition"
                    >
                        <FilePlus className="w-4 h-4" />
                    </button>

                    {/* New Folder */}
                    <button
                        onClick={onNewFolder}
                        title="Yeni Klasör"
                        className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 transition"
                    >
                        <FolderPlus className="w-4 h-4" />
                    </button>

                    {/* Upload */}
                    <button
                        onClick={onUpload}
                        title="Dosya Yükle"
                        className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 transition"
                    >
                        <Upload className="w-4 h-4" />
                    </button>

                    {/* Search */}
                    <button
                        onClick={onToggleSearch}
                        title="Dizinde Ara"
                        className={`p-1.5 rounded-lg transition ${
                            isSearching
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300"
                        }`}
                    >
                        <Search className="w-4 h-4" />
                    </button>

                    {/* Hidden files toggle */}
                    <button
                        onClick={toggleHidden}
                        title={showHidden ? "Gizli Dosyaları Gizle (Ctrl+H)" : "Gizli Dosyaları Göster (Ctrl+H)"}
                        className={`p-1.5 rounded-lg transition ${
                            showHidden
                                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                : "bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300"
                        }`}
                    >
                        {showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    {/* View mode toggle */}
                    <div className="flex items-center bg-zinc-950/80 p-0.5 rounded-lg border border-zinc-800">
                        <button
                            onClick={() => setViewMode("grid")}
                            title="Grid Görünümü"
                            className={`p-1 rounded ${
                                viewMode === "grid"
                                    ? "bg-zinc-800 text-emerald-400"
                                    : "text-zinc-400 hover:text-zinc-200"
                            }`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setViewMode("table")}
                            title="Tablo Görünümü"
                            className={`p-1 rounded ${
                                viewMode === "table"
                                    ? "bg-zinc-800 text-emerald-400"
                                    : "text-zinc-400 hover:text-zinc-200"
                            }`}
                        >
                            <TableIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Open Terminal */}
                    <button
                        onClick={handleOpenTerminal}
                        title="Bu Dizinde Terminal Aç"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-semibold transition"
                    >
                        <Terminal className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Terminal</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
