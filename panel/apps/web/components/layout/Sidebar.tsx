"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Activity,
    Server,
    Boxes,
    GitBranch,
    Bot,
    Terminal,
    Package,
    Folder,
    LineChart,
    FileText,
    Layers,
    Shield,
    HardDrive,
    Settings,
    ChevronDown,
    PanelLeftClose,
    PanelLeftOpen,
    Check,
    Radio,
} from "lucide-react";
import { useSidebarStore } from "@/store/sidebar-store";
import { useHostStore } from "@/store/host-store";
import { useTerminalStore } from "@/store/terminal-store";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";

interface NavLinkItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    badge?: string;
}

interface NavSection {
    title: string;
    items: NavLinkItem[];
}

const navSections: NavSection[] = [
    {
        title: "Overview",
        items: [
            { href: "/cockpit", label: "Cockpit", icon: Activity },
        ],
    },
    {
        title: "Infrastructure",
        items: [
            { href: "/services", label: "Services & Daemons", icon: Server },
            { href: "/containers", label: "Containers & Pods", icon: Boxes },
            { href: "/nixos", label: "NixOS Engine", icon: GitBranch, badge: "Rebuild" },
            { href: "/monitoring", label: "Telemetry & Metrics", icon: LineChart },
            { href: "/logs", label: "Journald Log Stream", icon: FileText },
        ],
    },
    {
        title: "Developer & AI",
        items: [
            { href: "/ai", label: "AI Agent Hub", icon: Bot, badge: "100+ Tools" },
            { href: "/terminal", label: "Terminal Console", icon: Terminal },
            { href: "/packages", label: "Packages & Flakes", icon: Package },
            { href: "/files", label: "Filesystem Explorer", icon: Folder },
        ],
    },
    {
        title: "Cluster & Security",
        items: [
            { href: "/fleet", label: "Fleet & Colmena", icon: Layers },
            { href: "/security", label: "Security & SOPS", icon: Shield },
            { href: "/storage", label: "Storage & Snapshots", icon: HardDrive },
        ],
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const { collapsed, toggle } = useSidebarStore();
    const { selectedHost, setHost, nodes } = useHostStore();
    const { toggleQuake } = useTerminalStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const activeNode = nodes.find((n) => n.id === selectedHost) || nodes[0];

    return (
        <aside
            className={cn(
                "group/sidebar relative flex h-full flex-col rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 ease-in-out select-none shadow-xs overflow-hidden shrink-0",
                collapsed ? "w-[60px]" : "w-64"
            )}
        >
            {/* ── Host & Target Node Switcher ── */}
            <div className="flex h-13 shrink-0 items-center justify-between border-b border-sidebar-border px-3 bg-sidebar/80">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className={cn(
                                "flex items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors hover:bg-sidebar-accent/60 outline-none w-full",
                                collapsed && "justify-center"
                            )}
                        >
                            {/* Host Status Indicator Avatar */}
                            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                                <Radio className="h-3.5 w-3.5" strokeWidth={1.75} />
                                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                            </div>

                            {!collapsed && (
                                <div className="min-w-0 flex-1">
                                    <p
                                        className="truncate text-xs font-semibold leading-tight text-foreground flex items-center gap-1.5"
                                        suppressHydrationWarning
                                    >
                                        <span>{mounted ? activeNode?.name : "Workstation"}</span>
                                    </p>
                                    <p className="truncate text-[10px] text-muted-foreground font-mono" suppressHydrationWarning>
                                        {mounted ? activeNode?.target_host : "localhost"}
                                    </p>
                                </div>
                            )}

                            {!collapsed && (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                            )}
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="start" className="w-60 p-1.5">
                        <DropdownMenuLabel className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                            Target Infrastructure Nodes
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {nodes.map((node) => (
                            <DropdownMenuItem
                                key={node.id}
                                onClick={() => setHost(node.id)}
                                className="flex items-center justify-between py-2 cursor-pointer rounded-lg"
                            >
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-foreground truncate">
                                        {node.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-mono">
                                        {node.target_host} ({node.roles.join(", ")})
                                    </p>
                                </div>
                                {node.id === selectedHost && (
                                    <Check className="h-4 w-4 text-primary shrink-0 ml-2" strokeWidth={2} />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {!collapsed && (
                    <button
                        onClick={toggle}
                        title="Collapse Sidebar"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-60 hover:opacity-100 hover:bg-sidebar-accent transition-all"
                    >
                        <PanelLeftClose className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                )}
            </div>

            {/* ── Navigation Sections ── */}
            <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-2.5 py-3">
                {navSections.map((section) => (
                    <div key={section.title} className="space-y-0.5">
                        {!collapsed && (
                            <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                                {section.title}
                            </p>
                        )}
                        {collapsed && <div className="mx-2 my-1 h-px bg-sidebar-border/50" />}

                        {section.items.map(({ href, label, icon: Icon, badge }) => {
                            const isActive =
                                pathname === href || pathname.startsWith(`${href}/`);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    title={collapsed ? label : undefined}
                                    className={cn(
                                        "group flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all select-none",
                                        isActive
                                            ? "bg-sidebar-accent text-foreground font-semibold shadow-xs ring-1 ring-sidebar-border"
                                            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                                        collapsed && "justify-center px-0 h-9"
                                    )}
                                >
                                    <Icon
                                        strokeWidth={1.6}
                                        className={cn(
                                            "h-4 w-4 shrink-0 transition-colors",
                                            isActive
                                                ? "text-primary"
                                                : "text-muted-foreground group-hover:text-foreground"
                                        )}
                                    />

                                    {!collapsed && (
                                        <span className="truncate flex-1 whitespace-nowrap">{label}</span>
                                    )}

                                    {!collapsed && badge && (
                                        <span className="rounded-md bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary shrink-0">
                                            {badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* ── Bottom Actions (Quake Terminal, Settings) ── */}
            <div className="border-t border-sidebar-border p-2 space-y-1 bg-sidebar/60">
                {/* Quake Terminal Button */}
                <button
                    onClick={toggleQuake}
                    title="Toggle Quake Terminal (`)"
                    className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors",
                        collapsed && "justify-center px-0 h-9"
                    )}
                >
                    <Terminal className="h-4 w-4 text-emerald-500 shrink-0" strokeWidth={1.6} />
                    {!collapsed && <span className="flex-1 text-left whitespace-nowrap">Quake Terminal</span>}
                    {!collapsed && <Kbd>`</Kbd>}
                </button>

                {/* Settings Link */}
                <Link
                    href="/settings"
                    title={collapsed ? "Settings" : undefined}
                    className={cn(
                        "flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors",
                        pathname === "/settings"
                            ? "bg-sidebar-accent text-foreground font-semibold"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                        collapsed && "justify-center px-0 h-9"
                    )}
                >
                    <Settings className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                    {!collapsed && <span className="flex-1 whitespace-nowrap">System Settings</span>}
                </Link>

                {/* Collapsed Expand Trigger */}
                {collapsed && (
                    <div className="pt-1.5 flex justify-center">
                        <button
                            onClick={toggle}
                            title="Expand Sidebar"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
                        >
                            <PanelLeftOpen className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}
