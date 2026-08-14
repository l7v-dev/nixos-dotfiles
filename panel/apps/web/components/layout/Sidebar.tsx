"use client";

import {
    LayoutDashboard,
    List,
    ScrollText,
    BarChart2,
    Plug,
    Gauge,
    Terminal,
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react";
import { NavItem } from "@/components/layout/NavItem";
import { useSidebarStore } from "@/store/sidebar-store";

const monitoringNav = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/monitoring", label: "Monitoring", icon: BarChart2 },
    { href: "/logs", label: "Logs", icon: ScrollText },
];

const managementNav = [
    { href: "/cockpit", label: "Cockpit", icon: Gauge },
    { href: "/terminal", label: "Terminal", icon: Terminal },
    { href: "/services", label: "Services", icon: List },
    { href: "/integrations", label: "Integrations", icon: Plug },
];

function NavGroup({
    label,
    items,
    collapsed,
}: {
    label: string;
    items: typeof monitoringNav;
    collapsed: boolean;
}) {
    return (
        <div className="space-y-0.5">
            {!collapsed && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                    {label}
                </p>
            )}
            {collapsed && <div className="mb-1 mx-3 h-px bg-border/50" />}
            {items.map(({ href, label, icon: Icon }) => (
                <NavItem
                    key={href}
                    href={href}
                    label={label}
                    icon={<Icon className="h-4 w-4" />}
                    collapsed={collapsed}
                />
            ))}
        </div>
    );
}

export function Sidebar() {
    const { collapsed, toggle } = useSidebarStore();

    return (
        <aside
            className={`group/sidebar relative flex h-full flex-col border-r border-border bg-card transition-all duration-200 ease-in-out ${
                collapsed ? "w-[56px]" : "w-60"
            }`}
        >
            {/* ── Logo bar — same height as Header (h-12) ── */}
            <div className="flex h-12 shrink-0 items-center border-b border-border">
                {/* Icon — always visible, centred when collapsed */}
                <div
                    className={`flex shrink-0 items-center justify-center transition-all duration-200 ${
                        collapsed ? "w-full" : "pl-4"
                    }`}
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
                        <Terminal className="h-3.5 w-3.5" />
                    </div>
                </div>

                {/* Text — hidden when collapsed */}
                <div
                    className={`min-w-0 flex-1 overflow-hidden pl-2.5 transition-all duration-200 ${
                        collapsed ? "w-0 opacity-0" : "opacity-100"
                    }`}
                >
                    <p className="truncate text-sm font-semibold leading-none tracking-tight">
                        l7v-panel
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        NixOS Control Center
                    </p>
                </div>

                {/* Toggle button — visible on hover */}
                {!collapsed && (
                    <button
                        onClick={toggle}
                        aria-label="Collapse sidebar"
                        className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-all hover:bg-accent hover:text-foreground group-hover/sidebar:opacity-100"
                    >
                        <PanelLeftClose className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {/* ── Navigation ── */}
            <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-2 py-4">
                <NavGroup label="Monitor" items={monitoringNav} collapsed={collapsed} />
                <NavGroup label="Manage" items={managementNav} collapsed={collapsed} />
            </nav>

            {/* ── Footer / expand button when collapsed ── */}
            {collapsed ? (
                <div className="flex items-center justify-center border-t border-border py-3">
                    <button
                        onClick={toggle}
                        aria-label="Expand sidebar"
                        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground/50 hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <PanelLeftOpen className="h-3.5 w-3.5" />
                    </button>
                </div>
            ) : (
                <div className="border-t border-border px-4 py-3">
                    <p className="truncate text-[10px] text-muted-foreground/40">
                        NixOS · declarative · reproducible
                    </p>
                </div>
            )}
        </aside>
    );
}
