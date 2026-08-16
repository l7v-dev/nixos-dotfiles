"use client";

import React from "react";
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Link2,
    Check,
} from "lucide-react";
import { useFileStore } from "@/store/file-store";
import { getFileIcon, formatFileSize } from "./file-icons";
import type { FileSystemItem, FileSortField } from "@/types/files";

interface FileTableProps {
    files: FileSystemItem[];
    onOpen: (item: FileSystemItem) => void;
    onContextMenu: (e: React.MouseEvent, item?: FileSystemItem) => void;
}

export function FileTable({ files, onOpen, onContextMenu }: FileTableProps) {
    const {
        selectedPaths,
        selectPath,
        selectAll,
        clearSelection,
        sortField,
        sortOrder,
        setSorting,
        clipboard,
    } = useFileStore();

    const allPaths = files.map((f) => f.path);
    const isAllSelected = files.length > 0 && selectedPaths.length === files.length;

    const handleSort = (field: FileSortField) => {
        setSorting(field);
    };

    const renderSortIcon = (field: FileSortField) => {
        if (sortField !== field) {
            return <ArrowUpDown className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400" />;
        }
        return sortOrder === "asc" ? (
            <ArrowUp className="w-3 h-3 text-emerald-400" />
        ) : (
            <ArrowDown className="w-3 h-3 text-emerald-400" />
        );
    };

    const handleRowClick = (e: React.MouseEvent, item: FileSystemItem) => {
        e.stopPropagation();
        if (e.shiftKey) {
            selectPath(item.path, { range: true, allVisiblePaths: allPaths });
        } else if (e.ctrlKey || e.metaKey) {
            selectPath(item.path, { multi: true });
        } else {
            selectPath(item.path);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleString("tr-TR", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return dateStr;
        }
    };

    if (files.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-zinc-500">
                <p className="text-sm">Bu dizin boş</p>
            </div>
        );
    }

    return (
        <div
            onContextMenu={(e) => onContextMenu(e)}
            className="w-full overflow-x-auto select-none"
        >
            <table className="w-full text-left text-xs border-collapse">
                <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-medium bg-zinc-950/40">
                        <th className="py-2.5 px-3 w-8">
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={(e) => {
                                    if (e.target.checked) selectAll(allPaths);
                                    else clearSelection();
                                }}
                                className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 cursor-pointer"
                            />
                        </th>
                        <th
                            onClick={() => handleSort("name")}
                            className="py-2.5 px-3 cursor-pointer group hover:text-zinc-200 transition"
                        >
                            <div className="flex items-center gap-1.5">
                                <span>Ad</span>
                                {renderSortIcon("name")}
                            </div>
                        </th>
                        <th
                            onClick={() => handleSort("size")}
                            className="py-2.5 px-3 cursor-pointer group hover:text-zinc-200 transition w-28"
                        >
                            <div className="flex items-center gap-1.5">
                                <span>Boyut</span>
                                {renderSortIcon("size")}
                            </div>
                        </th>
                        <th
                            onClick={() => handleSort("modTime")}
                            className="py-2.5 px-3 cursor-pointer group hover:text-zinc-200 transition w-40"
                        >
                            <div className="flex items-center gap-1.5">
                                <span>Değiştirilme</span>
                                {renderSortIcon("modTime")}
                            </div>
                        </th>
                        <th className="py-2.5 px-3 w-24">İzinler</th>
                        <th className="py-2.5 px-3 w-28">Sahip</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                    {files.map((item) => {
                        const isSelected = selectedPaths.includes(item.path);
                        const isCut = clipboard?.mode === "cut" && clipboard.paths.includes(item.path);

                        return (
                            <tr
                                key={item.path}
                                onClick={(e) => handleRowClick(e, item)}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    onOpen(item);
                                }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!selectedPaths.includes(item.path)) selectPath(item.path);
                                    onContextMenu(e, item);
                                }}
                                className={`cursor-pointer transition group ${
                                    isSelected
                                        ? "bg-emerald-500/15 text-emerald-200"
                                        : "hover:bg-zinc-800/40 text-zinc-300"
                                } ${isCut ? "opacity-40" : ""}`}
                            >
                                <td className="py-2 px-3">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {}}
                                        className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 pointer-events-none"
                                    />
                                </td>
                                <td className="py-2 px-3 font-medium flex items-center gap-2 max-w-[320px]">
                                    <div className="shrink-0">{getFileIcon(item, "sm")}</div>
                                    <span className="truncate group-hover:text-emerald-400 transition" title={item.name}>
                                        {item.name}
                                    </span>
                                    {item.is_symlink && (
                                        <span
                                            className="flex items-center gap-1 text-[11px] text-cyan-400 font-mono truncate"
                                            title={`Symlink -> ${item.symlink_target}`}
                                        >
                                            <Link2 className="w-3 h-3 shrink-0" />
                                            <span className="truncate">→ {item.symlink_target}</span>
                                        </span>
                                    )}
                                </td>
                                <td className="py-2 px-3 font-mono text-zinc-400">
                                    {item.is_dir ? "—" : formatFileSize(item.size)}
                                </td>
                                <td className="py-2 px-3 text-zinc-400 font-mono">
                                    {formatDate(item.mod_time)}
                                </td>
                                <td className="py-2 px-3 font-mono text-zinc-400">
                                    {item.permissions}
                                </td>
                                <td className="py-2 px-3 font-mono text-zinc-400">
                                    {item.owner ? `${item.owner}:${item.group || ""}` : "—"}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
