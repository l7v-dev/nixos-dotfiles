"use client";

import React, { useState } from "react";
import {
    Bluetooth, BluetoothOff, Search,
    X, Battery, CheckCircle2, AlertCircle,
    Headphones, Mouse, Keyboard, Smartphone, Laptop, Speaker, Radio,
} from "lucide-react";
import {
    useBluetooth,
    useBluetoothScan,
    useBluetoothConnect,
    useBluetoothDisconnect,
    useBluetoothRemove,
} from "@/hooks/useMetrics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BluetoothDevice } from "@/types/api";

export function BluetoothCard() {
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
        if (!icon) return <Radio className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
        const lower = icon.toLowerCase();
        if (lower.includes("audio") || lower.includes("head") || lower.includes("airtrack")) {
            return <Headphones className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
        }
        if (lower.includes("mouse")) return <Mouse className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
        if (lower.includes("keyboard")) return <Keyboard className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
        if (lower.includes("phone")) return <Smartphone className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
        if (lower.includes("computer")) return <Laptop className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
        if (lower.includes("speaker")) return <Speaker className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
        return <Radio className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
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

    const connectedDevices = data?.devices?.filter((d) => d.connected) ?? [];
    const totalDevices = data?.devices?.length ?? 0;

    return (
        <div className="instrument-card p-4 sm:p-5 space-y-4 font-sans">
            {/* ── 1. Header & Status ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
                        {data?.enabled ? <Bluetooth className="h-4 w-4" strokeWidth={1.6} /> : <BluetoothOff className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
                    </div>
                    <div>
                        <p className="text-sm font-semibold leading-tight text-foreground whitespace-nowrap">Bluetooth Controller</p>
                        <p className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                            {isLoading
                                ? "Reading controller…"
                                : data?.enabled
                                ? `${connectedDevices.length} Connected · ${totalDevices} Paired`
                                : "Controller Disabled"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge
                        variant={connectedDevices.length > 0 ? "success" : data?.enabled ? "info" : "muted"}
                        className="text-[10px] font-mono whitespace-nowrap"
                    >
                        {connectedDevices.length > 0 ? "● Active Mesh" : data?.enabled ? "○ Discoverable" : "Off"}
                    </Badge>
                    <button
                        onClick={() => toggle.mutate()}
                        disabled={toggle.isPending || isLoading}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            data?.enabled ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                data?.enabled ? "translate-x-4" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>
            </div>

            {/* ── 2. Primary Telemetry Metric Grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Controller Status */}
                <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                        Bluetooth HCI
                    </p>
                    <p className="text-xs font-bold font-mono text-foreground whitespace-nowrap truncate">
                        {data?.enabled ? "hci0 Ready" : "Powered Off"}
                    </p>
                    <p className={`text-[10px] font-mono whitespace-nowrap truncate ${data?.enabled ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                        {data?.enabled ? "● BlueZ 5.76" : "○ Down"}
                    </p>
                </div>

                {/* Active Connected */}
                <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                        Active Peripherals
                    </p>
                    <p className="text-lg font-bold font-mono tnum text-primary whitespace-nowrap truncate">
                        {connectedDevices.length}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap truncate">
                        {connectedDevices[0]?.name || "None active"}
                    </p>
                </div>

                {/* Paired Count */}
                <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                        Paired Devices
                    </p>
                    <p className="text-lg font-bold font-mono tnum text-foreground whitespace-nowrap truncate">
                        {totalDevices}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap truncate">
                        Stored in DBus
                    </p>
                </div>

                {/* Audio Profile */}
                <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                        Audio Codec
                    </p>
                    <p className="text-xs font-bold font-mono text-foreground whitespace-nowrap truncate">
                        LDAC / AAC
                    </p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap truncate">
                        PipeWire Session
                    </p>
                </div>
            </div>

            {/* ── 3. Paired Devices Quick List & Actions ── */}
            {data?.enabled && data.devices && data.devices.length > 0 && (
                <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/40 p-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                        Paired Peripherals
                    </p>
                    <div className="divide-y divide-border/30">
                        {data.devices.map((d: BluetoothDevice) => (
                            <div key={d.address} className="flex items-center justify-between py-1.5 px-1">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="p-1 rounded-md bg-muted/60">
                                        {deviceIcon(d.icon || d.name)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-foreground truncate">{d.name || d.address}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono">{d.address}</p>
                                    </div>
                                    {d.battery_pct != null && (
                                        <Badge variant="outline" className="gap-1 text-[9px] font-mono ml-1">
                                            <Battery className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                                            <span>{d.battery_pct}%</span>
                                        </Badge>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    {d.connected ? (
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            onClick={() => {
                                                setActionAddr(d.address);
                                                withFeedback(
                                                    btDisconnect.mutateAsync(d.address),
                                                    `Disconnected from ${d.name}`,
                                                    "Failed to disconnect"
                                                );
                                            }}
                                            disabled={btDisconnect.isPending && actionAddr === d.address}
                                            className="h-6 text-[10px] border-border text-muted-foreground hover:text-foreground"
                                        >
                                            Disconnect
                                        </Button>
                                    ) : (
                                        <Button
                                            size="xs"
                                            variant="default"
                                            onClick={() => {
                                                setActionAddr(d.address);
                                                withFeedback(
                                                    btConnect.mutateAsync(d.address),
                                                    `Connected to ${d.name}!`,
                                                    "Connection failed"
                                                );
                                            }}
                                            disabled={btConnect.isPending && actionAddr === d.address}
                                            className="h-6 text-[10px]"
                                        >
                                            Connect
                                        </Button>
                                    )}
                                    <button
                                        onClick={() =>
                                            withFeedback(
                                                btRemove.mutateAsync(d.address),
                                                `Unpaired ${d.name}`,
                                                "Failed to unpair"
                                            )
                                        }
                                        title="Unpair device"
                                        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── 4. Tactile Controls & Progressive Disclosure ── */}
            <div className="flex items-center justify-between pt-1">
                <Button
                    variant="outline"
                    size="xs"
                    onClick={handleScan}
                    disabled={scanning || !data?.enabled}
                    className="gap-1.5 text-xs font-medium h-8"
                >
                    {scanning ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                        <Search className="h-3.5 w-3.5 text-primary" />
                    )}
                    <span>{scanning ? "Scanning (~5s)…" : "Scan Nearby Devices"}</span>
                </Button>

                <span className="text-[10px] font-mono text-muted-foreground">
                    DBus /org/bluez
                </span>
            </div>

            {/* Feedback alert */}
            {feedback && (
                <div
                    className={`flex items-center gap-2 rounded-lg border p-2 text-xs font-mono ${
                        feedback.ok
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-destructive/30 bg-destructive/10 text-destructive"
                    }`}
                >
                    <span className="flex-1">{feedback.msg}</span>
                    <button onClick={() => setFeedback(null)}>
                        <X className="h-3 w-3" />
                    </button>
                </div>
            )}

            {/* Scan results drawer */}
            {showScan && scanned && scanned.length > 0 && (
                <div className="mt-3 rounded-lg border border-border/70 overflow-hidden bg-background/50 space-y-0">
                    <div className="bg-muted/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground flex items-center justify-between border-b border-border/60">
                        <span>Discovered Nearby Devices ({scanned.length})</span>
                        <button onClick={() => setShowScan(false)} className="text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-border/40">
                        {scanned
                            .filter((d: BluetoothDevice) => !d.paired)
                            .map((d: BluetoothDevice) => (
                                <div key={d.address} className="flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="p-1 rounded-md bg-muted/60">
                                            {deviceIcon(d.icon || d.name)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-foreground truncate">{d.name || d.address}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono">{d.address}</p>
                                        </div>
                                    </div>
                                    <Button
                                        size="xs"
                                        variant="default"
                                        onClick={() => {
                                            setActionAddr(d.address);
                                            withFeedback(
                                                btConnect.mutateAsync(d.address),
                                                `Paired and connected to ${d.name}!`,
                                                "Pairing failed"
                                            );
                                        }}
                                        disabled={btConnect.isPending && actionAddr === d.address}
                                        className="h-6 text-[10px]"
                                    >
                                        Pair & Connect
                                    </Button>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}
