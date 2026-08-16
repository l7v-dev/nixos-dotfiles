"use client";

import { useState } from "react";
import {
    Search,
    Play,
    Copy,
    Cpu,
    RefreshCw,
    CheckCircle,
    DownloadCloud,
    Trash2,
    Activity,
    AlertTriangle,
    FileText,
    HardDrive,
    Bot,
    Terminal,
    Sparkles,
} from "lucide-react";

export interface Snippet {
    id: string;
    category: string;
    title: string;
    description: string;
    command: string;
    autoRun: boolean;
    icon?: string;
}

const BUILTIN_SNIPPETS: Snippet[] = [
    {
        id: "nh-os-switch",
        category: "NixOS",
        title: "nh os switch",
        description: "Build and activate NixOS configuration",
        command: "nh os switch",
        autoRun: false,
        icon: "Cpu",
    },
    {
        id: "nh-os-test",
        category: "NixOS",
        title: "nh os test",
        description: "Test system configuration in-place without boot entry",
        command: "nh os test",
        autoRun: false,
        icon: "Play",
    },
    {
        id: "nixos-rebuild",
        category: "NixOS",
        title: "nixos-rebuild switch",
        description: "Local NixOS rebuild using flake directly",
        command: "sudo nixos-rebuild switch --flake .",
        autoRun: false,
        icon: "RefreshCw",
    },
    {
        id: "nix-flake-check",
        category: "NixOS",
        title: "nix flake check",
        description: "Validate all flake inputs and evaluated outputs",
        command: "nix flake check --show-trace",
        autoRun: true,
        icon: "CheckCircle",
    },
    {
        id: "nix-flake-update",
        category: "NixOS",
        title: "nix flake update",
        description: "Update all inputs in flake.lock",
        command: "nix flake update",
        autoRun: false,
        icon: "DownloadCloud",
    },
    {
        id: "nix-clean",
        category: "Maintenance",
        title: "nh clean / garbage collect",
        description: "Purge old system generations and unreferenced store paths",
        command: "nh clean all --keep 3",
        autoRun: false,
        icon: "Trash2",
    },
    {
        id: "btop",
        category: "Monitoring",
        title: "btop",
        description: "Visual CPU, memory, disk, and process monitor",
        command: "btop",
        autoRun: true,
        icon: "Activity",
    },
    {
        id: "systemctl-failed",
        category: "Services",
        title: "List Failed Units",
        description: "systemctl --failed check",
        command: "systemctl --failed",
        autoRun: true,
        icon: "AlertTriangle",
    },
    {
        id: "journalctl-f",
        category: "Logs",
        title: "Follow System Logs",
        description: "journalctl -f -n 50 stream",
        command: "journalctl -f -n 50",
        autoRun: true,
        icon: "FileText",
    },
    {
        id: "zfs-status",
        category: "Storage",
        title: "ZFS / Storage Health",
        description: "zpool status and disk space usage",
        command: "zpool status -v || df -hT",
        autoRun: true,
        icon: "HardDrive",
    },
    {
        id: "claude-autonomous",
        category: "AI Agents",
        title: "Autonomous Agent Loop",
        description: "Launch sandboxed Claude Code inside git worktree",
        command: "./scripts/claude-autonomous.sh task-1 'Fix issue' 10",
        autoRun: false,
        icon: "Bot",
    },
];

interface SnippetPaletteProps {
    onRunSnippet: (command: string, autoRun: boolean) => void;
    onClose: () => void;
}

export function SnippetPalette({ onRunSnippet, onClose }: SnippetPaletteProps) {
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    const categories = ["all", ...Array.from(new Set(BUILTIN_SNIPPETS.map((s) => s.category)))];

    const filtered = BUILTIN_SNIPPETS.filter((s) => {
        const matchesCategory = selectedCategory === "all" || s.category === selectedCategory;
        const matchesSearch =
            s.title.toLowerCase().includes(search.toLowerCase()) ||
            s.description.toLowerCase().includes(search.toLowerCase()) ||
            s.command.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const getIcon = (iconName?: string) => {
        switch (iconName) {
            case "Cpu": return <Cpu className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
            case "Play": return <Play className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
            case "RefreshCw": return <RefreshCw className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
            case "CheckCircle": return <CheckCircle className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
            case "DownloadCloud": return <DownloadCloud className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
            case "Trash2": return <Trash2 className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
            case "Activity": return <Activity className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
            case "AlertTriangle": return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />;
            case "FileText": return <FileText className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
            case "HardDrive": return <HardDrive className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
            case "Bot": return <Bot className="h-4 w-4 text-primary" strokeWidth={1.5} />;
            default: return <Terminal className="h-4 w-4 text-primary" strokeWidth={1.5} />;
        }
    };

    return (
        <div className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-card/95 backdrop-blur-md font-sans">
            {/* Header */}
            <div className="flex h-10 items-center justify-between border-b border-border px-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                    <span>Quick Commands</span>
                </div>
                <button
                    onClick={onClose}
                    className="text-xs text-muted-foreground hover:text-foreground"
                >
                    Close
                </button>
            </div>

            {/* Search Input */}
            <div className="p-2 border-b border-border/50">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                    <input
                        type="text"
                        placeholder="Search command…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                </div>

                {/* Category Pills */}
                <div className="mt-2 flex gap-1 overflow-x-auto no-scrollbar">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors whitespace-nowrap ${
                                selectedCategory === cat
                                    ? "bg-foreground text-background font-semibold"
                                    : "bg-muted text-muted-foreground hover:bg-accent"
                            }`}
                        >
                            {cat === "all" ? "All" : cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Snippet List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {filtered.map((item) => (
                    <div
                        key={item.id}
                        className="group rounded-xl border border-border/60 bg-background/50 p-2.5 transition-all hover:border-primary/50 hover:bg-accent/40"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                                {getIcon(item.icon)}
                                <div>
                                    <h4 className="text-xs font-semibold text-foreground">
                                        {item.title}
                                    </h4>
                                    <span className="text-[10px] text-muted-foreground">
                                        {item.category}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <p className="mt-1 text-[11px] text-muted-foreground leading-tight">
                            {item.description}
                        </p>

                        <div className="mt-2 flex items-center justify-between rounded-lg bg-muted/60 px-2 py-1 font-mono text-[11px] text-muted-foreground group-hover:text-foreground">
                            <span className="truncate">{item.command}</span>
                        </div>

                        <div className="mt-2 flex items-center justify-end gap-1.5">
                            <button
                                onClick={() => onRunSnippet(item.command, false)}
                                title="Paste into terminal without running"
                                className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            >
                                <Copy className="h-3 w-3" strokeWidth={1.5} />
                                <span>Paste</span>
                            </button>
                            <button
                                onClick={() => onRunSnippet(item.command, true)}
                                title="Execute immediately"
                                className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                                <Play className="h-3 w-3 fill-current" />
                                <span>Execute</span>
                            </button>
                        </div>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                        No matching commands found.
                    </div>
                )}
            </div>
        </div>
    );
}
