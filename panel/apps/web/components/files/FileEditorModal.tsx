"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    X,
    Save,
    RotateCcw,
    FileCode,
    Check,
    AlertCircle,
    Loader2,
} from "lucide-react";
import { useFileContent, useFileMutations } from "@/hooks/useFiles";

interface FileEditorModalProps {
    filePath: string | null;
    onClose: () => void;
}

export function FileEditorModal({ filePath, onClose }: FileEditorModalProps) {
    const { data: fileData, isLoading, error } = useFileContent(filePath, 0, !!filePath);
    const { writeFile } = useFileMutations();

    const [content, setContent] = useState("");
    const [isDirty, setIsDirty] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (fileData) {
            setContent(fileData.content);
            setIsDirty(false);
        }
    }, [fileData]);

    const handleSave = async () => {
        if (!filePath) return;
        try {
            await writeFile.mutateAsync({
                path: filePath,
                content,
                encoding: fileData?.encoding || "utf-8",
            });
            setIsDirty(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch {
            // error handled by mutation
        }
    };

    // Keyboard shortcuts (Ctrl+S to save, Esc to close if not dirty)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                handleSave();
            }
            if (e.key === "Escape" && !isDirty) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [content, isDirty, filePath]);

    if (!filePath) return null;

    const fileName = filePath.split("/").pop() || "";
    const lines = content.split("\n");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-5xl h-[85vh] bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <FileCode className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-semibold text-zinc-100 truncate">
                                {fileName}
                            </span>
                            <span className="text-xs text-zinc-500 font-mono truncate hidden sm:inline">
                                ({filePath})
                            </span>
                            {isDirty && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-medium">
                                    Kaydedilmedi
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {saveSuccess && (
                            <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                                <Check className="w-4 h-4" />
                                <span>Kaydedildi</span>
                            </div>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={writeFile.isPending || !isDirty}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition"
                        >
                            {writeFile.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Save className="w-3.5 h-3.5" />
                            )}
                            <span>Kaydet (Ctrl+S)</span>
                        </button>

                        <button
                            onClick={() => {
                                if (isDirty && !window.confirm("Kaydedilmemiş değişiklikler var. Çıkmak istediğinize emin misiniz?")) {
                                    return;
                                }
                                onClose();
                            }}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Editor Content Area */}
                <div className="flex-1 flex overflow-hidden relative">
                    {isLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-400">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                            <span className="text-xs">Dosya yükleniyor...</span>
                        </div>
                    ) : error ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-rose-400 p-6 text-center">
                            <AlertCircle className="w-8 h-8" />
                            <span className="text-sm font-semibold">Dosya okunamadı</span>
                            <span className="text-xs text-zinc-500">{(error as Error)?.message || "Bilinmeyen hata"}</span>
                        </div>
                    ) : fileData?.is_binary ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-400 p-6 text-center">
                            <AlertCircle className="w-8 h-8 text-amber-400" />
                            <span className="text-sm font-semibold text-zinc-200">İkili (Binary) Dosya</span>
                            <p className="text-xs text-zinc-500 max-w-md">
                                Bu dosya ikili biçimde kodlanmıştır. Düzenlemek yerine medya/hex önizleyicide görüntüleyebilirsiniz.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 flex font-mono text-xs overflow-hidden">
                            {/* Line Numbers Gutter */}
                            <div className="w-12 py-3 px-2 bg-zinc-950 border-r border-zinc-800/80 text-zinc-600 text-right select-none overflow-hidden shrink-0">
                                {lines.map((_, i) => (
                                    <div key={i} className="leading-5">
                                        {i + 1}
                                    </div>
                                ))}
                            </div>

                            {/* Text Area */}
                            <textarea
                                ref={textareaRef}
                                value={content}
                                onChange={(e) => {
                                    setContent(e.target.value);
                                    setIsDirty(true);
                                }}
                                spellCheck={false}
                                className="flex-1 py-3 px-3 bg-zinc-950 text-zinc-100 outline-none resize-none leading-5 font-mono selection:bg-emerald-500/30 overflow-auto no-scrollbar"
                            />
                        </div>
                    )}
                </div>

                {/* Status Bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/60 border-t border-zinc-800 text-[11px] text-zinc-500 font-mono shrink-0">
                    <div className="flex items-center gap-3">
                        <span>Satır: {lines.length}</span>
                        <span>Karakter: {content.length}</span>
                        <span>MIME: {fileData?.mime_type || "text/plain"}</span>
                    </div>
                    <div>
                        <span>Kodlama: {fileData?.encoding?.toUpperCase() || "UTF-8"}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
