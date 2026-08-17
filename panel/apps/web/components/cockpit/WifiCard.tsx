"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
    Wifi, WifiOff, Signal,
    RefreshCw, LockKeyhole,
    ArrowDown, ArrowUp, Search, X, Eye, EyeOff, CheckCircle2,
    AlertCircle, Radio, KeyRound,
    Network, Power, Trash2, BookmarkCheck,
    Shield, Check,
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

type BandFilter = "all" | "5GHz" | "2.4GHz";

export function WifiCard() {
    const { data: wifi, isLoading: isWifiLoading, toggle } = useWifi();
    const isWifiEnabled = wifi?.enabled ?? false;

    // Automatically scan when Wi-Fi is enabled
    const { data: aps, isFetching: isScanning, refetch: doScan } = useWifiScan(isWifiEnabled);
    const { data: savedConns, refetch: refetchSaved } = useSavedConnections();
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
    const [forgettingTarget, setForgettingTarget] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
    const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

    // Update last scan time on scan completion
    useEffect(() => {
        if (!isScanning && aps && aps.length > 0) {
            setLastScanTime(new Date());
        }
    }, [isScanning, aps]);

    // Fast check for saved network by SSID / ID
    const savedSSIDMap = useMemo(() => {
        const map = new Map<string, SavedConnection>();
        if (savedConns) {
            for (const conn of savedConns) {
                if (conn.ssid) map.set(conn.ssid, conn);
                if (conn.id) map.set(conn.id, conn);
            }
        }
        return map;
    }, [savedConns]);

    // Map discovered APs by SSID for fast in-range lookup
    const discoveredAPMap = useMemo(() => {
        const map = new Map<string, AccessPoint>();
        if (aps) {
            for (const ap of aps) {
                if (ap.ssid) map.set(ap.ssid, ap);
            }
        }
        return map;
    }, [aps]);

    const isConnected = isWifiEnabled && !!wifi?.ssid;

    // ── STRICT FILTER FOR SAVED NETWORKS ──
    // 1. Must be IN RANGE (detected nearby in AP scan)
    // 2. Must NOT be currently connected (already shown in Active Hero bar)
    const inRangeUnconnectedSaved = useMemo(() => {
        if (!savedConns || !aps || !isWifiEnabled) return [];
        return savedConns.filter((saved) => {
            const ssid = saved.ssid || saved.id;
            if (!ssid) return false;
            const isCurrentlyActive = isConnected && (wifi?.ssid === ssid || wifi?.ssid === saved.id);
            const inRange = discoveredAPMap.has(ssid) || (saved.id ? discoveredAPMap.has(saved.id) : false);
            return inRange && !isCurrentlyActive;
        });
    }, [savedConns, aps, isWifiEnabled, isConnected, wifi?.ssid, discoveredAPMap]);

    // Fast set of in-range saved SSIDs to exclude from general discovered list (prevents duplicate rows)
    const savedInRangeSSIDSet = useMemo(() => {
        const set = new Set<string>();
        for (const s of inRangeUnconnectedSaved) {
            if (s.ssid) set.add(s.ssid);
            if (s.id) set.add(s.id);
        }
        return set;
    }, [inRangeUnconnectedSaved]);

    // Handle Manual Refresh / Rescan
    const handleRescan = () => {
        setFeedback(null);
        doScan();
        refetchSaved();
    };

    // Connect action dispatcher
    const handleInitiateConnect = (ap: AccessPoint) => {
        const isSaved = savedSSIDMap.has(ap.ssid);
        const isOpen = ap.security === "open";

        if (isOpen || isSaved) {
            executeConnect(ap.ssid, "");
        } else {
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
                    setFeedback({ ok: true, msg: `"${ssid}" ağına bağlanılıyor… Bağlantı başlatıldı.` });
                    setSelectedSSID(null);
                    setPassword("");
                    setConnectingSSID(null);
                },
                onError: (err: unknown) => {
                    const msg = (err as { message?: string })?.message ?? "Bağlantı kurulamadı. Şifrenizi kontrol edin.";
                    setFeedback({ ok: false, msg });
                    setConnectingSSID(null);
                },
            }
        );
    };

    const handleForget = (targetId: string, ssidName?: string) => {
        setForgettingTarget(targetId);
        setFeedback(null);
        forget.mutate(targetId, {
            onSuccess: () => {
                setFeedback({ ok: true, msg: `"${ssidName || targetId}" ağ profili silindi.` });
                setForgettingTarget(null);
            },
            onError: (err: unknown) => {
                setFeedback({
                    ok: false,
                    msg: `Profil kaldırılamadı: ${(err as { message?: string })?.message ?? "Hata oluştu"}`,
                });
                setForgettingTarget(null);
            },
        });
    };

    // Signal Level Helpers (High-contrast OLED colors)
    const getSignalQuality = (dbm: number) => {
        if (dbm >= -55) return { bars: 4, label: "Mükemmel", color: "text-emerald-400", bg: "bg-emerald-400" };
        if (dbm >= -67) return { bars: 3, label: "İyi", color: "text-emerald-400", bg: "bg-emerald-400" };
        if (dbm >= -78) return { bars: 2, label: "Orta", color: "text-amber-400", bg: "bg-amber-400" };
        return { bars: 1, label: "Zayıf", color: "text-rose-400", bg: "bg-rose-400" };
    };

    // Filter & Sort Discovered Access Points (Exclude Active Network and in-range saved networks to prevent duplication)
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

        // Exclude active connected network (shown in Active Hero)
        if (isConnected && wifi?.ssid) {
            list = list.filter((ap) => ap.ssid !== wifi.ssid && !ap.active);
        }

        // Exclude networks already shown in in-range saved networks section
        if (savedInRangeSSIDSet.size > 0) {
            list = list.filter((ap) => !savedInRangeSSIDSet.has(ap.ssid));
        }

        // Sort by signal strength
        return list.sort((a, b) => b.signal_dbm - a.signal_dbm);
    }, [aps, searchQuery, bandFilter, isConnected, wifi?.ssid, savedInRangeSSIDSet]);

    const formatRate = (kbps?: number | null) => {
        if (kbps == null || kbps === 0) return "0 kbps";
        if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} Mbps`;
        return `${kbps.toFixed(0)} kbps`;
    };

    const activeQuality = wifi?.signal_dbm ? getSignalQuality(wifi.signal_dbm) : null;

    return (
        <div className="instrument-card p-4 sm:p-5 space-y-3.5 font-sans relative overflow-hidden shadow-xs">
            {/* ── 1. Compact Header & Master Radio Switch ── */}
            <div className="flex items-center justify-between gap-3 border-b border-border/80 pb-3">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-150",
                        isWifiEnabled
                            ? isConnected
                                ? "border-primary/50 bg-primary/10 text-primary"
                                : "border-amber-500/40 bg-amber-500/10 text-amber-400"
                            : "border-border bg-muted/60 text-muted-foreground"
                    )}>
                        {isWifiEnabled ? (
                            <>
                                <Wifi className="h-4 w-4" strokeWidth={2.2} />
                                {isConnected && (
                                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                                    </span>
                                )}
                            </>
                        ) : (
                            <WifiOff className="h-4 w-4" strokeWidth={2} />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm sm:text-base font-bold leading-tight text-foreground tracking-tight">
                                Wi-Fi
                            </h2>
                            <span className="text-xs font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border font-semibold">
                                wlan0
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {isWifiLoading
                                ? "Durum okunuyor…"
                                : isWifiEnabled
                                ? isConnected
                                    ? `Bağlı: ${wifi?.ssid} · ${wifi?.band || "Dual-Band"}`
                                    : "Radyo Açık · Bağlantı Bekleniyor"
                                : "Kablosuz Radyo Kapalı"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Badge
                        variant={isConnected ? "success" : isWifiEnabled ? "warning" : "muted"}
                        className="text-xs font-mono px-2 py-0.5 whitespace-nowrap font-bold"
                    >
                        {isConnected ? "● Bağlı" : isWifiEnabled ? "○ Beklemede" : "Kapalı"}
                    </Badge>

                    {/* Master Tactile Radio Toggle */}
                    <button
                        onClick={() => toggle.mutate()}
                        disabled={toggle.isPending || isWifiLoading}
                        title={isWifiEnabled ? "Wi-Fi Radyosunu Kapat" : "Wi-Fi Radyosunu Aç"}
                        className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-hidden",
                            isWifiEnabled ? "bg-primary" : "bg-muted-foreground/30",
                            (toggle.isPending || isWifiLoading) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <span
                            className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-150 ease-in-out",
                                isWifiEnabled ? "translate-x-5" : "translate-x-0"
                            )}
                        />
                    </button>
                </div>
            </div>

            {/* ── 2. Feedback Banner ── */}
            {feedback && (
                <div
                    className={cn(
                        "flex items-center gap-2.5 rounded-xl border p-2.5 text-xs font-mono transition-all animate-in fade-in duration-100",
                        feedback.ok
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border-destructive/40 bg-destructive/10 text-destructive"
                    )}
                >
                    {feedback.ok ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <span className="flex-1 font-medium">{feedback.msg}</span>
                    <button
                        onClick={() => setFeedback(null)}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* ── 3. Radio Disabled Offline State ── */}
            {!isWifiEnabled && (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center space-y-3">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-muted/60 border border-border text-muted-foreground">
                        <WifiOff className="h-5 w-5" strokeWidth={1.8} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-foreground">Wi-Fi Radyosu Devre Dışı</h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            Kablosuz donanım kapatıldı. Çevredeki ağları görmek için radyoyu etkinleştirin.
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="default"
                        onClick={() => toggle.mutate()}
                        disabled={toggle.isPending}
                        className="gap-2 text-xs font-semibold h-8 px-3.5"
                    >
                        <Power className="h-3.5 w-3.5" />
                        <span>Wi-Fi Aç</span>
                    </Button>
                </div>
            )}

            {/* ── 4. Compact Active Connection Telemetry Strip (When Connected) ── */}
            {isWifiEnabled && isConnected && (
                <div className="rounded-xl border border-primary/40 bg-primary/5 p-3.5 space-y-2.5">
                    {/* Active Header Row */}
                    <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <Radio className="h-3.5 w-3.5 animate-pulse" />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="text-sm sm:text-base font-bold text-foreground truncate">
                                    {wifi?.ssid}
                                </span>
                                {wifi?.band && (
                                    <Badge variant="outline" className="text-xs font-mono border-primary/40 bg-primary/10 text-primary py-0 px-1.5">
                                        {wifi.band}
                                    </Badge>
                                )}
                                {wifi?.freq_mhz && (
                                    <span className="text-xs font-mono text-muted-foreground font-semibold">
                                        {wifi.freq_mhz} MHz
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Actions: Unut & Bağlantıyı Kes */}
                        <div className="flex items-center gap-2 shrink-0">
                            {wifi?.ssid && (savedSSIDMap.has(wifi.ssid) || savedSSIDMap.has(wifi.ssid.trim())) && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleForget(savedSSIDMap.get(wifi.ssid!)?.uuid || wifi.ssid!, wifi.ssid!)}
                                    disabled={forget.isPending}
                                    className="h-7 text-xs font-medium border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 gap-1 px-2.5"
                                >
                                    <Trash2 className="h-3 w-3" />
                                    <span>Unut</span>
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => disconnect.mutate()}
                                disabled={disconnect.isPending}
                                className="h-7 text-xs font-bold border-destructive/40 text-destructive hover:bg-destructive/15 gap-1 px-2.5"
                            >
                                <WifiOff className="h-3 w-3" />
                                <span>{disconnect.isPending ? "Kesiliyor…" : "Bağlantıyı Kes"}</span>
                            </Button>
                        </div>
                    </div>

                    {/* Compact Telemetry Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-primary/15 font-mono text-xs">
                        <div className="flex items-center justify-between rounded-lg bg-card/90 border border-border/80 px-2.5 py-1.5">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <ArrowDown className="h-3 w-3 text-emerald-400" />
                                <span>İndirme</span>
                            </span>
                            <span className="font-bold text-emerald-400 tnum">{formatRate(wifi?.rx_kbps)}</span>
                        </div>

                        <div className="flex items-center justify-between rounded-lg bg-card/90 border border-border/80 px-2.5 py-1.5">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <ArrowUp className="h-3 w-3 text-primary" />
                                <span>Yükleme</span>
                            </span>
                            <span className="font-bold text-primary tnum">{formatRate(wifi?.tx_kbps)}</span>
                        </div>

                        <div className="flex items-center justify-between rounded-lg bg-card/90 border border-border/80 px-2.5 py-1.5">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <Signal className={cn("h-3 w-3", activeQuality?.color)} />
                                <span>Sinyal</span>
                            </span>
                            <span className={cn("font-bold tnum", activeQuality?.color)}>
                                {wifi?.signal_dbm ? `${wifi.signal_dbm} dBm` : "—"}
                            </span>
                        </div>

                        <div className="flex items-center justify-between rounded-lg bg-card/90 border border-border/80 px-2.5 py-1.5">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <Network className="h-3 w-3 text-muted-foreground" />
                                <span>IP</span>
                            </span>
                            <span className="font-bold text-foreground truncate">{wifi?.ip_address || "—"}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 5. Saved Networks Table (ONLY VISIBLE IF IN-RANGE & UNCONNECTED SAVED NETWORKS EXIST!) ── */}
            {inRangeUnconnectedSaved.length > 0 && (
                <div className="space-y-2 pt-0.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BookmarkCheck className="h-4 w-4 text-primary" />
                            <h3 className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
                                Menzildeki Kayıtlı Ağlar
                            </h3>
                            <span className="text-xs font-mono px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                                {inRangeUnconnectedSaved.length}
                            </span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                            Hızlı Bağlan
                        </span>
                    </div>

                    <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/60 shadow-xs">
                        {inRangeUnconnectedSaved.map((saved) => {
                            const ssid = saved.ssid || saved.id;
                            const apInRange = discoveredAPMap.get(ssid);
                            const quality = apInRange ? getSignalQuality(apInRange.signal_dbm) : null;
                            const isForgetting = forgettingTarget === saved.uuid || forgettingTarget === saved.id || forgettingTarget === ssid;

                            return (
                                <div
                                    key={saved.uuid || saved.id}
                                    className="flex items-center justify-between px-3 py-2 gap-2.5 hover:bg-white/[0.04] transition-colors"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/80 border border-border text-foreground">
                                            <Shield className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                                                {ssid}
                                            </p>
                                            <p className="text-xs text-muted-foreground font-mono mt-0.2 flex items-center gap-1.5">
                                                <span>{apInRange?.band || "2.4/5GHz"}</span>
                                                <span>·</span>
                                                <span className={quality?.color}>{apInRange?.signal_dbm} dBm ({quality?.label})</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => executeConnect(ssid, "")}
                                            disabled={connectingSSID === ssid}
                                            className="h-7 px-2.5 text-xs font-bold"
                                        >
                                            {connectingSSID === ssid ? "Bağlanıyor…" : "Bağlan"}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleForget(saved.uuid || saved.id || ssid, ssid)}
                                            disabled={isForgetting}
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            title="Bu ağı unut"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── 6. Discovered Wireless Networks Table ── */}
            {isWifiEnabled && (
                <div className="space-y-2.5 pt-0.5">
                    {/* Header Bar with Filter & Refresh Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
                                Keşfedilen Kablosuz Ağlar
                            </h3>
                            <span className="text-xs font-mono px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                                {filteredAPs.length}
                            </span>
                            {lastScanTime && (
                                <span className="text-xs font-mono text-muted-foreground hidden md:inline">
                                    · {lastScanTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            {/* Search Filter */}
                            <div className="relative flex-1 sm:w-44">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Ağ ara…"
                                    className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary font-mono transition-all"
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

                            {/* Band Filter */}
                            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-mono">
                                {(["all", "5GHz", "2.4GHz"] as BandFilter[]).map((band) => (
                                    <button
                                        key={band}
                                        onClick={() => setBandFilter(band)}
                                        className={cn(
                                            "px-2 py-0.5 rounded transition-all font-semibold",
                                            bandFilter === band
                                                ? "bg-card text-foreground shadow-xs"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {band === "all" ? "Tümü" : band}
                                    </button>
                                ))}
                            </div>

                            {/* ── DEDICATED REFRESH BUTTON ── */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRescan}
                                disabled={isScanning}
                                title="Ağları yeniden tara"
                                className="h-8 gap-1.5 text-xs font-bold border-border bg-card hover:bg-white/[0.04] transition-all shrink-0 px-2.5"
                            >
                                <RefreshCw
                                    className={cn(
                                        "h-3.5 w-3.5 text-primary transition-transform",
                                        isScanning && "animate-spin"
                                    )}
                                />
                                <span>{isScanning ? "Taranıyor…" : "Yenile"}</span>
                            </Button>
                        </div>
                    </div>

                    {/* Scanning Beam */}
                    {isScanning && (
                        <div className="h-1 w-full bg-muted/40 rounded-full overflow-hidden relative">
                            <div className="h-full bg-primary animate-pulse w-1/3 rounded-full" />
                        </div>
                    )}

                    {/* Discovered Networks List Container */}
                    <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/40 shadow-xs">
                        {filteredAPs.length === 0 ? (
                            <div className="p-6 text-center space-y-2">
                                <Radio className="h-6 w-6 text-muted-foreground mx-auto animate-pulse opacity-60" />
                                <p className="text-xs font-bold text-foreground">
                                    {isScanning ? "Kablosuz sinyaller taranıyor…" : "Kullanılabilir ağ bulunamadı"}
                                </p>
                                {searchQuery && (
                                    <Button size="xs" variant="outline" onClick={() => setSearchQuery("")}>
                                        Aramayı Temizle
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="max-h-[280px] overflow-y-auto divide-y divide-border/30">
                                {filteredAPs.map((ap) => {
                                    const quality = getSignalQuality(ap.signal_dbm);
                                    const isSaved = savedSSIDMap.has(ap.ssid) || savedSSIDMap.has(ap.ssid.trim());
                                    const isSelected = selectedSSID === ap.ssid;
                                    const isConnecting = connectingSSID === ap.ssid;

                                    return (
                                        <div
                                            key={ap.bssid || ap.ssid}
                                            className={cn(
                                                "transition-colors",
                                                ap.active ? "bg-primary/5" : "hover:bg-white/[0.04]"
                                            )}
                                        >
                                            <div className="flex items-center justify-between px-3 py-2 sm:px-3.5 sm:py-2.5 gap-2.5">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {/* 4-Bar High Clarity Signal Indicator */}
                                                    <div className="flex items-end gap-0.5 h-4 w-4 shrink-0 pb-0.5" title={`${ap.signal_dbm} dBm (${quality.label})`}>
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
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-[280px]">
                                                                {ap.ssid}
                                                            </p>
                                                            {isSaved && (
                                                                <Badge variant="outline" className="text-xs font-mono px-1 py-0 border-border bg-muted/60 text-muted-foreground">
                                                                    Kayıtlı
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 mt-0.2">
                                                            <span className="font-semibold">{ap.band}</span>
                                                            <span>·</span>
                                                            <span>{ap.signal_dbm} dBm</span>
                                                            <span>·</span>
                                                            <span className="capitalize">{ap.security}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {/* Security Badge */}
                                                    <div className="hidden xs:flex items-center">
                                                        {ap.security === "open" ? (
                                                            <Badge variant="success" className="text-xs font-mono px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                                                Açık
                                                            </Badge>
                                                        ) : ap.security === "wpa3" ? (
                                                            <Badge variant="outline" className="text-xs font-mono px-1.5 py-0 border-primary/40 bg-primary/10 text-primary">
                                                                WPA3
                                                            </Badge>
                                                        ) : (
                                                            <LockKeyhole className="h-3.5 w-3.5 text-muted-foreground/80" />
                                                        )}
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        variant={isSaved ? "outline" : "default"}
                                                        onClick={() => handleInitiateConnect(ap)}
                                                        disabled={isConnecting}
                                                        className={cn(
                                                            "h-7 px-2.5 text-xs font-bold transition-all active:scale-95",
                                                            isSelected && "ring-1 ring-primary"
                                                        )}
                                                    >
                                                        {isConnecting
                                                            ? "Bağlanıyor…"
                                                            : isSaved
                                                            ? "Bağlan"
                                                            : ap.security === "open"
                                                            ? "Katıl"
                                                            : isSelected
                                                            ? "Vazgeç"
                                                            : "Bağlan"}
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Inline Password Input Drawer */}
                                            {isSelected && !isSaved && ap.security !== "open" && (
                                                <div className="px-3 pb-3 pt-1.5 border-t border-border/60 bg-card/80 space-y-2 animate-in fade-in duration-100">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                                                            <KeyRound className="h-3.5 w-3.5 text-primary" />
                                                            <span><strong>{ap.ssid}</strong> şifresini girin</span>
                                                        </span>
                                                        <button
                                                            onClick={() => setSelectedSSID(null)}
                                                            className="text-muted-foreground hover:text-foreground font-mono"
                                                        >
                                                            Kapat (Esc)
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
                                                                placeholder="Güvenlik Şifresi"
                                                                autoFocus
                                                                className="w-full h-8 pl-3 pr-8 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                            >
                                                                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                            </button>
                                                        </div>

                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            onClick={() => executeConnect(ap.ssid, password)}
                                                            disabled={!password || isConnecting}
                                                            className="h-8 px-3 text-xs font-bold"
                                                        >
                                                            {isConnecting ? "Bağlanıyor…" : "Bağlan"}
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
