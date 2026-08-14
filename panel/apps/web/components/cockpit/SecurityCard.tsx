"use client";

import { useState } from "react";
import {
    Shield, ShieldCheck, ShieldAlert,
    Network, Users, ChevronDown, ChevronUp,
    Radio,
} from "lucide-react";
import { useSecurity } from "@/hooks/useSecurity";

export function SecurityCard() {
    const { data: security, toggleVPN, isLoading } = useSecurity();
    const [showPorts, setShowPorts] = useState(false);

    const vpn = security?.vpn;
    const isVpnActive = vpn?.active ?? false;
    const openPorts = security?.open_ports ?? [];
    const sessions = security?.sessions ?? [];

    return (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                        <Shield className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Güvenlik ve Ağ Tünelleri</p>
                        <p className="text-[11px] text-muted-foreground">
                            {isLoading ? "Yükleniyor…" : "NixOS Firewall & VPN"}
                        </p>
                    </div>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 border border-emerald-500/20">
                    Firewall Aktif
                </span>
            </div>

            {/* VPN / Tailscale Section */}
            <div className="rounded-lg border border-border/50 bg-background/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${isVpnActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"}`} />
                        <div>
                            <p className="text-xs font-semibold">Tailscale VPN</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                                {isVpnActive ? (vpn?.ip_address ? `IP: ${vpn.ip_address}` : "Bağlı") : "Bağlantı kesildi"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => toggleVPN.mutate()}
                        disabled={toggleVPN.isPending || vpn?.status === "not_installed"}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            isVpnActive
                                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                        } disabled:opacity-50`}
                    >
                        {toggleVPN.isPending ? "İşleniyor…" : isVpnActive ? "Bağlantıyı Kes" : "Bağlan"}
                    </button>
                </div>
            </div>

            {/* Active Sessions & Open Ports Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Active Sessions */}
                <div className="rounded-lg border border-border/50 bg-background/40 p-2.5 space-y-1">
                    <span className="flex items-center gap-1 text-[10px] uppercase font-semibold text-muted-foreground">
                        <Users className="h-3 w-3" /> Aktif Oturumlar ({sessions.length})
                    </span>
                    {sessions.length > 0 ? (
                        <div className="space-y-0.5 pt-0.5">
                            {sessions.slice(0, 2).map((s) => (
                                <p key={s.id} className="font-mono text-[11px] truncate">
                                    {s.user} {s.tty ? `(${s.tty})` : ""}
                                </p>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[11px] text-muted-foreground">Oturum yok</p>
                    )}
                </div>

                {/* Open Ports summary */}
                <div className="rounded-lg border border-border/50 bg-background/40 p-2.5 space-y-1">
                    <span className="flex items-center gap-1 text-[10px] uppercase font-semibold text-muted-foreground">
                        <Network className="h-3 w-3" /> Dinlenen Portlar
                    </span>
                    <p className="font-mono text-sm font-semibold">{openPorts.length} port açık</p>
                </div>
            </div>

            {/* Open Ports List (expandable) */}
            {openPorts.length > 0 && (
                <div className="border-t border-border/40 pt-2">
                    <button
                        onClick={() => setShowPorts(!showPorts)}
                        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground py-1"
                    >
                        <span>Açık Portları Görüntüle ({openPorts.length})</span>
                        {showPorts ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    {showPorts && (
                        <div className="mt-2 divide-y divide-border/30 rounded-lg border border-border/40 bg-background/50 max-h-36 overflow-y-auto">
                            {openPorts.map((p, idx) => (
                                <div key={idx} className="flex items-center justify-between px-3 py-1.5 text-xs font-mono">
                                    <span className="text-muted-foreground">{p.protocol.toUpperCase()}</span>
                                    <span className="font-medium text-foreground">Port {p.port}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
