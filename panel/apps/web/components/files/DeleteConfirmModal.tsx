"use client";

import React from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { useFileMutations } from "@/hooks/useFiles";

interface DeleteConfirmModalProps {
    paths: string[];
    isOpen: boolean;
    onClose: () => void;
}

export function DeleteConfirmModal({ paths, isOpen, onClose }: DeleteConfirmModalProps) {
    const { deletePaths } = useFileMutations();

    if (!isOpen || paths.length === 0) return null;

    const handleDelete = async () => {
        try {
            await deletePaths.mutateAsync({
                paths,
                recursive: true,
            });
            onClose();
        } catch {
            // error handled by mutation
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-zinc-950 border border-rose-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-rose-500/10 border-b border-rose-500/20">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                        <span className="text-sm font-semibold text-rose-300">
                            Silme İşlemini Onayla
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 flex flex-col gap-3 text-xs">
                    <p className="text-zinc-300">
                        Aşağıdaki <span className="font-semibold text-rose-400">{paths.length}</span> öğe kalıcı olarak silinecek. Bu işlem geri alınamaz!
                    </p>

                    <div className="max-h-36 overflow-y-auto bg-zinc-900/80 border border-zinc-800 rounded-lg p-2 flex flex-col gap-1 font-mono text-[11px] text-zinc-300">
                        {paths.map((p) => (
                            <div key={p} className="truncate">
                                {p}
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
                        >
                            İptal
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deletePaths.isPending}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-sm transition disabled:opacity-50"
                        >
                            {deletePaths.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                            )}
                            <span>Kalıcı Olarak Sil</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
