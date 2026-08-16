"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Search,
    X,
    File,
    Folder,
    FileText,
    Loader2,
    Code,
    Sparkles,
} from "lucide-react";
import { useFileSearch } from "@/hooks/useFiles";
import { formatFileSize } from "./file-icons";
import type { SearchMatch } from "@/types/files";

interface FileSearchOverlayProps {
    currentPath: string;
    isOpen: boolean;
    onClose: () => void;
    onSelectMatch: (match: SearchMatch) => void;
}

export function FileSearchOverlay({
    currentPath,
    isOpen,
    onClose,
    onSelectMatch,
}: FileSearchOverlayProps) {
    const [query, setQuery] = useState("");
    const [isRegex, setIsRegex] = useState(false);
    const [matchContent, setMatchContent] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const { data: searchData, isLoading } = useFileSearch(
        currentPath,
        query,
        isRegex,
        matchContent,
        isOpen
    );

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setQuery("");
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const matches = searchData?.matches || [];

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
                {/* Search Bar */}
                <div className="flex items-center gap-3 p-3.5 bg-zinc-900/80 border-b border-zinc-800">
                    <Search className="w-5 h-5 text-emerald-400 shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={`"${currentPath}" dizininde ara...`}
                        className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
                    />

                    {/* Options */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => setMatchContent(!matchContent)}
                            className={`px-2 py-1 rounded text-xs font-medium border transition ${
                                matchContent
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                            }`}
                            title="Dosya içeriğinde de ara"
                        >
                            İçerikte Ara
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsRegex(!isRegex)}
                            className={`px-2 py-1 rounded text-xs font-mono border transition ${
                                isRegex
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                            }`}
                            title="Düzenli İfade (Regex)"
                        >
                            .*
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition ml-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Results View */}
                <div className="flex-1 overflow-y-auto p-2 divide-y divide-zinc-900">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-8 text-zinc-400 gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                            <span className="text-xs">Aranıyor...</span>
                        </div>
                    ) : query.trim().length < 2 ? (
                        <div className="p-8 text-center text-zinc-500 text-xs">
                            Aramak için en az 2 karakter girin
                        </div>
                    ) : matches.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-xs">
                            Sonuç bulunamadı
                        </div>
                    ) : (
                        matches.map((m, idx) => (
                            <div
                                key={idx}
                                onClick={() => {
                                    onSelectMatch(m);
                                    onClose();
                                }}
                                className="flex flex-col gap-1 p-2.5 rounded-lg hover:bg-zinc-900/80 cursor-pointer transition group"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {m.is_dir ? (
                                            <Folder className="w-4 h-4 text-sky-400 shrink-0" />
                                        ) : (
                                            <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                                        )}
                                        <span className="text-xs font-semibold text-zinc-200 truncate group-hover:text-emerald-400 transition">
                                            {m.path.split("/").pop()}
                                        </span>
                                        {m.line_number && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 font-mono">
                                                Satır {m.line_number}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                                        {m.is_dir ? "Dizin" : formatFileSize(m.size)}
                                    </span>
                                </div>

                                <span className="text-[11px] text-zinc-500 font-mono truncate pl-6">
                                    {m.path}
                                </span>

                                {m.line_text && (
                                    <div className="ml-6 mt-1 p-1.5 bg-zinc-950 border border-zinc-800/80 rounded text-[11px] font-mono text-zinc-300 truncate">
                                        {m.line_text}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer status */}
                <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-t border-zinc-800 text-[11px] text-zinc-500 font-mono">
                    <span>Toplam: {matches.length} eşleşme</span>
                    <span>Seçmek için tıklayın • Kapatmak için Esc</span>
                </div>
            </div>
        </div>
    );
}
