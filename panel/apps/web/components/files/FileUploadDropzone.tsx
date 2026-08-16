"use client";

import React, { useState, useRef } from "react";
import { Upload, X, File, Check, Loader2, AlertCircle } from "lucide-react";
import { useFileMutations } from "@/hooks/useFiles";
import { formatFileSize } from "./file-icons";

interface FileUploadDropzoneProps {
    targetDir: string;
    isOpen: boolean;
    onClose: () => void;
}

export function FileUploadDropzone({ targetDir, isOpen, onClose }: FileUploadDropzoneProps) {
    const { uploadFiles } = useFileMutations();

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files) {
            setSelectedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
        }
    };

    const handleRemoveFile = (idx: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;
        setIsUploading(true);
        setError(null);
        try {
            await uploadFiles(targetDir, selectedFiles);
            setSelectedFiles([]);
            onClose();
        } catch (err: any) {
            setError(err?.message || "Yükleme başarısız oldu");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-emerald-400" />
                        <span className="text-sm font-semibold text-zinc-100">Dosya Yükle</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 flex flex-col gap-4 text-xs">
                    <div>
                        <span className="text-zinc-400">Hedef Dizin:</span>
                        <p className="font-mono text-zinc-200 truncate mt-0.5" title={targetDir}>
                            {targetDir}
                        </p>
                    </div>

                    {/* Drag and Drop Zone */}
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-zinc-700 hover:border-emerald-500/60 rounded-xl p-8 flex flex-col items-center justify-center gap-2 text-center cursor-pointer bg-zinc-900/40 hover:bg-zinc-900/80 transition"
                    >
                        <Upload className="w-8 h-8 text-zinc-400" />
                        <span className="font-medium text-zinc-200">
                            Dosyaları buraya sürükleyip bırakın veya seçmek için tıklayın
                        </span>
                        <span className="text-[11px] text-zinc-500">
                            Birden fazla dosya desteklenir
                        </span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>

                    {/* Selected Files List */}
                    {selectedFiles.length > 0 && (
                        <div className="flex flex-col gap-1">
                            <span className="text-zinc-400">
                                Yüklenecek Dosyalar ({selectedFiles.length}):
                            </span>
                            <div className="max-h-36 overflow-y-auto bg-zinc-900/60 border border-zinc-800 rounded-lg divide-y divide-zinc-800/60">
                                {selectedFiles.map((f, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-2 text-zinc-200"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <File className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                            <span className="truncate">{f.name}</span>
                                            <span className="text-zinc-500 font-mono text-[10px]">
                                                ({formatFileSize(f.size)})
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveFile(idx);
                                            }}
                                            className="text-zinc-500 hover:text-rose-400 p-1"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
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
                            type="button"
                            onClick={handleUpload}
                            disabled={isUploading || selectedFiles.length === 0}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm transition disabled:opacity-50"
                        >
                            {isUploading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Check className="w-3.5 h-3.5" />
                            )}
                            <span>{isUploading ? "Yükleniyor..." : "Yüklemeyi Başlat"}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
