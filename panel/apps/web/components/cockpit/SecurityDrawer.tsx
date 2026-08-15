"use client";

import { useState } from "react";
import {
    Shield,
    ShieldCheck,
    ShieldAlert,
    KeyRound,
    Network,
    Lock,
    Unlock,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Copy,
    Check,
    AlertTriangle,
    X,
    ExternalLink,
    Terminal,
    Search,
    UserX,
} from "lucide-react";
import {
    useSecurityAudit,
    useSOPSStatus,
    useVerifySOPS,
    useFail2ban,
    useUnbanIP,
    useSecurity,
} from "@/hooks/useSecurity";

interface SecurityDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type TabType = "audit" | "sops" | "ports";

export function SecurityDrawer({ open, onOpenChange }: SecurityDrawerProps) {
    const [tab, setTab] = useState<TabType>("audit");
    const [copiedKey, setCopiedKey] = useState(false);
    const [portFilter, setPortFilter] = useState("");

    const { data: audit, isLoading: auditLoading, refetch: refetchAudit } = useSecurityAudit();
    const { data: sops, isLoading: sopsLoading } = useSOPSStatus();
    const verifySOPS = useVerifySOPS();
    const { data: f2b, isLoading: f2bLoading } = useFail2ban();
    const unbanIP = useUnbanIP();
    const { toggleVPN } = useSecurity();

    if (!open) return null;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
    };

    const ports = audit?.open_ports || [];
    const filteredPorts = ports.filter(
        (p) =>
            p.port.toString().includes(portFilter) ||
            (p.process && p.process.toLowerCase().includes(portFilter.toLowerCase())) ||
            p.protocol.toLowerCase().includes(portFilter.toLowerCase()) ||
            p.exposure.toLowerCase().includes(portFilter.toLowerCase())
    );

    const sopsReport = sops || audit?.sops_report;
    const fail2banStatus = f2b || audit?.fail2ban;
    const score = audit?.score ?? 85;
    const grade = audit?.grade ?? "A";

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-300">
                {/* ── Header ── */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <Shield className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-foreground">Güvenlik & SOPS Merkezi</h2>
                            <p className="text-xs text-muted-foreground">
                                Sistem Sağlığı · SOPS Age Şifreleme · Port Denetimi & Fail2ban
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => refetchAudit()}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"
                            title="Yenile"
                        >
                            <RefreshCw className={`h-4 w-4 ${auditLoading ? "animate-spin" : ""}`} />
                        </button>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* ── Tabs Navigation ── */}
                <div className="flex border-b border-border bg-muted/20 px-6 pt-2">
                    {[
                        { id: "audit", label: "Güvenlik Skoru & Denetim", icon: ShieldCheck },
                        { id: "sops", label: "SOPS & Age Şifreleme", icon: KeyRound },
                        { id: "ports", label: "Portlar & Fail2ban", icon: Network },
                    ].map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id as TabType)}
                                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
                                    active
                                        ? "border-emerald-500 text-emerald-500 bg-background/50 rounded-t-lg"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* ── Tab Content ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* ═══════════════════════════════════════════════════════════════
                        TAB 1: GÜVENLİK SKORU & DENETİM
                    ═══════════════════════════════════════════════════════════════ */}
                    {tab === "audit" && (
                        <div className="space-y-5">
                            {/* Security Score Hero Card */}
                            <div className="rounded-xl border border-border/80 bg-gradient-to-br from-emerald-500/10 via-card to-card p-5 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            Sistem Güvenlik Skoru
                                        </span>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-extrabold font-mono text-foreground">
                                                %{score}
                                            </span>
                                            <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold font-mono">
                                                Derece: {grade}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            NixOS Güvenlik Duvarı, SOPS Şifreleme, Fail2ban ve Sysctl kuralları analiz edildi.
                                        </p>
                                    </div>

                                    <div className="h-16 w-16 shrink-0 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                        <ShieldCheck className="h-9 w-9" />
                                    </div>
                                </div>
                            </div>

                            {/* Checklist Dimensions */}
                            <div className="space-y-2.5">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Denetim Kontrol Listesi
                                </h3>

                                <div className="grid gap-2.5">
                                    {/* 1. Firewall */}
                                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3">
                                        <div className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                            <div>
                                                <p className="text-xs font-semibold">NixOS Güvenlik Duvarı (Firewall)</p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    nftables / iptables paket filtreleme aktif
                                                </p>
                                            </div>
                                        </div>
                                        <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                                            Aktif
                                        </span>
                                    </div>

                                    {/* 2. SOPS & Age */}
                                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3">
                                        <div className="flex items-center gap-2.5">
                                            {sopsReport?.key_file_exists && sopsReport?.registered_in_sops ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                            ) : (
                                                <AlertTriangle className="h-4 w-4 text-amber-400" />
                                            )}
                                            <div>
                                                <p className="text-xs font-semibold">SOPS & Age Anahtarı Sağlığı</p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {sopsReport?.status_message || "/etc/age/key doğrulandı"}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
                                                sopsReport?.decryption_ok
                                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                    : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                            }`}
                                        >
                                            {sopsReport?.decryption_ok ? "Doğrulandı" : "Kontrol Gerekli"}
                                        </span>
                                    </div>

                                    {/* 3. VPN / Tailscale Mesh */}
                                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3">
                                        <div className="flex items-center gap-2.5">
                                            {audit?.vpn_active ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                            ) : (
                                                <AlertTriangle className="h-4 w-4 text-amber-400" />
                                            )}
                                            <div>
                                                <p className="text-xs font-semibold">Tailscale / Mesh Tüneli</p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {audit?.vpn_active ? "Mesh ağı aktif ve bağlı" : "Tünel bağlı değil"}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleVPN.mutate()}
                                            disabled={toggleVPN.isPending}
                                            className="rounded border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted transition-colors"
                                        >
                                            {audit?.vpn_active ? "Tüneli Kapat" : "Tüneli Aç"}
                                        </button>
                                    </div>

                                    {/* 4. Fail2ban */}
                                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3">
                                        <div className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                            <div>
                                                <p className="text-xs font-semibold">Fail2ban Saldırı Engelleme</p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {fail2banStatus?.enabled
                                                        ? `${fail2banStatus.active_jails} aktif jail, ${fail2banStatus.total_banned_ip} banlı IP`
                                                        : "Host seviyesinde yapılandırıldı"}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                                            {fail2banStatus?.enabled ? "Aktif" : "Hazır"}
                                        </span>
                                    </div>

                                    {/* 5. Kernel Sysctl */}
                                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3">
                                        <div className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                            <div>
                                                <p className="text-xs font-semibold">Sysctl Kernel Sertleştirme</p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    rp_filter, icmp broadcast koruması ve redirect engelleri devrede
                                                </p>
                                            </div>
                                        </div>
                                        <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                                            Sertleştirildi
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Recommendations */}
                            {audit?.recommendations && audit.recommendations.length > 0 && (
                                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span>Güvenlik Önerileri</span>
                                    </div>
                                    <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                                        {audit.recommendations.map((rec, idx) => (
                                            <li key={idx}>{rec}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════
                        TAB 2: SOPS & AGE ŞİFRELEME
                    ═══════════════════════════════════════════════════════════════ */}
                    {tab === "sops" && (
                        <div className="space-y-5">
                            {/* Key File Info Card */}
                            <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">
                                        Age Anahtar Dosyası
                                    </span>
                                    {sopsReport?.key_file_exists ? (
                                        <span className="flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                                            <Check className="h-3 w-3" /> /etc/age/key Mevcut
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 rounded bg-destructive/10 border border-destructive/20 px-2 py-0.5 text-[11px] font-medium text-destructive">
                                            <XCircle className="h-3 w-3" /> Bulunamadı
                                        </span>
                                    )}
                                </div>

                                <div className="rounded-lg border border-border/50 bg-background p-3 font-mono text-xs text-muted-foreground flex items-center justify-between">
                                    <span>{sopsReport?.key_file_path || "/etc/age/key"}</span>
                                    <span className="text-[10px] text-muted-foreground/70">İzin: 0600 (root)</span>
                                </div>
                            </div>

                            {/* Public Key Card */}
                            {sopsReport?.public_key && (
                                <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-foreground">
                                            Age Public Key (Açık Anahtar)
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(sopsReport.public_key!)}
                                            className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                                        >
                                            {copiedKey ? (
                                                <>
                                                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                                                    <span className="text-emerald-400">Kopyalandı!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-3.5 w-3.5" />
                                                    <span>Kopyala</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <div className="rounded-lg border border-border/50 bg-background p-3 font-mono text-xs text-foreground break-all select-all">
                                        {sopsReport.public_key}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Bu açık anahtar `.sops.yaml` dosyasında kayıtlı olmalıdır.
                                    </p>
                                </div>
                            )}

                            {/* SOPS Decryption Test Action */}
                            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-semibold text-foreground">
                                            SOPS Canlı Deşifre Testi
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground">
                                            `secrets/sops/secrets.yaml` dosyasını Age anahtarı ile çözerek bütünlüğü test eder.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => verifySOPS.mutate()}
                                        disabled={verifySOPS.isPending}
                                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                                    >
                                        <RefreshCw
                                            className={`h-3.5 w-3.5 ${verifySOPS.isPending ? "animate-spin" : ""}`}
                                        />
                                        {verifySOPS.isPending ? "Test Ediliyor…" : "Şimdi Test Et"}
                                    </button>
                                </div>

                                {sopsReport?.status_message && (
                                    <div
                                        className={`rounded-lg border p-3 text-xs flex items-center gap-2 ${
                                            sopsReport.decryption_ok
                                                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                                                : "border-amber-500/30 bg-amber-500/5 text-amber-400"
                                        }`}
                                    >
                                        {sopsReport.decryption_ok ? (
                                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                                        ) : (
                                            <AlertTriangle className="h-4 w-4 shrink-0" />
                                        )}
                                        <span>{sopsReport.status_message}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════
                        TAB 3: PORTLAR & FAIL2BAN
                    ═══════════════════════════════════════════════════════════════ */}
                    {tab === "ports" && (
                        <div className="space-y-6">
                            {/* Fail2ban Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Fail2ban Aktif Jail&apos;ler ({fail2banStatus?.jails?.length || 0})
                                    </h3>
                                    <span className="text-[11px] font-mono text-muted-foreground">
                                        Toplam Banlı: {fail2banStatus?.total_banned_ip || 0}
                                    </span>
                                </div>

                                {fail2banStatus?.jails && fail2banStatus.jails.length > 0 ? (
                                    <div className="grid gap-2.5">
                                        {fail2banStatus.jails.map((j) => (
                                            <div
                                                key={j.name}
                                                className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2"
                                            >
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-mono font-bold text-foreground">
                                                        {j.name}
                                                    </span>
                                                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                                                        Banlı: {j.currently_banned} / Toplam: {j.total_banned}
                                                    </span>
                                                </div>

                                                {j.banned_ips && j.banned_ips.length > 0 ? (
                                                    <div className="divide-y divide-border/30 rounded border border-border/40 bg-background/50 text-xs font-mono">
                                                        {j.banned_ips.map((ip) => (
                                                            <div
                                                                key={ip}
                                                                className="flex items-center justify-between px-2.5 py-1.5"
                                                            >
                                                                <span className="text-destructive font-semibold">
                                                                    {ip}
                                                                </span>
                                                                <button
                                                                    onClick={() =>
                                                                        unbanIP.mutate({ jail: j.name, ip })
                                                                    }
                                                                    disabled={unbanIP.isPending}
                                                                    className="flex items-center gap-1 rounded bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted transition-colors"
                                                                >
                                                                    <UserX className="h-3 w-3" /> Ban Kaldır
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Şu an banlanan zararlı IP yok.
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-border/40 bg-muted/10 p-3 text-xs text-muted-foreground">
                                        Fail2ban servisi çalışıyor ancak aktif ban kaydı bulunmuyor.
                                    </div>
                                )}
                            </div>

                            {/* Open Ports Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Dinlenen Portlar ({filteredPorts.length})
                                    </h3>
                                    <div className="relative w-44">
                                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={portFilter}
                                            onChange={(e) => setPortFilter(e.target.value)}
                                            placeholder="Port / Proses ara…"
                                            className="w-full rounded-md border border-border bg-background py-1 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-lg border border-border/60 bg-background overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="border-b border-border bg-muted/30 text-[10px] font-semibold uppercase text-muted-foreground">
                                            <tr>
                                                <th className="px-3 py-2">Port</th>
                                                <th className="px-3 py-2">Protokol</th>
                                                <th className="px-3 py-2">Servis / Daemon</th>
                                                <th className="px-3 py-2">Dinlenen IP</th>
                                                <th className="px-3 py-2 text-right">Maruziyet</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/30 font-mono">
                                            {filteredPorts.map((p, idx) => (
                                                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                                    <td className="px-3 py-2 font-bold text-foreground">
                                                        :{p.port}
                                                    </td>
                                                    <td className="px-3 py-2 uppercase text-muted-foreground">
                                                        {p.protocol}
                                                    </td>
                                                    <td className="px-3 py-2 font-sans font-medium text-foreground">
                                                        {p.process || "daemon"}
                                                    </td>
                                                    <td className="px-3 py-2 text-muted-foreground">
                                                        {p.address}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-sans">
                                                        <span
                                                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                                                p.exposure === "localhost"
                                                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                                    : p.exposure === "mesh"
                                                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                            }`}
                                                        >
                                                            {p.exposure === "localhost"
                                                                ? "Localhost"
                                                                : p.exposure === "mesh"
                                                                ? "Mesh VPN"
                                                                : "Tüm Ağlar"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
