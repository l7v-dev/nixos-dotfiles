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
        <div className="flex h-screen w-full overflow-hidden bg-background font-sans">
            {/* Global Overlay Drawers & Command Menu */}
            <CommandPalette />
            <QuakeDrawer />

            {/* Left Sidebar */}
            <Sidebar />

            {/* Framed Container Shell (Circle / Linear Desktop Canvas) */}
            <div className="flex flex-1 flex-col overflow-hidden lg:p-2 w-full">
                <div className="flex flex-col flex-1 h-full w-full overflow-hidden lg:rounded-2xl lg:border border-border/70 bg-container shadow-sm">
                    <Header />
                    <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
