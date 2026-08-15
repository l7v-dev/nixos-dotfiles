"use client";

import React, { useState } from "react";
import {
    X,
    Package,
    Terminal,
    Copy,
    Check,
    ExternalLink,
    Code2,
    Layers,
    Cpu,
    GitBranch,
    Globe,
    CheckCircle2,
    FileText,
} from "lucide-react";
import type { NixPackage } from "@/types/packages";

interface PackageDetailDrawerProps {
    pkg: NixPackage | null;
    onClose: () => void;
    onRunInTerminal?: (pkg: NixPackage) => void;
}

export function PackageDetailDrawer({
    pkg,
    onClose,
    onRunInTerminal,
}: PackageDetailDrawerProps) {
    const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"overview" | "snippets" | "platforms">("overview");

    if (!pkg) return null;

    const copyText = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSnippet(id);
        setTimeout(() => setCopiedSnippet(null), 2000);
    };

    // GitHub position URL
    const githubUrl = pkg.package_position
        ? `https://github.com/NixOS/nixpkgs/blob/master/${pkg.package_position.replace(/:[0-9]+$/, "")}`
        : null;

    const homepage = pkg.package_homepage && pkg.package_homepage.length > 0 ? pkg.package_homepage[0] : null;

    // Snippets
    const nixosSnippet = `# /etc/nixos/configuration.nix
environment.systemPackages = with pkgs; [
  ${pkg.package_attr_name}
];`;

    const hmSnippet = `# ~/.config/home-manager/home.nix
home.packages = with pkgs; [
  ${pkg.package_attr_name}
];`;

    const flakeSnippet = `# flake.nix devShell
devShells.\${system}.default = pkgs.mkShell {
  buildInputs = with pkgs; [
    ${pkg.package_attr_name}
  ];
};`;

    const nixRunCommand = `nix run nixpkgs#${pkg.package_attr_name}`;
    const nixShellCommand = `nix shell nixpkgs#${pkg.package_attr_name}`;

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
                            <h2 className="font-mono text-lg font-bold text-foreground">
                                {pkg.package_attr_name}
                            </h2>
                            {pkg.package_pversion && (
                                <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary border border-primary/20">
                                    v{pkg.package_pversion}
                                </span>
                            )}
                            {pkg.is_installed && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500 border border-emerald-500/20">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Kurulu
                                </span>
                            )}
                        </div>

                        {pkg.package_pname && (
                            <p className="mt-1 font-mono text-xs text-muted-foreground">
                                Package Name: <span className="text-foreground">{pkg.package_pname}</span>
                            </p>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border px-5 text-xs">
                    {[
                        { id: "overview", label: "Genel Bakış" },
                        { id: "snippets", label: "Deklaratif Kod & Snippets" },
                        {
                            id: "platforms",
                            label: `Platformlar (${pkg.package_platforms?.length ?? 0})`,
                        },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={`border-b-2 py-2.5 px-3 font-medium transition-all ${
                                activeTab === tab.id
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Tab: Overview */}
                    {activeTab === "overview" && (
                        <div className="space-y-4">
                            {/* Description */}
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5">
                                    Açıklama
                                </h3>
                                <p className="text-sm text-foreground/90 leading-relaxed bg-background/50 rounded-lg p-3 border border-border">
                                    {pkg.package_description || "Açıklama bulunmuyor."}
                                </p>
                            </div>

                            {/* Executable programs */}
                            {(pkg.package_programs && pkg.package_programs.length > 0) || pkg.package_mainProgram ? (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5">
                                        Çalıştırılabilir Programlar (Binaries)
                                    </h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(pkg.package_programs || [pkg.package_mainProgram!]).map((prog) => (
                                            <span
                                                key={prog}
                                                className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 font-mono text-xs text-foreground"
                                            >
                                                <Terminal className="h-3 w-3 text-primary" />
                                                {prog}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {/* Outputs */}
                            {pkg.package_outputs && pkg.package_outputs.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5">
                                        Paket Çıktıları (Outputs)
                                    </h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {pkg.package_outputs.map((out) => (
                                            <span
                                                key={out}
                                                className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground"
                                            >
                                                {out}
                                                {out === pkg.package_default_output && " (default)"}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Licenses */}
                            {pkg.package_license_set && pkg.package_license_set.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5">
                                        Lisanslar
                                    </h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {pkg.package_license_set.map((lic) => (
                                            <span
                                                key={lic}
                                                className="rounded border border-border bg-card px-2 py-0.5 text-xs text-foreground"
                                            >
                                                {lic}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Links & Source Reference */}
                            <div className="pt-2 border-t border-border space-y-2">
                                {homepage && (
                                    <a
                                        href={homepage}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 text-xs text-foreground hover:bg-accent hover:text-primary transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Globe className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">Web Sitesi / Ana Sayfa</span>
                                        </div>
                                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                    </a>
                                )}

                                {githubUrl && (
                                    <a
                                        href={githubUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 text-xs text-foreground hover:bg-accent hover:text-primary transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <GitBranch className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-mono">{pkg.package_position}</span>
                                        </div>
                                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab: Snippets & Declarative Config */}
                    {activeTab === "snippets" && (
                        <div className="space-y-4">
                            {/* NixOS Config */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-foreground">
                                        NixOS Configuration (configuration.nix)
                                    </span>
                                    <button
                                        onClick={() => copyText(nixosSnippet, "nixos")}
                                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                                    >
                                        {copiedSnippet === "nixos" ? (
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
                                <pre className="rounded-lg border border-border bg-background p-3 font-mono text-xs text-foreground/90 overflow-x-auto">
                                    <code>{nixosSnippet}</code>
                                </pre>
                            </div>

                            {/* Home Manager */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-foreground">
                                        Home Manager (home.nix)
                                    </span>
                                    <button
                                        onClick={() => copyText(hmSnippet, "hm")}
                                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                                    >
                                        {copiedSnippet === "hm" ? (
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
                                <pre className="rounded-lg border border-border bg-background p-3 font-mono text-xs text-foreground/90 overflow-x-auto">
                                    <code>{hmSnippet}</code>
                                </pre>
                            </div>

                            {/* Flake devShell */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-foreground">
                                        Flake DevShell (flake.nix)
                                    </span>
                                    <button
                                        onClick={() => copyText(flakeSnippet, "flake")}
                                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                                    >
                                        {copiedSnippet === "flake" ? (
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
                                <pre className="rounded-lg border border-border bg-background p-3 font-mono text-xs text-foreground/90 overflow-x-auto">
                                    <code>{flakeSnippet}</code>
                                </pre>
                            </div>

                            {/* CLI Commands */}
                            <div className="space-y-2 pt-2 border-t border-border">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Hızlı CLI Komutları
                                </h4>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 text-xs font-mono">
                                        <span className="text-foreground">{nixRunCommand}</span>
                                        <button
                                            onClick={() => copyText(nixRunCommand, "nix-run")}
                                            className="p-1 text-muted-foreground hover:text-foreground"
                                        >
                                            {copiedSnippet === "nix-run" ? (
                                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 text-xs font-mono">
                                        <span className="text-foreground">{nixShellCommand}</span>
                                        <button
                                            onClick={() => copyText(nixShellCommand, "nix-shell")}
                                            className="p-1 text-muted-foreground hover:text-foreground"
                                        >
                                            {copiedSnippet === "nix-shell" ? (
                                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab: Platforms */}
                    {activeTab === "platforms" && (
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                                Bu paketin resmi olarak derlendiği ve desteklendiği mimariler:
                            </p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {pkg.package_platforms && pkg.package_platforms.length > 0 ? (
                                    pkg.package_platforms.map((plat) => (
                                        <div
                                            key={plat}
                                            className="flex items-center gap-1.5 rounded-md border border-border bg-background p-2 font-mono text-[11px] text-foreground"
                                        >
                                            <Cpu className="h-3.5 w-3.5 text-primary shrink-0" />
                                            <span className="truncate">{plat}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground col-span-2">
                                        Platform bilgisi mevcut değil.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Drawer Footer Actions */}
                <div className="border-t border-border p-4 bg-card/50 flex items-center justify-between gap-3">
                    <button
                        onClick={() => copyText(`pkgs.${pkg.package_attr_name}`, "footer-copy")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground hover:bg-accent transition-colors"
                    >
                        {copiedSnippet === "footer-copy" ? (
                            <>
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-emerald-500">Kopyalandı!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>pkgs.{pkg.package_attr_name}</span>
                            </>
                        )}
                    </button>

                    {onRunInTerminal && (
                        <button
                            onClick={() => onRunInTerminal(pkg)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
                        >
                            <Terminal className="h-3.5 w-3.5" />
                            <span>Terminalde Çalıştır (nix run)</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
