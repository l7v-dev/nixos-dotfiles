"use client";

import React, { useState } from "react";
import {
    Package,
    CheckCircle2,
    Copy,
    Check,
    Terminal,
    ExternalLink,
    Code,
    ChevronRight,
} from "lucide-react";
import type { NixPackage } from "@/types/packages";

interface PackageCardProps {
    pkg: NixPackage;
    onSelect: (pkg: NixPackage) => void;
    onRunInTerminal?: (pkg: NixPackage) => void;
}

export function PackageCard({ pkg, onSelect, onRunInTerminal }: PackageCardProps) {
    const [copied, setCopied] = useState(false);

    const handleCopySnippet = (e: React.MouseEvent) => {
        e.stopPropagation();
        const snippet = `pkgs.${pkg.package_attr_name}`;
        navigator.clipboard.writeText(snippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleTerminalClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onRunInTerminal) {
            onRunInTerminal(pkg);
        }
    };

    return (
        <div
            onClick={() => onSelect(pkg)}
            className="group relative flex flex-col justify-between rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-accent/25 hover:shadow-xs cursor-pointer"
        >
            {/* Header: Name, Version & Status */}
            <div>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                {pkg.package_attr_name}
                            </span>
                            {pkg.package_pversion && (
                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                    v{pkg.package_pversion}
                                </span>
                            )}
                        </div>

                        {pkg.package_pname && pkg.package_pname !== pkg.package_attr_name && (
                            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/60">
                                {pkg.package_pname}
                            </p>
                        )}
                    </div>

                    {/* Installed Status Badge */}
                    {pkg.is_installed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500 border border-emerald-500/20 shrink-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Kurulu
                        </span>
                    ) : null}
                </div>

                {/* Description */}
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {pkg.package_description || "Açıklama bulunmuyor."}
                </p>
            </div>

            {/* Footer Metadata & Actions */}
            <div className="mt-3.5 pt-3 border-t border-border/50 flex flex-col gap-2.5">
                {/* Programs and License tags */}
                <div className="flex items-center justify-between gap-2 text-[11px]">
                    {/* Executable programs */}
                    <div className="flex items-center gap-1 overflow-hidden min-w-0">
                        {pkg.package_programs && pkg.package_programs.length > 0 ? (
                            <div className="flex items-center gap-1 overflow-hidden">
                                <Terminal className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                <span className="truncate font-mono text-[10px] text-muted-foreground">
                                    {pkg.package_programs.slice(0, 3).join(", ")}
                                    {pkg.package_programs.length > 3 && ` +${pkg.package_programs.length - 3}`}
                                </span>
                            </div>
                        ) : pkg.package_mainProgram ? (
                            <div className="flex items-center gap-1">
                                <Terminal className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    {pkg.package_mainProgram}
                                </span>
                            </div>
                        ) : null}
                    </div>

                    {/* License Badge */}
                    {pkg.package_license_set && pkg.package_license_set.length > 0 && (
                        <span className="rounded bg-muted/70 px-1.5 py-0.5 text-[10px] text-muted-foreground shrink-0 max-w-[120px] truncate">
                            {pkg.package_license_set[0]}
                        </span>
                    )}
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center justify-between gap-1">
                    <button
                        type="button"
                        onClick={handleCopySnippet}
                        title="Deklaratif Nix ifadesini kopyala (pkgs.<attr>)"
                        className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[10px] font-mono text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        {copied ? (
                            <>
                                <Check className="h-3 w-3 text-emerald-500" />
                                <span className="text-emerald-500">Kopyalandı</span>
                            </>
                        ) : (
                            <>
                                <Copy className="h-3 w-3" />
                                <span>pkgs.{pkg.package_attr_name}</span>
                            </>
                        )}
                    </button>

                    <div className="flex items-center gap-1">
                        {onRunInTerminal && (
                            <button
                                type="button"
                                onClick={handleTerminalClick}
                                title="Terminalde Çalıştır (nix run)"
                                className="flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                                <Terminal className="h-3 w-3" />
                            </button>
                        )}
                        <span className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/60 group-hover:text-foreground">
                            <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
