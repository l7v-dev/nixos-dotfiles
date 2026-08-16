"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Terminal,
    Gauge,
    Server,
    Boxes,
    GitBranch,
    Bot,
    FolderTree,
    PackageSearch,
    BarChart2,
    ScrollText,
    Shield,
    HardDrive,
    Settings,
    Layers,
    Search,
    ArrowRight,
    Sparkles,
    RotateCcw,
    Play,
} from "lucide-react";
import { useHostStore } from "@/store/host-store";
import { useTerminalStore } from "@/store/terminal-store";
import { Kbd } from "@/components/ui/kbd";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface CommandItem {
    id: string;
    title: string;
    description?: string;
    category: "Navigation" | "Quick Action" | "Cluster Node" | "Operation";
    icon: React.ReactNode;
    shortcut?: string[];
    onSelect: () => void;
}

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const router = useRouter();
    const { selectedHost, setHost, nodes } = useHostStore();

    // Toggle on Cmd+K or Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const navigate = useCallback(
        (href: string) => {
            setOpen(false);
            router.push(href);
        },
        [router]
    );

    const commands: CommandItem[] = [
        // ── Quick Actions
        {
            id: "rebuild-nixos",
            title: "Rebuild NixOS (nh os switch)",
            description: "Compile and switch to new system generation",
            category: "Quick Action",
            icon: <Sparkles className="h-4 w-4 text-primary" />,
            shortcut: ["⌘", "R"],
            onSelect: () => navigate("/nixos?action=rebuild"),
        },
        {
            id: "rollback-nixos",
            title: "Rollback Generation",
            description: "Switch to previous working generation",
            category: "Quick Action",
            icon: <RotateCcw className="h-4 w-4 text-amber-500" />,
            onSelect: () => navigate("/nixos?tab=generations"),
        },
        {
            id: "toggle-quake",
            title: "Toggle Quake Web Terminal",
            description: "Slide down instant PTY terminal overlay",
            category: "Quick Action",
            icon: <Terminal className="h-4 w-4 text-emerald-500" />,
            shortcut: ["`"],
            onSelect: () => {
                setOpen(false);
                useTerminalStore.getState().toggleQuake();
            },
        },
        {
            id: "launch-ai-loop",
            title: "Launch Autonomous AI Coding Task",
            description: "Start claude-autonomous loop in isolated worktree",
            category: "Quick Action",
            icon: <Bot className="h-4 w-4 text-indigo-400" />,
            shortcut: ["⌘", "A"],
            onSelect: () => navigate("/ai?action=new-task"),
        },

        // ── Navigation
        {
            id: "nav-cockpit",
            title: "Cockpit Overview",
            description: "Hardware telemetry, live KPIs & quick toggles",
            category: "Navigation",
            icon: <Gauge className="h-4 w-4 text-blue-400" />,
            shortcut: ["G", "C"],
            onSelect: () => navigate("/cockpit"),
        },
        {
            id: "nav-services",
            title: "Services & Daemons",
            description: "Systemd units, managed daemons, journal logs",
            category: "Navigation",
            icon: <Server className="h-4 w-4 text-emerald-400" />,
            shortcut: ["G", "S"],
            onSelect: () => navigate("/services"),
        },
        {
            id: "nav-containers",
            title: "Containers & Stacks",
            description: "Podman/Docker containers, images & volumes",
            category: "Navigation",
            icon: <Boxes className="h-4 w-4 text-cyan-400" />,
            shortcut: ["G", "D"],
            onSelect: () => navigate("/containers"),
        },
        {
            id: "nav-nixos",
            title: "NixOS Engine",
            description: "Generations timeline, package diff & compiler console",
            category: "Navigation",
            icon: <GitBranch className="h-4 w-4 text-primary" />,
            shortcut: ["G", "N"],
            onSelect: () => navigate("/nixos"),
        },
        {
            id: "nav-ai",
            title: "AI Agent Hub",
            description: "Autonomous loops, 100+ agents & microVM sandboxes",
            category: "Navigation",
            icon: <Bot className="h-4 w-4 text-indigo-400" />,
            shortcut: ["G", "A"],
            onSelect: () => navigate("/ai"),
        },
        {
            id: "nav-terminal",
            title: "Interactive Web Terminal",
            description: "Multi-tab xterm.js PTY with split views",
            category: "Navigation",
            icon: <Terminal className="h-4 w-4 text-emerald-400" />,
            shortcut: ["G", "T"],
            onSelect: () => navigate("/terminal"),
        },
        {
            id: "nav-packages",
            title: "Nix Packages & Options",
            description: "Search 100,000+ nixpkgs and NixOS options",
            category: "Navigation",
            icon: <PackageSearch className="h-4 w-4 text-purple-400" />,
            shortcut: ["G", "P"],
            onSelect: () => navigate("/packages"),
        },
        {
            id: "nav-files",
            title: "Host File Explorer",
            description: "Browse filesystem and edit configuration files",
            category: "Navigation",
            icon: <FolderTree className="h-4 w-4 text-amber-400" />,
            shortcut: ["G", "F"],
            onSelect: () => navigate("/files"),
        },
        {
            id: "nav-monitoring",
            title: "Monitoring & Metrics",
            description: "Prometheus telemetry graphs and query studio",
            category: "Navigation",
            icon: <BarChart2 className="h-4 w-4 text-blue-400" />,
            onSelect: () => navigate("/monitoring"),
        },
        {
            id: "nav-logs",
            title: "Journald Log Streamer",
            description: "Live SSE system log viewer with filtering",
            category: "Navigation",
            icon: <ScrollText className="h-4 w-4 text-muted-foreground" />,
            onSelect: () => navigate("/logs"),
        },
        {
            id: "nav-fleet",
            title: "Fleet Cluster & Colmena",
            description: "Multi-host topology and declarative deployment",
            category: "Navigation",
            icon: <Layers className="h-4 w-4 text-pink-400" />,
            onSelect: () => navigate("/fleet"),
        },
        {
            id: "nav-security",
            title: "Security & SOPS Secrets",
            description: "Age cryptography, fail2ban jails & Tailscale VPN",
            category: "Navigation",
            icon: <Shield className="h-4 w-4 text-emerald-500" />,
            onSelect: () => navigate("/security"),
        },
        {
            id: "nav-storage",
            title: "Storage & Btrfs Snapshots",
            description: "Snapper timeline, Restic S3/SFTP backups & disks",
            category: "Navigation",
            icon: <HardDrive className="h-4 w-4 text-amber-500" />,
            onSelect: () => navigate("/storage"),
        },
        {
            id: "nav-settings",
            title: "System & Theme Settings",
            description: "Theme customizer, keyboard shortcuts & PIN lock",
            category: "Navigation",
            icon: <Settings className="h-4 w-4 text-muted-foreground" />,
            onSelect: () => navigate("/settings"),
        },

        // ── Host Switching
        ...nodes.map((node) => ({
            id: `host-${node.id}`,
            title: `Switch to ${node.name}`,
            description: `Target node: ${node.target_host} (${node.roles.join(", ")})`,
            category: "Cluster Node" as const,
            icon: <Server className={`h-4 w-4 ${node.id === selectedHost ? "text-emerald-500" : "text-muted-foreground"}`} />,
            onSelect: () => {
                setHost(node.id);
                setOpen(false);
            },
        })),
    ];

    const filteredCommands = commands.filter((cmd) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
            cmd.title.toLowerCase().includes(q) ||
            cmd.description?.toLowerCase().includes(q) ||
            cmd.category.toLowerCase().includes(q)
        );
    });

    const categories = ["Quick Action", "Navigation", "Cluster Node"] as const;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden border border-border/80 bg-card shadow-2xl rounded-2xl">
                {/* Search Bar */}
                <div className="flex items-center border-b border-border/70 px-4 py-3 bg-muted/20">
                    <Search className="h-4 w-4 text-muted-foreground mr-3 shrink-0" />
                    <input
                        type="text"
                        placeholder="Type a command or search (e.g. 'rebuild', 'postgres', 'claude', 'terminal')..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                        autoFocus
                    />
                    <Kbd className="ml-2">ESC</Kbd>
                </div>

                {/* Command List */}
                <div className="max-h-[380px] overflow-y-auto p-2 space-y-4">
                    {categories.map((cat) => {
                        const items = filteredCommands.filter(
                            (c) => c.category === cat
                        );
                        if (items.length === 0) return null;

                        return (
                            <div key={cat} className="space-y-1">
                                <p className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                                    {cat === "Quick Action"
                                        ? "⚡ Quick Actions"
                                        : cat === "Navigation"
                                        ? "🧭 Navigation"
                                        : "🌐 Cluster Targets"}
                                </p>
                                {items.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={item.onSelect}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-accent hover:text-accent-foreground group transition-colors select-none"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/60 group-hover:bg-card border border-border/50 shrink-0">
                                                {item.icon}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary">
                                                    {item.title}
                                                </p>
                                                {item.description && (
                                                    <p className="text-[11px] text-muted-foreground truncate">
                                                        {item.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                            {item.shortcut?.map((k, i) => (
                                                <Kbd key={i}>{k}</Kbd>
                                            ))}
                                            <ArrowRight className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        );
                    })}

                    {filteredCommands.length === 0 && (
                        <div className="py-12 text-center text-xs text-muted-foreground">
                            No matching commands found for &ldquo;{query}&rdquo;
                        </div>
                    )}
                </div>

                {/* Footer Bar */}
                <div className="flex items-center justify-between border-t border-border/70 px-4 py-2 bg-muted/30 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-3">
                        <span>
                            <Kbd className="mr-1">↑↓</Kbd> Navigate
                        </span>
                        <span>
                            <Kbd className="mr-1">↵</Kbd> Select
                        </span>
                    </div>
                    <span>NixOS Control Center · Linear Grade</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
