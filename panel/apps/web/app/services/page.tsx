"use client";

import { useState, useDeferredValue } from "react";
import { useServices, useServiceAction } from "@/hooks/useMetrics";
import type { ServiceUnit } from "@/types/api";

export default function ServicesPage() {
    const { data: units, isLoading, error } = useServices();
    const [filter, setFilter] = useState("");
    const deferredFilter = useDeferredValue(filter);

    if (isLoading) return <div className="text-muted-foreground text-sm">Loading services…</div>;
    if (error) return <div className="text-red-500 text-sm">Failed to load services</div>;
    if (!units) return null;

    const q = deferredFilter.toLowerCase();
    const filtered = units.filter(
        (u) => u.name.toLowerCase().includes(q) || u.description.toLowerCase().includes(q)
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Services</h1>
                <span className="text-xs text-muted-foreground">{filtered.length} units</span>
            </div>
            <input
                type="search"
                placeholder="Filter by name or description…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full rounded border border-input bg-background px-3 py-1.5 text-sm"
            />
            <div className="rounded-lg border border-border bg-card overflow-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                            <th className="px-4 py-2">Unit</th>
                            <th className="px-4 py-2">State</th>
                            <th className="px-4 py-2">File</th>
                            <th className="px-4 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((unit) => (
                            <ServiceRow key={unit.name} unit={unit} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ServiceRow({ unit }: { unit: ServiceUnit }) {
    const start = useServiceAction(unit.name, "start");
    const stop = useServiceAction(unit.name, "stop");
    const enable = useServiceAction(unit.name, "enable");
    const disable = useServiceAction(unit.name, "disable");

    const stateColor =
        unit.active_state === "active" && unit.sub_state === "running"
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
            : unit.active_state === "failed"
                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                : unit.active_state === "active"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

    const isRunning = unit.active_state === "active" && unit.sub_state === "running";
    const isEnabled = unit.unit_file_state === "enabled";
    const anyPending = start.isPending || stop.isPending || enable.isPending || disable.isPending;

    return (
        <tr className="border-b border-border last:border-0 hover:bg-accent/40">
            <td className="px-4 py-2">
                <p className="font-mono text-xs font-medium">{unit.name}</p>
                <p className="text-xs text-muted-foreground truncate max-w-xs">{unit.description}</p>
            </td>
            <td className="px-4 py-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stateColor}`}>
                    {unit.active_state}/{unit.sub_state}
                </span>
            </td>
            <td className="px-4 py-2 text-xs text-muted-foreground">{unit.unit_file_state || "—"}</td>
            <td className="px-4 py-2">
                <div className="flex gap-1 flex-wrap">
                    <ActionBtn
                        label="Start"
                        disabled={anyPending || isRunning}
                        pending={start.isPending}
                        onClick={() => start.mutate()}
                    />
                    <ActionBtn
                        label="Stop"
                        disabled={anyPending || !isRunning}
                        pending={stop.isPending}
                        onClick={() => stop.mutate()}
                        variant="destructive"
                    />
                    <ActionBtn
                        label="Enable"
                        disabled={anyPending || isEnabled}
                        pending={enable.isPending}
                        onClick={() => enable.mutate()}
                    />
                    <ActionBtn
                        label="Disable"
                        disabled={anyPending || !isEnabled}
                        pending={disable.isPending}
                        onClick={() => disable.mutate()}
                        variant="destructive"
                    />
                </div>
            </td>
        </tr>
    );
}

function ActionBtn({
    label, disabled, pending, onClick, variant,
}: {
    label: string;
    disabled: boolean;
    pending: boolean;
    onClick: () => void;
    variant?: "destructive";
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled || pending}
            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-40 ${variant === "destructive"
                    ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
        >
            {pending ? "…" : label}
        </button>
    );
}
