"use client";

import { useState } from "react";
import { usePowerMutation } from "@/hooks/useMetrics";
import { useHostStore } from "@/store/host-store";
import { PowerOff, RotateCcw, Moon } from "lucide-react";

type PowerAction = "shutdown" | "reboot" | "sleep";

export default function PowerPage() {
    const host = useHostStore((s) => s.selectedHost);
    const [pending, setPending] = useState<PowerAction | null>(null);
    const [confirm, setConfirm] = useState<PowerAction | null>(null);

    const shutdown = usePowerMutation("shutdown");
    const reboot = usePowerMutation("reboot");
    const sleep = usePowerMutation("sleep");

    const mutationFor = (a: PowerAction) =>
        a === "shutdown" ? shutdown : a === "reboot" ? reboot : sleep;

    const handleConfirm = () => {
        if (!confirm) return;
        const mutation = mutationFor(confirm);
        setPending(confirm);
        setConfirm(null);
        mutation.mutate(undefined, {
            onSettled: () => setPending(null),
        });
    };

    const isDisabled = (a: PowerAction) => pending !== null || mutationFor(a).isPending;

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-semibold">Power Control</h1>
            <p className="text-sm text-muted-foreground">
                Target: <span className="font-medium">{host}</span>
            </p>

            <div className="flex flex-wrap gap-4">
                <PowerButton
                    label="Shutdown"
                    icon={PowerOff}
                    disabled={isDisabled("shutdown")}
                    loading={pending === "shutdown"}
                    onClick={() => setConfirm("shutdown")}
                    variant="destructive"
                />
                <PowerButton
                    label="Reboot"
                    icon={RotateCcw}
                    disabled={isDisabled("reboot")}
                    loading={pending === "reboot"}
                    onClick={() => setConfirm("reboot")}
                />
                <PowerButton
                    label="Sleep"
                    icon={Moon}
                    disabled={isDisabled("sleep")}
                    loading={pending === "sleep"}
                    onClick={() => setConfirm("sleep")}
                />
            </div>

            {/* Confirmation dialog */}
            {confirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="rounded-lg border border-border bg-card p-6 shadow-xl w-80">
                        <h2 className="text-lg font-semibold capitalize">{confirm} {host}?</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            This action will {confirm === "shutdown" ? "power off" : confirm === "reboot" ? "restart" : "suspend"}{" "}
                            the host <span className="font-medium">{host}</span>. Are you sure?
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setConfirm(null)}
                                className="rounded px-4 py-1.5 text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="rounded px-4 py-1.5 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PowerButton({
    label, icon: Icon, disabled, loading, onClick, variant,
}: {
    label: string;
    icon: React.ElementType;
    disabled: boolean;
    loading: boolean;
    onClick: () => void;
    variant?: "destructive";
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${variant === "destructive"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
        >
            {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
                <Icon className="h-4 w-4" />
            )}
            {label}
        </button>
    );
}
