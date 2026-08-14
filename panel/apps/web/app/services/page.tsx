"use client";

import { useState, useDeferredValue } from "react";
import { useServices, useServiceActions } from "@/hooks/useMetrics";
import type { ServiceUnit, AgentError } from "@/types/api";
import { Search, RotateCcw } from "lucide-react";

export default function ServicesPage() {
    const { data: units, isLoading, error } = useServices();
    const [filter, setFilter] = useState("");
    const deferredFilter = useDeferredValue(filter);

    if (isLoading) return <ServicesSkeleton />;

    if (error) {
        const ae = error as AgentError;
        return (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {ae.message ?? "Servisler yüklenemedi"}
                {ae.unit && <span className="ml-2 font-mono opacity-70">({ae.unit})</span>}
            </div>
        );
    }

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
                    <h1 className="text-lg font-semibold">Servisler</h1>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        systemd unit yönetimi
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
                    placeholder="İsim veya açıklama ile filtrele…"
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
                            <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Durum</th>
                            <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Yüklenme</th>
                            <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Dosya</th>
                            <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((unit) => (
                            <ServiceRow key={unit.name} unit={unit} />
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">
                                    Filtreyle eşleşen servis yok.
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
    const { start, stop, restart, enable, disable } = useServiceActions(unit.name);

    const isRunning = unit.active_state === "active" && unit.sub_state === "running";
    const isActive = unit.active_state === "active";
    const isEnabled = unit.unit_file_state === "enabled" || unit.unit_file_state === "enabled-runtime";
    const isMasked = unit.unit_file_state === "masked" || unit.load_state === "masked";
    const isNotFound = unit.load_state === "not-found";
    const anyPending = start.isPending || stop.isPending || restart.isPending || enable.isPending || disable.isPending;

    const stateBadge = () => {
        if (unit.active_state === "failed")
            return { label: "failed", cls: "bg-destructive/15 text-destructive" };
        if (isRunning)
            return { label: "running", cls: "bg-primary/15 text-primary", pulse: true };
        if (isActive)
            return { label: unit.sub_state || "active", cls: "bg-blue-500/15 text-blue-400" };
        if (unit.active_state === "activating")
            return { label: "activating", cls: "bg-yellow-500/15 text-yellow-400" };
        return { label: unit.active_state || "—", cls: "bg-muted text-muted-foreground" };
    };

    const loadBadge = () => {
        if (isNotFound) return { label: "not-found", cls: "text-destructive/70" };
        if (isMasked) return { label: "masked", cls: "text-orange-400/70" };
        if (unit.load_state === "loaded") return { label: "loaded", cls: "text-muted-foreground" };
        return { label: unit.load_state || "—", cls: "text-muted-foreground" };
    };

    const fileBadge = () => {
        if (!unit.unit_file_state) return { label: "—", cls: "text-muted-foreground/50" };
        if (isEnabled) return { label: unit.unit_file_state, cls: "text-primary" };
        if (isMasked) return { label: "masked", cls: "text-orange-400" };
        return { label: unit.unit_file_state, cls: "text-muted-foreground" };
    };

    const sb = stateBadge();
    const lb = loadBadge();
    const fb = fileBadge();

    return (
        <tr className="border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors">
            {/* Unit name + description */}
            <td className="px-4 py-2.5 max-w-xs">
                <p className="font-mono text-xs font-medium">{unit.name}</p>
                {unit.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{unit.description}</p>
                )}
            </td>

            {/* Active state badge */}
            <td className="px-4 py-2.5">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sb.cls}`}>
                    {"pulse" in sb && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                    {sb.label}
                </span>
            </td>

            {/* Load state */}
            <td className="px-4 py-2.5">
                <span className={`text-xs ${lb.cls}`}>{lb.label}</span>
            </td>

            {/* Unit file state */}
            <td className="px-4 py-2.5">
                <span className={`text-xs ${fb.cls}`}>{fb.label}</span>
            </td>

            {/* Actions */}
            <td className="px-4 py-2.5">
                <div className="flex gap-1 flex-wrap">
                    <ActionBtn
                        label="Başlat"
                        disabled={anyPending || isActive || isMasked}
                        pending={start.isPending}
                        onClick={() => start.mutate()}
                    />
                    <ActionBtn
                        label="Durdur"
                        disabled={anyPending || !isActive}
                        pending={stop.isPending}
                        onClick={() => stop.mutate()}
                        variant="destructive"
                    />
                    <ActionBtn
                        label={<><RotateCcw className="h-2.5 w-2.5" />Yeniden</>}
                        disabled={anyPending || !isActive || isMasked}
                        pending={restart.isPending}
                        onClick={() => restart.mutate()}
                    />
                    <ActionBtn
                        label="Etkinleştir"
                        disabled={anyPending || isEnabled || isMasked}
                        pending={enable.isPending}
                        onClick={() => enable.mutate()}
                    />
                    <ActionBtn
                        label="Devre dışı"
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
    label: React.ReactNode;
    disabled: boolean;
    pending: boolean;
    onClick: () => void;
    variant?: "destructive";
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled || pending}
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-40 ${variant === "destructive"
                    ? "border border-destructive/40 text-destructive hover:bg-destructive/10"
                    : "border border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                }`}
        >
            {pending ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : label}
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
