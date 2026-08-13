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
