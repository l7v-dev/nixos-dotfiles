"use client";

import React, { useState } from "react";
import { X, Archive, FolderArchive, Check, Loader2 } from "lucide-react";
import { useFileMutations } from "@/hooks/useFiles";
import type { FileSystemItem } from "@/types/files";

interface ArchiveModalProps {
    mode: "compress" | "extract";
    targetPaths?: string[];
    extractItem?: FileSystemItem | null;
    currentPath: string;
    onClose: () => void;
}

export function ArchiveModal({
    mode,
    targetPaths = [],
    extractItem,
    currentPath,
    onClose,
}: ArchiveModalProps) {
    const { createArchive, extractArchive } = useFileMutations();

    const defaultArchiveName = targetPaths.length === 1
        ? `${targetPaths[0].split("/").pop()}.tar.gz`
        : "archive.tar.gz";

    const [destination, setDestination] = useState(
        mode === "compress"
            ? `${currentPath}/${defaultArchiveName}`
            : currentPath
    );
    const [format, setFormat] = useState<"tar.gz" | "zip" | "tar.zst">("tar.gz");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (mode === "compress") {
                await createArchive.mutateAsync({
                    paths: targetPaths,
                    destination,
                    format,
                });
            } else if (extractItem) {
                await extractArchive.mutateAsync({
                    archive_path: extractItem.path,
                    destination,
                });
            }
            onClose();
        } catch {
            // error handled by mutation
        }
    };

    const isPending = createArchive.isPending || extractArchive.isPending;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                        {mode === "compress" ? (
                            <Archive className="w-5 h-5 text-amber-400" />
                        ) : (
                            <FolderArchive className="w-5 h-5 text-emerald-400" />
                        )}
                        <span className="text-sm font-semibold text-zinc-100">
                            {mode === "compress" ? "Arşiv Oluştur" : "Arşivi Çıkar"}
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
                    {mode === "compress" ? (
                        <>
                            <div>
                                <span className="text-zinc-400">Arşivlenecek Öğeler ({targetPaths.length}):</span>
                                <div className="max-h-24 overflow-y-auto bg-zinc-900/60 border border-zinc-800 rounded-lg p-2 mt-1 flex flex-col gap-1 font-mono text-[11px] text-zinc-300">
                                    {targetPaths.map((p) => (
                                        <div key={p} className="truncate">
                                            {p}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-zinc-400">Arşiv Formatı:</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["tar.gz", "zip", "tar.zst"] as const).map((fmt) => (
                                        <button
                                            key={fmt}
                                            type="button"
                                            onClick={() => {
                                                setFormat(fmt);
                                                const base = destination.replace(/\.(tar\.gz|zip|tar\.zst)$/, "");
                                                setDestination(`${base}.${fmt}`);
                                            }}
                                            className={`py-1.5 px-2 rounded-lg border font-mono text-center transition ${
                                                format === fmt
                                                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold"
                                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                                            }`}
                                        >
                                            .{fmt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-zinc-400">Hedef Dosya Yolu:</label>
                                <input
                                    type="text"
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                    className="bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-zinc-100 font-mono rounded-lg outline-none focus:border-amber-500"
                                    required
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <span className="text-zinc-400">Kaynak Arşiv:</span>
                                <p className="font-mono text-zinc-200 truncate mt-0.5" title={extractItem?.path}>
                                    {extractItem?.path}
                                </p>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-zinc-400">Çıkarılacak Hedef Dizin:</label>
                                <input
                                    type="text"
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                    className="bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-zinc-100 font-mono rounded-lg outline-none focus:border-emerald-500"
                                    required
                                />
                            </div>
                        </>
                    )}

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
                            disabled={isPending}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm transition disabled:opacity-50"
                        >
                            {isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Check className="w-3.5 h-3.5" />
                            )}
                            <span>{mode === "compress" ? "Arşivle" : "Çıkar"}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
