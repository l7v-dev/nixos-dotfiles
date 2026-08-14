"use client";

import React, { useState } from "react";
import {
    Network as NetworkIcon,
    Plus,
    Trash2,
    Search,
    Shield,
    Boxes,
    X,
    Radio,
} from "lucide-react";
import { useNetworks, useCreateNetwork, useRemoveNetwork } from "@/hooks/useContainers";

export function NetworkManagementTab() {
    const [search, setSearch] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [netName, setNetName] = useState("");
    const [driver, setDriver] = useState("bridge");
    const [subnet, setSubnet] = useState("");
    const [gateway, setGateway] = useState("");
    const [internal, setInternal] = useState(false);

    const { data, isLoading } = useNetworks();
    const createMutation = useCreateNetwork();
    const removeMutation = useRemoveNetwork();

    const networks = data?.networks || [];

    const filteredNetworks = networks.filter((n) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return n.name.toLowerCase().includes(q) || n.driver.toLowerCase().includes(q);
    });

    const handleCreateNetwork = () => {
        if (!netName.trim()) return;
        createMutation.mutate(
            {
                name: netName.trim(),
                driver,
                subnet: subnet.trim() || undefined,
                gateway: gateway.trim() || undefined,
                internal,
            },
            {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    setNetName("");
                    setSubnet("");
                    setGateway("");
                    setInternal(false);
                },
            }
        );
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex items-center">
                    <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Ağ adı veya sürücü ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9 w-64 rounded-md border border-border bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:w-80"
                    />
                </div>

                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Özel Ağ Oluştur (Create Network)
                </button>
            </div>

            {/* Networks Table */}
            {isLoading ? (
                <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-14 animate-pulse rounded-lg border border-border bg-card/40" />
                    ))}
                </div>
            ) : filteredNetworks.length === 0 ? (
                <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center">
                    <NetworkIcon className="mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm font-semibold text-foreground">Sanal Ağ Bulunamadı</p>
                    <p className="text-xs text-muted-foreground">Kapsayıcıları bağlamak için özel bir ağ tanımlayın.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <tr>
                                <th className="p-3">Ağ Adı & ID</th>
                                <th className="p-3">Sürücü & Scope</th>
                                <th className="p-3">IPAM (Subnet / Gateway)</th>
                                <th className="p-3">Bağlı Kapsayıcılar & IP'ler</th>
                                <th className="p-3 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y border-border">
                            {filteredNetworks.map((n) => {
                                const isSystemNetwork = ["bridge", "host", "none"].includes(n.name);
                                const containersList = n.containers ? Object.entries(n.containers) : [];

                                return (
                                    <tr key={n.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <NetworkIcon className="h-4 w-4 text-indigo-400 shrink-0" />
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-foreground">{n.name}</span>
                                                    <span className="font-mono text-[10px] text-muted-foreground">
                                                        {n.id.slice(0, 12)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3 text-muted-foreground">
                                            {n.driver} ({n.scope || "local"})
                                            {n.internal && (
                                                <span className="ml-1 rounded bg-amber-500/10 px-1 text-[9px] text-amber-500">
                                                    Internal
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 font-mono text-muted-foreground">
                                            {n.ipam?.config && n.ipam.config.length > 0 ? (
                                                n.ipam.config.map((cfg, i) => (
                                                    <div key={i}>
                                                        {cfg.subnet || "—"} {cfg.gateway ? `(GW: ${cfg.gateway})` : ""}
                                                    </div>
                                                ))
                                            ) : (
                                                <span>—</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            {containersList.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {containersList.map(([cid, ep]) => (
                                                        <span
                                                            key={cid}
                                                            className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-foreground"
                                                        >
                                                            <Boxes className="h-2.5 w-2.5 text-primary" />
                                                            {ep.name || cid.slice(0, 8)}: {ep.ipv4Address || "DHCP"}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground/60">—</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            {!isSystemNetwork && (
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`${n.name} ağını silmek istediğinize emin misiniz?`)) {
                                                            removeMutation.mutate(n.id);
                                                        }
                                                    }}
                                                    disabled={removeMutation.isPending}
                                                    title="Ağı Sil"
                                                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Network Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                <NetworkIcon className="h-4 w-4 text-primary" />
                                Yeni Sanal Ağ Tanımla
                            </h3>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="rounded p-1 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-foreground mb-1">
                                Ağ Adı <span className="text-destructive">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Örn: custom_app_net"
                                value={netName}
                                onChange={(e) => setNetName(e.target.value)}
                                className="h-9 w-full rounded-md border border-border bg-card px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1">
                                    Sürücü (Driver)
                                </label>
                                <select
                                    value={driver}
                                    onChange={(e) => setDriver(e.target.value)}
                                    className="h-9 w-full rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none"
                                >
                                    <option value="bridge">bridge (Varsayılan)</option>
                                    <option value="macvlan">macvlan</option>
                                    <option value="ipvlan">ipvlan</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1">
                                    Subnet (CIDR)
                                </label>
                                <input
                                    type="text"
                                    placeholder="172.28.0.0/16"
                                    value={subnet}
                                    onChange={(e) => setSubnet(e.target.value)}
                                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="internalNet"
                                checked={internal}
                                onChange={(e) => setInternal(e.target.checked)}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            />
                            <label htmlFor="internalNet" className="text-xs font-medium text-foreground cursor-pointer">
                                İzole Ağ (Dış internete çıkışı engelle)
                            </label>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-border">
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleCreateNetwork}
                                disabled={createMutation.isPending || !netName.trim()}
                                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                                {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
