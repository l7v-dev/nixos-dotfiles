"use client";

import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { QuakeDrawer } from "@/components/terminal/QuakeDrawer";

interface MainLayoutProps {
    children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-background p-2 sm:p-2.5 gap-2.5 font-sans">
            {/* Global Overlay Drawers & Command Menu */}
            <CommandPalette />
            <QuakeDrawer />

            {/* Left Sidebar — Symmetrical Rounded Card */}
            <Sidebar />

            {/* Main Application Canvas — Symmetrical Rounded Card */}
            <div className="flex flex-1 flex-col h-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
                <Header />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
