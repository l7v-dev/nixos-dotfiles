"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItemProps {
    href: string;
    label: string;
    icon: React.ReactNode;
    collapsed?: boolean;
}

export function NavItem({ href, label, icon, collapsed = false }: NavItemProps) {
    const pathname = usePathname();
    const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

    return (
        <Link
            href={href}
            title={collapsed ? label : undefined}
            className={`group flex items-center gap-2.5 rounded-md text-sm font-medium transition-all ${
                collapsed ? "justify-center px-0 py-2" : "px-3 py-2"
            } ${
                isActive
                    ? collapsed
                        ? "bg-primary/10 text-primary"
                        : "border-l-2 border-primary bg-primary/10 pl-[10px] text-primary"
                    : collapsed
                        ? "border-l-2 border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                        : "border-l-2 border-transparent pl-[10px] text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
        >
            <span
                className={`shrink-0 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                }`}
            >
                {icon}
            </span>
            {!collapsed && label}
        </Link>
    );
}
