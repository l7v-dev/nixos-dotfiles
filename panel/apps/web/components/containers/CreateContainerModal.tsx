"use client";

import React, { useState } from "react";
import {
    X,
    Plus,
    Trash2,
    Boxes,
    Network,
    HardDrive,
    Shield,
    Check,
    Cpu,
    AlertCircle,
    ArrowRight,
    ArrowLeft,
} from "lucide-react";
import { useCreateContainer } from "@/hooks/useContainers";
import type { CreateContainerRequest, PortMapping, MountPoint } from "@/types/containers";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateContainerModal({ isOpen, onClose }: Props) {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

    // Form states
    const [name, setName] = useState("");
    const [image, setImage] = useState("");
    const [autoStart, setAutoStart] = useState(true);
    const [restartPolicy, setRestartPolicy] = useState("unless-stopped");

    // Ports
    const [ports, setPorts] = useState<PortMapping[]>([]);
    const [newHostPort, setNewHostPort] = useState("");
    const [newContainerPort, setNewContainerPort] = useState("");
    const [newPortType, setNewPortType] = useState("tcp");
    const [network, setNetwork] = useState("bridge");

    // Volumes
    const [mounts, setMounts] = useState<MountPoint[]>([]);
    const [newMountSource, setNewMountSource] = useState("");
    const [newMountDest, setNewMountDest] = useState("");
    const [newMountRW, setNewMountRW] = useState(true);

    // Environment variables
    const [envList, setEnvList] = useState<{ key: string; val: string }[]>([]);
    const [newEnvKey, setNewEnvKey] = useState("");
    const [newEnvVal, setNewEnvVal] = useState("");

    // Limits
    const [memoryMB, setMemoryMB] = useState<number | undefined>(undefined);
    const [cpus, setCpus] = useState<number | undefined>(undefined);
    const [privileged, setPrivileged] = useState(false);

    const createMutation = useCreateContainer();

    if (!isOpen) return null;

    const handleAddPort = () => {
        const hPort = parseInt(newHostPort, 10);
        const cPort = parseInt(newContainerPort, 10);
        if (cPort > 0 && cPort <= 65535) {
            setPorts((prev) => [
                ...prev,
                {
                    publicPort: hPort > 0 ? hPort : undefined,
                    privatePort: cPort,
                    type: newPortType,
                },
            ]);
            setNewHostPort("");
            setNewContainerPort("");
        }
    };

    const handleAddMount = () => {
        if (newMountSource && newMountDest) {
            setMounts((prev) => [
                ...prev,
                {
                    type: newMountSource.startsWith("/") ? "bind" : "volume",
                    source: newMountSource,
                    destination: newMountDest,
                    rw: newMountRW,
                },
            ]);
            setNewMountSource("");
            setNewMountDest("");
        }
    };

    const handleAddEnv = () => {
        if (newEnvKey) {
            setEnvList((prev) => [...prev, { key: newEnvKey, val: newEnvVal }]);
            setNewEnvKey("");
            setNewEnvVal("");
        }
    };

    const handleSubmit = () => {
        if (!image.trim()) {
            setStep(1);
            return;
        }

        const formattedEnv = envList.map((e) => `${e.key}=${e.val}`);

        const req: CreateContainerRequest = {
            name: name.trim() || undefined,
            image: image.trim(),
            ports: ports.length > 0 ? ports : undefined,
            mounts: mounts.length > 0 ? mounts : undefined,
            env: formattedEnv.length > 0 ? formattedEnv : undefined,
            network: network || undefined,
            restartPolicy,
            memoryMB: memoryMB && memoryMB > 0 ? memoryMB : undefined,
            cpus: cpus && cpus > 0 ? cpus : undefined,
            privileged,
            autoStart,
        };

        createMutation.mutate(req, {
            onSuccess: () => {
                onClose();
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="relative flex w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Boxes className="h-5 w-5 text-primary" />
                        <div>
                            <h2 className="text-base font-bold text-foreground">Yeni Kapsayıcı Oluştur</h2>
                            <p className="text-xs text-muted-foreground">
                                OCI / Podman / Docker imajından yeni bir servis başlatın.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Wizard Steps */}
                <div className="flex border-b border-border bg-muted/20 px-6 py-2.5">
                    {[
                        { num: 1, label: "1. Temel Bilgiler" },
                        { num: 2, label: "2. Port & Ağ" },
                        { num: 3, label: "3. Disk & Ortam" },
                        { num: 4, label: "4. Limitler & Güvenlik" },
                    ].map((s) => (
                        <button
                            key={s.num}
                            onClick={() => setStep(s.num as any)}
                            className={`flex-1 text-center text-xs font-semibold py-1 border-b-2 transition-colors ${
                                step === s.num
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* Body Content */}
                <div className="p-6 min-h-[340px] max-h-[480px] overflow-y-auto">
                    {/* Step 1: Basic */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1">
                                    İmaj Adı <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Örn: nginx:alpine, redis:latest, postgres:16"
                                    value={image}
                                    onChange={(e) => setImage(e.target.value)}
                                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                                />
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    İmaj yerelde yoksa otomatik olarak kayıtlı registry'den çekilecektir.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1">
                                    Kapsayıcı Adı (İsteğe Bağlı)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Örn: my-web-server"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">
                                        Yeniden Başlatma Politikası
                                    </label>
                                    <select
                                        value={restartPolicy}
                                        onChange={(e) => setRestartPolicy(e.target.value)}
                                        className="h-9 w-full rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none"
                                    >
                                        <option value="unless-stopped">Unless Stopped (Önerilen)</option>
                                        <option value="always">Always</option>
                                        <option value="on-failure">On Failure</option>
                                        <option value="no">No (Yeniden başlatma)</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 pt-5">
                                    <input
                                        type="checkbox"
                                        id="autoStart"
                                        checked={autoStart}
                                        onChange={(e) => setAutoStart(e.target.checked)}
                                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="autoStart" className="text-xs font-medium text-foreground cursor-pointer">
                                        Oluşturulduktan sonra hemen başlat
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Ports & Network */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1">
                                    Ağ Modu (Network Mode)
                                </label>
                                <select
                                    value={network}
                                    onChange={(e) => setNetwork(e.target.value)}
                                    className="h-9 w-full rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none"
                                >
                                    <option value="bridge">Bridge (Varsayılan NAT Köprüsü)</option>
                                    <option value="host">Host (Doğrudan ana makine ağı)</option>
                                    <option value="none">None (İzole ağ)</option>
                                </select>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="block text-xs font-semibold text-foreground">
                                    Port Eşlemeleri (Host Port ➔ Container Port)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        placeholder="Host Port (örn: 8080)"
                                        value={newHostPort}
                                        onChange={(e) => setNewHostPort(e.target.value)}
                                        className="h-8 flex-1 rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none"
                                    />
                                    <span className="text-muted-foreground">➔</span>
                                    <input
                                        type="number"
                                        placeholder="Container Port (örn: 80)"
                                        value={newContainerPort}
                                        onChange={(e) => setNewContainerPort(e.target.value)}
                                        className="h-8 flex-1 rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none"
                                    />
                                    <select
                                        value={newPortType}
                                        onChange={(e) => setNewPortType(e.target.value)}
                                        className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none"
                                    >
                                        <option value="tcp">TCP</option>
                                        <option value="udp">UDP</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={handleAddPort}
                                        className="flex h-8 items-center gap-1 rounded-md bg-accent px-3 text-xs font-semibold text-foreground hover:bg-accent/80"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Ekle
                                    </button>
                                </div>

                                {ports.length > 0 && (
                                    <div className="mt-2 space-y-1 rounded-md border border-border bg-muted/20 p-2">
                                        {ports.map((p, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-xs font-mono py-1 px-2 rounded bg-card">
                                                <span>
                                                    Host {p.publicPort || "Rastgele"} ➔ Container {p.privatePort}/{p.type}
                                                </span>
                                                <button
                                                    onClick={() => setPorts(ports.filter((_, i) => i !== idx))}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Mounts & Environment */}
                    {step === 3 && (
                        <div className="space-y-5">
                            {/* Mounts */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-foreground">
                                    Kalıcı Diskler & Bind Mounts
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Host Dizini veya Volume Adı"
                                        value={newMountSource}
                                        onChange={(e) => setNewMountSource(e.target.value)}
                                        className="h-8 flex-1 rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none"
                                    />
                                    <span className="text-muted-foreground">➔</span>
                                    <input
                                        type="text"
                                        placeholder="Kapsayıcı İçi Dizin"
                                        value={newMountDest}
                                        onChange={(e) => setNewMountDest(e.target.value)}
                                        className="h-8 flex-1 rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddMount}
                                        className="flex h-8 items-center gap-1 rounded-md bg-accent px-3 text-xs font-semibold text-foreground hover:bg-accent/80"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Ekle
                                    </button>
                                </div>

                                {mounts.length > 0 && (
                                    <div className="space-y-1 rounded-md border border-border bg-muted/20 p-2">
                                        {mounts.map((m, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-xs font-mono py-1 px-2 rounded bg-card">
                                                <span>{m.source} ➔ {m.destination} ({m.rw ? "RW" : "RO"})</span>
                                                <button
                                                    onClick={() => setMounts(mounts.filter((_, i) => i !== idx))}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Environment Variables */}
                            <div className="space-y-2 pt-2 border-t border-border">
                                <label className="block text-xs font-semibold text-foreground">
                                    Ortam Değişkenleri (Environment Variables)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="DEĞİŞKEN_ADI"
                                        value={newEnvKey}
                                        onChange={(e) => setNewEnvKey(e.target.value)}
                                        className="h-8 w-1/3 rounded-md border border-border bg-card px-2.5 text-xs text-foreground font-mono focus:outline-none"
                                    />
                                    <span className="text-muted-foreground">=</span>
                                    <input
                                        type="text"
                                        placeholder="değer"
                                        value={newEnvVal}
                                        onChange={(e) => setNewEnvVal(e.target.value)}
                                        className="h-8 flex-1 rounded-md border border-border bg-card px-2.5 text-xs text-foreground font-mono focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddEnv}
                                        className="flex h-8 items-center gap-1 rounded-md bg-accent px-3 text-xs font-semibold text-foreground hover:bg-accent/80"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Ekle
                                    </button>
                                </div>

                                {envList.length > 0 && (
                                    <div className="space-y-1 rounded-md border border-border bg-muted/20 p-2 max-h-36 overflow-y-auto">
                                        {envList.map((e, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-xs font-mono py-1 px-2 rounded bg-card">
                                                <span><span className="text-blue-400 font-semibold">{e.key}</span>={e.val}</span>
                                                <button
                                                    onClick={() => setEnvList(envList.filter((_, i) => i !== idx))}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Limits & Security */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">
                                        Bellek Limiti (MB)
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="Boş = Limitsiz (örn: 512)"
                                        value={memoryMB || ""}
                                        onChange={(e) => setMemoryMB(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                                        className="h-9 w-full rounded-md border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">
                                        CPU Çekirdek Sayısı
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        placeholder="Boş = Limitsiz (örn: 1.5)"
                                        value={cpus || ""}
                                        onChange={(e) => setCpus(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        className="h-9 w-full rounded-md border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="privileged"
                                        checked={privileged}
                                        onChange={(e) => setPrivileged(e.target.checked)}
                                        className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <label htmlFor="privileged" className="text-xs font-semibold text-foreground cursor-pointer">
                                            Ayrıcalıklı Mod (Privileged Mode)
                                        </label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Kapsayıcıya tüm ana makine aygıtlarına doğrudan erişim ve genişletilmiş Linux yetkileri verir. Sadece güvendiğiniz imajlarda kullanın.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {createMutation.isError && (
                                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>{createMutation.error?.message || "Kapsayıcı oluşturulamadı."}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between border-t border-border bg-muted/20 px-6 py-4">
                    <div>
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={() => setStep((step - 1) as any)}
                                className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" /> Geri
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
                        >
                            İptal
                        </button>

                        {step < 4 ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (step === 1 && !image.trim()) {
                                        alert("Lütfen bir imaj adı belirtin.");
                                        return;
                                    }
                                    setStep((step + 1) as any);
                                }}
                                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                            >
                                İleri <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={createMutation.isPending}
                                className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90"
                            >
                                <Check className="h-3.5 w-3.5" />
                                {createMutation.isPending ? "Oluşturuluyor..." : "Kapsayıcıyı Oluştur"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
