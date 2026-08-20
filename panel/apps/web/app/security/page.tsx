"use client";

import React, { useState, Suspense } from "react";
import {
    useSOPSStatus,
    useSOPSSecrets,
    useVerifySOPS,
    useSecurityAudit,
    useFail2ban,
    useUnbanIP,
    useBanIP,
} from "@/hooks/useSecurity";
import {
    Shield,
    Key,
    Lock,
    RefreshCw,
    CheckCircle2,
    XCircle,
    AlertCircle,
    AlertTriangle,
    Copy,
    Check,
    Search,
    UserX,
    UserPlus,
    Plus,
    Activity,
    Server,
    ExternalLink,
    FileCode2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { SOPSAuditReport, Fail2banJailInfo, PortAuditItem, SecretMetadata } from "@/types/api";

function SecurityPageContent() {
    const [activeTab, setActiveTab] = useState<string>("sops");
    const [copied, setCopied] = useState(false);
    const [portFilter, setPortFilter] = useState("");
    const [secretFilter, setSecretFilter] = useState("");

    // Manual Ban Form state
    const [showBanModal, setShowBanModal] = useState(false);
    const [banJail, setBanJail] = useState("");
    const [banIPInput, setBanIPInput] = useState("");

    const { data: sopsData, isLoading: loadingSOPS, refetch: refetchSOPS } = useSOPSStatus();
    const { data: secretsData, isLoading: loadingSecrets, refetch: refetchSecrets } = useSOPSSecrets();
    const { data: auditData, isLoading: loadingAudit, refetch: refetchAudit, isError: auditError } = useSecurityAudit();
    const { data: f2bData, isLoading: loadingF2B, refetch: refetchF2B } = useFail2ban();

    const verifySOPSMutation = useVerifySOPS();
    const unbanMutation = useUnbanIP();
    const banMutation = useBanIP();

    const handleCopyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRefreshAll = () => {
        refetchSOPS();
        refetchSecrets();
        refetchAudit();
        refetchF2B();
    };

    const handleBanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!banJail || !banIPInput) return;
        banMutation.mutate(
            { jail: banJail, ip: banIPInput.trim() },
            {
                onSuccess: () => {
                    setShowBanModal(false);
                    setBanIPInput("");
                },
            }
        );
    };

    const sopsReport = sopsData || auditData?.sops_report;
    const sopsOk = sopsReport?.decryption_ok ?? false;
    const keyExists = sopsReport?.key_file_exists ?? false;
    const score = auditData?.score ?? 0;
    const grade = auditData?.grade ?? "-";
    const firewallActive = auditData?.firewall_active ?? false;
    const sysctlHardened = auditData?.sysctl_hardened ?? false;

    const jails = f2bData?.jails ?? auditData?.fail2ban?.jails ?? [];
    const ports = auditData?.open_ports ?? [];
    const secrets = secretsData?.secrets ?? [];

    const filteredPorts = ports.filter(
        (p) =>
            p.port.toString().includes(portFilter) ||
            (p.process && p.process.toLowerCase().includes(portFilter.toLowerCase())) ||
            p.protocol.toLowerCase().includes(portFilter.toLowerCase()) ||
            p.exposure.toLowerCase().includes(portFilter.toLowerCase())
    );

    const filteredSecrets = secrets.filter(
        (s) =>
            s.key.toLowerCase().includes(secretFilter.toLowerCase()) ||
            s.category.toLowerCase().includes(secretFilter.toLowerCase()) ||
            (s.associated_app && s.associated_app.toLowerCase().includes(secretFilter.toLowerCase()))
    );

    return (
        <div className="space-y-4 pb-12 font-sans">
            {/* ── Top Apparatus Header ── */}
            <div className="instrument-card p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2">
                            <span
                                className={`flex h-2.5 w-2.5 rounded-full ${
                                    loadingAudit
                                        ? "bg-amber-400 animate-pulse"
                                        : score >= 80
                                        ? "bg-emerald-500 shadow-glow"
                                        : "bg-destructive"
                                }`}
                            />
                            <h1 className="text-base font-bold text-foreground">
                                Security Posture & SOPS Secrets
                            </h1>
                            {!loadingAudit && (
                                <Badge
                                    variant={score >= 80 ? "success" : score >= 60 ? "warning" : "destructive"}
                                    className="font-mono text-[10px]"
                                >
                                    Grade {grade} ({score}%)
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Age key decryption verification, SOPS declarative secrets inventory, Fail2ban jail telemetry, and socket exposure auditing.
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
                            <Key className={`h-3 w-3 ${verifySOPSMutation.isPending ? "animate-spin" : ""}`} />
                            <span>{verifySOPSMutation.isPending ? "Auditing SOPS…" : "Verify SOPS Decryption"}</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="xs"
                            onClick={handleRefreshAll}
                            className="gap-1"
                        >
                            <RefreshCw className={`h-3 w-3 ${loadingAudit || loadingSOPS ? "animate-spin" : ""}`} />
                            <span>Refresh</span>
                        </Button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-4 border-t border-border/60 mt-4">
                    {/* SOPS Status */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                            SOPS / Age Key
                        </span>
                        <p
                            className={`text-xs font-bold font-mono pt-0.5 ${
                                sopsOk
                                    ? "text-emerald-400"
                                    : keyExists
                                    ? "text-amber-400"
                                    : "text-destructive"
                            }`}
                        >
                            {loadingSOPS ? "Checking…" : sopsOk ? "● Key Verified" : keyExists ? "▲ Unverified" : "✕ Missing Key"}
                        </p>
                    </div>

                    {/* Firewall */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                            Firewall
                        </span>
                        <p
                            className={`text-xs font-bold font-mono pt-0.5 ${
                                firewallActive ? "text-emerald-400" : "text-destructive"
                            }`}
                        >
                            {loadingAudit ? "Scanning…" : firewallActive ? "● Active (nft/ipt)" : "✕ Inactive"}
                        </p>
                    </div>

                    {/* Sysctl Hardening */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                            Kernel Sysctl
                        </span>
                        <p
                            className={`text-xs font-bold font-mono pt-0.5 ${
                                sysctlHardened ? "text-emerald-400" : "text-amber-400"
                            }`}
                        >
                            {loadingAudit ? "Auditing…" : sysctlHardened ? "● Hardened" : "▲ Default"}
                        </p>
                    </div>

                    {/* Fail2ban */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                            Fail2ban Jails
                        </span>
                        <p className="text-lg font-bold font-mono tnum text-foreground">
                            {loadingF2B ? "…" : jails.length}
                        </p>
                    </div>

                    {/* Sockets */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                            Listening Sockets
                        </span>
                        <p className="text-lg font-bold font-mono tnum text-primary">
                            {loadingAudit ? "…" : ports.length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Recommendations Banner */}
            {auditData?.recommendations && auditData.recommendations.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Security Hardening Recommendations ({auditData.recommendations.length})</span>
                    </div>
                    <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                        {auditData.recommendations.map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── Tabs Workspace ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="sops" className="gap-1.5 text-xs">
                        <Key className="h-3.5 w-3.5" />
                        <span>SOPS & Age ({secrets.length} Secrets)</span>
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

                {/* ═══════════════════════════════════════════════════════════════
                    TAB 1: SOPS & SECRETS INVENTORY
                ═══════════════════════════════════════════════════════════════ */}
                <TabsContent value="sops">
                    <div className="space-y-4">
                        {/* Age Key Card */}
                        <div className="instrument-card p-4 sm:p-5 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">Age Public Key & Decryption Status</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Managed declaratively via <code className="font-mono text-primary">modules/capabilities/secrets/default.nix</code>
                                    </p>
                                </div>
                                <Badge variant={sopsOk ? "success" : keyExists ? "warning" : "destructive"}>
                                    {sopsOk ? "Decryption Healthy (OK)" : keyExists ? "Key Present (Not Tested)" : "Key Missing"}
                                </Badge>
                            </div>

                            {/* Status message */}
                            {sopsReport?.status_message && (
                                <div
                                    className={`rounded-lg border p-3 text-xs flex items-center gap-2.5 ${
                                        sopsOk
                                            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                                            : "border-amber-500/30 bg-amber-500/5 text-amber-400"
                                    }`}
                                >
                                    {sopsOk ? (
                                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                                    ) : (
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                    )}
                                    <span>{sopsReport.status_message}</span>
                                </div>
                            )}

                            {/* Public Key Display */}
                            {sopsReport?.public_key && (
                                <div className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-1.5">
                                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                        Host Age Public Key ({sopsReport.key_file_path || "/etc/age/key"})
                                    </span>
                                    <div className="flex items-center justify-between gap-2">
                                        <code className="text-xs font-mono text-foreground select-all break-all">
                                            {sopsReport.public_key}
                                        </code>
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            onClick={() => handleCopyKey(sopsReport.public_key!)}
                                            className="gap-1 shrink-0"
                                        >
                                            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                            <span>{copied ? "Copied" : "Copy"}</span>
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Real Secrets Inventory */}
                        <div className="instrument-card p-4 sm:p-5 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">
                                        SOPS Encrypted Secrets Inventory ({secrets.length})
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Targets declared in <code className="font-mono text-foreground">secrets/sops/secrets.yaml</code>
                                    </p>
                                </div>

                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={secretFilter}
                                        onChange={(e) => setSecretFilter(e.target.value)}
                                        placeholder="Filter secrets or apps…"
                                        className="w-full rounded-md border border-border bg-background py-1 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            {loadingSecrets ? (
                                <div className="p-8 text-center text-xs text-muted-foreground">
                                    Loading secrets catalog from secrets.yaml…
                                </div>
                            ) : filteredSecrets.length === 0 ? (
                                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                                    No declared secrets found matching &quot;{secretFilter}&quot;.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                    {filteredSecrets.map((s: SecretMetadata) => (
                                        <div
                                            key={s.key}
                                            className="rounded-lg border border-border/60 bg-background/50 p-3 space-y-2 hover:border-border transition-colors"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 truncate">
                                                    <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                                    <span className="text-xs font-mono font-bold text-foreground truncate">
                                                        {s.key}
                                                    </span>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] uppercase font-mono shrink-0">
                                                    {s.category}
                                                </Badge>
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                                                <span className="flex items-center gap-1 font-sans">
                                                    <Server className="h-3 w-3" />
                                                    {s.associated_app ? (
                                                        <span className="text-foreground font-medium">{s.associated_app}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">system</span>
                                                    )}
                                                </span>
                                                <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    AES256-GCM
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                {/* ═══════════════════════════════════════════════════════════════
                    TAB 2: FAIL2BAN JAILS & BAN SENTINEL
                ═══════════════════════════════════════════════════════════════ */}
                <TabsContent value="fail2ban">
                    <div className="instrument-card p-4 sm:p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Fail2ban Active Jails & Telemetry</h3>
                                <p className="text-xs text-muted-foreground">
                                    Intrusion prevention daemon guarding SSH, authentication endpoints, and proxies.
                                </p>
                            </div>
                            <Button
                                size="xs"
                                variant="outline"
                                onClick={() => {
                                    if (jails.length > 0) setBanJail(jails[0].name);
                                    setShowBanModal(true);
                                }}
                                className="gap-1 text-xs"
                            >
                                <Plus className="h-3 w-3" />
                                <span>Ban Offending IP</span>
                            </Button>
                        </div>

                        {/* Ban IP Modal Form */}
                        {showBanModal && (
                            <form
                                onSubmit={handleBanSubmit}
                                className="rounded-lg border border-primary/40 bg-primary/5 p-3.5 space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <UserPlus className="h-3.5 w-3.5 text-primary" />
                                        Manual IP Ban Enforcement
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setShowBanModal(false)}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        Cancel
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="text-[10px] uppercase font-semibold text-muted-foreground block pb-1">
                                            Target Jail
                                        </label>
                                        <select
                                            value={banJail}
                                            onChange={(e) => setBanJail(e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                        >
                                            {jails.map((j) => (
                                                <option key={j.name} value={j.name}>
                                                    {j.name}
                                                </option>
                                            ))}
                                            {jails.length === 0 && <option value="sshd">sshd</option>}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-semibold text-muted-foreground block pb-1">
                                            IP Address
                                        </label>
                                        <input
                                            type="text"
                                            value={banIPInput}
                                            onChange={(e) => setBanIPInput(e.target.value)}
                                            placeholder="e.g. 192.168.1.100"
                                            className="w-full rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-1">
                                    <Button
                                        type="submit"
                                        size="xs"
                                        variant="destructive"
                                        disabled={banMutation.isPending || !banIPInput}
                                        className="gap-1"
                                    >
                                        <Lock className="h-3 w-3" />
                                        <span>{banMutation.isPending ? "Enforcing Ban…" : "Enforce Ban"}</span>
                                    </Button>
                                </div>
                            </form>
                        )}

                        {/* Jails Grid */}
                        {loadingF2B ? (
                            <div className="p-8 text-center text-xs text-muted-foreground">
                                Querying fail2ban-client status…
                            </div>
                        ) : jails.length === 0 ? (
                            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                                No active fail2ban jails reported or daemon is not running on host.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {jails.map((j: Fail2banJailInfo) => (
                                    <div
                                        key={j.name}
                                        className="rounded-lg border border-border/60 bg-background/50 p-3.5 space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold font-mono text-foreground flex items-center gap-1.5">
                                                <Lock className="h-3.5 w-3.5 text-primary" />
                                                {j.name}
                                            </span>
                                            <Badge variant="outline" className="text-[10px] text-emerald-400">
                                                {j.currently_banned} active bans
                                            </Badge>
                                        </div>

                                        <p className="text-xs text-muted-foreground font-mono">
                                            Lifetime bans: {j.total_banned} | Current pool: {j.banned_ips?.length ?? 0}
                                        </p>

                                        {j.banned_ips && j.banned_ips.length > 0 ? (
                                            <div className="divide-y divide-border/30 rounded border border-border/40 bg-background/60 text-xs font-mono max-h-40 overflow-y-auto">
                                                {j.banned_ips.map((ip) => (
                                                    <div
                                                        key={ip}
                                                        className="flex items-center justify-between px-2.5 py-1.5 hover:bg-muted/20 transition-colors"
                                                    >
                                                        <span className="text-destructive font-semibold">{ip}</span>
                                                        <Button
                                                            size="xs"
                                                            variant="ghost"
                                                            onClick={() =>
                                                                unbanMutation.mutate({ jail: j.name, ip })
                                                            }
                                                            disabled={unbanMutation.isPending}
                                                            className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                                                        >
                                                            <UserX className="h-3 w-3" />
                                                            <span>Unban</span>
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-muted-foreground italic">
                                                No banned IP addresses in this jail currently.
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ═══════════════════════════════════════════════════════════════
                    TAB 3: SOCKET & PORT SCANNER
                ═══════════════════════════════════════════════════════════════ */}
                <TabsContent value="ports">
                    <div className="instrument-card p-4 sm:p-5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">
                                    Listening Network Sockets ({filteredPorts.length})
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Audited from <code className="font-mono text-foreground">/proc/net/{'{tcp,udp}'}</code> with process inode resolution.
                                </p>
                            </div>

                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={portFilter}
                                    onChange={(e) => setPortFilter(e.target.value)}
                                    placeholder="Filter port, protocol, daemon…"
                                    className="w-full rounded-md border border-border bg-background py-1 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>

                        {loadingAudit ? (
                            <div className="p-8 text-center text-xs text-muted-foreground">
                                Scanning network sockets…
                            </div>
                        ) : filteredPorts.length === 0 ? (
                            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                                No open ports matching &quot;{portFilter}&quot;.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-border/60">
                                <table className="w-full text-left text-xs font-mono">
                                    <thead className="bg-muted/60 text-muted-foreground border-b border-border/60 text-[10px] uppercase">
                                        <tr>
                                            <th className="p-2.5 font-semibold">Port</th>
                                            <th className="p-2.5 font-semibold">Protocol</th>
                                            <th className="p-2.5 font-semibold">Address</th>
                                            <th className="p-2.5 font-semibold">Process / Daemon</th>
                                            <th className="p-2.5 font-semibold">PID</th>
                                            <th className="p-2.5 font-semibold text-right">Exposure</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {filteredPorts.map((p: PortAuditItem, idx: number) => (
                                            <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                                <td className="p-2.5 font-bold text-primary tnum">:{p.port}</td>
                                                <td className="p-2.5 uppercase font-semibold text-foreground">
                                                    {p.protocol || "tcp"}
                                                </td>
                                                <td className="p-2.5 text-muted-foreground">{p.address}</td>
                                                <td className="p-2.5 text-foreground font-sans font-medium">
                                                    {p.process || "daemon"}
                                                </td>
                                                <td className="p-2.5 text-muted-foreground">
                                                    {p.pid && p.pid > 0 ? p.pid : "-"}
                                                </td>
                                                <td className="p-2.5 text-right">
                                                    <Badge
                                                        variant={
                                                            p.exposure === "localhost"
                                                                ? "muted"
                                                                : p.exposure === "mesh"
                                                                ? "default"
                                                                : "warning"
                                                        }
                                                        className="text-[10px] font-sans"
                                                    >
                                                        {p.exposure === "localhost"
                                                            ? "Localhost"
                                                            : p.exposure === "mesh"
                                                            ? "Mesh VPN"
                                                            : "Public (0.0.0.0)"}
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
