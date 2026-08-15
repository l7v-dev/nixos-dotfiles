"use client";

import React, { useState } from "react";
import {
    Sliders,
    Copy,
    Check,
    ChevronRight,
    FileCode,
    FileText,
} from "lucide-react";
import type { NixOption } from "@/types/packages";

interface OptionCardProps {
    option: NixOption;
    onSelect: (option: NixOption) => void;
}

export function OptionCard({ option, onSelect }: OptionCardProps) {
    const [copied, setCopied] = useState(false);

    const isHM =
        option.option_source?.includes("home-manager") ||
        option.scope === "home-manager";

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        const snippet = `${option.option_name} = ${
            option.option_default && option.option_default !== "null"
                ? option.option_default
                : "true"
        };`;
        navigator.clipboard.writeText(snippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Strip rendered-html tags for card snippet preview
    const cleanDescription = option.option_description
        ? option.option_description
              .replace(/<[^>]*>?/gm, "")
              .replace(/\n+/g, " ")
              .trim()
        : "Açıklama bulunmuyor.";

    return (
        <div
            onClick={() => onSelect(option)}
            className="group relative flex flex-col justify-between rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-accent/25 hover:shadow-xs cursor-pointer"
        >
            <div>
                {/* Header: Option Name, Scope Tag & Type */}
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-sm font-semibold text-foreground group-hover:text-primary transition-colors break-all">
                                {option.option_name}
                            </span>
                        </div>

                        {/* Scope Tag (NixOS vs Home-Manager) */}
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                    isHM
                                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                        : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                }`}
                            >
                                {isHM ? "Home Manager" : "NixOS Module"}
                            </span>

                            {option.option_type && (
                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground truncate max-w-[200px]">
                                    {option.option_type}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Description Preview */}
                <p className="mt-2.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {cleanDescription}
                </p>

                {/* Default value preview */}
                {option.option_default && (
                    <div className="mt-3 rounded bg-background/60 p-2 border border-border/50 text-[11px] font-mono text-muted-foreground">
                        <span className="text-muted-foreground/60">Varsayılan: </span>
                        <span className="text-foreground truncate block">
                            {option.option_default.length > 60
                                ? option.option_default.slice(0, 60) + "..."
                                : option.option_default}
                        </span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-3.5 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={handleCopy}
                    title="Seçenek atamasını kopyala"
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
                            <span>Kopyala</span>
                        </>
                    )}
                </button>

                <div className="flex items-center gap-1">
                    {option.option_source && (
                        <span className="truncate max-w-[150px] font-mono text-[10px] text-muted-foreground/50">
                            {option.option_source.split("/").pop()}
                        </span>
                    )}
                    <span className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/60 group-hover:text-foreground">
                        <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                </div>
            </div>
        </div>
    );
}
