"use client";

import React, { useState, useEffect } from "react";
import { X, Edit3, Check, Loader2 } from "lucide-react";
import { useFileMutations } from "@/hooks/useFiles";
import type { FileSystemItem } from "@/types/files";

interface RenameModalProps {
    item: FileSystemItem | null;
    onClose: () => void;
}

export function RenameModal({ item, onClose }: RenameModalProps) {
    const { renamePath } = useFileMutations();
    const [newName, setNewName] = useState("");

    useEffect(() => {
        if (item) {
            setNewName(item.name);
        }
    }, [item]);

    if (!item) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newName.trim();
        if (!trimmed || trimmed === item.name) {
            onClose();
            return;
        }

        const parentDir = item.path.substring(0, item.path.lastIndexOf("/"));
        const newPath = `${parentDir}/${trimmed}`;

        try {
            await renamePath.mutateAsync({
                oldPath: item.path,
                newPath,
            });
            onClose();
        } catch {
            // error handled by mutation
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-sky-400" />
                        <span className="text-sm font-semibold text-zinc-100">
                            Yeniden Adlandır
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4 text-xs">
                    <div className="flex flex-col gap-1">
                        <label className="text-zinc-400">Mevcut Ad:</label>
                        <span className="text-zinc-300 font-mono">{item.name}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-zinc-400">Yeni Ad:</label>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-zinc-100 font-mono rounded-lg outline-none focus:border-sky-500"
                            autoFocus
                            required
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={renamePath.isPending || !newName.trim()}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-sm transition disabled:opacity-50"
                        >
                            {renamePath.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Kaydet</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
