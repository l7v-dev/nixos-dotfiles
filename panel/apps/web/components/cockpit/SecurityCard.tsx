"use client";

import { useState } from "react";
import {
    Shield,
    ShieldCheck,
    ShieldAlert,
    Network,
    Users,
    ChevronDown,
    ChevronUp,
    KeyRound,
    CheckCircle2,
    Lock,
} from "lucide-react";
import { useSecurity, useSecurityAudit } from "@/hooks/useSecurity";
import { SecurityDrawer } from "./SecurityDrawer";

export function SecurityCard() {
    const { data: security, toggleVPN, isLoading } = useSecurity();
    const { data: audit } = useSecurityAudit();
    const [showPorts, setShowPorts] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const vpn = security?.vpn;
    const isVpnActive = vpn?.active ?? false;
    const openPorts = security?.open_ports ?? [];
    const sessions = security?.sessions ?? [];
    const sopsOk = audit?.sops_report?.decryption_ok ?? true;
    const score = audit?.score ?? 95;
    const grade = audit?.grade ?? "A+";

    return (
        <>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <Shield className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Güvenlik & SOPS Denetimi</p>
                            <p className="text-[11px] text-muted-foreground">
                                {isLoading ? "Yükleniyor…" : `NixOS Güvenlik Skoru: %${score} (${grade})`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 border border-emerald-500/20">
                            Firewall Aktif
                        </span>
                    </div>
                </div>

                {/* ── Badges & Status Overview ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {/* SOPS Status */}
                    <div className="rounded-lg border border-border/50 bg-background/40 p-2.5 space-y-1">
                        <span className="flex items-center gap-1 text-[10px] uppercase font-semibold text-muted-foreground">
                            <KeyRound className="h-3 w-3" /> SOPS & Age
                        </span>
                        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{sopsOk ? "Şifreleme Hazır" : "Uyarı"}</span>
                        </div>
                    </div>

                    {/* Active Sessions */}
                    <div className="rounded-lg border border-border/50 bg-background/40 p-2.5 space-y-1">
                        <span className="flex items-center gap-1 text-[10px] uppercase font-semibold text-muted-foreground">
                            <Users className="h-3 w-3" /> Oturumlar
                        </span>
                        <p className="font-mono text-xs font-semibold">
                            {sessions.length > 0 ? `${sessions.length} aktif oturum` : "Yerel oturum"}
                        </p>
                    </div>

                    {/* Open Ports */}
                    <div className="rounded-lg border border-border/50 bg-background/40 p-2.5 space-y-1 col-span-2 sm:col-span-1">
                        <span className="flex items-center gap-1 text-[10px] uppercase font-semibold text-muted-foreground">
                            <Network className="h-3 w-3" /> Dinlenen Port
                        </span>
                        <p className="font-mono text-xs font-semibold">{openPorts.length} port açık</p>
                    </div>
                </div>

                {/* ── VPN / Tailscale Section ── */}
                <div className="rounded-lg border border-border/50 bg-background/40 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div
                                className={`h-2.5 w-2.5 rounded-full ${
                                    isVpnActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"
                                }`}
                            />
                            <div>
                                <p className="text-xs font-semibold">Tailscale VPN Tüneli</p>
                                <p className="text-[10px] text-muted-foreground font-mono">
                                    {isVpnActive
                                        ? vpn?.ip_address
                                            ? `IP: ${vpn.ip_address}`
                                            : "Bağlı"
                                        : "Bağlantı kesildi"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => toggleVPN.mutate()}
                            disabled={toggleVPN.isPending || vpn?.status === "not_installed"}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                                isVpnActive
                                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                            } disabled:opacity-50`}
                        >
                            {toggleVPN.isPending ? "İşleniyor…" : isVpnActive ? "Bağlantıyı Kes" : "Bağlan"}
                        </button>
                    </div>
                </div>

                {/* ── Quick Action: Open Security Drawer ── */}
                <div className="pt-1">
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-xs"
                    >
                        <Shield className="h-3.5 w-3.5" />
                        Güvenlik Merkezini Aç (Denetim & SOPS)
                    </button>
                </div>
            </div>

            {/* ── Security & SOPS Slide-over Drawer ── */}
            <SecurityDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
        </>
    );
}
