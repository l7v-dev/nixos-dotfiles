"use client";

import { useHostStore } from "@/store/host-store";

const HOSTS = ["laptop", "server"] as const;

export function HostSelector() {
    const selectedHost = useHostStore((s) => s.selectedHost);
    const setHost = useHostStore((s) => s.setHost);

    return (
        <select
            value={selectedHost}
            onChange={(e) => setHost(e.target.value)}
            className="rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
            aria-label="Select managed host"
        >
            {HOSTS.map((h) => (
                <option key={h} value={h}>
                    {h}
                </option>
            ))}
        </select>
    );
}
