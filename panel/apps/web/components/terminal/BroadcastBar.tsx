"use client";

import { useTerminalStore } from "@/store/terminal-store";
import { Radio, X } from "lucide-react";

export function BroadcastBar() {
    const { broadcastMode, toggleBroadcastMode, tabs, activeTabId } = useTerminalStore();

    if (!broadcastMode) return null;

    const currentTab = tabs.find((t) => t.id === activeTabId);
    const paneCount = currentTab?.panes.length || 1;

    return (
        <div className="flex shrink-0 items-center justify-between bg-amber-500/15 border-y border-amber-500/30 px-3 py-1 text-xs text-amber-300 animate-pulse">
            <div className="flex items-center gap-2">
                <Radio className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-semibold">Broadcast Modu Aktif:</span>
                <span>
                    Yazdığınız her komut bu sekmedeki <strong>{paneCount} bölmeye</strong> aynı anda iletilecektir.
                </span>
            </div>

            <button
                onClick={toggleBroadcastMode}
                className="flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-200 hover:bg-amber-500/30 transition-colors"
            >
                <X className="h-3 w-3" />
                Devre Dışı Bırak
            </button>
        </div>
    );
}
