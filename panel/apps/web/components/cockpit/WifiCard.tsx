"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
    Wifi, WifiOff, Signal,
    RefreshCw, LockKeyhole,
    ArrowDown, ArrowUp, Search, X, Eye, EyeOff, CheckCircle2,
    AlertCircle, Radio, KeyRound,
    Network, Power,
} from "lucide-react";
import {
    useWifi,
    useWifiScan,
    useWifiConnect,
    useWifiDisconnect,
    useSavedConnections,
    useWifiForget,
} from "@/hooks/useMetrics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AccessPoint, SavedConnection } from "@/types/api";

type BandFilter = "all" | "5GHz" | "2.4GHz" | "6GHz";

export function WifiCard() {
    const { data: wifi, isLoading: isWifiLoading, toggle } = useWifi();
    const isWifiEnabled = wifi?.enabled ?? false;

    // Automatically scan when Wi-Fi is enabled
    const { data: aps, isFetching: isScanning, refetch: doScan } = useWifiScan(isWifiEnabled);
    const { data: savedConns } = useSavedConnections();
    const connect = useWifiConnect();
    const disconnect = useWifiDisconnect();
    const forget = useWifiForget();

    // Local UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [bandFilter, setBandFilter] = useState<BandFilter>("all");
    const [selectedSSID, setSelectedSSID] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [connectingSSID, setConnectingSSID] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
    const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

    // Update last scan time on scan completion
    useEffect(() => {
        if (!isScanning && aps && aps.length > 0) {
            setLastScanTime(new Date());
        }
    }, [isScanning, aps]);

    // Fast check for saved network UUID by SSID
    const savedSSIDMap = useMemo(() => {
        const map = new Map<string, SavedConnection>();
        if (savedConns) {
            for (const conn of savedConns) {
                if (conn.ssid) {
                    map.set(conn.ssid, conn);
                }
            }
        }
        return map;
    }, [savedConns]);

    // Handle Manual Refresh / Rescan
    const handleRescan = () => {
        setFeedback(null);
        doScan();
    };

    // Connect action dispatcher
    const handleInitiateConnect = (ap: AccessPoint) => {
        const isSaved = savedSSIDMap.has(ap.ssid);
        const isOpen = ap.security === "open";

        if (isOpen || isSaved) {
            // Can connect directly without prompting for password
            executeConnect(ap.ssid, "");
        } else {
            // Open inline password drawer
            if (selectedSSID === ap.ssid) {
                setSelectedSSID(null);
            } else {
                setSelectedSSID(ap.ssid);
                setPassword("");
                setShowPassword(false);
            }
        }
    };

    const executeConnect = (ssid: string, pass: string) => {
        setConnectingSSID(ssid);
        setFeedback(null);
        connect.mutate(
            { ssid, password: pass },
            {
                onSuccess: () => {
                    setFeedback({ ok: true, msg: `Connecting to ${ssid}… Handshake initiated.` });
                    setSelectedSSID(null);
                    setPassword("");
                    setConnectingSSID(null);
                },
                onError: (err: unknown) => {
                    const msg = (err as { message?: string })?.message ?? "Authentication failed. Check your security key.";
                    setFeedback({ ok: false, msg });
                    setConnectingSSID(null);
                },
            }
        );
    };

    const handleForget = (ssid: string) => {
        const saved = savedSSIDMap.get(ssid);
        if (!saved) return;
        forget.mutate(saved.uuid, {
            onSuccess: () => {
                setFeedback({ ok: true, msg: `Network profile "${ssid}" removed.` });
            },
            onError: (err: unknown) => {
                setFeedback({ ok: false, msg: `Failed to remove profile: ${(err as { message?: string })?.message ?? "Error"}` });
            },
        });
    };

    // Signal Level Helpers
    const getSignalQuality = (dbm: number) => {
        if (dbm >= -55) return { bars: 4, label: "Excellent", color: "text-emerald-500", bg: "bg-emerald-500" };
        if (dbm >= -67) return { bars: 3, label: "Good", color: "text-emerald-400", bg: "bg-emerald-400" };
        if (dbm >= -78) return { bars: 2, label: "Fair", color: "text-amber-500", bg: "bg-amber-500" };
        return { bars: 1, label: "Weak", color: "text-rose-500", bg: "bg-rose-500" };
    };

    // Filter & Sort Access Points
    const filteredAPs = useMemo(() => {
        if (!aps) return [];
        let list = [...aps];

        // Search query filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((ap) => ap.ssid.toLowerCase().includes(q) || ap.bssid.toLowerCase().includes(q));
        }

        // Band filter
        if (bandFilter !== "all") {
            list = list.filter((ap) => ap.band === bandFilter);
        }

        // Sort: Active network first -> Saved networks -> Highest dBm signal
        return list.sort((a, b) => {
            if (a.active) return -1;
            if (b.active) return 1;
            const aSaved = savedSSIDMap.has(a.ssid) ? 1 : 0;
            const bSaved = savedSSIDMap.has(b.ssid) ? 1 : 0;
            if (aSaved !== bSaved) return bSaved - aSaved;
            return b.signal_dbm - a.signal_dbm;
        });
    }, [aps, searchQuery, bandFilter, savedSSIDMap]);

    // Format Data Rates (kbps -> Mbps / kbps)
    const formatRate = (kbps?: number | null) => {
        if (kbps == null || kbps === 0) return "0 kbps";
        if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} Mbps`;
        return `${kbps.toFixed(0)} kbps`;
    };

    const isConnected = isWifiEnabled && !!wifi?.ssid;
    const activeQuality = wifi?.signal_dbm ? getSignalQuality(wifi.signal_dbm) : null;

    return (
        <div className="instrument-card p-4 sm:p-5 space-y-4 font-sans relative overflow-hidden">
            {/* Background ambient gradient glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            {/* ── 1. Header & Master Radio Toggle ── */}
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200",
                        isWifiEnabled
                            ? isConnected
                                ? "border-primary/50 bg-primary/10 text-primary shadow-xs"
                                : "border-amber-500/40 bg-amber-500/10 text-amber-500"
                            : "border-border/80 bg-muted/60 text-muted-foreground"
                    )}>
                        {isWifiEnabled ? (
                            <>
                                <Wifi className="h-4 w-4" strokeWidth={1.8} />
                                {isConnected && (
                                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                    </span>
                                )}
                            </>
                        ) : (
                            <WifiOff className="h-4 w-4" strokeWidth={1.6} />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold leading-tight text-foreground tracking-tight">Wi-Fi Interface</h3>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground border border-border/60">
                                wlan0
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">
                            {isWifiLoading
                                ? "Reading NetworkManager state…"
                                : isWifiEnabled
                                ? isConnected
                                    ? `Linked to ${wifi?.ssid} · ${wifi?.band || "Dual-Band"}`
                                    : "Radio Online · Ready to Connect"
                                : "Hardware Radio Disabled"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Badge
                        variant={isConnected ? "success" : isWifiEnabled ? "warning" : "muted"}
                        className="text-[10px] font-mono whitespace-nowrap shadow-xs"
                    >
                        {isConnected ? "● Connected" : isWifiEnabled ? "○ Standby" : "Off"}
                    </Badge>

                    {/* Master Tactile Radio Toggle Switch */}
                    <button
                        onClick={() => toggle.mutate()}
                        disabled={toggle.isPending || isWifiLoading}
                        title={isWifiEnabled ? "Disable Wi-Fi Radio" : "Enable Wi-Fi Radio"}
                        className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                            isWifiEnabled ? "bg-primary" : "bg-muted-foreground/30",
                            (toggle.isPending || isWifiLoading) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <span
                            className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                isWifiEnabled ? "translate-x-5" : "translate-x-0"
                            )}
                        />
                    </button>
                </div>
            </div>

            {/* ── 2. Feedback Alert Banner ── */}
            {feedback && (
                <div
                    className={cn(
                        "flex items-center gap-2.5 rounded-xl border p-2.5 text-xs font-mono transition-all animate-in fade-in slide-in-from-top-1 duration-150",
                        feedback.ok
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-destructive/40 bg-destructive/10 text-destructive"
                    )}
                >
                    {feedback.ok ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <span className="flex-1 leading-snug">{feedback.msg}</span>
                    <button
                        onClick={() => setFeedback(null)}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* ── 3. Radio Disabled Offline State ── */}
            {!isWifiEnabled && (
                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-6 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/80 text-muted-foreground">
                        <WifiOff className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">Wi-Fi Radio is Powered Off</p>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            Wireless interface is currently disabled to conserve power and prevent broadcast emissions.
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="default"
                        onClick={() => toggle.mutate()}
                        disabled={toggle.isPending}
                        className="gap-2 text-xs font-semibold shadow-xs"
                    >
                        <Power className="h-3.5 w-3.5" />
                        <span>Enable Wi-Fi Radio</span>
                    </Button>
                </div>
            )}

            {/* ── 4. Active Connection Hero Banner (When Connected) ── */}
            {isWifiEnabled && isConnected && (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3.5 sm:p-4 space-y-3.5 relative overflow-hidden shadow-xs">
                    {/* Top Active Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-primary/20">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                                <Radio className="h-3.5 w-3.5 animate-pulse" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-foreground truncate">{wifi?.ssid}</span>
                                    {wifi?.band && (
                                        <Badge variant="outline" className="text-[10px] font-mono border-primary/40 bg-primary/10 text-primary py-0">
                                            {wifi.band}
                                        </Badge>
                                    )}
                                    {wifi?.freq_mhz && (
                                        <span className="text-[10px] font-mono text-muted-foreground">
                                            {wifi.freq_mhz} MHz
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] font-mono text-muted-foreground truncate">
                                    Gateway: {wifi?.gateway || "DHCP Assigned"} · IPv4: {wifi?.ip_address || "Acquiring…"}
                                </p>
                            </div>
                        </div>

                        {/* Disconnect Action */}
                        <div className="flex items-center gap-2 shrink-0">
                            {wifi?.ssid && savedSSIDMap.has(wifi.ssid) && (
                                <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => handleForget(wifi.ssid!)}
                                    disabled={forget.isPending}
                                    className="h-7 text-[11px] font-medium border-border/80 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 gap-1.5"
                                >
                                    <KeyRound className="h-3 w-3" />
                                    <span>Forget</span>
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="xs"
                                onClick={() => disconnect.mutate()}
                                disabled={disconnect.isPending}
                                className="h-7 text-[11px] font-semibold border-destructive/40 text-destructive hover:bg-destructive/15 gap-1.5"
                            >
                                <WifiOff className="h-3.5 w-3.5" />
                                <span>{disconnect.isPending ? "Disconnecting…" : "Disconnect"}</span>
                            </Button>
                        </div>
                    </div>

                    {/* Live Telemetry Quad Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* Live Download Rx */}
                        <div className="rounded-xl border border-border/70 bg-card/80 p-2.5 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                <span>Download (RX)</span>
                                <ArrowDown className="h-3 w-3 text-emerald-500" />
                            </div>
                            <p className="text-xs font-bold font-mono tnum text-emerald-600 dark:text-emerald-400">
                                {formatRate(wifi?.rx_kbps)}
                            </p>
                            <p className="text-[9px] text-muted-foreground font-mono truncate">
                                Total: {wifi?.rx_bytes ? (wifi.rx_bytes / 1024 / 1024).toFixed(1) + " MB" : "0 MB"}
                            </p>
                        </div>

                        {/* Live Upload Tx */}
                        <div className="rounded-xl border border-border/70 bg-card/80 p-2.5 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                <span>Upload (TX)</span>
                                <ArrowUp className="h-3 w-3 text-primary" />
                            </div>
                            <p className="text-xs font-bold font-mono tnum text-primary">
                                {formatRate(wifi?.tx_kbps)}
                            </p>
                            <p className="text-[9px] text-muted-foreground font-mono truncate">
                                Total: {wifi?.tx_bytes ? (wifi.tx_bytes / 1024 / 1024).toFixed(1) + " MB" : "0 MB"}
                            </p>
                        </div>

                        {/* Signal Quality */}
                        <div className="rounded-xl border border-border/70 bg-card/80 p-2.5 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                <span>Signal RSSI</span>
                                <Signal className={cn("h-3 w-3", activeQuality?.color)} />
                            </div>
                            <p className="text-xs font-bold font-mono tnum text-foreground">
                                {wifi?.signal_dbm ? `${wifi.signal_dbm} dBm` : "—"}
                            </p>
                            <p className={cn("text-[9px] font-mono font-medium truncate", activeQuality?.color)}>
                                {activeQuality ? `● ${activeQuality.label}` : "Calibrating"}
                            </p>
                        </div>

                        {/* Assigned IP / DNS */}
                        <div className="rounded-xl border border-border/70 bg-card/80 p-2.5 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                <span>IP & Gateway</span>
                                <Network className="h-3 w-3 text-muted-foreground" />
                            </div>
                            <p className="text-xs font-bold font-mono text-foreground truncate">
                                {wifi?.ip_address || "—"}
                            </p>
                            <p className="text-[9px] text-muted-foreground font-mono truncate">
                                {wifi?.dns?.[0] ? `DNS: ${wifi.dns[0]}` : "WPA2/3 Security"}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 5. Integrated Available Networks Hub ── */}
            {isWifiEnabled && (
                <div className="space-y-3 pt-1">
                    {/* Header Bar with Count, Filters & Dedicated Refresh Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-foreground">Available Networks</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                                    {filteredAPs.length}
                                </span>
                            </div>
                            {lastScanTime && (
                                <span className="text-[10px] font-mono text-muted-foreground hidden md:inline">
                                    · Updated {lastScanTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            {/* Search Filter Input */}
                            <div className="relative flex-1 sm:w-44">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Filter networks…"
                                    className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-border/80 bg-background/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono transition-all"
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

                            {/* Frequency Band Filter Pills */}
                            <div className="flex items-center gap-0.5 rounded-lg border border-border/80 bg-muted/40 p-0.5 text-[10px] font-mono">
                                {(["all", "5GHz", "2.4GHz"] as BandFilter[]).map((band) => (
                                    <button
                                        key={band}
                                        onClick={() => setBandFilter(band)}
                                        className={cn(
                                            "px-2 py-1 rounded-md transition-all font-medium",
                                            bandFilter === band
                                                ? "bg-card text-foreground font-semibold shadow-xs"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {band === "all" ? "All" : band}
                                    </button>
                                ))}
                            </div>

                            {/* ── DEDICATED REFRESH / RESCAN BUTTON (Yenileme Butonu) ── */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRescan}
                                disabled={isScanning}
                                title="Scan for nearby Wi-Fi networks"
                                className="h-8 gap-1.5 text-xs font-semibold border-border/80 bg-card hover:bg-muted/60 transition-all shrink-0 active:scale-95 shadow-xs"
                            >
                                <RefreshCw
                                    className={cn(
                                        "h-3.5 w-3.5 text-primary transition-transform",
                                        isScanning && "animate-spin text-primary"
                                    )}
                                />
                                <span className="font-sans">{isScanning ? "Scanning…" : "Yenile"}</span>
                            </Button>
                        </div>
                    </div>

                    {/* Scan Loading Beam Indicator */}
                    {isScanning && (
                        <div className="h-1 w-full bg-muted/40 rounded-full overflow-hidden relative">
                            <div className="h-full bg-primary animate-pulse w-1/3 rounded-full" />
                        </div>
                    )}

                    {/* Discovery List Container */}
                    <div className="rounded-xl border border-border/70 bg-background/40 overflow-hidden divide-y divide-border/40 shadow-xs">
                        {filteredAPs.length === 0 ? (
                            <div className="p-8 text-center space-y-2">
                                <Radio className="h-6 w-6 text-muted-foreground mx-auto animate-pulse opacity-60" />
                                <p className="text-xs font-semibold text-foreground">
                                    {isScanning ? "Scanning surrounding RF spectrum…" : "No wireless networks found"}
                                </p>
                                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                                    {searchQuery
                                        ? `No access points matching "${searchQuery}". Try clearing your search.`
                                        : "Ensure your Wi-Fi antenna is attached or click Yenile to rescan."}
                                </p>
                                {searchQuery && (
                                    <Button size="xs" variant="outline" onClick={() => setSearchQuery("")}>
                                        Clear Search Filter
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="max-h-[320px] overflow-y-auto divide-y divide-border/30">
                                {filteredAPs.map((ap) => {
                                    const quality = getSignalQuality(ap.signal_dbm);
                                    const isSaved = savedSSIDMap.has(ap.ssid);
                                    const isSelected = selectedSSID === ap.ssid;
                                    const isConnecting = connectingSSID === ap.ssid;

                                    return (
                                        <div
                                            key={ap.bssid || ap.ssid}
                                            className={cn(
                                                "transition-colors",
                                                ap.active ? "bg-primary/5" : "hover:bg-muted/40"
                                            )}
                                        >
                                            {/* Network Row */}
                                            <div className="flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 gap-2">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {/* Dynamic 4-Bar Signal Indicator */}
                                                    <div className="flex items-end gap-0.5 h-4 w-4 shrink-0 pb-0.5" title={`Signal: ${ap.signal_dbm} dBm (${quality.label})`}>
                                                        {[1, 2, 3, 4].map((bar) => (
                                                            <div
                                                                key={bar}
                                                                className={cn(
                                                                    "w-0.5 rounded-xs transition-all",
                                                                    bar <= quality.bars
                                                                        ? quality.bg
                                                                        : "bg-muted-foreground/20"
                                                                )}
                                                                style={{ height: `${bar * 25}%` }}
                                                            />
                                                        ))}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <p className="text-xs font-semibold text-foreground truncate max-w-[180px] sm:max-w-[240px]">
                                                                {ap.ssid}
                                                            </p>
                                                            {isSaved && (
                                                                <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 border-border bg-muted/60 text-muted-foreground">
                                                                    Saved
                                                                </Badge>
                                                            )}
                                                            {ap.active && (
                                                                <Badge variant="success" className="text-[9px] font-mono px-1.5 py-0">
                                                                    Connected
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5">
                                                            <span>{ap.band}</span>
                                                            <span>·</span>
                                                            <span>{ap.signal_dbm} dBm</span>
                                                            <span>·</span>
                                                            <span className="capitalize">{ap.security}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Right Action Badge & Buttons */}
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {/* Security Icon Badge */}
                                                    <div className="hidden xs:flex items-center" title={`Security: ${ap.security.toUpperCase()}`}>
                                                        {ap.security === "open" ? (
                                                            <Badge variant="success" className="text-[9px] font-mono px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                                                Open
                                                            </Badge>
                                                        ) : ap.security === "wpa3" ? (
                                                            <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 border-primary/40 bg-primary/10 text-primary">
                                                                WPA3
                                                            </Badge>
                                                        ) : (
                                                            <LockKeyhole className="h-3 w-3 text-muted-foreground/80" />
                                                        )}
                                                    </div>

                                                    {/* Connect Button or Active State */}
                                                    {ap.active ? (
                                                        <span className="flex h-6 items-center px-2 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <Button
                                                            size="xs"
                                                            variant={isSaved ? "outline" : "default"}
                                                            onClick={() => handleInitiateConnect(ap)}
                                                            disabled={isConnecting}
                                                            className={cn(
                                                                "h-6 px-2.5 text-[10px] font-semibold transition-all active:scale-95",
                                                                isSelected && "ring-2 ring-primary"
                                                            )}
                                                        >
                                                            {isConnecting
                                                                ? "Linking…"
                                                                : isSaved
                                                                ? "Connect"
                                                                : ap.security === "open"
                                                                ? "Join Free"
                                                                : isSelected
                                                                ? "Cancel"
                                                                : "Connect"}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* ── Inline Expandable Password Accordion ── */}
                                            {isSelected && !isSaved && ap.security !== "open" && (
                                                <div className="px-3 pb-3 pt-1 border-t border-border/40 bg-card/60 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                                            <KeyRound className="h-3.5 w-3.5 text-primary" />
                                                            <span>Enter Security Key for <strong>{ap.ssid}</strong></span>
                                                        </p>
                                                        <button
                                                            onClick={() => setSelectedSSID(null)}
                                                            className="text-muted-foreground hover:text-foreground text-[10px] font-mono"
                                                        >
                                                            Esc to close
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <div className="relative flex-1">
                                                            <input
                                                                type={showPassword ? "text" : "password"}
                                                                value={password}
                                                                onChange={(e) => setPassword(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter" && password) executeConnect(ap.ssid, password);
                                                                    if (e.key === "Escape") setSelectedSSID(null);
                                                                }}
                                                                placeholder="WPA / WPA2 / WPA3 Pre-Shared Key"
                                                                autoFocus
                                                                className="w-full h-8 pl-3 pr-8 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                                                            >
                                                                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                            </button>
                                                        </div>

                                                        <Button
                                                            size="xs"
                                                            variant="default"
                                                            onClick={() => executeConnect(ap.ssid, password)}
                                                            disabled={!password || isConnecting}
                                                            className="h-8 px-3 text-xs font-semibold shadow-xs"
                                                        >
                                                            {isConnecting ? (
                                                                <span className="flex items-center gap-1.5">
                                                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                                    <span>Joining…</span>
                                                                </span>
                                                            ) : (
                                                                "Connect"
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
