"use client";

import React, { useState } from "react";
import { X, FolderPlus, FilePlus, Check, Loader2 } from "lucide-react";
import { useFileMutations } from "@/hooks/useFiles";

interface CreateItemModalProps {
    mode: "file" | "folder";
    currentPath: string;
    isOpen: boolean;
    onClose: () => void;
    onCreatedFile?: (filePath: string) => void;
}

export function CreateItemModal({
    mode,
    currentPath,
    isOpen,
    onClose,
    onCreatedFile,
}: CreateItemModalProps) {
    const { writeFile, createDir } = useFileMutations();
    const [name, setName] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;

        const targetPath = `${currentPath}/${trimmed}`;

        try {
            if (mode === "file") {
                await writeFile.mutateAsync({
                    path: targetPath,
                    content: "",
                    create_parents: true,
                });
                if (onCreatedFile) {
                    onCreatedFile(targetPath);
                }
            } else {
                await createDir.mutateAsync(targetPath);
            }
            onClose();
            setName("");
        } catch {
            // error handled by mutation
        }
    };

    const isPending = writeFile.isPending || createDir.isPending;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                        {mode === "file" ? (
                            <FilePlus className="w-5 h-5 text-emerald-400" />
                        ) : (
                            <FolderPlus className="w-5 h-5 text-sky-400" />
                        )}
                        <span className="text-sm font-semibold text-zinc-100">
                            {mode === "file" ? "Yeni Dosya Oluştur" : "Yeni Klasör Oluştur"}
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
                    <div>
                        <span className="text-zinc-400">Konum:</span>
                        <p className="font-mono text-zinc-200 truncate mt-0.5" title={currentPath}>
                            {currentPath}
                        </p>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-zinc-400">
                            {mode === "file" ? "Dosya Adı (örn: configuration.nix):" : "Klasör Adı:"}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={mode === "file" ? "ornek.nix" : "yeni-klasor"}
                            className="bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-zinc-100 font-mono rounded-lg outline-none focus:border-emerald-500"
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
                            disabled={isPending || !name.trim()}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm transition disabled:opacity-50"
                        >
                            {isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Oluştur</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
