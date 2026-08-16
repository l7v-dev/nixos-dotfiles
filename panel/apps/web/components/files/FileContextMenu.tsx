"use client";

import React, { useEffect, useRef } from "react";
import {
    FolderOpen,
    Edit3,
    Eye,
    Scissors,
    Copy,
    Clipboard,
    Trash2,
    Download,
    Terminal,
    Shield,
    Archive,
    FolderArchive,
    ExternalLink,
} from "lucide-react";
import type { FileSystemItem } from "@/types/files";

interface ContextMenuProps {
    x: number;
    y: number;
    targetItem?: FileSystemItem;
    selectedCount: number;
    clipboardHasItems: boolean;
    onClose: () => void;
    onOpen: (item: FileSystemItem) => void;
    onEdit: (item: FileSystemItem) => void;
    onPreview: (item: FileSystemItem) => void;
    onCut: () => void;
    onCopy: () => void;
    onPaste: () => void;
    onRename: (item: FileSystemItem) => void;
    onPermissions: (item: FileSystemItem) => void;
    onArchive: () => void;
    onExtract: (item: FileSystemItem) => void;
    onDownload: (item: FileSystemItem) => void;
    onDelete: () => void;
    onOpenTerminal: () => void;
}

export function FileContextMenu({
    x,
    y,
    targetItem,
    selectedCount,
    clipboardHasItems,
    onClose,
    onOpen,
    onEdit,
    onPreview,
    onCut,
    onCopy,
    onPaste,
    onRename,
    onPermissions,
    onArchive,
    onExtract,
    onDownload,
    onDelete,
    onOpenTerminal,
}: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    // Position adjustment to avoid viewport overflow
    const menuWidth = 220;
    const menuHeight = 360;
    const posX = typeof window !== "undefined" && x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 10 : x;
    const posY = typeof window !== "undefined" && y + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 10 : y;

    const isArchive = targetItem && !targetItem.is_dir && (
        targetItem.name.endsWith(".tar.gz") ||
        targetItem.name.endsWith(".zip") ||
        targetItem.name.endsWith(".tar.zst") ||
        targetItem.name.endsWith(".tar.xz")
    );

    return (
        <div
            ref={menuRef}
            style={{ left: posX, top: posY }}
            className="fixed z-50 w-56 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl shadow-2xl py-1.5 text-xs text-zinc-200 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
        >
            {targetItem && (
                <>
                    <button
                        onClick={() => {
                            onOpen(targetItem);
                            onClose();
                        }}
                        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-emerald-500/20 hover:text-emerald-300 transition text-left"
                    >
                        <FolderOpen className="w-4 h-4 text-emerald-400" />
                        <span>{targetItem.is_dir ? "Dizini Aç" : "Dosyayı Aç"}</span>
                    </button>

                    {!targetItem.is_dir && (
                        <button
                            onClick={() => {
                                onEdit(targetItem);
                                onClose();
                            }}
                            className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-800 transition text-left"
                        >
                            <Edit3 className="w-4 h-4 text-sky-400" />
                            <span>Editörde Düzenle</span>
                        </button>
                    )}

                    <button
                        onClick={() => {
                            onPreview(targetItem);
                            onClose();
                        }}
                        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-800 transition text-left"
                    >
                        <Eye className="w-4 h-4 text-cyan-400" />
                        <span>Detay & Önizleme</span>
                    </button>

                    <div className="h-px bg-zinc-800 my-1" />
                </>
            )}

            <button
                onClick={() => {
                    onCut();
                    onClose();
                }}
                className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-800 transition text-left"
            >
                <Scissors className="w-4 h-4 text-amber-400" />
                <span>Kes (Cut)</span>
                <span className="ml-auto text-[10px] text-zinc-500 font-mono">Ctrl+X</span>
            </button>

            <button
                onClick={() => {
                    onCopy();
                    onClose();
                }}
                className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-800 transition text-left"
            >
                <Copy className="w-4 h-4 text-emerald-400" />
                <span>Kopyala (Copy)</span>
                <span className="ml-auto text-[10px] text-zinc-500 font-mono">Ctrl+C</span>
            </button>

            {clipboardHasItems && (
                <button
                    onClick={() => {
                        onPaste();
                        onClose();
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-800 text-emerald-400 font-medium transition text-left"
                >
                    <Clipboard className="w-4 h-4" />
                    <span>Buraya Yapıştır</span>
                    <span className="ml-auto text-[10px] text-zinc-500 font-mono">Ctrl+V</span>
                </button>
            )}

            {targetItem && (
                <button
                    onClick={() => {
                        onRename(targetItem);
                        onClose();
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-800 transition text-left"
                >
                    <Edit3 className="w-4 h-4 text-zinc-400" />
                    <span>Yeniden Adlandır</span>
                    <span className="ml-auto text-[10px] text-zinc-500 font-mono">F2</span>
                </button>
            )}

            <div className="h-px bg-zinc-800 my-1" />

            {targetItem && (
                <button
                    onClick={() => {
                        onPermissions(targetItem);
                        onClose();
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-800 transition text-left"
                >
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <span>İzinler (chmod)</span>
                </button>
            )}

            {isArchive && targetItem && (
                <button
                    onClick={() => {
                        onExtract(targetItem);
                        onClose();
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-800 transition text-left"
                >
                    <FolderArchive className="w-4 h-4 text-amber-400" />
                    <span>Arşivi Buraya Çıkar</span>
                </button>
            )}

            {selectedCount > 0 && (
                <button
                    onClick={() => {
                        onArchive();
                        onClose();
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-800 transition text-left"
                >
                    <Archive className="w-4 h-4 text-amber-500" />
                    <span>Arşiv Oluştur (.tar.gz)</span>
                </button>
            )}

            {targetItem && (
                <button
                    onClick={() => {
                        onDownload(targetItem);
                        onClose();
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-800 transition text-left"
                >
                    <Download className="w-4 h-4 text-sky-400" />
                    <span>İndir</span>
                </button>
            )}

            <button
                onClick={() => {
                    onOpenTerminal();
                    onClose();
                }}
                className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-800 transition text-left"
            >
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Burada Terminal Aç</span>
            </button>

            {selectedCount > 0 && (
                <>
                    <div className="h-px bg-zinc-800 my-1" />
                    <button
                        onClick={() => {
                            onDelete();
                            onClose();
                        }}
                        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition text-left font-medium"
                    >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        <span>Sil ({selectedCount})</span>
                        <span className="ml-auto text-[10px] text-rose-400/60 font-mono">Del</span>
                    </button>
                </>
            )}
        </div>
    );
}
