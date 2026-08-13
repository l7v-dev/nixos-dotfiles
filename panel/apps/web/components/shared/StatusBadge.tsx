import { THRESHOLD_BG } from "@/lib/thresholds";
import type { ThresholdLevel } from "@/types/api";

interface StatusBadgeProps {
    level: ThresholdLevel;
    label: string;
}

export function StatusBadge({ level, label }: StatusBadgeProps) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${THRESHOLD_BG[level]}`}
        >
            {label}
        </span>
    );
}
