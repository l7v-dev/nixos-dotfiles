"use client";

import { useState } from "react";
import {
    PowerOff, RotateCcw, Moon, BedDouble, Layers,
    Wifi, WifiOff, Bluetooth, BluetoothOff,
    Zap, BatteryCharging,
    Plug, Clock, X, ChevronDown, ChevronUp,
    AlertTriangle, Signal, Server,
    Search, LockKeyhole,
} from "lucide-react";
import {
    usePowerMutation,
    usePowerCapabilities,
    usePowerStatus,
    useScheduledShutdown,
    useWifi,
    useWifiScan,
    useWifiConnect,
    useWifiDisconnect,
    useBluetooth,
    useBluetoothScan,
    useBluetoothConnect,
    useBluetoothDisconnect,
    useBluetoothRemove,
    useWoLHosts,
    useWoLMutation,
} from "@/hooks/useMetrics";
import { useHostStore } from "@/store/host-store";
import type { PowerCapabilities } from "@/types/api";

type PowerAction = "shutdown" | "reboot" | "sleep" | "hibernate" | "hybrid-sleep";

/* ─────────────────────────────────────────────────────────────────────────────
   Root Page
   ───────────────────────────────────────────────────────────────────────────── */

export default function CockpitPage() {
    const host = useHostStore((s) => s.selectedHost);

    return (
        <div className="mx-auto max-w-3xl space-y-5">
            {/* Page title */}
            <div>
                <h1 className="text-lg font-semibold">Cockpit</h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    Sistem kontrolü —{" "}
                    <span className="font-mono text-foreground">{host}</span>
                </p>
            </div>

            {/* ── Power Control (all-in-one) ── */}
            <PowerControlCard />

            {/* ── Network ── */}
            <div className="grid gap-4 sm:grid-cols-2">
                <WifiCard />
                <BluetoothCard />
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Power Control — unified card
   ───────────────────────────────────────────────────────────────────────────── */

function PowerControlCard() {
    const host = useHostStore((s) => s.selectedHost);
    const [confirm, setConfirm] = useState<PowerAction | null>(null);
    const [pending, setPending] = useState<PowerAction | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [advancedTab, setAdvancedTab] = useState<"schedule" | "wol">("schedule");

    const { data: caps } = usePowerCapabilities();
    const { data: powerStatus } = usePowerStatus();
    const { data: scheduled, cancel: cancelSchedule } = useScheduledShutdown();

    const shutdown = usePowerMutation("shutdown");
    const reboot = usePowerMutation("reboot");
    const sleep = usePowerMutation("sleep");
    const hibernate = usePowerMutation("hibernate");
    const hybridSleep = usePowerMutation("hybrid-sleep");

    const mutationFor = (a: PowerAction) => ({
        shutdown, reboot, sleep, hibernate, "hybrid-sleep": hybridSleep,
    }[a]);

    const handleAction = (action: PowerAction) => {
        const m = mutationFor(action);
        setPending(action);
        setConfirm(null);
        m.mutate(undefined, { onSettled: () => setPending(null) });
    };

    const isRunning = pending !== null;

    // Battery summary
    const bat = powerStatus?.batteries?.[0];
    const batPct = bat?.capacity_pct ?? null;
    const batStatus = bat?.status ?? null;
    const acOnline = powerStatus?.ac_online ?? null;

    const actionLabel = (a?: string) => {
        if (a === "poweroff" || a === "shutdown") return "Kapat";
        if (a === "reboot") return "Yeniden Başlat";
        if (a === "halt") return "Durdur";
        return a ?? "";
    };

    return (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
            {/* ── Header bar ── */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Server className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Güç Kontrolü</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {host}
                        </p>
                    </div>
                </div>

                {/* Status badges */}
                <div className="flex items-center gap-2">
                    {acOnline !== null && (
                        <StatusPill
                            icon={acOnline ? <Plug className="h-3 w-3" /> : <BatteryCharging className="h-3 w-3" />}
                            label={acOnline ? "AC Bağlı" : "Pil"}
                            color={acOnline ? "green" : "amber"}
                        />
                    )}
                    {batPct !== null && (
                        <StatusPill
                            icon={<BatteryIcon pct={batPct} status={batStatus ?? ""} />}
                            label={`${batPct}%`}
                            color={batPct <= 10 ? "red" : batPct <= 25 ? "amber" : "green"}
                        />
                    )}
                    {scheduled?.scheduled && (
                        <StatusPill
                            icon={<Clock className="h-3 w-3" />}
                            label={`~${scheduled.remaining_min}dk`}
                            color="amber"
                        />
                    )}
                </div>
            </div>

            {/* ── Active schedule banner — always visible when a shutdown is scheduled ── */}
            {scheduled?.scheduled && (
                <div className="mx-5 mt-4 flex items-center justify-between rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                        <div className="text-xs">
                            <span className="font-medium text-orange-400">
                                {actionLabel(scheduled.action)} planlandı
                            </span>
                            {scheduled.execute_at && (
                                <span className="ml-2 text-muted-foreground">
                                    {new Date(scheduled.execute_at).toLocaleString("tr-TR")}
                                </span>
                            )}
                            {scheduled.remaining_min != null && (
                                <span className="ml-2 font-medium text-orange-400">
                                    ~{scheduled.remaining_min} dk kaldı
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => cancelSchedule.mutate(undefined)}
                        disabled={cancelSchedule.isPending}
                        title="Zamanlamayı iptal et"
                        className="ml-3 flex items-center gap-1 rounded-md border border-orange-500/30 px-2 py-1 text-[11px] font-medium text-orange-400 hover:bg-orange-500/20 disabled:opacity-50 transition-colors"
                    >
                        {cancelSchedule.isPending
                            ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            : <X className="h-3 w-3" />}
                        İptal et
                    </button>
                </div>
            )}

            {/* ── Primary actions ── */}
            <div className="px-5 py-5">
                <PrimaryActions
                    caps={caps}
                    pending={pending}
                    isRunning={isRunning}
                    onRequest={setConfirm}
                />
            </div>

            {/* ── Battery detail (if present) ── */}
            {bat && (
                <div className="mx-5 mb-5 rounded-lg border border-border/50 bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <BatteryCharging className="h-3.5 w-3.5" />
                            <span>{bat.name}</span>
                            <span className="text-muted-foreground/50">·</span>
                            <span className={
                                bat.status === "Charging" ? "text-primary" :
                                    bat.status === "Discharging" ? "text-orange-400" : "text-foreground"
                            }>
                                {bat.status === "Charging" ? "Şarj oluyor" :
                                    bat.status === "Full" ? "Dolu" :
                                        bat.status === "Discharging" ? "Deşarj" : bat.status}
                            </span>
                        </div>
                        <span className="text-xs font-semibold tabular-nums">{bat.capacity_pct}%</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className={`h-full rounded-full transition-all ${bat.status === "Charging" ? "bg-primary" :
                                bat.capacity_pct <= 10 ? "bg-destructive" :
                                    bat.capacity_pct <= 25 ? "bg-orange-400" : "bg-primary"
                                }`}
                            style={{ width: `${bat.capacity_pct}%` }}
                        />
                    </div>
                    {bat.time_remaining_min != null && bat.time_remaining_min > 0 && (
                        <p className="mt-1.5 text-[10px] text-muted-foreground">
                            {bat.status === "Charging" ? "Dolmaya kalan:" : "Kalan:"}{" "}
                            {Math.floor(bat.time_remaining_min / 60)}s {bat.time_remaining_min % 60}d
                            {bat.power_now_uw != null && bat.power_now_uw > 0 && (
                                <> · {(bat.power_now_uw / 1_000_000).toFixed(1)} W</>
                            )}
                        </p>
                    )}
                </div>
            )}

            {/* ── Advanced toggle ── */}
            <div className="border-t border-border">
                <button
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="flex w-full items-center justify-between px-5 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    <span className="flex items-center gap-2">
                        <span>Gelişmiş</span>
                        <span className="flex gap-1.5">
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">Wake-on-LAN</span>
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">Zamanlı Kapatma</span>
                            {caps?.can_hibernate && (
                                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">Hazırda Beklet</span>
                            )}
                        </span>
                    </span>
                    {showAdvanced
                        ? <ChevronUp className="h-3.5 w-3.5" />
                        : <ChevronDown className="h-3.5 w-3.5" />
                    }
                </button>

                {showAdvanced && (
                    <div className="border-t border-border/50">
                        {/* Tab bar */}
                        <div className="flex border-b border-border/50 px-5">
                            {(["schedule", "wol"] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setAdvancedTab(tab)}
                                    className={`mr-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${advancedTab === tab
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    {tab === "schedule" ? "⏱ Zamanlı Kapatma" : "⚡ Wake-on-LAN"}
                                </button>
                            ))}
                        </div>

                        <div className="p-5">
                            {advancedTab === "schedule"
                                ? <SchedulePanel />
                                : <WoLPanel />
                            }
                        </div>
                    </div>
                )}
            </div>

            {/* ── Confirm Dialog ── */}
            {confirm && (
                <ConfirmDialog
                    action={confirm}
                    host={host}
                    onConfirm={() => handleAction(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Primary Actions — big buttons
   ───────────────────────────────────────────────────────────────────────────── */

const PRIMARY_ACTIONS: {
    action: PowerAction;
    label: string;
    sub: string;
    icon: React.ElementType;
    cap: keyof PowerCapabilities | null;
    danger?: boolean;
}[] = [
        { action: "shutdown", label: "Kapat", sub: "Sistemi güvenli kapat", icon: PowerOff, cap: "can_power_off", danger: true },
        { action: "reboot", label: "Yeniden Başlat", sub: "Hızlı yeniden başlatma", icon: RotateCcw, cap: "can_reboot" },
        { action: "sleep", label: "Uyku", sub: "Düşük güç modu", icon: Moon, cap: "can_suspend" },
    ];

const SECONDARY_ACTIONS: {
    action: PowerAction;
    label: string;
    icon: React.ElementType;
    cap: keyof PowerCapabilities;
}[] = [
        { action: "hibernate", label: "Hazırda Beklet", icon: BedDouble, cap: "can_hibernate" },
        { action: "hybrid-sleep", label: "Hibrit Uyku", icon: Layers, cap: "can_hybrid_sleep" },
    ];

function PrimaryActions({
    caps, pending, isRunning, onRequest,
}: {
    caps: PowerCapabilities | undefined;
    pending: PowerAction | null;
    isRunning: boolean;
    onRequest: (a: PowerAction) => void;
}) {
    const available = PRIMARY_ACTIONS.filter(
        (a) => !a.cap || (caps?.[a.cap] ?? true)
    );
    const secondary = SECONDARY_ACTIONS.filter((a) => caps?.[a.cap]);

    return (
        <div className="space-y-3">
            {/* Primary row — big cards */}
            <div className={`grid gap-3 ${available.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {available.map(({ action, label, sub, icon: Icon, danger }) => (
                    <button
                        key={action}
                        onClick={() => onRequest(action)}
                        disabled={isRunning}
                        className={`group flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all disabled:opacity-40 ${danger
                            ? "border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5"
                            : "border-border hover:border-primary/40 hover:bg-primary/5"
                            }`}
                    >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${danger
                            ? "bg-destructive/10 text-destructive group-hover:bg-destructive/15"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                            }`}>
                            {pending === action
                                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                : <Icon className="h-4 w-4" />
                            }
                        </div>
                        <div>
                            <p className={`text-sm font-semibold ${danger ? "text-destructive" : ""}`}>{label}</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">{sub}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Secondary row — compact buttons */}
            {secondary.length > 0 && (
                <div className="flex gap-2">
                    {secondary.map(({ action, label, icon: Icon }) => (
                        <button
                            key={action}
                            onClick={() => onRequest(action)}
                            disabled={isRunning}
                            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-40 transition-all"
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Schedule Panel
   ───────────────────────────────────────────────────────────────────────────── */

function SchedulePanel() {
    const { schedule } = useScheduledShutdown();
    const [action, setAction] = useState("shutdown");
    const [mode, setMode] = useState<"delay" | "time">("delay");
    const [delayMin, setDelayMin] = useState("30");
    const [atTime, setAtTime] = useState("");
    const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

    const fmtSuccess = (res: { action?: string; execute_at?: string }) => {
        const label = res.action === "reboot" ? "Yeniden Başlat" : res.action === "halt" ? "Durdur" : "Kapat";
        const time = res.execute_at ? ` — ${new Date(res.execute_at).toLocaleTimeString("tr-TR")}` : "";
        return `Planlandı: ${label}${time}`;
    };

    const handleSchedule = () => {
        setFeedback(null);
        const body = mode === "delay"
            ? { action, delay_minutes: parseInt(delayMin, 10) }
            : { action, at_time: new Date(atTime).toISOString() };

        schedule.mutate(body, {
            onSuccess: (res) => setFeedback({ ok: true, msg: fmtSuccess(res) }),
            onError: (err: unknown) => setFeedback({
                ok: false,
                msg: (err as { message?: string })?.message ?? "Hata",
            }),
        });
    };

    return (
        <div className="space-y-4">

            <div className="grid gap-3 sm:grid-cols-2">
                {/* Action */}
                <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground uppercase tracking-wider">İşlem</label>
                    <select
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                        <option value="shutdown">Kapat</option>
                        <option value="reboot">Yeniden Başlat</option>
                        <option value="halt">Durdur</option>
                    </select>
                </div>

                {/* Mode */}
                <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Zaman Modu</label>
                    <div className="flex overflow-hidden rounded-md border border-border text-sm">
                        {(["delay", "time"] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={`flex-1 py-2 transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                                    }`}
                            >
                                {m === "delay" ? "Süre" : "Saat"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Input */}
            {mode === "delay" ? (
                <div className="space-y-3">
                    {/* Quick presets */}
                    <div>
                        <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                            Hızlı Seçim
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { label: "5 dk", min: 5 },
                                { label: "15 dk", min: 15 },
                                { label: "30 dk", min: 30 },
                                { label: "1 sa", min: 60 },
                                { label: "2 sa", min: 120 },
                                { label: "4 sa", min: 240 },
                                { label: "8 sa", min: 480 },
                            ].map(({ label, min }) => (
                                <button
                                    key={min}
                                    onClick={() => {
                                        setDelayMin(String(min));
                                        setFeedback(null);
                                        schedule.mutate(
                                            { action, delay_minutes: min },
                                            {
                                                onSuccess: (res) => setFeedback({ ok: true, msg: fmtSuccess(res) }),
                                                onError: (err: unknown) => setFeedback({
                                                    ok: false,
                                                    msg: (err as { message?: string })?.message ?? "Hata",
                                                }),
                                            }
                                        );
                                    }}
                                    disabled={schedule.isPending}
                                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all disabled:opacity-50 ${delayMin === String(min)
                                        ? "border-primary bg-primary/15 text-primary"
                                        : "border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <p className="mt-1.5 text-[10px] text-muted-foreground">
                            Chip'e tıklayınca otomatik planlanır
                        </p>
                    </div>

                    {/* Manual input */}
                    <div>
                        <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                            Manuel (dakika)
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={1} max={1440}
                                value={delayMin}
                                onChange={(e) => setDelayMin(e.target.value)}
                                className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <span className="text-sm text-muted-foreground">dakika</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Tarih & Saat
                    </label>
                    <input
                        type="datetime-local"
                        value={atTime}
                        onChange={(e) => setAtTime(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
            )}

            <div className="flex items-center gap-2">
                <button
                    onClick={handleSchedule}
                    disabled={schedule.isPending || (mode === "time" && !atTime)}
                    className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                    {schedule.isPending
                        ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        : <Clock className="h-3.5 w-3.5" />
                    }
                    Planla
                </button>
            </div>

            {feedback && (
                <p className={`rounded-md border px-3 py-2 text-xs ${feedback.ok
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                    }`}>
                    {feedback.msg}
                </p>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Wake-on-LAN Panel
   ───────────────────────────────────────────────────────────────────────────── */

function WoLPanel() {
    const { data: hosts } = useWoLHosts();
    const wol = useWoLMutation();
    const [selectedMAC, setSelectedMAC] = useState("");
    const [customMAC, setCustomMAC] = useState("");
    const [broadcast, setBroadcast] = useState("255.255.255.255");
    const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

    const targetMAC = selectedMAC === "__custom__" ? customMAC : selectedMAC;

    const handleWake = () => {
        if (!targetMAC) return;
        setResult(null);
        wol.mutate(
            { mac: targetMAC, broadcast: broadcast || undefined },
            {
                onSuccess: () => setResult({ ok: true, msg: `Magic packet gönderildi → ${targetMAC}` }),
                onError: (err: unknown) => setResult({
                    ok: false,
                    msg: (err as { message?: string })?.message ?? "Gönderilemedi",
                }),
            }
        );
    };

    return (
        <div className="space-y-3">
            {hosts && hosts.length > 0 && (
                <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Hedef Host
                    </label>
                    <select
                        value={selectedMAC}
                        onChange={(e) => setSelectedMAC(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                        <option value="">— Seç —</option>
                        {hosts.map((h) => (
                            <option key={h.mac} value={h.mac}>{h.name} — {h.mac}</option>
                        ))}
                        <option value="__custom__">Manuel giriş…</option>
                    </select>
                </div>
            )}

            {(selectedMAC === "__custom__" || !hosts || hosts.length === 0) && (
                <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        MAC Adresi
                    </label>
                    <input
                        type="text"
                        value={customMAC}
                        onChange={(e) => setCustomMAC(e.target.value)}
                        placeholder="aa:bb:cc:dd:ee:ff"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
            )}

            <div>
                <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Broadcast
                </label>
                <input
                    type="text"
                    value={broadcast}
                    onChange={(e) => setBroadcast(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
            </div>

            <button
                onClick={handleWake}
                disabled={!targetMAC || wol.isPending}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
                {wol.isPending
                    ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    : <Zap className="h-3.5 w-3.5" />
                }
                Uyandır
            </button>

            {result && (
                <p className={`rounded-md border px-3 py-2 text-xs ${result.ok
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                    }`}>
                    {result.msg}
                </p>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   WiFi Card
   ───────────────────────────────────────────────────────────────────────────── */

function WifiCard() {
    const { data, isLoading, toggle } = useWifi();
    const { data: aps, isFetching: scanning, refetch: doScan } = useWifiScan();
    const connect = useWifiConnect();
    const disconnect = useWifiDisconnect();

    const [showScan, setShowScan] = useState(false);
    const [connectingSSID, setConnectingSSID] = useState<string | null>(null);
    const [passwordSSID, setPasswordSSID] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

    const handleScan = () => {
        setShowScan(true);
        doScan();
    };

    const handleConnect = (ssid: string, isOpen: boolean) => {
        if (isOpen) {
            doConnect(ssid, "");
        } else {
            setPasswordSSID(ssid);
            setPassword("");
        }
    };

    const doConnect = (ssid: string, pw: string) => {
        setConnectingSSID(ssid);
        setPasswordSSID(null);
        setFeedback(null);
        connect.mutate({ ssid, password: pw }, {
            onSuccess: () => {
                setFeedback({ ok: true, msg: `${ssid} ağına bağlanılıyor…` });
                setShowScan(false);
                setConnectingSSID(null);
            },
            onError: (err: unknown) => {
                setFeedback({ ok: false, msg: (err as { message?: string })?.message ?? "Bağlantı hatası" });
                setConnectingSSID(null);
            },
        });
    };

    const signalBars = (dbm: number) => {
        if (dbm >= -50) return 4;
        if (dbm >= -65) return 3;
        if (dbm >= -75) return 2;
        return 1;
    };

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${data?.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                        {data?.enabled ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                    </div>
                    <div>
                        <p className="text-sm font-semibold">WiFi</p>
                        <p className="text-[11px] text-muted-foreground">
                            {isLoading ? "Yükleniyor…" : data?.enabled ? (data.ssid ?? "Bağlı") : "Kapalı"}
                        </p>
                    </div>
                </div>
                <Toggle
                    checked={data?.enabled ?? false}
                    disabled={toggle.isPending || isLoading}
                    onChange={() => toggle.mutate()}
                />
            </div>

            {/* Current connection details */}
            {data?.enabled && (
                <div className="space-y-1.5 rounded-lg border border-border/50 bg-background/40 p-3 text-xs mb-3">
                    {data.ssid && <InfoRow label="SSID" value={data.ssid} />}
                    {data.ip_address && <InfoRow label="IP" value={data.ip_address} mono />}
                    {data.signal_dbm != null && (
                        <InfoRow label="Sinyal" value={`${data.signal_dbm} dBm`} icon={<Signal className="h-3 w-3" />} />
                    )}
                </div>
            )}

            {/* Action buttons */}
            {data?.enabled && (
                <div className="flex gap-2">
                    <button
                        onClick={handleScan}
                        disabled={scanning}
                        className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                    >
                        {scanning
                            ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            : <Search className="h-3 w-3" />}
                        Ağları Tara
                    </button>
                    {data.ssid && (
                        <button
                            onClick={() => disconnect.mutate()}
                            disabled={disconnect.isPending}
                            className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                        >
                            Bağlantıyı Kes
                        </button>
                    )}
                </div>
            )}

            {/* Scan results */}
            {showScan && aps && aps.length > 0 && (
                <div className="mt-3 rounded-lg border border-border overflow-hidden">
                    <div className="bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center justify-between">
                        <span>{aps.length} ağ bulundu</span>
                        <button onClick={() => setShowScan(false)} className="text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
                        {[...aps].sort((a, b) => b.signal_dbm - a.signal_dbm).map((ap) => (
                            <div key={ap.bssid} className="flex items-center justify-between px-3 py-2 hover:bg-muted/30">
                                <div className="flex items-center gap-2 min-w-0">
                                    {/* Signal bars */}
                                    <div className="flex items-end gap-0.5 h-4">
                                        {[1, 2, 3, 4].map((bar) => (
                                            <div key={bar} className={`w-1 rounded-sm ${bar <= signalBars(ap.signal_dbm)
                                                ? "bg-primary"
                                                : "bg-muted-foreground/30"
                                                }`} style={{ height: `${bar * 25}%` }} />
                                        ))}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium truncate">{ap.ssid}</p>
                                        <p className="text-[10px] text-muted-foreground">{ap.band} · {ap.signal_dbm} dBm</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {ap.security !== "open"
                                        ? <LockKeyhole className="h-3 w-3 text-muted-foreground" />
                                        : <span className="text-[10px] text-green-600">Açık</span>}
                                    {ap.active ? (
                                        <span className="text-[10px] font-medium text-primary">Bağlı</span>
                                    ) : (
                                        <button
                                            onClick={() => handleConnect(ap.ssid, ap.security === "open")}
                                            disabled={connectingSSID === ap.ssid}
                                            className="rounded px-2 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                        >
                                            {connectingSSID === ap.ssid ? "…" : "Bağlan"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Password input dialog */}
            {passwordSSID && (
                <div className="mt-3 rounded-lg border border-border p-3 space-y-2 bg-background/60">
                    <p className="text-xs font-medium">
                        <LockKeyhole className="inline h-3 w-3 mr-1" />
                        {passwordSSID} için şifre
                    </p>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && password && doConnect(passwordSSID, password)}
                        placeholder="WiFi şifresi"
                        autoFocus
                        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => doConnect(passwordSSID, password)}
                            disabled={!password}
                            className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                            Bağlan
                        </button>
                        <button
                            onClick={() => setPasswordSSID(null)}
                            className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
                        >
                            İptal
                        </button>
                    </div>
                </div>
            )}

            {/* Feedback */}
            {feedback && (
                <p className={`mt-2 rounded-md px-3 py-1.5 text-xs font-medium ${feedback.ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
                    }`}>
                    {feedback.msg}
                </p>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Bluetooth Card
   ───────────────────────────────────────────────────────────────────────────── */

function BluetoothCard() {
    const { data, isLoading, toggle } = useBluetooth();
    const { data: scanned, isFetching: scanning, refetch: doScan } = useBluetoothScan();
    const btConnect = useBluetoothConnect();
    const btDisconnect = useBluetoothDisconnect();
    const btRemove = useBluetoothRemove();

    const [showScan, setShowScan] = useState(false);
    const [actionAddr, setActionAddr] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

    const handleScan = () => {
        setShowScan(true);
        doScan();
    };

    const deviceIcon = (icon?: string) => {
        if (!icon) return "📱";
        if (icon.includes("headset") || icon.includes("headphone") || icon.includes("audio")) return "🎧";
        if (icon.includes("mouse")) return "🖱️";
        if (icon.includes("keyboard")) return "⌨️";
        if (icon.includes("phone")) return "📱";
        if (icon.includes("computer")) return "💻";
        if (icon.includes("speaker")) return "🔊";
        return "📡";
    };

    const withFeedback = (promise: Promise<unknown>, ok: string, fail: string) => {
        setActionAddr(null);
        setFeedback(null);
        promise
            .then(() => setFeedback({ ok: true, msg: ok }))
            .catch((err: unknown) =>
                setFeedback({ ok: false, msg: (err as { message?: string })?.message ?? fail })
            );
    };

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${data?.enabled ? "bg-blue-500/10 text-blue-400" : "bg-muted text-muted-foreground"
                        }`}>
                        {data?.enabled ? <Bluetooth className="h-4 w-4" /> : <BluetoothOff className="h-4 w-4" />}
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Bluetooth</p>
                        <p className="text-[11px] text-muted-foreground">
                            {isLoading ? "Yükleniyor…" : data?.enabled
                                ? `${data.devices?.filter((d) => d.connected).length ?? 0} bağlı cihaz`
                                : "Kapalı"}
                        </p>
                    </div>
                </div>
                <Toggle
                    checked={data?.enabled ?? false}
                    disabled={toggle.isPending || isLoading}
                    onChange={() => toggle.mutate()}
                />
            </div>

            {/* Paired device list */}
            {data?.enabled && data.devices && data.devices.length > 0 && (
                <div className="mb-3 rounded-lg border border-border/50 bg-background/40 divide-y divide-border/30">
                    {data.devices.map((d) => (
                        <div key={d.address} className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-base">{deviceIcon(d.icon)}</span>
                                <div className="min-w-0">
                                    <p className="text-xs font-medium truncate">{d.name || d.address}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">{d.address}</p>
                                </div>
                                {d.battery_pct != null && (
                                    <span className="text-[10px] text-muted-foreground ml-1">🔋{d.battery_pct}%</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] font-medium ${d.connected ? "text-primary" : "text-muted-foreground"}`}>
                                    {d.connected ? "Bağlı" : "Bağlı değil"}
                                </span>
                                {d.connected ? (
                                    <button
                                        onClick={() => {
                                            setActionAddr(d.address);
                                            withFeedback(
                                                btDisconnect.mutateAsync(d.address),
                                                `${d.name} bağlantısı kesildi`,
                                                "Bağlantı kesilemedi"
                                            );
                                        }}
                                        disabled={btDisconnect.isPending && actionAddr === d.address}
                                        className="rounded px-1.5 py-0.5 text-[10px] bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
                                    >
                                        Kes
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setActionAddr(d.address); withFeedback(
                                                btConnect.mutateAsync(d.address),
                                                `${d.name} bağlanıyor…`,
                                                "Bağlanılamadı"
                                            );
                                        }}
                                        disabled={btConnect.isPending && actionAddr === d.address}
                                        className="rounded px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        Bağlan
                                    </button>
                                )}
                                <button
                                    onClick={() => withFeedback(
                                        btRemove.mutateAsync(d.address),
                                        `${d.name} kaldırıldı`,
                                        "Kaldırılamadı"
                                    )}
                                    title="Eşleştirmeyi kaldır"
                                    className="rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {data?.enabled && (!data.devices || data.devices.length === 0) && (
                <p className="mb-3 text-xs text-muted-foreground">Eşleştirilmiş cihaz yok.</p>
            )}

            {/* Scan button */}
            {data?.enabled && (
                <button
                    onClick={handleScan}
                    disabled={scanning}
                    className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                >
                    {scanning
                        ? <>
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Taranıyor (~5s)…
                        </>
                        : <><Search className="h-3 w-3" />Cihazları Tara</>}
                </button>
            )}

            {/* Scan results */}
            {showScan && scanned && scanned.length > 0 && (
                <div className="mt-3 rounded-lg border border-border overflow-hidden">
                    <div className="bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center justify-between">
                        <span>{scanned.length} cihaz</span>
                        <button onClick={() => setShowScan(false)}><X className="h-3 w-3" /></button>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
                        {scanned.filter((d) => !d.paired).map((d) => (
                            <div key={d.address} className="flex items-center justify-between px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">{deviceIcon(d.icon)}</span>
                                    <div>
                                        <p className="text-xs font-medium">{d.name || d.address}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono">{d.address}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setActionAddr(d.address); withFeedback(
                                            btConnect.mutateAsync(d.address),
                                            `${d.name || d.address} bağlanıyor…`,
                                            "Bağlanılamadı"
                                        ); setShowScan(false);
                                    }}
                                    disabled={btConnect.isPending && actionAddr === d.address}
                                    className="rounded px-2 py-0.5 text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    Bağlan
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Feedback */}
            {feedback && (
                <p className={`mt-2 rounded-md px-3 py-1.5 text-xs font-medium ${feedback.ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
                    }`}>
                    {feedback.msg}
                </p>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Confirm Dialog
   ───────────────────────────────────────────────────────────────────────────── */

const ACTION_COPY: Record<PowerAction, { title: string; desc: string; danger: boolean }> = {
    shutdown: { title: "Sistemi kapatmak istediğinize emin misiniz?", desc: "Tüm çalışan işlemler durdurulacak.", danger: true },
    reboot: { title: "Yeniden başlatmak istediğinize emin misiniz?", desc: "Sistem yeniden başlatılacak.", danger: false },
    sleep: { title: "Uyku moduna almak istediğinize emin misiniz?", desc: "Düşük güç moduna geçilecek.", danger: false },
    hibernate: { title: "Hazırda beklemeye almak istediğinize emin misiniz?", desc: "Oturum diske kaydedilecek.", danger: false },
    "hybrid-sleep": { title: "Hibrit uyku moduna almak istediğinize emin misiniz?", desc: "Uyku + hazırda bekleme.", danger: false },
};

function ConfirmDialog({
    action, host, onConfirm, onCancel,
}: {
    action: PowerAction;
    host: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const copy = ACTION_COPY[action];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-[340px] rounded-2xl border border-border bg-card p-6 shadow-2xl">
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full ${copy.danger ? "bg-destructive/15" : "bg-primary/10"
                    }`}>
                    {copy.danger
                        ? <AlertTriangle className="h-5 w-5 text-destructive" />
                        : <PowerOff className="h-5 w-5 text-primary" />
                    }
                </div>
                <h2 className="text-base font-semibold leading-snug">{copy.title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{copy.desc}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Hedef:{" "}
                    <span className="font-mono font-medium text-foreground">{host}</span>
                </p>
                <div className="mt-5 flex gap-2">
                    <button
                        onClick={onCancel}
                        className="flex-1 rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${copy.danger
                            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                    >
                        Onayla
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Primitives
   ───────────────────────────────────────────────────────────────────────────── */

function Toggle({ checked, disabled, onChange }: {
    checked: boolean;
    disabled: boolean;
    onChange: () => void;
}) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={onChange}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${checked ? "bg-primary" : "bg-muted"
                }`}
        >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"
                }`} />
        </button>
    );
}

function StatusPill({ icon, label, color }: {
    icon: React.ReactNode;
    label: string;
    color: "green" | "amber" | "red";
}) {
    const cls = {
        green: "bg-primary/10 text-primary border-primary/20",
        amber: "bg-orange-400/10 text-orange-400 border-orange-400/20",
        red: "bg-destructive/10 text-destructive border-destructive/20",
    }[color];

    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
            {icon}
            {label}
        </span>
    );
}

function BatteryIcon({ pct, status }: { pct: number; status: string }) {
    if (status === "Charging") return <BatteryCharging className="h-3 w-3" />;
    return <BatteryCharging className={`h-3 w-3 ${pct <= 20 ? "text-destructive" : ""}`} />;
}

function InfoRow({ label, value, mono, icon }: {
    label: string;
    value: string;
    mono?: boolean;
    icon?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-muted-foreground">
                {icon}
                {label}
            </span>
            <span className={mono ? "font-mono" : "font-medium"}>{value}</span>
        </div>
    );
}
