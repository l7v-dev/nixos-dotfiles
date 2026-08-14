"use client";

import type { TimeRange } from "@/hooks/usePrometheusQuery";

interface TimeRangeSelectorProps {
    value: TimeRange;
    onChange: (val: TimeRange) => void;
}

const RANGES: { label: string; value: TimeRange }[] = [
    { label: "15m", value: "15m" },
    { label: "1h", value: "1h" },
    { label: "6h", value: "6h" },
    { label: "24h", value: "24h" },
];

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
    return (
        <div className="inline-flex items-center rounded-lg border border-border bg-card p-1">
            {RANGES.map((r) => {
                const isActive = value === r.value;
                return (
                    <button
                        key={r.value}
                        type="button"
                        onClick={() => onChange(r.value)}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                            isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        }`}
                    >
                        {r.label}
                    </button>
                );
            })}
        </div>
    );
}
