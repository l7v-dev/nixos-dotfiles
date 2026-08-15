"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    usePackageSearch,
    useOptionSearch,
    useInstalledPackages,
} from "@/hooks/usePackages";
import { PackageSearchInput } from "@/components/packages/PackageSearchInput";
import { PackageCard } from "@/components/packages/PackageCard";
import { PackageTable } from "@/components/packages/PackageTable";
import { PackageDetailDrawer } from "@/components/packages/PackageDetailDrawer";
import { OptionCard } from "@/components/packages/OptionCard";
import { OptionDetailDrawer } from "@/components/packages/OptionDetailDrawer";
import { InstalledPackagesView } from "@/components/packages/InstalledPackagesView";
import type {
    NixPackage,
    NixOption,
    SearchTab,
    ChannelOption,
    OptionScope,
} from "@/types/packages";
import {
    Package,
    Sliders,
    Layers,
    Search,
    AlertCircle,
    Terminal,
    Sparkles,
    CheckCircle2,
    HardDrive,
    ArrowRight,
} from "lucide-react";
import { useHostStore } from "@/store/host-store";
import { useTerminalStore, dispatchTerminalInput } from "@/store/terminal-store";

function PackagesPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const host = useHostStore((s) => s.selectedHost);
    const { addTab } = useTerminalStore();

    // Query states
    const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "ripgrep");
    const [activeTab, setActiveTab] = useState<SearchTab>(
        (searchParams.get("tab") as SearchTab) || "packages"
    );
    const [channel, setChannel] = useState<ChannelOption>("nixos-unstable");
    const [optionScope, setOptionScope] = useState<OptionScope>("all");
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

    // Drawer selection states
    const [selectedPackage, setSelectedPackage] = useState<NixPackage | null>(null);
    const [selectedOption, setSelectedOption] = useState<NixOption | null>(null);

    // Queries
    const {
        data: packageResults,
        isLoading: isPkgLoading,
        error: pkgError,
    } = usePackageSearch(searchQuery, channel, 50, {
        enabled: activeTab === "packages",
    });

    const {
        data: optionResults,
        isLoading: isOptLoading,
        error: optError,
    } = useOptionSearch(searchQuery, channel, optionScope, 50, {
        enabled: activeTab === "options",
    });

    const {
        data: installedData,
        isLoading: isInstalledLoading,
        error: installedError,
    } = useInstalledPackages();

    const handleRunInTerminal = (pkg: NixPackage) => {
        addTab(host, `nix run ${pkg.package_attr_name}`);
        router.push(`/terminal`);
        setTimeout(() => {
            dispatchTerminalInput(`nix run nixpkgs#${pkg.package_attr_name}\n`);
        }, 600);
    };

    const handleSelectInstalledPName = (pname: string) => {
        setSearchQuery(pname);
        setActiveTab("packages");
    };

    const totalResults =
        activeTab === "packages"
            ? packageResults?.total
            : activeTab === "options"
            ? optionResults?.total
            : undefined;

    const elapsedMs =
        activeTab === "packages"
            ? packageResults?.elapsed_ms
            : activeTab === "options"
            ? optionResults?.elapsed_ms
            : undefined;

    const isLoading =
        activeTab === "packages"
            ? isPkgLoading
            : activeTab === "options"
            ? isOptLoading
            : isInstalledLoading;

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        Nixpkgs & Seçenek Gezgini
                    </h1>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Nixpkgs paket havuzu, NixOS modülleri ve Home Manager seçeneklerinde anlık arama yapın —{" "}
                        <span className="font-mono font-medium text-foreground">{host}</span>
                    </p>
                </div>
            </div>

            {/* Search Input and Control Bar */}
            <PackageSearchInput
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                channel={channel}
                onChannelChange={setChannel}
                optionScope={optionScope}
                onOptionScopeChange={setOptionScope}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                totalResults={totalResults}
                elapsedMs={elapsedMs}
                isLoading={isLoading}
            />

            {/* Tab 1: Nixpkgs Packages */}
            {activeTab === "packages" && (
                <div className="space-y-4">
                    {isPkgLoading ? (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="h-36 rounded-lg border border-border bg-card p-4 animate-pulse space-y-3"
                                >
                                    <div className="h-4 bg-muted rounded w-1/2" />
                                    <div className="h-3 bg-muted rounded w-3/4" />
                                    <div className="h-3 bg-muted rounded w-1/3" />
                                </div>
                            ))}
                        </div>
                    ) : pkgError ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-destructive/20 bg-destructive/5 text-destructive">
                            <AlertCircle className="h-8 w-8 mb-2" />
                            <p className="text-sm font-semibold">Arama sırasında bir hata oluştu</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-md">
                                {(pkgError as Error).message}
                            </p>
                        </div>
                    ) : packageResults && packageResults.results.length > 0 ? (
                        viewMode === "grid" ? (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {packageResults.results.map((pkg) => (
                                    <PackageCard
                                        key={pkg.package_attr_name}
                                        pkg={pkg}
                                        onSelect={setSelectedPackage}
                                        onRunInTerminal={handleRunInTerminal}
                                    />
                                ))}
                            </div>
                        ) : (
                            <PackageTable
                                packages={packageResults.results}
                                onSelect={setSelectedPackage}
                                onRunInTerminal={handleRunInTerminal}
                            />
                        )
                    ) : searchQuery.trim().length >= 2 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed border-border">
                            <Package className="h-8 w-8 text-muted-foreground/40 mb-2" />
                            <p className="text-sm font-medium text-foreground">Sonuç bulunamadı</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                &ldquo;{searchQuery}&rdquo; sorgusu ile eşleşen bir paket bulunamadı.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed border-border">
                            <Search className="h-8 w-8 text-muted-foreground/40 mb-2" />
                            <p className="text-sm font-medium text-foreground">Aramaya Başlayın</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Arama yapmak için en az 2 karakter girin (örn. git, ripgrep, docker, neovim).
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: NixOS & Home Manager Options */}
            {activeTab === "options" && (
                <div className="space-y-4">
                    {isOptLoading ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="h-36 rounded-lg border border-border bg-card p-4 animate-pulse space-y-3"
                                >
                                    <div className="h-4 bg-muted rounded w-2/3" />
                                    <div className="h-3 bg-muted rounded w-full" />
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                </div>
                            ))}
                        </div>
                    ) : optError ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-destructive/20 bg-destructive/5 text-destructive">
                            <AlertCircle className="h-8 w-8 mb-2" />
                            <p className="text-sm font-semibold">Seçenek araması sırasında bir hata oluştu</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-md">
                                {(optError as Error).message}
                            </p>
                        </div>
                    ) : optionResults && optionResults.results.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {optionResults.results.map((opt) => (
                                <OptionCard
                                    key={opt.option_name}
                                    option={opt}
                                    onSelect={setSelectedOption}
                                />
                            ))}
                        </div>
                    ) : searchQuery.trim().length >= 2 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed border-border">
                            <Sliders className="h-8 w-8 text-muted-foreground/40 mb-2" />
                            <p className="text-sm font-medium text-foreground">Seçenek bulunamadı</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                &ldquo;{searchQuery}&rdquo; sorgusu ile eşleşen bir yapılandırma seçeneği bulunamadı.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed border-border">
                            <Search className="h-8 w-8 text-muted-foreground/40 mb-2" />
                            <p className="text-sm font-medium text-foreground">Seçenek Arayın</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                NixOS veya Home Manager seçeneklerini aramak için terim girin (örn. firewall, nginx, postgresql).
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Tab 3: Installed Packages */}
            {activeTab === "installed" && (
                <InstalledPackagesView
                    packages={installedData?.packages || []}
                    isLoading={isInstalledLoading}
                    searchQuery={searchQuery}
                    onSelectPackage={handleSelectInstalledPName}
                />
            )}

            {/* Slide-over Drawers */}
            <PackageDetailDrawer
                pkg={selectedPackage}
                onClose={() => setSelectedPackage(null)}
                onRunInTerminal={handleRunInTerminal}
            />

            <OptionDetailDrawer
                option={selectedOption}
                onClose={() => setSelectedOption(null)}
            />
        </div>
    );
}

export default function PackagesPage() {
    return (
        <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Yükleniyor...</div>}>
            <PackagesPageContent />
        </Suspense>
    );
}
