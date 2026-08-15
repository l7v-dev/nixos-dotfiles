"use client";

import React, { useState } from "react";
import {
    HardDrive,
    Search,
    Copy,
    Check,
    Layers,
    Terminal,
    User,
    Server,
    ExternalLink,
} from "lucide-react";
import type { InstalledPackage } from "@/types/packages";

interface InstalledPackagesViewProps {
    packages: InstalledPackage[];
    isLoading: boolean;
    searchQuery: string;
    onSelectPackage?: (pname: string) => void;
}

export function InstalledPackagesView({
    packages,
    isLoading,
    searchQuery,
    onSelectPackage,
}: InstalledPackagesViewProps) {
    const [typeFilter, setTypeFilter] = useState<"all" | "system" | "user">("all");
    const [copiedPath, setCopiedPath] = useState<string | null>(null);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedPath(text);
        setTimeout(() => setCopiedPath(null), 2000);
    };

    const filtered = packages.filter((pkg) => {
        if (typeFilter !== "all" && pkg.type !== typeFilter) {
            return false;
        }
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            pkg.pname.toLowerCase().includes(q) ||
            pkg.version.toLowerCase().includes(q) ||
            pkg.store_path.toLowerCase().includes(q) ||
            pkg.programs?.some((p) => p.toLowerCase().includes(q))
        );
    });

    const systemCount = packages.filter((p) => p.type === "system").length;
    const userCount = packages.filter((p) => p.type === "user").length;

    return (
        <div className="space-y-4">
            {/* Stats and Type Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-3 rounded-lg border border-border">
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground">{packages.length}</span>
                        <span className="text-muted-foreground">Toplam Paket</span>
                    </div>
                    <div className="h-3 w-px bg-border" />
                    <div className="flex items-center gap-1.5">
                        <Server className="h-3.5 w-3.5 text-blue-500" />
                        <span className="font-semibold text-foreground">{systemCount}</span>
                        <span className="text-muted-foreground">Sistem</span>
                    </div>
                    <div className="h-3 w-px bg-border" />
                    <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="font-semibold text-foreground">{userCount}</span>
                        <span className="text-muted-foreground">Kullanıcı</span>
                    </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 text-xs">
                    {[
                        { id: "all", label: "Tümü" },
                        { id: "system", label: "Sistem (NixOS)" },
                        { id: "user", label: "Kullanıcı Profili" },
                    ].map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setTypeFilter(f.id as typeof typeFilter)}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                                typeFilter === f.id
                                    ? "bg-accent text-foreground shadow-2xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex items-center justify-center p-12 text-muted-foreground text-xs">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2" />
                    Kurulu paketler taranıyor...
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed border-border">
                    <HardDrive className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-medium text-foreground">Paket bulunamadı</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Arama filtrenize uygun kurulu paket bulunamadı.
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="border-b border-border bg-muted/40 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                <tr>
                                    <th className="py-2.5 px-4">Paket Adı</th>
                                    <th className="py-2.5 px-3">Versiyon</th>
                                    <th className="py-2.5 px-3">Tür</th>
                                    <th className="py-2.5 px-3">Programlar (Binaries)</th>
                                    <th className="py-2.5 px-3">Nix Store Yolu</th>
                                    <th className="py-2.5 px-4 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50 font-normal">
                                {filtered.map((pkg) => (
                                    <tr
                                        key={pkg.store_path}
                                        className="hover:bg-accent/30 transition-colors"
                                    >
                                        {/* PName */}
                                        <td className="py-2.5 px-4">
                                            <button
                                                onClick={() => onSelectPackage && onSelectPackage(pkg.pname)}
                                                className="font-mono font-medium text-foreground hover:text-primary transition-colors text-left"
                                            >
                                                {pkg.pname}
                                            </button>
                                        </td>

                                        {/* Version */}
                                        <td className="py-2.5 px-3 font-mono text-muted-foreground">
                                            v{pkg.version}
                                        </td>

                                        {/* Type */}
                                        <td className="py-2.5 px-3">
                                            <span
                                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                                    pkg.type === "system"
                                                        ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                                        : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                                }`}
                                            >
                                                {pkg.type === "system" ? "Sistem" : "Kullanıcı"}
                                            </span>
                                        </td>

                                        {/* Programs */}
                                        <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                                            {pkg.programs && pkg.programs.length > 0 ? (
                                                <div className="flex items-center gap-1">
                                                    <Terminal className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                                    <span className="truncate max-w-[180px]">
                                                        {pkg.programs.join(", ")}
                                                    </span>
                                                </div>
                                            ) : (
                                                "—"
                                            )}
                                        </td>

                                        {/* Store Path */}
                                        <td className="py-2.5 px-3 font-mono text-[10px] text-muted-foreground/60 max-w-xs truncate">
                                            {pkg.store_path}
                                        </td>

                                        {/* Actions */}
                                        <td className="py-2.5 px-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(pkg.store_path)}
                                                title="Nix store yolunu kopyala"
                                                className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                                            >
                                                {copiedPath === pkg.store_path ? (
                                                    <Check className="h-3 w-3 text-emerald-500" />
                                                ) : (
                                                    <Copy className="h-3 w-3" />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
