"use client";

import { useState } from "react";

interface ErrorToastProps {
    message: string;
    status?: number;
}

export function ErrorToast({ message, status }: ErrorToastProps) {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    return (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            <span className="flex-1">
                {status && <span className="font-mono font-semibold mr-2">{status}</span>}
                {message}
            </span>
            <button
                onClick={() => setDismissed(true)}
                className="ml-auto text-red-500 hover:text-red-700 dark:text-red-400"
                aria-label="Dismiss"
            >
                ✕
            </button>
        </div>
    );
}
