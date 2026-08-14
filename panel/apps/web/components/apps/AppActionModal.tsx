"use client";

import { AlertTriangle, X, ShieldAlert } from "lucide-react";
import type { Application } from "@/types/apps";

interface AppActionModalProps {
    isOpen: boolean;
    app: Application | null;
    action: "start" | "stop" | "restart" | null;
    onClose: () => void;
    onConfirm: (force: boolean) => void;
    isPending?: boolean;
}

export function AppActionModal({
    isOpen,
    app,
    action,
    onClose,
    onConfirm,
    isPending,
}: AppActionModalProps) {
    if (!isOpen || !app || !action) return null;

    const actionText =
        action === "stop" ? "durdurmak" : action === "restart" ? "yeniden başlatmak" : "başlatmak";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div
                className="relative w-full max-w-md rounded-2xl border border-destructive/40 bg-card p-6 shadow-2xl space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive border border-destructive/30">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-foreground">
                                Kritik Bağımlılık Uyarısı
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Servis etki analizi ve onaylama
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Message */}
                <div className="space-y-3 text-sm text-foreground/90">
                    <p>
                        <span className="font-semibold text-primary">{app.name}</span> servisini{" "}
                        <span className="font-semibold text-destructive">{actionText}</span> üzeresiniz.
                    </p>

                    {/* Affected Services Alert Box */}
                    {app.dependents && app.dependents.length > 0 && (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                                <ShieldAlert className="h-4 w-4" />
                                <span>Etkilenecek Bağımlı Servisler ({app.dependents.length})</span>
                            </div>
                            <ul className="list-disc list-inside text-xs text-destructive/90 space-y-1 font-mono">
                                {app.dependents.map((dep) => (
                                    <li key={dep}>{dep}</li>
                                ))}
                            </ul>
                            <p className="text-[11px] text-muted-foreground">
                                Bu servisin durdurulması yukarıdaki sistem servislerinde kesintiye veya bağlantı hatalarına yol açabilir.
                            </p>
                        </div>
                    )}
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                    <button
                        onClick={onClose}
                        disabled={isPending}
                        className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        İptal Et
                    </button>
                    <button
                        onClick={() => onConfirm(true)}
                        disabled={isPending}
                        className="rounded-lg bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm"
                    >
                        {isPending ? "İşleniyor..." : "Yine de Devam Et (Force)"}
                    </button>
                </div>
            </div>
        </div>
    );
}
