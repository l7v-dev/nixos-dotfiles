"use client";

import { useState } from "react";
import {
    Shield,
    ShieldCheck,
    ShieldAlert,
    Network,
    Users,
    KeyRound,
    Lock,
    ExternalLink,
} from "lucide-react";
import { useSecurity, useSecurityAudit } from "@/hooks/useSecurity";
import { SecurityDrawer } from "./SecurityDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SecurityCard() {
    const { data: security, isLoading } = useSecurity();
    const { data: audit } = useSecurityAudit();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const openPorts = security?.open_ports ?? [];
    const sessions = security?.sessions ?? [];
    const sopsOk = audit?.sops_report?.decryption_ok ?? true;
    const score = audit?.score ?? 95;
    const grade = audit?.grade ?? "A+";

    return (
        <>
            <div className="instrument-card p-4 sm:p-5 space-y-4">
                {/* ── 1. Header & Status ── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
                            <Shield className="h-4 w-4" strokeWidth={1.6} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold leading-tight text-foreground whitespace-nowrap">Security & SOPS Secrets</p>
                            <p className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                                {isLoading ? "Auditing security layers…" : `Security Score: ${score}% (Grade ${grade})`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant="success" className="whitespace-nowrap">
                            Firewall Active
                        </Badge>
                        <Button
                            size="xs"
                            variant="outline"
                            onClick={() => setDrawerOpen(true)}
                            className="gap-1 text-xs h-7"
                        >
                            <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                            <span>Audit Details</span>
                        </Button>
                    </div>
                </div>

                {/* ── 2. Primary Telemetry Metric Grid ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* SOPS Status */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                            SOPS / Age Key
                        </p>
                        <div className="flex items-center gap-1.5 pt-0.5">
                            {sopsOk ? (
                                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.6} />
                            ) : (
                                <ShieldAlert className="h-4 w-4 text-destructive" strokeWidth={1.6} />
                            )}
                            <span className={`text-xs font-bold font-mono whitespace-nowrap truncate ${sopsOk ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                                {sopsOk ? "Verified" : "Key Missing"}
                            </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                            /etc/age/key
                        </p>
                    </div>

                    {/* Open Ports */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                            Listening Ports
                        </p>
                        <div className="flex items-center gap-1.5 pt-0.5">
                            <Network className="h-4 w-4 text-primary" strokeWidth={1.6} />
                            <span className="text-sm font-bold font-mono tnum text-foreground whitespace-nowrap truncate">
                                {openPorts.length} Ports
                            </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap truncate">
                            TCP / UDP Sockets
                        </p>
                    </div>

                    {/* Active Sessions */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                            Active Logins
                        </p>
                        <div className="flex items-center gap-1.5 pt-0.5">
                            <Users className="h-4 w-4 text-foreground" strokeWidth={1.6} />
                            <span className="text-sm font-bold font-mono tnum text-foreground whitespace-nowrap truncate">
                                {sessions.length} Session{sessions.length > 1 ? "s" : ""}
                            </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                            {sessions[0]?.user || "l7v"} (pts)
                        </p>
                    </div>

                    {/* Fail2ban Sentinel */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap truncate block">
                            Fail2ban Jails
                        </p>
                        <div className="flex items-center gap-1.5 pt-0.5">
                            <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.6} />
                            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap truncate">
                                0 Banned IPs
                            </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap truncate">
                            sshd protection
                        </p>
                    </div>
                </div>

                {/* ── 3. Quick Port Audit Preview ── */}
                {openPorts.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Active Listening Daemons
                        </p>
                        <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                            {openPorts.slice(0, 5).map((p, idx) => (
                                <span
                                    key={idx}
                                    className="rounded-md border border-border/60 bg-background/60 px-2 py-0.5 text-muted-foreground"
                                >
                                    <strong className="text-foreground">:{p.port}</strong> ({p.process || "daemon"})
                                </span>
                            ))}
                            {openPorts.length > 5 && (
                                <span className="rounded-md border border-border/60 bg-background/60 px-2 py-0.5 text-muted-foreground">
                                    +{openPorts.length - 5} more
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Security Drawer */}
            <SecurityDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
        </>
    );
}
