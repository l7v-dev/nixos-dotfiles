"use client";

import React, { useState } from "react";
import {
    X,
    Sliders,
    Copy,
    Check,
    ExternalLink,
    FileCode,
    Code2,
    BookOpen,
} from "lucide-react";
import type { NixOption } from "@/types/packages";

interface OptionDetailDrawerProps {
    option: NixOption | null;
    onClose: () => void;
}

export function OptionDetailDrawer({ option, onClose }: OptionDetailDrawerProps) {
    const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

    if (!option) return null;

    const isHM =
        option.option_source?.includes("home-manager") ||
        option.scope === "home-manager";

    const copyText = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSnippet(id);
        setTimeout(() => setCopiedSnippet(null), 2000);
    };

    // GitHub Source URL
    let githubUrl: string | null = null;
    if (option.option_source) {
        if (isHM) {
            githubUrl = `https://github.com/nix-community/home-manager/blob/master/${option.option_source.replace(
                /^home-manager\//,
                ""
            )}`;
        } else {
            githubUrl = `https://github.com/NixOS/nixpkgs/blob/master/${option.option_source.replace(
                /^nixos\//,
                "nixos/"
            )}`;
        }
    }

    // Default or example snippet
    const configSnippet = `${option.option_name} = ${
        option.option_example
            ? option.option_example
            : option.option_default && option.option_default !== "null"
            ? option.option_default
            : "true"
    };`;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
            <div
                className="fixed inset-0"
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border p-5">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span
                                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                    isHM
                                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                        : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                }`}
                            >
                                {isHM ? "Home Manager Option" : "NixOS Module Option"}
                            </span>
                        </div>

                        <h2 className="mt-2 font-mono text-base font-bold text-foreground break-all">
                            {option.option_name}
                        </h2>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                    {/* Description */}
                    <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5 flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5" />
                            Açıklama & Dokümantasyon
                        </h3>
                        {option.option_description ? (
                            <div
                                className="prose prose-xs dark:prose-invert max-w-none rounded-lg border border-border bg-background/50 p-4 leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0 [&>pre]:bg-background [&>pre]:p-2 [&>code]:font-mono [&>code]:text-primary"
                                dangerouslySetInnerHTML={{
                                    __html: option.option_description,
                                }}
                            />
                        ) : (
                            <p className="text-muted-foreground bg-background/50 rounded-lg p-3 border border-border">
                                Açıklama bulunmuyor.
                            </p>
                        )}
                    </div>

                    {/* Option Type */}
                    {option.option_type && (
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5 flex items-center gap-1.5">
                                <Code2 className="h-3.5 w-3.5" />
                                Değer Türü (Type)
                            </h3>
                            <div className="rounded-lg border border-border bg-background p-3 font-mono text-foreground break-all">
                                <code>{option.option_type}</code>
                            </div>
                        </div>
                    )}

                    {/* Default Value */}
                    {option.option_default && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                                    Varsayılan Değer (Default)
                                </h3>
                                <button
                                    onClick={() => copyText(option.option_default!, "default")}
                                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                                >
                                    {copiedSnippet === "default" ? (
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
                            </div>
                            <pre className="rounded-lg border border-border bg-background p-3 font-mono text-xs text-foreground overflow-x-auto">
                                <code>{option.option_default}</code>
                            </pre>
                        </div>
                    )}

                    {/* Example Value */}
                    {option.option_example && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                                    Örnek Yapılandırma (Example)
                                </h3>
                                <button
                                    onClick={() => copyText(option.option_example!, "example")}
                                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                                >
                                    {copiedSnippet === "example" ? (
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
                            </div>
                            <pre className="rounded-lg border border-border bg-background p-3 font-mono text-xs text-foreground overflow-x-auto">
                                <code>{option.option_example}</code>
                            </pre>
                        </div>
                    )}

                    {/* Declarative Assignment Snippet */}
                    <div className="space-y-1.5 pt-2 border-t border-border">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                                Deklaratif Tanımlama Snippet&apos;ı
                            </h3>
                            <button
                                onClick={() => copyText(configSnippet, "config")}
                                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                            >
                                {copiedSnippet === "config" ? (
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
                        </div>
                        <pre className="rounded-lg border border-border bg-background p-3 font-mono text-xs text-primary overflow-x-auto">
                            <code>{configSnippet}</code>
                        </pre>
                    </div>

                    {/* Source File Link */}
                    {githubUrl && (
                        <div className="pt-2 border-t border-border">
                            <a
                                href={githubUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between rounded-lg border border-border bg-background p-3 text-foreground hover:bg-accent hover:text-primary transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <FileCode className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-mono text-xs truncate max-w-sm">
                                        {option.option_source}
                                    </span>
                                </div>
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            </a>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-border p-4 bg-card/50 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        {isHM ? "Home Manager" : "NixOS Module"}
                    </span>
                    <button
                        onClick={() => copyText(configSnippet, "footer-copy")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
                    >
                        {copiedSnippet === "footer-copy" ? (
                            <>
                                <Check className="h-3.5 w-3.5 text-primary-foreground" />
                                <span>Kopyalandı!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Seçeneği Kopyala</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
