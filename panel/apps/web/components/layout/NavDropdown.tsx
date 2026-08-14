"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface NavSubItem {
    href: string;
    label: string;
    icon?: React.ReactNode;
    tab?: string;
}

interface NavDropdownProps {
    label: string;
    icon: React.ReactNode;
    baseHref: string;
    items: NavSubItem[];
    collapsed?: boolean;
}

function SubItemsList({
    baseHref,
    items,
}: {
    baseHref: string;
    items: NavSubItem[];
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get("tab") || "apps";

    return (
        <div className="ml-4 space-y-0.5 border-l border-border/60 pl-2.5 pt-0.5">
            {items.map((item) => {
                const isSubActive =
                    pathname === baseHref &&
                    (item.tab ? currentTab === item.tab : !searchParams.get("tab"));

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                            isSubActive
                                ? "bg-primary/15 font-semibold text-primary"
                                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        }`}
                    >
                        {item.icon && (
                            <span
                                className={`shrink-0 ${
                                    isSubActive ? "text-primary" : "text-muted-foreground"
                                }`}
                            >
                                {item.icon}
                            </span>
                        )}
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </div>
    );
}

function SubItemsFallback({
    items,
}: {
    items: NavSubItem[];
}) {
    return (
        <div className="ml-4 space-y-0.5 border-l border-border/60 pl-2.5 pt-0.5">
            {items.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-all"
                >
                    {item.icon && <span className="shrink-0 text-muted-foreground">{item.icon}</span>}
                    <span>{item.label}</span>
                </Link>
            ))}
        </div>
    );
}

export function NavDropdown({
    label,
    icon,
    baseHref,
    items,
    collapsed = false,
}: NavDropdownProps) {
    const pathname = usePathname();
    const isBaseActive = pathname === baseHref || pathname.startsWith(`${baseHref}/`);
    const [isOpen, setIsOpen] = useState(isBaseActive);

    // Keep open if currently active
    useEffect(() => {
        if (isBaseActive) {
            setIsOpen(true);
        }
    }, [isBaseActive]);

    if (collapsed) {
        return (
            <div className="relative group">
                <Link
                    href={baseHref}
                    title={label}
                    className={`flex items-center justify-center rounded-md py-2 transition-all ${
                        isBaseActive
                            ? "bg-primary/10 text-primary border-l-2 border-primary"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground border-l-2 border-transparent"
                    }`}
                >
                    <span className="shrink-0">{icon}</span>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {/* Header toggle button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-all ${
                    isBaseActive
                        ? "border-l-2 border-primary bg-primary/10 pl-[10px] text-primary"
                        : "border-l-2 border-transparent pl-[10px] text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }`}
            >
                <div className="flex items-center gap-2.5">
                    <span
                        className={`shrink-0 transition-colors ${
                            isBaseActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        }`}
                    >
                        {icon}
                    </span>
                    <span>{label}</span>
                </div>
                <span className="text-muted-foreground/60 transition-transform duration-200">
                    {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                    )}
                </span>
            </button>

            {/* Collapsible sub-items wrapped in Suspense */}
            {isOpen && (
                <Suspense fallback={<SubItemsFallback items={items} />}>
                    <SubItemsList baseHref={baseHref} items={items} />
                </Suspense>
            )}
        </div>
    );
}
