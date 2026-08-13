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
    green: "text-green-600 dark:text-green-400",
    amber: "text-amber-500 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
};

export const THRESHOLD_BG: Record<ThresholdLevel, string> = {
    green: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};
