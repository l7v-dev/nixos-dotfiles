"use client";

import React from "react";
import { Link2, ArrowRight } from "lucide-react";
import { useFileStore } from "@/store/file-store";
import { getFileIcon, formatFileSize } from "./file-icons";
import type { FileSystemItem } from "@/types/files";

interface FileGridProps {
    files: FileSystemItem[];
    onOpen: (item: FileSystemItem) => void;
    onContextMenu: (e: React.MouseEvent, item?: FileSystemItem) => void;
}

export function FileGrid({ files, onOpen, onContextMenu }: FileGridProps) {
    const { selectedPaths, selectPath, clipboard } = useFileStore();

    const allPaths = files.map((f) => f.path);

    const handleClick = (e: React.MouseEvent, item: FileSystemItem) => {
        e.stopPropagation();
        if (e.shiftKey) {
            selectPath(item.path, { range: true, allVisiblePaths: allPaths });
        } else if (e.ctrlKey || e.metaKey) {
            selectPath(item.path, { multi: true });
        } else {
            selectPath(item.path);
        }
    };

    const handleDoubleClick = (e: React.MouseEvent, item: FileSystemItem) => {
        e.stopPropagation();
        onOpen(item);
    };

    const handleItemContextMenu = (e: React.MouseEvent, item: FileSystemItem) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selectedPaths.includes(item.path)) {
            selectPath(item.path);
        }
        onContextMenu(e, item);
    };

    if (files.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-zinc-500">
                <p className="text-sm">Bu dizin boş</p>
                <p className="text-xs text-zinc-600 mt-1">Dosya yüklemek için buraya sürükleyin veya araç çubuğundan ekleyin</p>
            </div>
        );
    }

    return (
        <div
            onContextMenu={(e) => onContextMenu(e)}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 p-1 select-none"
        >
            {files.map((item) => {
                const isSelected = selectedPaths.includes(item.path);
                const isCut = clipboard?.mode === "cut" && clipboard.paths.includes(item.path);

                return (
                    <div
                        key={item.path}
                        onClick={(e) => handleClick(e, item)}
                        onDoubleClick={(e) => handleDoubleClick(e, item)}
                        onContextMenu={(e) => handleItemContextMenu(e, item)}
                        className={`group relative flex flex-col items-center p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                                ? "bg-emerald-500/15 border-emerald-500/40 shadow-lg shadow-emerald-950/20"
                                : "bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/50 hover:border-zinc-700/80"
                        } ${isCut ? "opacity-40" : ""}`}
                    >
                        {/* Checkbox indicator on hover/select */}
                        <div
                            className={`absolute top-2 left-2 w-4 h-4 rounded border flex items-center justify-center transition ${
                                isSelected
                                    ? "bg-emerald-500 border-emerald-400 text-black"
                                    : "opacity-0 group-hover:opacity-100 border-zinc-700 bg-zinc-950/80"
                            }`}
                        >
                            {isSelected && <span className="text-[10px] font-bold">✓</span>}
                        </div>

                        {/* Symlink badge */}
                        {item.is_symlink && (
                            <div
                                className="absolute top-2 right-2 p-0.5 rounded bg-zinc-950/80 text-cyan-400 border border-cyan-500/30"
                                title={`Symlink -> ${item.symlink_target || "bilinmiyor"}`}
                            >
                                <Link2 className="w-3 h-3" />
                            </div>
                        )}

                        {/* Icon */}
                        <div className="my-2 flex items-center justify-center h-12 w-12">
                            {getFileIcon(item, "lg")}
                        </div>

                        {/* Name */}
                        <span
                            className="w-full text-center text-xs font-medium text-zinc-200 truncate mt-1 group-hover:text-emerald-400 transition"
                            title={item.name}
                        >
                            {item.name}
                        </span>

                        {/* Meta (Size / Mod Time) */}
                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            {item.is_dir ? "Dizin" : formatFileSize(item.size)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
