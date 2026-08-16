"use client";

import React, { useState } from "react";
import {
    X,
    Download,
    ZoomIn,
    ZoomOut,
    RotateCw,
    FileText,
    Binary,
    Image as ImageIcon,
    Music,
    Video,
    Loader2,
} from "lucide-react";
import { useFileContent } from "@/hooks/useFiles";
import { useHostStore } from "@/store/host-store";
import { formatFileSize } from "./file-icons";

interface FileViewerModalProps {
    filePath: string | null;
    onClose: () => void;
}

export function FileViewerModal({ filePath, onClose }: FileViewerModalProps) {
    const selectedHost = useHostStore((s) => s.selectedHost);
    const { data: fileData, isLoading } = useFileContent(filePath, 0, !!filePath);

    const [zoom, setZoom] = useState(1);

    if (!filePath) return null;

    const fileName = filePath.split("/").pop() || "";
    const ext = (fileName.split(".").pop() || "").toLowerCase();
    const downloadUrl = `/api/agent/${encodeURIComponent(selectedHost)}/api/v1/fs/download?path=${encodeURIComponent(filePath)}`;

    const isImage = ["png", "jpg", "jpeg", "svg", "webp", "gif", "ico", "bmp"].includes(ext);
    const isVideo = ["mp4", "webm", "mkv", "mov", "avi"].includes(ext);
    const isAudio = ["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext);
    const isPDF = ext === "pdf";

    // Generate Hex dump if binary
    const renderHexDump = (base64Content: string) => {
        try {
            const raw = atob(base64Content.slice(0, 10000)); // preview first 10KB
            const rows: { offset: string; hex: string; ascii: string }[] = [];

            for (let i = 0; i < raw.length; i += 16) {
                const chunk = raw.slice(i, i + 16);
                const offset = i.toString(16).padStart(8, "0");
                const hexArr: string[] = [];
                let ascii = "";

                for (let j = 0; j < 16; j++) {
                    if (j < chunk.length) {
                        const code = chunk.charCodeAt(j);
                        hexArr.push(code.toString(16).padStart(2, "0"));
                        ascii += code >= 32 && code <= 126 ? chunk[j] : ".";
                    } else {
                        hexArr.push("  ");
                    }
                }

                rows.push({
                    offset,
                    hex: hexArr.slice(0, 8).join(" ") + "  " + hexArr.slice(8).join(" "),
                    ascii,
                });
            }

            return (
                <div className="flex-1 font-mono text-xs overflow-auto p-4 bg-zinc-950 text-zinc-300">
                    <div className="grid grid-cols-[100px_1fr_160px] gap-4 pb-2 border-b border-zinc-800 text-zinc-500 font-semibold select-none">
                        <span>Offset</span>
                        <span>Hex Bytes</span>
                        <span>ASCII</span>
                    </div>
                    <div className="divide-y divide-zinc-900 mt-2">
                        {rows.map((r, idx) => (
                            <div key={idx} className="grid grid-cols-[100px_1fr_160px] gap-4 py-0.5">
                                <span className="text-zinc-600">{r.offset}</span>
                                <span className="text-cyan-400 font-mono tracking-wider">{r.hex}</span>
                                <span className="text-emerald-400 font-mono">{r.ascii}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        } catch {
            return (
                <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
                    Hex dökümü oluşturulamadı
                </div>
            );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
            <div className="w-full max-w-5xl h-[85vh] bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {isImage ? (
                            <ImageIcon className="w-5 h-5 text-purple-400 shrink-0" />
                        ) : isVideo ? (
                            <Video className="w-5 h-5 text-rose-400 shrink-0" />
                        ) : isAudio ? (
                            <Music className="w-5 h-5 text-pink-400 shrink-0" />
                        ) : (
                            <Binary className="w-5 h-5 text-cyan-400 shrink-0" />
                        )}
                        <span className="text-sm font-semibold text-zinc-100 truncate">
                            {fileName}
                        </span>
                        {fileData && (
                            <span className="text-xs text-zinc-500 font-mono">
                                ({formatFileSize(fileData.size)})
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {isImage && (
                            <div className="flex items-center bg-zinc-800/80 rounded-lg p-0.5 border border-zinc-700">
                                <button
                                    onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                                    title="Uzaklaştır"
                                    className="p-1 text-zinc-300 hover:text-white"
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </button>
                                <span className="px-2 text-xs font-mono text-zinc-400 select-none">
                                    {Math.round(zoom * 100)}%
                                </span>
                                <button
                                    onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                                    title="Yakınlaştır"
                                    className="p-1 text-zinc-300 hover:text-white"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setZoom(1)}
                                    title="Sıfırla"
                                    className="p-1 text-zinc-300 hover:text-white ml-1 border-l border-zinc-700"
                                >
                                    <RotateCw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        <a
                            href={downloadUrl}
                            download={fileName}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>İndir</span>
                        </a>

                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content Viewport */}
                <div className="flex-1 flex items-center justify-center overflow-auto p-4 bg-zinc-950/60 relative">
                    {isLoading ? (
                        <div className="flex flex-col items-center gap-2 text-zinc-400">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                            <span className="text-xs">Medya yükleniyor...</span>
                        </div>
                    ) : isImage ? (
                        <div className="flex items-center justify-center min-h-full min-w-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={downloadUrl}
                                alt={fileName}
                                style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
                                className="max-h-[70vh] max-w-[85vw] object-contain rounded-lg shadow-xl transition-transform duration-100"
                            />
                        </div>
                    ) : isVideo ? (
                        <video
                            src={downloadUrl}
                            controls
                            autoPlay
                            className="max-h-[70vh] max-w-full rounded-xl shadow-2xl"
                        />
                    ) : isAudio ? (
                        <div className="flex flex-col items-center gap-4 p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl">
                            <Music className="w-16 h-16 text-pink-400 animate-pulse" />
                            <span className="text-sm font-semibold text-zinc-200">{fileName}</span>
                            <audio src={downloadUrl} controls autoPlay className="w-80" />
                        </div>
                    ) : isPDF ? (
                        <iframe
                            src={downloadUrl}
                            className="w-full h-full rounded-xl border border-zinc-800"
                            title={fileName}
                        />
                    ) : fileData?.is_binary ? (
                        renderHexDump(fileData.content)
                    ) : (
                        <div className="flex-1 font-mono text-xs overflow-auto p-4 bg-zinc-950 text-zinc-300 whitespace-pre">
                            {fileData?.content}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
