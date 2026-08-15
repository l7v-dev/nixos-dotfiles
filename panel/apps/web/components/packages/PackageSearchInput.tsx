"use client";

import React, { useEffect, useRef } from "react";
import {
    Search,
    X,
    LayoutGrid,
    Table as TableIcon,
    Package,
    Sliders,
    Layers,
    CheckCircle2,
    Clock,
} from "lucide-react";
import type { SearchTab, ChannelOption, OptionScope } from "@/types/packages";

interface PackageSearchInputProps {
    searchQuery: string;
    onSearchChange: (q: string) => void;
    activeTab: SearchTab;
    onTabChange: (tab: SearchTab) => void;
    channel: ChannelOption;
    onChannelChange: (ch: ChannelOption) => void;
    optionScope: OptionScope;
    onOptionScopeChange: (scope: OptionScope) => void;
    viewMode: "grid" | "table";
    onViewModeChange: (mode: "grid" | "table") => void;
    totalResults?: number;
    elapsedMs?: number;
    isLoading?: boolean;
}

export function PackageSearchInput({
    searchQuery,
    onSearchChange,
    activeTab,
    onTabChange,
    channel,
    onChannelChange,
    optionScope,
    onOptionScopeChange,
    viewMode,
    onViewModeChange,
    totalResults,
    elapsedMs,
    isLoading,
}: PackageSearchInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    // Global shortcut: press "/" to focus search input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === "/" &&
                document.activeElement?.tagName !== "INPUT" &&
                document.activeElement?.tagName !== "TEXTAREA"
            ) {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <div className="space-y-3.5">
            {/* Top row: Tab Switcher & Channel / View mode controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                {/* Search Type Tabs */}
                <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 text-xs">
                    <button
                        onClick={() => onTabChange("packages")}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${
                            activeTab === "packages"
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                    >
                        <Package className="h-3.5 w-3.5" />
                        <span>Nixpkgs Paketleri</span>
                    </button>
                    <button
                        onClick={() => onTabChange("options")}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${
                            activeTab === "options"
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                    >
                        <Sliders className="h-3.5 w-3.5" />
                        <span>NixOS & HM Seçenekleri</span>
                    </button>
                    <button
                        onClick={() => onTabChange("installed")}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${
                            activeTab === "installed"
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                    >
                        <Layers className="h-3.5 w-3.5" />
                        <span>Kurulu Paketler</span>
                    </button>
                </div>

                {/* Controls: Channel / Scope / View mode */}
                <div className="flex items-center gap-2">
                    {/* Channel Selector (for packages & options) */}
                    {activeTab !== "installed" && (
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground/60 hidden sm:inline">Kanal:</span>
                            <select
                                value={channel}
                                onChange={(e) => onChannelChange(e.target.value as ChannelOption)}
                                className="h-8 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                            >
                                <option value="nixos-unstable">nixos-unstable</option>
                                <option value="nixos-25.05">nixos-25.05</option>
                                <option value="nixos-24.11">nixos-24.11</option>
                            </select>
                        </div>
                    )}

                    {/* Option Scope Selector */}
                    {activeTab === "options" && (
                        <select
                            value={optionScope}
                            onChange={(e) => onOptionScopeChange(e.target.value as OptionScope)}
                            className="h-8 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                        >
                            <option value="all">Tüm Kapsamlar</option>
                            <option value="nixos">NixOS Modules</option>
                            <option value="home-manager">Home Manager</option>
                        </select>
                    )}

                    {/* View Mode Toggle (Grid vs Table) */}
                    {activeTab !== "options" && (
                        <div className="flex items-center rounded-md border border-border bg-background p-0.5">
                            <button
                                onClick={() => onViewModeChange("grid")}
                                title="Grid Görünümü"
                                className={`flex h-7 w-7 items-center justify-center rounded ${
                                    viewMode === "grid"
                                        ? "bg-accent text-foreground shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => onViewModeChange("table")}
                                title="Tablo Görünümü"
                                className={`flex h-7 w-7 items-center justify-center rounded ${
                                    viewMode === "table"
                                        ? "bg-accent text-foreground shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <TableIcon className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={
                        activeTab === "packages"
                            ? "Nixpkgs paketi ara (örn. ripgrep, neovim, firefox, tailscale)... [/]"
                            : activeTab === "options"
                            ? "NixOS / Home-Manager seçeneği ara (örn. networking.firewall, services.forgejo)... [/]"
                            : "Kurulu paketler içinde ara (örn. git, bash, zfs)... [/]"
                    }
                    className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-24 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary transition-all shadow-xs"
                />

                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange("")}
                            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted"
                            title="Temizle (Esc)"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] text-muted-foreground">
                        /
                    </kbd>
                </div>
            </div>

            {/* Search Results Summary & Stats */}
            {totalResults !== undefined && totalResults > 0 && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                            {totalResults} {activeTab === "options" ? "seçenek" : "paket"} bulundu
                        </span>
                        {elapsedMs !== undefined && elapsedMs > 0 && (
                            <span className="flex items-center gap-1 text-muted-foreground/60">
                                <Clock className="h-3 w-3" />
                                {elapsedMs} ms
                            </span>
                        )}
                    </div>
                    {isLoading && (
                        <span className="animate-pulse text-primary font-medium">Aranıyor...</span>
                    )}
                </div>
            )}
        </div>
    );
}
