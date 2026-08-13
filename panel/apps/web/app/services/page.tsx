"use client";

import { useState, useDeferredValue } from "react";
import { useServices, useServiceAction } from "@/hooks/useMetrics";
import type { ServiceUnit } from "@/types/api";
import { Search } from "lucide-react";

export default function ServicesPage() {
    const { data: units, isLoading, error } = useServices();
    const [filter, setFilter] = useState("");
    const deferredFilter = useDeferredValue(filter);

    if (isLoading) return <ServicesSkeleton />;
    if (error) return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load services
        </div>
    );
    if (!units) return null;

    const q = deferredFilter.toLowerCase();
    const filtered = units.filter(
        (u) => u.name.toLowerCase().includes(q) || u.description.toLowerCase().includes(q)
    );

    return (
        <div className="space-y-4">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold">Services</h1>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Manage systemd units
                    </p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {filtered.length} / {units.length}
                </span>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="search"
                    placeholder="Filter by name or description…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                />
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border bg-card overflow-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/30 text-left">
                            <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Unit</th>
                            <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">State</th>
                            <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">File</th>
                            <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((unit) => (
                            <ServiceRow key={unit.name} unit={unit} />
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">
                                    No services match your filter.
                                </td>
                            </tr>
                        )}
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

    const isRunning = unit.active_state === "active" && unit.sub_state === "running";
    const isEnabled = unit.unit_file_state === "enabled";
    const anyPending = start.isPending || stop.isPending || enable.isPending || disable.isPending;

    const stateBadge =
        isRunning
            ? { label: "running", cls: "bg-primary/15 text-primary" }
            : unit.active_state === "failed"
                ? { label: "failed", cls: "bg-destructive/15 text-destructive" }
                : unit.active_state === "active"
                    ? { label: unit.sub_state, cls: "bg-blue-500/15 text-blue-400" }
                    : { label: unit.active_state, cls: "bg-muted text-muted-foreground" };

    return (
        <tr className="border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors">
            <td className="px-4 py-2.5">
                <p className="font-mono text-xs font-medium">{unit.name}</p>
                <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">{unit.description}</p>
            </td>
            <td className="px-4 py-2.5">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${stateBadge.cls}`}>
                    {isRunning && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                    {stateBadge.label}
                </span>
            </td>
            <td className="px-4 py-2.5 text-xs text-muted-foreground">
                {unit.unit_file_state || "—"}
            </td>
            <td className="px-4 py-2.5">
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
            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                variant === "destructive"
                    ? "border border-destructive/40 text-destructive hover:bg-destructive/10"
                    : "border border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            }`}
        >
            {pending ? "…" : label}
        </button>
    );
}

function ServicesSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-6 w-28 rounded bg-muted" />
            <div className="h-9 rounded-md bg-muted" />
            <div className="rounded-lg border border-border bg-card">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex gap-4 border-b border-border/50 px-4 py-3 last:border-0">
                        <div className="h-4 w-48 rounded bg-muted" />
                        <div className="h-4 w-16 rounded-full bg-muted" />
                    </div>
                ))}
            </div>
        </div>
    );
}
