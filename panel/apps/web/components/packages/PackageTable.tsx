"use client";

import React, { useState } from "react";
import {
    Copy,
    Check,
    Terminal,
    ChevronRight,
} from "lucide-react";
import type { NixPackage } from "@/types/packages";

interface PackageTableProps {
    packages: NixPackage[];
    onSelect: (pkg: NixPackage) => void;
    onRunInTerminal?: (pkg: NixPackage) => void;
}

export function PackageTable({ packages, onSelect, onRunInTerminal }: PackageTableProps) {
    const [copiedAttr, setCopiedAttr] = useState<string | null>(null);

    const handleCopy = (e: React.MouseEvent, attrName: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(`pkgs.${attrName}`);
        setCopiedAttr(attrName);
        setTimeout(() => setCopiedAttr(null), 2000);
    };

    return (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/40 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        <tr>
                            <th className="py-2.5 px-4">Paket / Nitelik Adı</th>
                            <th className="py-2.5 px-3">Versiyon</th>
                            <th className="py-2.5 px-3">Açıklama</th>
                            <th className="py-2.5 px-3">Programlar</th>
                            <th className="py-2.5 px-3">Lisans</th>
                            <th className="py-2.5 px-3">Durum</th>
                            <th className="py-2.5 px-4 text-right">Eylemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 font-normal">
                        {packages.map((pkg) => (
                            <tr
                                key={pkg.package_attr_name}
                                onClick={() => onSelect(pkg)}
                                className="group hover:bg-accent/30 cursor-pointer transition-colors"
                            >
                                {/* Name */}
                                <td className="py-2.5 px-4">
                                    <div className="flex flex-col">
                                        <span className="font-mono font-medium text-foreground group-hover:text-primary transition-colors">
                                            {pkg.package_attr_name}
                                        </span>
                                        {pkg.package_pname && pkg.package_pname !== pkg.package_attr_name && (
                                            <span className="font-mono text-[10px] text-muted-foreground/60">
                                                {pkg.package_pname}
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* Version */}
                                <td className="py-2.5 px-3 font-mono text-muted-foreground">
                                    {pkg.package_pversion ? `v${pkg.package_pversion}` : "—"}
                                </td>

                                {/* Description */}
                                <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">
                                    {pkg.package_description || "—"}
                                </td>

                                {/* Programs */}
                                <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                                    {pkg.package_programs && pkg.package_programs.length > 0
                                        ? pkg.package_programs.slice(0, 2).join(", ") +
                                          (pkg.package_programs.length > 2
                                              ? ` +${pkg.package_programs.length - 2}`
                                              : "")
                                        : pkg.package_mainProgram || "—"}
                                </td>

                                {/* License */}
                                <td className="py-2.5 px-3">
                                    {pkg.package_license_set && pkg.package_license_set.length > 0 ? (
                                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                            {pkg.package_license_set[0]}
                                        </span>
                                    ) : (
                                        "—"
                                    )}
                                </td>

                                {/* Status */}
                                <td className="py-2.5 px-3">
                                    {pkg.is_installed ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500 border border-emerald-500/20">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            Kurulu
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground/50">—</span>
                                    )}
                                </td>

                                {/* Actions */}
                                <td className="py-2.5 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <button
                                            type="button"
                                            onClick={(e) => handleCopy(e, pkg.package_attr_name)}
                                            title="Nix snippet kopyala"
                                            className="flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                                        >
                                            {copiedAttr === pkg.package_attr_name ? (
                                                <Check className="h-3 w-3 text-emerald-500" />
                                            ) : (
                                                <Copy className="h-3 w-3" />
                                            )}
                                        </button>

                                        {onRunInTerminal && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRunInTerminal(pkg);
                                                }}
                                                title="Terminalde Çalıştır"
                                                className="flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-colors"
                                            >
                                                <Terminal className="h-3 w-3" />
                                            </button>
                                        )}

                                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-foreground" />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
