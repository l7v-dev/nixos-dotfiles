"use client";

import React from "react";
import {
    Boxes,
    PlayCircle,
    StopCircle,
    PauseCircle,
    Disc,
    HardDrive,
    Network,
    Cpu,
    Activity,
} from "lucide-react";
import type { ContainersOverview } from "@/types/containers";

interface Props {
    overview?: ContainersOverview | null;
    isLoading?: boolean;
}

export function ContainerStatsCards({ overview, isLoading }: Props) {
    if (isLoading || !overview) {
        return (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="h-20 animate-pulse rounded-lg border border-border bg-card/50 p-3"
                    />
                ))}
            </div>
        );
    }

    const cards = [
        {
            label: "Toplam Kapsayıcı",
            value: overview.totalContainers,
            sub: `${overview.engine.toUpperCase()} Engine`,
            icon: Boxes,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
        },
        {
            label: "Çalışan",
            value: overview.runningContainers,
            sub: `${overview.stoppedContainers} durduruldu`,
            icon: PlayCircle,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
        },
        {
            label: "Durdurulan / Duraklatılan",
            value: `${overview.stoppedContainers} / ${overview.pausedContainers}`,
            sub: "Beklemede",
            icon: overview.pausedContainers > 0 ? PauseCircle : StopCircle,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
        },
        {
            label: "Yerel İmajlar",
            value: overview.totalImages,
            sub: "Kayıtlı imaj",
            icon: Disc,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
        },
        {
            label: "Kalıcı Birimler (Volumes)",
            value: overview.totalVolumes,
            sub: "Depolama alanı",
            icon: HardDrive,
            color: "text-cyan-500",
            bg: "bg-cyan-500/10",
        },
        {
            label: "Sanal Ağlar (Networks)",
            value: overview.totalNetworks,
            sub: "Bridge / Host / Custom",
            icon: Network,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {cards.map((card, idx) => {
                const Icon = card.icon;
                return (
                    <div
                        key={idx}
                        className="flex flex-col justify-between rounded-lg border border-border bg-card p-3.5 shadow-sm transition-all hover:border-border/80"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                {card.label}
                            </span>
                            <div className={`rounded-md p-1.5 ${card.bg} ${card.color}`}>
                                <Icon className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                            <span className="text-xl font-bold tracking-tight text-foreground">
                                {card.value}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{card.sub}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
