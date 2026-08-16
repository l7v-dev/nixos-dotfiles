"use client";

import React, { useState } from "react";
import {
    X,
    Folder,
    FileText,
    Copy,
    Check,
    Download,
    Edit3,
    Eye,
    Shield,
    Trash2,
    Terminal,
    Link2,
    Calendar,
    HardDrive,
    User,
    Key,
} from "lucide-react";
import { getFileIcon, formatFileSize } from "./file-icons";
import { useHostStore } from "@/store/host-store";
import { useTerminalStore, dispatchTerminalInput } from "@/store/terminal-store";
import { useRouter } from "next/navigation";
import type { FileSystemItem } from "@/types/files";

interface FileDetailDrawerProps {
    item: FileSystemItem | null;
    onClose: () => void;
    onEdit: (item: FileSystemItem) => void;
    onPreview: (item: FileSystemItem) => void;
    onPermissions: (item: FileSystemItem) => void;
    onDelete: (item: FileSystemItem) => void;
}

export function FileDetailDrawer({
    item,
    onClose,
    onEdit,
    onPreview,
    onPermissions,
    onDelete,
}: FileDetailDrawerProps) {
    const selectedHost = useHostStore((s) => s.selectedHost);
    const { addTab } = useTerminalStore();
    const router = useRouter();

    const [copied, setCopied] = useState(false);

    if (!item) return null;

    const handleCopyPath = () => {
        navigator.clipboard.writeText(item.path);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleOpenTerminal = () => {
        const targetDir = item.is_dir ? item.path : item.path.substring(0, item.path.lastIndexOf("/"));
        addTab(selectedHost, `shell: ${targetDir.split("/").pop() || "root"}`);
        setTimeout(() => {
            dispatchTerminalInput(`cd ${targetDir}\n`);
        }, 300);
        router.push("/terminal");
    };

    const downloadUrl = `/api/agent/${encodeURIComponent(selectedHost)}/api/v1/fs/download?path=${encodeURIComponent(item.path)}`;

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleString("tr-TR");
        } catch {
            return dateStr;
        }
    };

    return (
        <aside className="w-80 shrink-0 bg-zinc-950/90 border-l border-zinc-800 flex flex-col p-4 backdrop-blur-xl overflow-y-auto no-scrollbar animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Öğe Detayı
                </span>
                <button
                    onClick={onClose}
                    className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Icon & Name */}
            <div className="flex flex-col items-center text-center my-4">
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg mb-3">
                    {getFileIcon(item, "lg")}
                </div>
                <h3 className="text-sm font-semibold text-zinc-100 break-all px-2">
                    {item.name}
                </h3>
                <span className="text-xs text-zinc-500 font-mono mt-1">
                    {item.is_dir ? "Dizin" : formatFileSize(item.size)}
                </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2 my-2">
                {!item.is_dir && (
                    <button
                        onClick={() => onEdit(item)}
                        className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-sky-400 transition"
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Düzenle</span>
                    </button>
                )}

                <button
                    onClick={() => onPreview(item)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-cyan-400 transition"
                >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Önizle</span>
                </button>

                <a
                    href={downloadUrl}
                    download={item.name}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-emerald-400 transition"
                >
                    <Download className="w-3.5 h-3.5" />
                    <span>İndir</span>
                </a>

                <button
                    onClick={() => onPermissions(item)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-indigo-400 transition"
                >
                    <Shield className="w-3.5 h-3.5" />
                    <span>İzinler</span>
                </button>
            </div>

            {/* Metadata Fields */}
            <div className="flex flex-col gap-3 my-3 text-xs">
                {/* Full Path */}
                <div className="flex flex-col gap-1 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-500 font-medium flex items-center gap-1.5">
                        <span>Tam Yol</span>
                        <button
                            onClick={handleCopyPath}
                            className="ml-auto text-zinc-500 hover:text-emerald-400 transition p-0.5"
                            title="Yolu Kopyala"
                        >
                            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                    </span>
                    <span className="text-zinc-200 font-mono text-[11px] break-all select-all">
                        {item.path}
                    </span>
                </div>

                {/* Symlink info */}
                {item.is_symlink && (
                    <div className="flex flex-col gap-1 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80">
                        <span className="text-zinc-500 font-medium flex items-center gap-1.5">
                            <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Sembolik Bağlantı Hedefi</span>
                        </span>
                        <span className="text-cyan-300 font-mono text-[11px] break-all">
                            {item.symlink_target || "Bilinmiyor"}
                        </span>
                    </div>
                )}

                {/* Details list */}
                <div className="flex flex-col divide-y divide-zinc-800/60 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
                    <div className="flex items-center justify-between p-2.5">
                        <span className="text-zinc-400 flex items-center gap-1.5">
                            <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Boyut</span>
                        </span>
                        <span className="font-mono text-zinc-200">
                            {item.is_dir ? "—" : `${item.size.toLocaleString()} bayt`}
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5">
                        <span className="text-zinc-400 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Değiştirilme</span>
                        </span>
                        <span className="font-mono text-zinc-300 text-[11px]">
                            {formatDate(item.mod_time)}
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5">
                        <span className="text-zinc-400 flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-zinc-500" />
                            <span>İzinler</span>
                        </span>
                        <span className="font-mono text-zinc-200">
                            {item.permissions} ({item.mode})
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5">
                        <span className="text-zinc-400 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Sahip / Grup</span>
                        </span>
                        <span className="font-mono text-zinc-200">
                            {item.owner || "—"}:{item.group || "—"}
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5">
                        <span className="text-zinc-400">MIME Türü</span>
                        <span className="font-mono text-zinc-400 text-[11px] truncate max-w-[140px]" title={item.mime_type}>
                            {item.mime_type || "—"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-auto pt-3 border-t border-zinc-800 flex flex-col gap-2">
                <button
                    onClick={handleOpenTerminal}
                    className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-emerald-400 transition"
                >
                    <Terminal className="w-4 h-4" />
                    <span>Terminalde Aç</span>
                </button>

                <button
                    onClick={() => onDelete(item)}
                    className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-medium text-rose-400 transition"
                >
                    <Trash2 className="w-4 h-4" />
                    <span>Öğeyi Sil</span>
                </button>
            </div>
        </aside>
    );
}
