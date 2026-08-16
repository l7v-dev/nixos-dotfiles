"use client";

import React, { useState } from "react";
import {
    Layers,
    Server,
    User,
    Terminal,
    Copy,
    Check,
    HardDrive,
} from "lucide-react";
import type { InstalledPackage } from "@/types/packages";

interface InstalledPackagesViewProps {
    packages: InstalledPackage[];
    isLoading?: boolean;
    onSelectPackage?: (pname: string) => void;
    searchQuery?: string;
}

export function InstalledPackagesView({
    packages,
    isLoading,
    onSelectPackage,
    searchQuery = "",
}: InstalledPackagesViewProps) {
    const [typeFilter, setTypeFilter] = useState<"all" | "system" | "user">("all");
    const [copiedPath, setCopiedPath] = useState<string | null>(null);

    const handleCopy = (path: string) => {
        navigator.clipboard.writeText(path);
        setCopiedPath(path);
        setTimeout(() => setCopiedPath(null), 2000);
    };

    const filtered = packages.filter((pkg) => {
        if (typeFilter !== "all" && pkg.type !== typeFilter) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            pkg.pname.toLowerCase().includes(q) ||
            pkg.version.toLowerCase().includes(q) ||
            pkg.programs?.some((p) => p.toLowerCase().includes(q))
        );
    });

    const systemCount = packages.filter((p) => p.type === "system").length;
    const userCount = packages.filter((p) => p.type === "user").length;

    return (
        <div className="space-y-4 font-sans">
            {/* Stats and Type Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-3 rounded-xl border border-border">
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-primary" strokeWidth={1.5} />
                        <span className="font-semibold text-foreground">{packages.length}</span>
                        <span className="text-muted-foreground">Total Packages</span>
                    </div>
                    <div className="h-3 w-px bg-border" />
                    <div className="flex items-center gap-1.5">
                        <Server className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
                        <span className="font-semibold text-foreground">{systemCount}</span>
                        <span className="text-muted-foreground">System</span>
                    </div>
                    <div className="h-3 w-px bg-border" />
                    <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
                        <span className="font-semibold text-foreground">{userCount}</span>
                        <span className="text-muted-foreground">User Profile</span>
                    </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 text-xs">
                    {[
                        { id: "all", label: "All" },
                        { id: "system", label: "System (NixOS)" },
                        { id: "user", label: "User Profile" },
                    ].map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setTypeFilter(f.id as typeof typeFilter)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                                typeFilter === f.id
                                    ? "bg-foreground text-background shadow-xs font-semibold"
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
                <div className="flex items-center justify-center p-12 text-muted-foreground text-xs font-mono">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2" />
                    Scanning installed packages...
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-card/40">
                    <HardDrive className="h-8 w-8 text-muted-foreground/40 mb-2" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-foreground">No packages found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        No installed package matches your search filter.
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="border-b border-border bg-muted/40 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                <tr>
                                    <th className="py-2.5 px-4">Package Name</th>
                                    <th className="py-2.5 px-3">Version</th>
                                    <th className="py-2.5 px-3">Scope</th>
                                    <th className="py-2.5 px-3">Binaries</th>
                                    <th className="py-2.5 px-3">Nix Store Path</th>
                                    <th className="py-2.5 px-4 text-right">Action</th>
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
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-medium ${
                                                    pkg.type === "system"
                                                        ? "bg-primary/10 text-primary border border-primary/20"
                                                        : "bg-muted text-muted-foreground border border-border"
                                                }`}
                                            >
                                                {pkg.type === "system" ? "System" : "User"}
                                            </span>
                                        </td>

                                        {/* Programs */}
                                        <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                                            {pkg.programs && pkg.programs.length > 0 ? (
                                                <div className="flex items-center gap-1">
                                                    <Terminal className="h-3 w-3 text-muted-foreground/60 shrink-0" strokeWidth={1.5} />
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
                                                title="Copy Nix store path"
                                                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                                            >
                                                {copiedPath === pkg.store_path ? (
                                                    <Check className="h-3 w-3 text-emerald-500" strokeWidth={2} />
                                                ) : (
                                                    <Copy className="h-3 w-3" strokeWidth={1.5} />
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
