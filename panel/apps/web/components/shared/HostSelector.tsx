"use client";

import { useHostStore } from "@/store/host-store";
import { useFleetNodes } from "@/hooks/useFleet";
import { Server, Laptop, Cpu, ShieldCheck } from "lucide-react";

export function HostSelector() {
    const selectedHost = useHostStore((s) => s.selectedHost);
    const setHost = useHostStore((s) => s.setHost);
    const nodes = useHostStore((s) => s.nodes);

    // Auto-fetch fleet status every 15s in background
    useFleetNodes();

    const activeNode = nodes.find((n) => n.id === selectedHost);

    const getIcon = (id: string) => {
        switch (id) {
            case "laptop":
                return <Laptop className="w-3.5 h-3.5 text-primary" />;
            case "server":
                return <Server className="w-3.5 h-3.5 text-emerald-400" />;
            case "builder":
                return <Cpu className="w-3.5 h-3.5 text-amber-400" />;
            case "backup":
                return <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />;
            default:
                return <Server className="w-3.5 h-3.5 text-muted-foreground" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "local":
            case "online":
                return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";
            case "offline":
                return "bg-rose-500";
            default:
                return "bg-muted-foreground";
        }
    };

    return (
        <div className="flex items-center gap-1.5">
            <span
                className={`w-2 h-2 rounded-full transition-colors ${getStatusColor(activeNode?.status ?? "offline")}`}
                title={`Durum: ${activeNode?.status ?? "unknown"} (${activeNode?.ping_ms != null && activeNode.ping_ms >= 0 ? `${activeNode.ping_ms}ms` : "bağlantı yok"})`}
            />

            <div className="flex items-center gap-1">
                {getIcon(selectedHost)}
                <select
                    value={selectedHost}
                    onChange={(e) => setHost(e.target.value)}
                    className="bg-transparent border-0 text-xs font-semibold text-foreground focus:ring-0 cursor-pointer pl-1 pr-2 py-0.5"
                    aria-label="Yönetilen sunucuyu seçin"
                >
                    {nodes.map((n) => (
                        <option key={n.id} value={n.id} className="bg-card text-foreground">
                            {n.id.toUpperCase()} {n.is_local ? "(Yerel)" : `(${n.status})`}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
