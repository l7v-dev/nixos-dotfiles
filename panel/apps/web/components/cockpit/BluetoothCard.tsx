"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
    Bluetooth, BluetoothOff, Search,
    X, Battery, CheckCircle2, AlertCircle,
    Headphones, Mouse, Keyboard, Smartphone, Laptop, Speaker, Radio,
    Gamepad2, Signal, RefreshCw, Trash2, ShieldCheck, Power,
} from "lucide-react";
import {
    useBluetooth,
    useBluetoothScan,
    useBluetoothPair,
    useBluetoothConnect,
    useBluetoothDisconnect,
    useBluetoothRemove,
} from "@/hooks/useMetrics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BluetoothDevice } from "@/types/api";

type CategoryFilter = "all" | "audio" | "input" | "other";

export function BluetoothCard() {
    const { data, isLoading, toggle } = useBluetooth();
    const { data: scanned, isFetching: scanning, refetch: doScan } = useBluetoothScan();
    const btPair = useBluetoothPair();
    const btConnect = useBluetoothConnect();
    const btDisconnect = useBluetoothDisconnect();
    const btRemove = useBluetoothRemove();

    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
    const [showScan, setShowScan] = useState(false);
    const [hasScannedOnce, setHasScannedOnce] = useState(false);
    const [actionAddr, setActionAddr] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

    const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

    const setTimedFeedback = (msg: { ok: boolean; msg: string }) => {
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        setFeedback(msg);
        feedbackTimerRef.current = setTimeout(() => {
            setFeedback(null);
        }, 4500);
    };

    useEffect(() => {
        return () => {
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        };
    }, []);

    const handleScan = () => {
        setShowScan(true);
        setHasScannedOnce(true);
        doScan();
    };

    const getDeviceCategory = (d: BluetoothDevice): "audio" | "input" | "other" => {
        const text = `${d.icon || ""} ${d.name || ""}`.toLowerCase();
        if (text.includes("audio") || text.includes("head") || text.includes("speaker") || text.includes("ear") || text.includes("airtrack") || text.includes("sound")) {
            return "audio";
        }
        if (text.includes("mouse") || text.includes("keyboard") || text.includes("gamepad") || text.includes("controller") || text.includes("trackpad") || text.includes("input")) {
            return "input";
        }
        return "other";
    };

    const deviceIcon = (d: BluetoothDevice) => {
        const text = `${d.icon || ""} ${d.name || ""}`.toLowerCase();
        if (text.includes("head") || text.includes("airtrack") || text.includes("ear")) {
            return <Headphones className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
        }
        if (text.includes("speaker") || text.includes("sound")) {
            return <Speaker className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
        }
        if (text.includes("mouse") || text.includes("trackpad")) {
            return <Mouse className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
        }
        if (text.includes("keyboard")) {
            return <Keyboard className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
        }
        if (text.includes("gamepad") || text.includes("controller")) {
            return <Gamepad2 className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
        }
        if (text.includes("phone")) {
            return <Smartphone className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
        }
        if (text.includes("computer") || text.includes("laptop")) {
            return <Laptop className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
        }
        return <Radio className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
    };

    const renderSignalMeter = (rssi?: number) => {
        if (rssi == null) return null;
        let bars = 1;
        let colorClass = "text-destructive";
        if (rssi >= -60) {
            bars = 4;
            colorClass = "text-emerald-500";
        } else if (rssi >= -70) {
            bars = 3;
            colorClass = "text-emerald-400";
        } else if (rssi >= -80) {
            bars = 2;
            colorClass = "text-amber-500";
        }

        return (
            <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground" title={`Signal: ${rssi} dBm`}>
                <div className="flex items-end gap-0.5 h-3">
                    <span className={`w-0.5 rounded-xs h-1.5 ${bars >= 1 ? "bg-current " + colorClass : "bg-muted"}`} />
                    <span className={`w-0.5 rounded-xs h-2 ${bars >= 2 ? "bg-current " + colorClass : "bg-muted"}`} />
                    <span className={`w-0.5 rounded-xs h-2.5 ${bars >= 3 ? "bg-current " + colorClass : "bg-muted"}`} />
                    <span className={`w-0.5 rounded-xs h-3 ${bars >= 4 ? "bg-current " + colorClass : "bg-muted"}`} />
                </div>
                <span className="text-[9px]">{rssi} dBm</span>
            </div>
        );
    };

    const withFeedback = (promise: Promise<unknown>, okMsg: string, failMsg: string) => {
        setFeedback(null);
        promise
            .then(() => setTimedFeedback({ ok: true, msg: okMsg }))
            .catch((err: unknown) => {
                const message = (err as { message?: string })?.message ?? failMsg;
                setTimedFeedback({ ok: false, msg: message });
            })
            .finally(() => setActionAddr(null));
    };

    const isEnabled = data?.enabled ?? false;
    const connectedDevices = data?.devices?.filter((d) => d.connected) ?? [];
    const totalDevices = data?.devices?.length ?? 0;

    // Filter paired devices by category & search query
    const filteredPaired = useMemo(() => {
        if (!data?.devices) return [];
        return data.devices.filter((d) => {
            const matchesQuery =
                !searchQuery ||
                (d.name && d.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                d.address.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesQuery) return false;
            if (categoryFilter === "all") return true;
            return getDeviceCategory(d) === categoryFilter;
        });
    }, [data?.devices, searchQuery, categoryFilter]);

    // Unpaired scanned devices
    const scannedUnpaired = useMemo(() => {
        if (!scanned) return [];
        const pairedAddresses = new Set((data?.devices ?? []).map((d) => d.address.toUpperCase()));
        return scanned.filter((d) => !d.paired && !pairedAddresses.has(d.address.toUpperCase()));
    }, [scanned, data?.devices]);

    // Connected profiles summary
    const connectedProfilesSummary = useMemo(() => {
        if (connectedDevices.length === 0) return "None Active";
        const hasAudio = connectedDevices.some((d) => getDeviceCategory(d) === "audio");
        const hasInput = connectedDevices.some((d) => getDeviceCategory(d) === "input");
        if (hasAudio && hasInput) return "Audio + Input";
        if (hasAudio) return "Audio Sink";
        if (hasInput) return "Input Peripheral";
        return "Connected";
    }, [connectedDevices]);

    return (
        <div className="instrument-card p-4 sm:p-5 space-y-4 font-sans">
            {/* ── 1. Header & Status ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div
                        className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                            isEnabled
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border bg-muted text-muted-foreground"
                        )}
                    >
                        {isEnabled ? (
                            <Bluetooth className="h-4 w-4" strokeWidth={1.8} />
                        ) : (
                            <BluetoothOff className="h-4 w-4" strokeWidth={1.5} />
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-semibold leading-tight text-foreground whitespace-nowrap">
                            Bluetooth Controller
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                            {isLoading
                                ? "Reading controller…"
                                : isEnabled
                                ? `${connectedDevices.length} Connected · ${totalDevices} Paired`
                                : "Controller Powered Off"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge
                        variant={connectedDevices.length > 0 ? "success" : isEnabled ? "info" : "muted"}
                        className="text-[10px] font-mono whitespace-nowrap"
                    >
                        {connectedDevices.length > 0
                            ? "● Active Mesh"
                            : isEnabled
                            ? data?.discovering
                                ? "● Scanning"
                                : "○ Discoverable"
                            : "Off"}
                    </Badge>
                    <button
                        onClick={() => toggle.mutate()}
                        disabled={toggle.isPending || isLoading}
                        aria-label={isEnabled ? "Disable Bluetooth" : "Enable Bluetooth"}
                        className={cn(
                            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                            isEnabled ? "bg-primary" : "bg-muted-foreground/30",
                            (toggle.isPending || isLoading) && "opacity-60 cursor-not-allowed"
                        )}
                    >
                        <span
                            className={cn(
                                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                                isEnabled ? "translate-x-4" : "translate-x-0"
                            )}
                        />
                    </button>
                </div>
            </div>

            {/* ── 2. Primary Telemetry Metric Grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Controller Status */}
                <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                        Adapter Interface
                    </p>
                    <p className="text-xs font-bold font-mono text-foreground whitespace-nowrap truncate">
                        {data?.adapter_name || (isEnabled ? "hci0 Ready" : "Powered Off")}
                    </p>
                    <p
                        className={cn(
                            "text-[10px] font-mono whitespace-nowrap truncate",
                            isEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                        )}
                    >
                        {data?.adapter_addr ? data.adapter_addr : isEnabled ? "● BlueZ D-Bus" : "○ Down"}
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
                        {connectedDevices[0]?.name || (connectedDevices.length > 0 ? connectedDevices[0]?.address : "None active")}
                    </p>
                </div>

                {/* Paired Count */}
                <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                        Paired Peripherals
                    </p>
                    <p className="text-lg font-bold font-mono tnum text-foreground whitespace-nowrap truncate">
                        {totalDevices}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap truncate">
                        Bonded in BlueZ
                    </p>
                </div>

                {/* Active Profile */}
                <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                        Connected Profile
                    </p>
                    <p className="text-xs font-bold font-mono text-foreground whitespace-nowrap truncate">
                        {connectedProfilesSummary}
                    </p>
                    <p
                        className={cn(
                            "text-[10px] font-mono whitespace-nowrap truncate",
                            connectedDevices.length > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                        )}
                    >
                        {connectedDevices.length > 0 ? "● PipeWire / HID" : "○ Idle"}
                    </p>
                </div>
            </div>

            {/* Feedback Alert */}
            {feedback && (
                <div
                    className={cn(
                        "flex items-center gap-2 rounded-lg border p-2 text-xs font-mono transition-all",
                        feedback.ok
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-destructive/30 bg-destructive/10 text-destructive"
                    )}
                >
                    {feedback.ok ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : (
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                    )}
                    <span className="flex-1">{feedback.msg}</span>
                    <button
                        onClick={() => setFeedback(null)}
                        className="text-muted-foreground hover:text-foreground p-0.5 rounded-sm"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            )}

            {/* Disabled State Banner */}
            {!isEnabled && !isLoading && (
                <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-4 text-center space-y-2">
                    <BluetoothOff className="h-6 w-6 text-muted-foreground mx-auto" />
                    <p className="text-xs font-medium text-foreground">Bluetooth is Powered Off</p>
                    <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                        Enable the controller to manage paired accessories, scan for nearby devices, and connect audio or input hardware.
                    </p>
                    <Button
                        size="xs"
                        variant="default"
                        onClick={() => toggle.mutate()}
                        disabled={toggle.isPending}
                        className="gap-1.5 text-xs h-7 mt-1"
                    >
                        <Power className="h-3.5 w-3.5" />
                        <span>Power On Bluetooth</span>
                    </Button>
                </div>
            )}

            {/* ── 3. Enabled State: Search, Filter, and Device List ── */}
            {isEnabled && (
                <div className="space-y-3">
                    {/* Search & Category Filter Header */}
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-0">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search peripheral name or MAC..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-border/70 bg-background/50 placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>

                        {/* Category Buttons */}
                        <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50 shrink-0 overflow-x-auto">
                            {(["all", "audio", "input", "other"] as const).map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setCategoryFilter(cat)}
                                    className={cn(
                                        "px-2.5 py-1 text-[10px] font-medium rounded-md capitalize transition-colors whitespace-nowrap",
                                        categoryFilter === cat
                                            ? "bg-background text-foreground shadow-xs font-semibold"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Paired Peripherals List */}
                    <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/40 p-2.5">
                        <div className="flex items-center justify-between px-1 pb-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Paired Peripherals ({filteredPaired.length} / {totalDevices})
                            </p>
                            {searchQuery && (
                                <span className="text-[10px] font-mono text-muted-foreground">
                                    Filtered by: &ldquo;{searchQuery}&rdquo;
                                </span>
                            )}
                        </div>

                        {filteredPaired.length > 0 ? (
                            <div className="divide-y divide-border/30">
                                {filteredPaired.map((d: BluetoothDevice) => {
                                    const displayName = d.name || d.address;
                                    const isPendingAction = actionAddr === d.address;

                                    return (
                                        <div
                                            key={d.address}
                                            className={cn(
                                                "flex items-center justify-between py-2 px-1.5 rounded-md transition-colors",
                                                d.connected ? "bg-primary/5" : "hover:bg-muted/30"
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div
                                                    className={cn(
                                                        "p-1.5 rounded-lg border",
                                                        d.connected
                                                            ? "border-primary/30 bg-primary/10 text-primary"
                                                            : "border-border/60 bg-muted/60 text-foreground"
                                                    )}
                                                >
                                                    {deviceIcon(d)}
                                                </div>
                                                <div className="min-w-0 space-y-0.5">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <p className="text-xs font-semibold text-foreground truncate max-w-[160px] sm:max-w-[240px]">
                                                            {displayName}
                                                        </p>
                                                        {d.connected && (
                                                            <Badge variant="success" className="text-[9px] h-4 px-1.5 font-mono">
                                                                Connected
                                                            </Badge>
                                                        )}
                                                        {d.trusted && (
                                                            <span title="Trusted Device" className="text-muted-foreground">
                                                                <ShieldCheck className="h-3 w-3 text-primary/70" />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                                                        <span>{d.address}</span>
                                                        {renderSignalMeter(d.rssi)}
                                                    </div>
                                                </div>

                                                {d.battery_pct != null && (
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "gap-1 text-[9px] font-mono shrink-0 ml-1",
                                                            d.battery_pct > 50
                                                                ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                                                : d.battery_pct >= 20
                                                                ? "text-amber-600 dark:text-amber-400 border-amber-500/30"
                                                                : "text-destructive border-destructive/30"
                                                        )}
                                                    >
                                                        <Battery className="h-2.5 w-2.5" />
                                                        <span>{d.battery_pct}%</span>
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                {d.connected ? (
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setActionAddr(d.address);
                                                            withFeedback(
                                                                btDisconnect.mutateAsync(d.address),
                                                                `Disconnected from ${displayName}`,
                                                                "Failed to disconnect peripheral"
                                                            );
                                                        }}
                                                        disabled={btDisconnect.isPending && isPendingAction}
                                                        className="h-6 text-[10px] border-border text-muted-foreground hover:text-foreground"
                                                    >
                                                        {btDisconnect.isPending && isPendingAction ? (
                                                            <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                                                        ) : null}
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
                                                                `Connected to ${displayName}!`,
                                                                "Connection failed"
                                                            );
                                                        }}
                                                        disabled={btConnect.isPending && isPendingAction}
                                                        className="h-6 text-[10px]"
                                                    >
                                                        {btConnect.isPending && isPendingAction ? (
                                                            <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                                                        ) : null}
                                                        Connect
                                                    </Button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setActionAddr(d.address);
                                                        withFeedback(
                                                            btRemove.mutateAsync(d.address),
                                                            `Unpaired ${displayName}`,
                                                            "Failed to unpair peripheral"
                                                        );
                                                    }}
                                                    disabled={btRemove.isPending && isPendingAction}
                                                    title={`Unpair ${displayName}`}
                                                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-6 text-center space-y-2">
                                <Radio className="h-5 w-5 text-muted-foreground mx-auto" />
                                {totalDevices === 0 ? (
                                    <>
                                        <p className="text-xs font-medium text-foreground">No paired peripherals yet</p>
                                        <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                                            Click &ldquo;Scan Nearby Devices&rdquo; below to discover and pair headphones, mice, keyboards, or controllers.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-xs font-medium text-foreground">No peripherals matching filter</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Try clearing your search query or switching category tabs.
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── 4. Tactile Controls & Scan Actions ── */}
            <div className="flex items-center justify-between pt-1">
                <Button
                    variant="outline"
                    size="xs"
                    onClick={handleScan}
                    disabled={scanning || !isEnabled}
                    className="gap-1.5 text-xs font-medium h-8"
                >
                    {scanning ? (
                        <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin" />
                    ) : (
                        <Search className="h-3.5 w-3.5 text-primary" />
                    )}
                    <span>{scanning ? "Scanning for ~5s…" : "Scan Nearby Devices"}</span>
                </Button>

                <span className="text-[10px] font-mono text-muted-foreground">
                    DBus: org.bluez
                </span>
            </div>

            {/* ── 5. Discovered Nearby Devices Drawer ── */}
            {showScan && isEnabled && (
                <div className="mt-3 rounded-lg border border-border/70 overflow-hidden bg-background/50 space-y-0">
                    <div className="bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground flex items-center justify-between border-b border-border/60">
                        <div className="flex items-center gap-2">
                            <span>Discovered Nearby Devices</span>
                            {scanning ? (
                                <Badge variant="info" className="text-[9px] font-mono animate-pulse">
                                    Listening…
                                </Badge>
                            ) : (
                                <Badge variant="muted" className="text-[9px] font-mono">
                                    {scannedUnpaired.length} Found
                                </Badge>
                            )}
                        </div>
                        <button
                            onClick={() => setShowScan(false)}
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded-sm"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {scanning ? (
                        <div className="py-6 px-4 text-center space-y-2">
                            <RefreshCw className="h-5 w-5 text-primary animate-spin mx-auto" />
                            <p className="text-xs font-medium text-foreground">Discovering Nearby Bluetooth Peripherals</p>
                            <p className="text-[11px] text-muted-foreground">
                                Adapter is actively listening for BLE advertisements and classic Bluetooth inquiries…
                            </p>
                        </div>
                    ) : scannedUnpaired.length > 0 ? (
                        <div className="max-h-56 overflow-y-auto divide-y divide-border/40">
                            {scannedUnpaired.map((d: BluetoothDevice) => {
                                const displayName = d.name || d.address;
                                const isPendingAction = actionAddr === d.address;

                                return (
                                    <div
                                        key={d.address}
                                        className="flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="p-1 rounded-md bg-muted/60 text-foreground">
                                                {deviceIcon(d)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-foreground truncate max-w-[160px] sm:max-w-[240px]">
                                                    {displayName}
                                                </p>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                                                    <span>{d.address}</span>
                                                    {renderSignalMeter(d.rssi)}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            size="xs"
                                            variant="default"
                                            onClick={() => {
                                                setActionAddr(d.address);
                                                withFeedback(
                                                    btPair.mutateAsync(d.address),
                                                    `Paired & bonded with ${displayName}!`,
                                                    "Pairing failed. Ensure peripheral is in pairing mode."
                                                );
                                            }}
                                            disabled={(btPair.isPending || btConnect.isPending) && isPendingAction}
                                            className="h-6 text-[10px] shrink-0 ml-2"
                                        >
                                            {btPair.isPending && isPendingAction ? (
                                                <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                                            ) : null}
                                            Pair & Connect
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : hasScannedOnce ? (
                        <div className="py-6 px-4 text-center space-y-1.5">
                            <Radio className="h-5 w-5 text-muted-foreground mx-auto" />
                            <p className="text-xs font-medium text-foreground">No new nearby devices found</p>
                            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                                Ensure your headset, mouse, or keyboard is turned on and placed in active pairing mode, then click scan again.
                            </p>
                            <Button
                                size="xs"
                                variant="outline"
                                onClick={handleScan}
                                disabled={scanning}
                                className="h-6 text-[10px] mt-1"
                            >
                                Scan Again
                            </Button>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
