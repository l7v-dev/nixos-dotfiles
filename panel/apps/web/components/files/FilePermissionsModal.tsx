"use client";

import React, { useState, useEffect } from "react";
import { X, Shield, Check, Loader2 } from "lucide-react";
import { useFileMutations } from "@/hooks/useFiles";
import type { FileSystemItem } from "@/types/files";

interface FilePermissionsModalProps {
    item: FileSystemItem | null;
    onClose: () => void;
}

export function FilePermissionsModal({ item, onClose }: FilePermissionsModalProps) {
    const { changePermissions } = useFileMutations();

    // Permissions state: [UserRead, UserWrite, UserExec, GroupRead, GroupWrite, GroupExec, OtherRead, OtherWrite, OtherExec]
    const [perms, setPerms] = useState({
        u_r: true,
        u_w: true,
        u_x: false,
        g_r: true,
        g_w: false,
        g_x: false,
        o_r: true,
        o_w: false,
        o_x: false,
    });
    const [recursive, setRecursive] = useState(false);

    useEffect(() => {
        if (item) {
            // Parse octal or mode string e.g. "0755"
            let octal = item.permissions;
            if (octal.length === 4) octal = octal.slice(1);
            if (octal.length === 3) {
                const u = parseInt(octal[0], 10) || 0;
                const g = parseInt(octal[1], 10) || 0;
                const o = parseInt(octal[2], 10) || 0;

                setPerms({
                    u_r: (u & 4) !== 0,
                    u_w: (u & 2) !== 0,
                    u_x: (u & 1) !== 0,
                    g_r: (g & 4) !== 0,
                    g_w: (g & 2) !== 0,
                    g_x: (g & 1) !== 0,
                    o_r: (o & 4) !== 0,
                    o_w: (o & 2) !== 0,
                    o_x: (o & 1) !== 0,
                });
            }
        }
    }, [item]);

    if (!item) return null;

    // Calculate octal mode string
    const uVal = (perms.u_r ? 4 : 0) + (perms.u_w ? 2 : 0) + (perms.u_x ? 1 : 0);
    const gVal = (perms.g_r ? 4 : 0) + (perms.g_w ? 2 : 0) + (perms.g_x ? 1 : 0);
    const oVal = (perms.o_r ? 4 : 0) + (perms.o_w ? 2 : 0) + (perms.o_x ? 1 : 0);
    const octalString = `0${uVal}${gVal}${oVal}`;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await changePermissions.mutateAsync({
                path: item.path,
                mode: octalString,
                recursive: item.is_dir ? recursive : false,
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
                        <Shield className="w-5 h-5 text-indigo-400" />
                        <span className="text-sm font-semibold text-zinc-100">
                            POSIX İzinlerini Düzenle (chmod)
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-4 flex flex-col gap-4 text-xs">
                    <div>
                        <span className="text-zinc-400">Hedef:</span>
                        <p className="font-mono text-zinc-200 truncate mt-0.5" title={item.path}>
                            {item.path}
                        </p>
                    </div>

                    {/* Permissions Matrix */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex flex-col gap-3">
                        {/* Headers */}
                        <div className="grid grid-cols-4 gap-2 text-zinc-400 font-semibold border-b border-zinc-800 pb-2 text-center">
                            <span className="text-left">Kullanıcı</span>
                            <span>Okuma (r)</span>
                            <span>Yazma (w)</span>
                            <span>Çalıştırma (x)</span>
                        </div>

                        {/* Owner */}
                        <div className="grid grid-cols-4 gap-2 items-center text-center">
                            <span className="text-left font-medium text-zinc-300">Sahip (User)</span>
                            <input
                                type="checkbox"
                                checked={perms.u_r}
                                onChange={(e) => setPerms({ ...perms, u_r: e.target.checked })}
                                className="mx-auto rounded border-zinc-700 bg-zinc-950 text-emerald-500"
                            />
                            <input
                                type="checkbox"
                                checked={perms.u_w}
                                onChange={(e) => setPerms({ ...perms, u_w: e.target.checked })}
                                className="mx-auto rounded border-zinc-700 bg-zinc-950 text-emerald-500"
                            />
                            <input
                                type="checkbox"
                                checked={perms.u_x}
                                onChange={(e) => setPerms({ ...perms, u_x: e.target.checked })}
                                className="mx-auto rounded border-zinc-700 bg-zinc-950 text-emerald-500"
                            />
                        </div>

                        {/* Group */}
                        <div className="grid grid-cols-4 gap-2 items-center text-center">
                            <span className="text-left font-medium text-zinc-300">Grup (Group)</span>
                            <input
                                type="checkbox"
                                checked={perms.g_r}
                                onChange={(e) => setPerms({ ...perms, g_r: e.target.checked })}
                                className="mx-auto rounded border-zinc-700 bg-zinc-950 text-emerald-500"
                            />
                            <input
                                type="checkbox"
                                checked={perms.g_w}
                                onChange={(e) => setPerms({ ...perms, g_w: e.target.checked })}
                                className="mx-auto rounded border-zinc-700 bg-zinc-950 text-emerald-500"
                            />
                            <input
                                type="checkbox"
                                checked={perms.g_x}
                                onChange={(e) => setPerms({ ...perms, g_x: e.target.checked })}
                                className="mx-auto rounded border-zinc-700 bg-zinc-950 text-emerald-500"
                            />
                        </div>

                        {/* Others */}
                        <div className="grid grid-cols-4 gap-2 items-center text-center">
                            <span className="text-left font-medium text-zinc-300">Diğerleri (Other)</span>
                            <input
                                type="checkbox"
                                checked={perms.o_r}
                                onChange={(e) => setPerms({ ...perms, o_r: e.target.checked })}
                                className="mx-auto rounded border-zinc-700 bg-zinc-950 text-emerald-500"
                            />
                            <input
                                type="checkbox"
                                checked={perms.o_w}
                                onChange={(e) => setPerms({ ...perms, o_w: e.target.checked })}
                                className="mx-auto rounded border-zinc-700 bg-zinc-950 text-emerald-500"
                            />
                            <input
                                type="checkbox"
                                checked={perms.o_x}
                                onChange={(e) => setPerms({ ...perms, o_x: e.target.checked })}
                                className="mx-auto rounded border-zinc-700 bg-zinc-950 text-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Octal display */}
                    <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl">
                        <span className="text-zinc-400">Sekizli (Octal) Mod:</span>
                        <span className="text-emerald-400 font-mono text-sm font-semibold">
                            {octalString}
                        </span>
                    </div>

                    {item.is_dir && (
                        <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={recursive}
                                onChange={(e) => setRecursive(e.target.checked)}
                                className="rounded border-zinc-700 bg-zinc-950 text-emerald-500"
                            />
                            <span>Alt dizinlere ve dosyalara özyinelemeli uygula (-R)</span>
                        </label>
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
                            disabled={changePermissions.isPending}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm transition disabled:opacity-50"
                        >
                            {changePermissions.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Uygula</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
