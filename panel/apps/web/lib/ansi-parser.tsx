import React from "react";

/**
 * Regex for matching ANSI escape sequences.
 */
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]/g;

/**
 * Strips all ANSI escape sequences from a string.
 */
export function stripAnsi(str: string): string {
    return str.replace(ANSI_REGEX, "");
}

/**
 * Basic ANSI SGR code to Tailwind CSS color class mapping.
 */
const ANSI_COLOR_MAP: Record<number, string> = {
    30: "text-neutral-900 dark:text-neutral-100", // Black
    31: "text-red-500 dark:text-red-400",         // Red
    32: "text-emerald-500 dark:text-emerald-400", // Green
    33: "text-amber-500 dark:text-amber-400",     // Yellow
    34: "text-blue-500 dark:text-blue-400",       // Blue
    35: "text-purple-500 dark:text-purple-400",   // Magenta
    36: "text-cyan-500 dark:text-cyan-400",       // Cyan
    37: "text-neutral-200 dark:text-neutral-300", // White
    90: "text-neutral-500 dark:text-neutral-400", // Bright Black (Gray)
    91: "text-red-400 dark:text-red-300",         // Bright Red
    92: "text-emerald-400 dark:text-emerald-300", // Bright Green
    93: "text-amber-400 dark:text-amber-300",     // Bright Yellow
    94: "text-blue-400 dark:text-blue-300",       // Bright Blue
    95: "text-purple-400 dark:text-purple-300",   // Bright Magenta
    96: "text-cyan-400 dark:text-cyan-300",       // Bright Cyan
    97: "text-white",                             // Bright White
};

/**
 * Renders a log message with ANSI colors and highlighted search query.
 */
export function renderFormattedLogMessage(message: string, searchQuery?: string): React.ReactNode {
    const clean = stripAnsi(message);

    if (!searchQuery || !searchQuery.trim()) {
        return clean;
    }

    const q = searchQuery.trim().toLowerCase();
    const cleanLower = clean.toLowerCase();
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    let matchIndex = cleanLower.indexOf(q, lastIndex);
    while (matchIndex !== -1) {
        if (matchIndex > lastIndex) {
            parts.push(clean.substring(lastIndex, matchIndex));
        }
        parts.push(
            <mark
                key={matchIndex}
                className="bg-amber-500/30 text-amber-200 rounded px-0.5 font-semibold"
            >
                {clean.substring(matchIndex, matchIndex + q.length)}
            </mark>
        );
        lastIndex = matchIndex + q.length;
        matchIndex = cleanLower.indexOf(q, lastIndex);
    }

    if (lastIndex < clean.length) {
        parts.push(clean.substring(lastIndex));
    }

    return parts;
}
