"use client";

import { useState } from "react";
import {
    HardDrive, Disc,
    CheckCircle2, AlertCircle,
    FileBox,
} from "lucide-react";
import { useStorage } from "@/hooks/useStorage";

export function StorageCard() {
    const { data: drives, unmount, isLoading } = useStorage();
    const [actionMsg, setActionMsg] = useState<{ ok: boolean; msg: string } | null>(null);

    const handleUnmount = (device: string) => {
        setActionMsg(null);
        unmount.mutate(device, {
            onSuccess: () => {
                setActionMsg({ ok: true, msg: `${device} güvenli şekilde çıkarıldı!` });
            },
            onError: (err) => {
                setActionMsg({ ok: false, msg: err.message ?? "Çıkarma başarısız" });
            },
        });
    };

    const removableDrives = drives ?? [];

    return (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500">
                        <HardDrive className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Çıkarılabilir Diskler ve USB</p>
                        <p className="text-[11px] text-muted-foreground">
                            {isLoading ? "Yükleniyor…" : `${removableDrives.length} aygıt takılı`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Drive list */}
            {removableDrives.length > 0 ? (
                <div className="divide-y divide-border/40 rounded-lg border border-border/50 bg-background/40">
                    {removableDrives.map((d) => (
                        <div key={d.device} className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                    <Disc className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold">
                                        {d.label || d.name || d.device}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-mono">
                                        {d.size_gib ? `${d.size_gib.toFixed(1)} GB` : ""} {d.fs_type ? `· ${d.fs_type}` : ""}
                                        {d.mount_point ? ` · ${d.mount_point}` : " · Bağlı Değil"}
                                    </p>
                                </div>
                            </div>
                            <div>
                                {d.is_mounted ? (
                                    <button
                                        onClick={() => handleUnmount(d.device)}
                                        disabled={unmount.isPending}
                                        className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                                    >
                                        Güvenli Çıkar
                                    </button>
                                ) : (
                                    <span className="text-[11px] text-muted-foreground">Bağlı Değil</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-5 text-center text-muted-foreground rounded-lg border border-dashed border-border/60">
                    <FileBox className="h-6 w-6 stroke-1 mb-1 opacity-50" />
                    <p className="text-xs">Bağlı harici USB disk veya çıkarılabilir ortam bulunamadı.</p>
                </div>
            )}

            {/* Action Feedback */}
            {actionMsg && (
                <div
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs ${
                        actionMsg.ok
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                            : "border-destructive/30 bg-destructive/10 text-destructive"
                    }`}
                >
                    {actionMsg.ok ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span className="leading-tight">{actionMsg.msg}</span>
                </div>
            )}
        </div>
    );
}
