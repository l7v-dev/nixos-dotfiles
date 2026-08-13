"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    List,
    Power,
    Wifi,
    ScrollText,
    BarChart2,
    Plug,
} from "lucide-react";

const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/services", label: "Services", icon: List },
    { href: "/power", label: "Power", icon: Power },
    { href: "/network", label: "Network", icon: Wifi },
    { href: "/logs", label: "Logs", icon: ScrollText },
    { href: "/monitoring", label: "Monitoring", icon: BarChart2 },
    { href: "/integrations", label: "Integrations", icon: Plug },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="flex h-full w-56 flex-col border-r border-border bg-card px-3 py-4">
            <div className="mb-6 px-2">
                <span className="text-lg font-semibold tracking-tight">l7v-panel</span>
            </div>
            <nav className="flex flex-col gap-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${active
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                }`}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
