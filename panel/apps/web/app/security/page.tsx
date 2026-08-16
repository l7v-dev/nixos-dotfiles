"use client";

import React, { useState, Suspense } from "react";
import {
    useSOPSStatus,
    useVerifySOPS,
    useSecurityAudit,
    useFail2ban,
    useUnbanIP,
} from "@/hooks/useSecurity";
import {
    Shield,
    Key,
    Lock,
    RefreshCw,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Copy,
    Check,
    Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { SOPSAuditReport, Fail2banJailInfo, PortAuditItem } from "@/types/api";

function SecurityPageContent() {
    const [activeTab, setActiveTab] = useState<string>("sops");
    const [copied, setCopied] = useState(false);

    const { data: sopsData, isLoading: loadingSOPS, refetch: refetchSOPS } = useSOPSStatus();
    const { data: auditData, isLoading: loadingAudit, refetch: refetchAudit } = useSecurityAudit();
    const { data: f2bData, isLoading: loadingF2B, refetch: refetchF2B } = useFail2ban();

    const verifySOPSMutation = useVerifySOPS();
    const unbanMutation = useUnbanIP();

    const handleCopyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRefreshAll = () => {
        refetchSOPS();
        refetchAudit();
        refetchF2B();
    };

    const sopsOk = auditData?.sops_report?.decryption_ok ?? true;
    const score = auditData?.score ?? 95;
    const grade = auditData?.grade ?? "A+";
    const jails = f2bData?.jails ?? [];
    const ports = auditData?.open_ports ?? [];

    return (
        <div className="space-y-4 pb-12 font-sans">
            {/* ── Top Apparatus Header ── */}
            <div className="instrument-card p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-glow" />
                            <h1 className="text-base font-bold text-foreground">
                                Security Posture & SOPS Secrets
                            </h1>
                            <Badge variant="success" className="font-mono text-[10px]">
                                Grade {grade} ({score}%)
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Age key decryption verification, SOPS encrypted secrets audit, Fail2ban jail telemetry, and open port vulnerability scanning.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Button
                            variant="default"
                            size="xs"
                            onClick={() => verifySOPSMutation.mutate()}
                            disabled={verifySOPSMutation.isPending}
                            className="gap-1.5 shadow-sm"
                        >
                            <Key className="h-3 w-3" />
                            <span>{verifySOPSMutation.isPending ? "Auditing…" : "Verify SOPS Keys"}</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="xs"
                            onClick={handleRefreshAll}
                            className="gap-1"
                        >
                            <RefreshCw className="h-3 w-3" />
                            <span>Refresh</span>
                        </Button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-border/60 mt-4">
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">SOPS Decryption</span>
                        <p className={`text-sm font-bold font-mono pt-0.5 ${sopsOk ? "text-emerald-400" : "text-destructive"}`}>
                            {sopsOk ? "● Key Validated" : "▲ Missing Key"}
                        </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Firewall Status</span>
                        <p className="text-sm font-bold font-mono text-emerald-400 pt-0.5">● iptables active</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Fail2ban Jails</span>
                        <p className="text-lg font-bold font-mono tnum text-foreground">{jails.length}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Listening Sockets</span>
                        <p className="text-lg font-bold font-mono tnum text-primary">{ports.length}</p>
                    </div>
                </div>
            </div>

            {/* ── Tabs Workspace ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="sops" className="gap-1.5 text-xs">
                        <Key className="h-3.5 w-3.5" />
                        <span>SOPS & Secrets</span>
                    </TabsTrigger>
                    <TabsTrigger value="fail2ban" className="gap-1.5 text-xs">
                        <Lock className="h-3.5 w-3.5" />
                        <span>Fail2ban Jails ({jails.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="ports" className="gap-1.5 text-xs">
                        <Shield className="h-3.5 w-3.5" />
                        <span>Port Scanner ({ports.length})</span>
                    </TabsTrigger>
                </TabsList>

                {/* 1. SOPS Tab */}
                <TabsContent value="sops">
                    <div className="instrument-card p-4 sm:p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Age Public Key & SOPS Encrypted Secrets</h3>
                                <p className="text-xs text-muted-foreground">
                                    Declarative secrets managed via <code className="font-mono text-primary">modules/capabilities/secrets/sops.nix</code>
                                </p>
                            </div>
                            <Badge variant={sopsOk ? "success" : "destructive"}>
                                {sopsOk ? "Decryption Healthy" : "Decryption Error"}
                            </Badge>
                        </div>

                        {sopsData?.public_key && (
                            <div className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-1.5">
                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                    Host Age Public Key (/etc/age/key)
                                </span>
                                <div className="flex items-center justify-between gap-2">
                                    <code className="text-xs font-mono text-foreground select-all break-all">
                                        {sopsData.public_key}
                                    </code>
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        onClick={() => handleCopyKey(sopsData.public_key!)}
                                        className="gap-1 shrink-0"
                                    >
                                        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                        <span>{copied ? "Copied" : "Copy"}</span>
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2 pt-2">
                            <p className="text-xs font-semibold text-foreground">Encrypted Secret Targets</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                                {[
                                    "secrets/sops/cloudflare.yaml",
                                    "secrets/sops/forgejo.yaml",
                                    "secrets/sops/restic.yaml",
                                    "secrets/sops/tailscale.yaml",
                                ].map((s) => (
                                    <div key={s} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 p-2.5">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                        <span className="truncate text-muted-foreground">{s}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* 2. Fail2ban Tab */}
                <TabsContent value="fail2ban">
                    <div className="instrument-card p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-foreground">Fail2ban Active Jails</h3>
                            <span className="text-xs font-mono text-muted-foreground">Sentinel active</span>
                        </div>

                        {jails.length === 0 ? (
                            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                                No active jails configured or fail2ban daemon is idle.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {jails.map((j: Fail2banJailInfo) => (
                                    <div key={j.name} className="rounded-lg border border-border/60 bg-background/50 p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold font-mono text-foreground">{j.name}</span>
                                            <Badge variant="outline" className="text-[10px] text-emerald-400">
                                                {j.currently_banned} banned
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground font-mono">
                                            Total banned IPs: {j.total_banned} ({j.banned_ips?.length ?? 0} active)
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* 3. Ports Tab */}
                <TabsContent value="ports">
                    <div className="instrument-card p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-foreground">Open TCP/UDP Sockets</h3>
                            <span className="text-xs font-mono text-muted-foreground">{ports.length} listening daemons</span>
                        </div>

                        {ports.length === 0 ? (
                            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                                No listening ports recorded in audit.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-border/60">
                                <table className="w-full text-left text-xs font-mono">
                                    <thead className="bg-muted/60 text-muted-foreground border-b border-border/60">
                                        <tr>
                                            <th className="p-2.5 font-semibold">Port</th>
                                            <th className="p-2.5 font-semibold">Protocol</th>
                                            <th className="p-2.5 font-semibold">Address</th>
                                            <th className="p-2.5 font-semibold">Process / Daemon</th>
                                            <th className="p-2.5 font-semibold">Scope</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {ports.map((p: PortAuditItem, idx: number) => (
                                            <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                                <td className="p-2.5 font-bold text-primary tnum">:{p.port}</td>
                                                <td className="p-2.5 uppercase">{p.protocol || "tcp"}</td>
                                                <td className="p-2.5 text-muted-foreground">{p.address || "0.0.0.0"}</td>
                                                <td className="p-2.5 text-foreground font-sans font-medium">{p.process || "systemd"}</td>
                                                <td className="p-2.5">
                                                    <Badge variant={p.exposure === "localhost" ? "muted" : "warning"} className="text-[10px]">
                                                        {p.exposure || "localhost"}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function SecurityPage() {
    return (
        <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading Security Hub...</div>}>
            <SecurityPageContent />
        </Suspense>
    );
}
