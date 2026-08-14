/**
 * Maps a journald priority level (0–7) to a CSS color class.
 * Pure function — deterministic, total over [0, 7].
 *
 * 0 emergency, 1 alert, 2 critical, 3 error → red
 * 4 warning → amber
 * 5 notice, 6 info → green
 * 7 debug → grey
 */
export function priorityToColor(priority: number): string {
    if (priority <= 3) return "text-red-600 dark:text-red-400";
    if (priority === 4) return "text-amber-500 dark:text-amber-400";
    if (priority <= 6) return "text-green-600 dark:text-green-400";
    return "text-slate-400 dark:text-slate-500";
}

export function priorityToBadgeClass(priority: number): string {
    switch (priority) {
        case 0:
        case 1:
        case 2:
            return "bg-rose-500/15 text-rose-400 border-rose-500/30";
        case 3:
            return "bg-red-500/15 text-red-400 border-red-500/30";
        case 4:
            return "bg-amber-500/15 text-amber-400 border-amber-500/30";
        case 5:
            return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
        case 6:
            return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
        case 7:
            return "bg-slate-500/15 text-slate-400 border-slate-500/30";
        default:
            return "bg-muted text-muted-foreground border-border";
    }
}

export function priorityToCategory(priority: number): "critical" | "error" | "warning" | "info" | "debug" {
    if (priority <= 2) return "critical";
    if (priority === 3) return "error";
    if (priority === 4) return "warning";
    if (priority <= 6) return "info";
    return "debug";
}

export const CATEGORY_COLORS = {
    critical: "#f43f5e", // rose-500
    error: "#ef4444",    // red-500
    warning: "#f59e0b",  // amber-500
    info: "#3b82f6",     // blue-500
    debug: "#64748b",    // slate-500
};

export const PRIORITY_LABELS: Record<number, string> = {
    0: "EMERG",
    1: "ALERT",
    2: "CRIT",
    3: "ERROR",
    4: "WARN",
    5: "NOTICE",
    6: "INFO",
    7: "DEBUG",
};

export const PRIORITY_FULL_LABELS: Record<number, string> = {
    0: "Emergency (0)",
    1: "Alert (1)",
    2: "Critical (2)",
    3: "Error (3)",
    4: "Warning (4)",
    5: "Notice (5)",
    6: "Informational (6)",
    7: "Debug (7)",
};
