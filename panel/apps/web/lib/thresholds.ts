import type { ThresholdLevel } from "@/types/api";

/**
 * Classifies a metric value into a threshold level.
 * Pure function — no side effects, deterministic.
 *
 * green:  v < warn
 * amber:  warn <= v < crit
 * red:    v >= crit
 */
export function classifyThreshold(
    v: number,
    warn: number,
    crit: number
): ThresholdLevel {
    if (v >= crit) return "red";
    if (v >= warn) return "amber";
    return "green";
}

export const THRESHOLD_COLORS: Record<ThresholdLevel, string> = {
    green: "text-primary",
    amber: "text-orange-400",
    red: "text-destructive",
};

export const THRESHOLD_BG: Record<ThresholdLevel, string> = {
    green: "bg-primary/15 text-primary",
    amber: "bg-orange-400/15 text-orange-400",
    red: "bg-destructive/15 text-destructive",
};

