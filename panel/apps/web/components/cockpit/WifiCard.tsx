"use client";

import React, { useState } from "react";
import {
    Wifi, WifiOff, Signal, Search,
    LockKeyhole, X, CheckCircle2, Shield,
    RefreshCw, Globe, ArrowDownUp,
} from "lucide-react";
import {
    useWifi,
    useWifiScan,
    useWifiConnect,
    useWifiDisconnect,
} from "@/hooks/useMetrics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AccessPoint } from "@/types/api";

export function WifiCard() {
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
        connect.mutate(
            { ssid, password: pw },
            {
                onSuccess: () => {
                    setFeedback({ ok: true, msg: `Connecting to ${ssid}…` });
                    setShowScan(false);
                    setConnectingSSID(null);
                },
                onError: (err: unknown) => {
                    setFeedback({
                        ok: false,
                        msg: (err as { message?: string })?.message ?? "Connection failed",
                    });
                    setConnectingSSID(null);
                },
            }
        );
    };

    const signalBars = (dbm: number) => {
        if (dbm >= -50) return 4;
        if (dbm >= -65) return 3;
        if (dbm >= -75) return 2;
        return 1;
    };

    const isConnected = data?.enabled && !!data?.ssid;

    return (
        <div className="instrument-card p-4 sm:p-5 space-y-4 font-sans">
            {/* ── 1. Header & Status ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
                        {data?.enabled ? <Wifi className="h-4 w-4" strokeWidth={1.6} /> : <WifiOff className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
                    </div>
                    <div>
                        <p className="text-sm font-semibold leading-tight text-foreground whitespace-nowrap">Wi-Fi Interface</p>
                        <p className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                            {isLoading
                                ? "Reading interface…"
                                : data?.enabled
                                ? isConnected
                                    ? `SSID: ${data.ssid}`
                                    : "Enabled · Disconnected"
                                : "Radio Disabled"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge
                        variant={isConnected ? "success" : data?.enabled ? "warning" : "muted"}
                        className="text-[10px] font-mono whitespace-nowrap"
                    >
                        {isConnected ? "● Connected" : data?.enabled ? "○ Standby" : "Disabled"}
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
                {/* Active SSID */}
                <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                        Network (SSID)
                    </p>
                    <p className="text-xs font-bold font-mono text-foreground whitespace-nowrap truncate">
                        {data?.ssid || "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap truncate">
                        {data?.band || "802.11ax"}
                    </p>
                </div>

                {/* Assigned IP */}
                <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                        IPv4 Address
                    </p>
                    <p className="text-xs font-bold font-mono text-primary whitespace-nowrap truncate">
                        {data?.ip_address || "127.0.0.1"}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap truncate">
                        wlan0
                    </p>
                </div>

                {/* Signal RSSI */}
                <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                        Signal RSSI
                    </p>
                    <div className="flex items-center gap-1.5 pt-0.5">
                        <Signal className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.6} />
                        <span className="text-xs font-bold font-mono tnum text-foreground whitespace-nowrap truncate">
                            {data?.signal_dbm ? `${data.signal_dbm} dBm` : "—"}
                        </span>
                    </div>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap truncate">
                        {data?.signal_dbm && data.signal_dbm >= -65 ? "● High Signal" : "○ Fair Signal"}
                    </p>
                </div>

                {/* Gateway / Link */}
                <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                        Gateway & DNS
                    </p>
                    <p className="text-xs font-bold font-mono text-foreground whitespace-nowrap truncate">
                        {data?.gateway || "192.168.1.1"}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap truncate">
                        WPA2/WPA3
                    </p>
                </div>
            </div>

            {/* ── 3. Tactile Action Controls ── */}
            <div className="flex items-center gap-2 pt-1">
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
                    <span>{scanning ? "Scanning (~5s)…" : "Scan Access Points"}</span>
                </Button>

                {isConnected && (
                    <Button
                        variant="outline"
                        size="xs"
                        onClick={() => disconnect.mutate()}
                        disabled={disconnect.isPending}
                        className="gap-1.5 text-xs font-medium h-8 text-destructive hover:bg-destructive/10 border-destructive/30"
                    >
                        <WifiOff className="h-3.5 w-3.5" />
                        <span>Disconnect</span>
                    </Button>
                )}
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

            {/* ── 4. Progressive Disclosure (Access Points List) ── */}
            {showScan && aps && aps.length > 0 && (
                <div className="mt-3 rounded-lg border border-border/70 overflow-hidden bg-background/50 space-y-0">
                    <div className="bg-muted/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground flex items-center justify-between border-b border-border/60">
                        <span>Discovered Wireless Networks ({aps.length})</span>
                        <button onClick={() => setShowScan(false)} className="text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-border/40">
                        {[...aps]
                            .sort((a, b) => b.signal_dbm - a.signal_dbm)
                            .map((ap: AccessPoint) => (
                                <div key={ap.bssid} className="flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="flex items-end gap-0.5 h-3.5">
                                            {[1, 2, 3, 4].map((bar) => (
                                                <div
                                                    key={bar}
                                                    className={`w-1 rounded-xs ${
                                                        bar <= signalBars(ap.signal_dbm)
                                                            ? "bg-primary"
                                                            : "bg-muted-foreground/30"
                                                    }`}
                                                    style={{ height: `${bar * 25}%` }}
                                                />
                                            ))}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-foreground truncate">{ap.ssid}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono">
                                                {ap.band} · {ap.signal_dbm} dBm
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {ap.security !== "open" ? (
                                            <LockKeyhole className="h-3 w-3 text-muted-foreground" />
                                        ) : (
                                            <Badge variant="success" className="text-[9px] px-1 py-0">Open</Badge>
                                        )}
                                        {ap.active ? (
                                            <Badge variant="info" className="text-[9px]">Active</Badge>
                                        ) : (
                                            <Button
                                                size="xs"
                                                variant="outline"
                                                onClick={() => handleConnect(ap.ssid, ap.security === "open")}
                                                disabled={connectingSSID === ap.ssid}
                                                className="h-6 text-[10px]"
                                            >
                                                {connectingSSID === ap.ssid ? "Connecting…" : "Connect"}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Password Modal */}
            {passwordSSID && (
                <div className="rounded-lg border border-border p-3 space-y-2.5 bg-background/80">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <LockKeyhole className="h-3.5 w-3.5 text-primary" />
                            <span>Authentication: {passwordSSID}</span>
                        </p>
                        <button onClick={() => setPasswordSSID(null)}>
                            <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                    </div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && password && doConnect(passwordSSID, password)}
                        placeholder="Enter network security key"
                        autoFocus
                        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                    <div className="flex justify-end gap-2">
                        <Button size="xs" variant="outline" onClick={() => setPasswordSSID(null)}>
                            Cancel
                        </Button>
                        <Button size="xs" variant="default" onClick={() => doConnect(passwordSSID, password)} disabled={!password}>
                            Connect
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
