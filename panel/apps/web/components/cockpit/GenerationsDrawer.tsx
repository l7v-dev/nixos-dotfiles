"use client";

import React, { useState } from "react";
import {
    X,
    Layers,
    RotateCcw,
    CheckCircle2,
    Clock,
    Cpu,
    GitBranch,
    Search,
    ArrowRight,
    ArrowUpDown,
    Plus,
    Minus,
    RefreshCw,
    Shield,
    Sparkles,
    FileText,
    ExternalLink,
    AlertCircle,
} from "lucide-react";
import {
    useNixOS,
    useNixOSGenerations,
    useGenerationDiff,
    useSwitchGeneration,
    useRollback,
    useFlakeInfo,
} from "@/hooks/useNixOS";
import type { NixOSGeneration, PackageDiffItem } from "@/types/api";

interface Props {
    open: boolean;
    onClose: () => void;
    onOpenRebuildModal?: () => void;
}

export function GenerationsDrawer({ open, onClose, onOpenRebuildModal }: Props) {
    const [activeTab, setActiveTab] = useState<"generations" | "diff" | "flake">("generations");

    const { data: nixosStatus } = useNixOS();
    const { data: genData, isLoading: loadingGens, refetch: refetchGens } = useNixOSGenerations();
    const { data: flakeInfo, isLoading: loadingFlake, refetch: refetchFlake } = useFlakeInfo();

    const switchGen = useSwitchGeneration();
    const rollback = useRollback();

    // Diff tab state
    const currentGenNum = nixosStatus?.current_generation ?? 1;
    const [diffToGen, setDiffToGen] = useState<number>(currentGenNum);
    const [diffFromGen, setDiffFromGen] = useState<number>(Math.max(1, currentGenNum - 1));
    const [diffSearch, setDiffSearch] = useState("");
    const [showRawDiff, setShowRawDiff] = useState(false);

    // Generation list search
    const [genSearch, setGenSearch] = useState("");

    // Flake search
    const [flakeSearch, setFlakeSearch] = useState("");

    // Feedback message
    const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

    const { data: diffData, isLoading: loadingDiff, refetch: refetchDiff } = useGenerationDiff(diffFromGen, diffToGen);

    if (!open) return null;

    const generations = genData?.generations ?? [];

    const handleSwitch = (genNum: number) => {
        setFeedback(null);
        if (!confirm(`Sistem jenerasyon #${genNum} seviyesine geçirilecek. Devam edilsin mi?`)) {
            return;
        }

        switchGen.mutate(
            { generation: genNum },
            {
                onSuccess: () => {
                    setFeedback({ ok: true, msg: `Sistem başarıyla Jenerasyon #${genNum} seviyesine geçirildi.` });
                    refetchGens();
                },
                onError: (err) => {
                    setFeedback({ ok: false, msg: err.message ?? "Jenerasyon geçişi başarısız oldu." });
                },
            }
        );
    };

    const handleRollback = () => {
        setFeedback(null);
        if (!confirm("Önceki jenerasyona geri dönülecek (Rollback). Onaylıyor musunuz?")) {
            return;
        }

        rollback.mutate(undefined, {
            onSuccess: (res) => {
                setFeedback({ ok: true, msg: `Rollback tamamlandı → Yeni aktif jenerasyon: #${res.target_generation || res.current_generation}` });
                refetchGens();
            },
            onError: (err) => {
                setFeedback({ ok: false, msg: err.message ?? "Rollback işlemi başarısız oldu." });
            },
        });
    };

    const handleSelectForDiff = (genNum: number) => {
        setDiffToGen(currentGenNum);
        setDiffFromGen(genNum);
        setActiveTab("diff");
    };

    // Filter generations
    const filteredGens = generations.filter((g) => {
        if (!genSearch) return true;
        const q = genSearch.toLowerCase();
        return (
            String(g.number).includes(q) ||
            (g.nixos_version && g.nixos_version.toLowerCase().includes(q)) ||
            (g.kernel_version && g.kernel_version.toLowerCase().includes(q)) ||
            (g.configuration_revision && g.configuration_revision.toLowerCase().includes(q))
        );
    });

    // Filter diff items
    const filteredDiffItems = (diffData?.items ?? []).filter((item: PackageDiffItem) => {
        if (!diffSearch) return true;
        const q = diffSearch.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.raw.toLowerCase().includes(q);
    });

    // Filter flake inputs
    const filteredFlakeInputs = (flakeInfo?.inputs ?? []).filter((inp) => {
        if (!flakeSearch) return true;
        const q = flakeSearch.toLowerCase();
        return (
            inp.name.toLowerCase().includes(q) ||
            (inp.owner && inp.owner.toLowerCase().includes(q)) ||
            (inp.repo && inp.repo.toLowerCase().includes(q)) ||
            (inp.ref && inp.ref.toLowerCase().includes(q))
        );
    });

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in">
            {/* Drawer Container */}
            <div className="flex h-full w-full max-w-3xl flex-col border-l border-border bg-card shadow-2xl transition-transform animate-in slide-in-from-right duration-200">
                {/* ── Header ── */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-semibold">NixOS Jenerasyon & Flake Yönetimi</h2>
                                <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[11px] font-bold text-cyan-500 border border-cyan-500/30">
                                    Aktif: #{currentGenNum}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Sistem jenerasyonları, paket diff analizi ve bildirimsel flake durumu
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {onOpenRebuildModal && (
                            <button
                                onClick={onOpenRebuildModal}
                                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                Rebuild Başlat
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* ── Feedback Message ── */}
                {feedback && (
                    <div className="mx-6 mt-4 flex items-center justify-between gap-2 rounded-lg border p-3 text-xs animate-in fade-in">
                        <div className="flex items-center gap-2">
                            {feedback.ok ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            ) : (
                                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                            )}
                            <span className={feedback.ok ? "text-emerald-500" : "text-destructive font-medium"}>
                                {feedback.msg}
                            </span>
                        </div>
                        <button
                            onClick={() => setFeedback(null)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                {/* ── Tab Navigation ── */}
                <div className="flex border-b border-border px-6">
                    <button
                        onClick={() => setActiveTab("generations")}
                        className={`flex items-center gap-2 border-b-2 py-3 px-1 text-xs font-medium transition-colors ${
                            activeTab === "generations"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Layers className="h-4 w-4" />
                        Jenerasyonlar ({generations.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("diff")}
                        className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-medium transition-colors ${
                            activeTab === "diff"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <ArrowUpDown className="h-4 w-4" />
                        Paket Farkları (Diff)
                        {diffData?.summary && (
                            <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-semibold text-foreground">
                                {diffData.summary.total_changes}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("flake")}
                        className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-medium transition-colors ${
                            activeTab === "flake"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <GitBranch className="h-4 w-4" />
                        Flake Kilit & Girdileri ({flakeInfo?.total_inputs ?? 0})
                    </button>
                </div>

                {/* ── Content Body ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* ══════════════════════ TAB 1: GENERATIONS ══════════════════════ */}
                    {activeTab === "generations" && (
                        <div className="space-y-4">
                            {/* Actions & Search Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Jenerasyon, çekirdek veya commit ara…"
                                        value={genSearch}
                                        onChange={(e) => setGenSearch(e.target.value)}
                                        className="w-full rounded-lg border border-border bg-background/50 pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleRollback}
                                        disabled={rollback.isPending || generations.length < 2}
                                        className="flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-400 hover:bg-orange-500/20 disabled:opacity-40 transition-colors"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        {rollback.isPending ? "Rollback Yapılıyor…" : "Hızlı Rollback"}
                                    </button>
                                    <button
                                        onClick={() => refetchGens()}
                                        disabled={loadingGens}
                                        className="rounded-lg border border-border bg-background p-2 text-muted-foreground hover:text-foreground transition-colors"
                                        title="Yenile"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${loadingGens ? "animate-spin" : ""}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Generations Timeline List */}
                            {loadingGens ? (
                                <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin text-primary" />
                                    Jenerasyonlar taranıyor…
                                </div>
                            ) : filteredGens.length === 0 ? (
                                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                                    Eşleşen jenerasyon bulunamadı.
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {filteredGens.map((gen) => {
                                        const isCurrent = gen.current || gen.number === currentGenNum;
                                        return (
                                            <div
                                                key={gen.number}
                                                className={`rounded-xl border p-4 transition-all ${
                                                    isCurrent
                                                        ? "border-cyan-500/40 bg-cyan-500/5 shadow-xs"
                                                        : "border-border/60 bg-background/40 hover:border-border hover:bg-background/80"
                                                }`}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    {/* Left info */}
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`rounded-md px-2 py-0.5 text-xs font-bold font-mono ${
                                                                    isCurrent
                                                                        ? "bg-cyan-500 text-cyan-950"
                                                                        : "bg-muted text-foreground"
                                                                }`}
                                                            >
                                                                Gen #{gen.number}
                                                            </span>

                                                            {isCurrent && (
                                                                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 border border-emerald-500/20">
                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                    Aktif Sistem
                                                                </span>
                                                            )}

                                                            {gen.configuration_revision && (
                                                                <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                                                                    rev:{gen.configuration_revision}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {gen.date_formatted || "Bilinmiyor"}
                                                            </span>
                                                            {gen.kernel_version && (
                                                                <span className="flex items-center gap-1">
                                                                    <Cpu className="h-3 w-3" />
                                                                    {gen.kernel_version}
                                                                </span>
                                                            )}
                                                            {gen.nixos_version && (
                                                                <span className="font-mono text-[11px]">
                                                                    {gen.nixos_version}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <p className="text-[10px] font-mono text-muted-foreground/60 truncate max-w-lg">
                                                            {gen.store_path}
                                                        </p>
                                                    </div>

                                                    {/* Right actions */}
                                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                                        <button
                                                            onClick={() => handleSelectForDiff(gen.number)}
                                                            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                                            title="Aktif jenerasyon ile farkları göster"
                                                        >
                                                            <ArrowUpDown className="h-3 w-3" />
                                                            Diff
                                                        </button>

                                                        {!isCurrent && (
                                                            <button
                                                                onClick={() => handleSwitch(gen.number)}
                                                                disabled={switchGen.isPending}
                                                                className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-40 transition-all"
                                                            >
                                                                {switchGen.isPending && switchGen.variables?.generation === gen.number ? (
                                                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                                ) : (
                                                                    <ArrowRight className="h-3 w-3" />
                                                                )}
                                                                Geçiş Yap
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══════════════════════ TAB 2: CLOSURE DIFF ══════════════════════ */}
                    {activeTab === "diff" && (
                        <div className="space-y-4">
                            {/* Selector Header */}
                            <div className="rounded-xl border border-border bg-background/50 p-4 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                                                Başlangıç (From)
                                            </label>
                                            <select
                                                value={diffFromGen}
                                                onChange={(e) => setDiffFromGen(parseInt(e.target.value, 10))}
                                                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                                            >
                                                {generations.map((g) => (
                                                    <option key={g.number} value={g.number}>
                                                        Gen #{g.number} ({g.date_formatted?.split(" ")[0]})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <ArrowRight className="h-4 w-4 text-muted-foreground mt-4" />

                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                                                Hedef (To)
                                            </label>
                                            <select
                                                value={diffToGen}
                                                onChange={(e) => setDiffToGen(parseInt(e.target.value, 10))}
                                                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                                            >
                                                {generations.map((g) => (
                                                    <option key={g.number} value={g.number}>
                                                        Gen #{g.number} {g.current || g.number === currentGenNum ? "(Aktif)" : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                        <button
                                            onClick={() => setShowRawDiff((v) => !v)}
                                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                                showRawDiff
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                            {showRawDiff ? "Yapısal Görünüm" : "Ham Diff"}
                                        </button>
                                        <button
                                            onClick={() => refetchDiff()}
                                            disabled={loadingDiff}
                                            className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <RefreshCw className={`h-4 w-4 ${loadingDiff ? "animate-spin" : ""}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Summary Badges */}
                                {diffData?.summary && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/50 text-xs">
                                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-center">
                                            <span className="text-[10px] font-semibold text-emerald-500 uppercase">Eklenen</span>
                                            <p className="font-bold text-emerald-500 text-sm">+{diffData.summary.added_count}</p>
                                        </div>
                                        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2 text-center">
                                            <span className="text-[10px] font-semibold text-destructive uppercase">Kaldırılan</span>
                                            <p className="font-bold text-destructive text-sm">-{diffData.summary.removed_count}</p>
                                        </div>
                                        <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-2 text-center">
                                            <span className="text-[10px] font-semibold text-cyan-500 uppercase">Güncellenen</span>
                                            <p className="font-bold text-cyan-500 text-sm">~{diffData.summary.updated_count}</p>
                                        </div>
                                        <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-2 text-center">
                                            <span className="text-[10px] font-semibold text-purple-400 uppercase">Yeniden Derlenen</span>
                                            <p className="font-bold text-purple-400 text-sm">{diffData.summary.rebuilt_count}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Search bar inside diff */}
                            {!showRawDiff && (
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Değişen paketler arasında ara…"
                                        value={diffSearch}
                                        onChange={(e) => setDiffSearch(e.target.value)}
                                        className="w-full rounded-lg border border-border bg-background/50 pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                            )}

                            {/* Diff Content */}
                            {loadingDiff ? (
                                <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin text-primary" />
                                    Paket farkları hesaplanıyor (`nix store diff-closures`)…
                                </div>
                            ) : showRawDiff ? (
                                <pre className="max-h-96 overflow-auto rounded-xl border border-border bg-black/80 p-4 font-mono text-[11px] text-emerald-400">
                                    {diffData?.raw_output || "Fark bulunamadı."}
                                </pre>
                            ) : filteredDiffItems.length === 0 ? (
                                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                                    {diffData?.items?.length === 0
                                        ? "Bu iki jenerasyon arasında paket kapanış farkı (closure diff) bulunamadı."
                                        : "Arama kriterine uygun paket bulunamadı."}
                                </div>
                            ) : (
                                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                                    {filteredDiffItems.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-xs hover:bg-background/80 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                {item.change_type === "added" && (
                                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-500/15 text-emerald-500">
                                                        <Plus className="h-3.5 w-3.5" />
                                                    </span>
                                                )}
                                                {item.change_type === "removed" && (
                                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-destructive/15 text-destructive">
                                                        <Minus className="h-3.5 w-3.5" />
                                                    </span>
                                                )}
                                                {item.change_type === "updated" && (
                                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-cyan-500/15 text-cyan-500">
                                                        <RefreshCw className="h-3 w-3" />
                                                    </span>
                                                )}
                                                {item.change_type === "rebuilt" && (
                                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-purple-500/15 text-purple-400">
                                                        <Sparkles className="h-3 w-3" />
                                                    </span>
                                                )}

                                                <span className="font-medium font-mono truncate">{item.name}</span>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono">
                                                {item.old_version && item.new_version ? (
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <span>{item.old_version}</span>
                                                        <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                                                        <span className="text-foreground font-semibold">{item.new_version}</span>
                                                    </div>
                                                ) : item.new_version ? (
                                                    <span className="text-emerald-500 font-semibold">{item.new_version}</span>
                                                ) : item.old_version ? (
                                                    <span className="text-destructive font-semibold line-through">{item.old_version}</span>
                                                ) : null}

                                                {item.size_delta && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                                        item.size_delta.startsWith("-")
                                                            ? "bg-destructive/10 text-destructive"
                                                            : "bg-muted text-muted-foreground"
                                                    }`}>
                                                        {item.size_delta}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══════════════════════ TAB 3: FLAKE INPUTS ══════════════════════ */}
                    {activeTab === "flake" && (
                        <div className="space-y-4">
                            {/* Flake Overview Header */}
                            <div className="rounded-xl border border-border bg-background/50 p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold">Flake Lock Metadata</p>
                                        <p className="font-mono text-[11px] text-muted-foreground truncate">
                                            {flakeInfo?.flake_path || "Varsayılan Flake Dizini"}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-500 border border-emerald-500/20">
                                            Lock Format v{flakeInfo?.lock_version ?? 7}
                                        </span>
                                        <button
                                            onClick={() => refetchFlake()}
                                            disabled={loadingFlake}
                                            className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <RefreshCw className={`h-4 w-4 ${loadingFlake ? "animate-spin" : ""}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Flake girdisi ara (nixpkgs, home-manager, sops-nix…)…"
                                    value={flakeSearch}
                                    onChange={(e) => setFlakeSearch(e.target.value)}
                                    className="w-full rounded-lg border border-border bg-background/50 pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            {/* Inputs Table */}
                            {loadingFlake ? (
                                <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin text-primary" />
                                    flake.lock ayrıştırılıyor…
                                </div>
                            ) : filteredFlakeInputs.length === 0 ? (
                                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                                    Girdi bulunamadı.
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                    {filteredFlakeInputs.map((input) => (
                                        <div
                                            key={input.name}
                                            className="rounded-lg border border-border/50 bg-background/40 p-3 text-xs hover:bg-background/80 transition-colors"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <GitBranch className="h-4 w-4 text-primary shrink-0" />
                                                    <span className="font-semibold text-foreground font-mono">{input.name}</span>
                                                    {input.ref && (
                                                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
                                                            {input.ref}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 text-[11px]">
                                                    <span className="text-muted-foreground">
                                                        {input.last_modified_relative || "bilinmiyor"}
                                                    </span>
                                                    {input.short_revision && (
                                                        <span className="font-mono bg-muted/80 px-1.5 py-0.5 rounded text-[10px] text-primary">
                                                            {input.short_revision}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {input.url && (
                                                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                                                    <a
                                                        href={input.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 hover:text-primary transition-colors truncate max-w-md"
                                                    >
                                                        <ExternalLink className="h-3 w-3 shrink-0" />
                                                        <span className="truncate">{input.url}</span>
                                                    </a>
                                                    {input.owner && input.repo && (
                                                        <span className="font-mono text-[10px]">
                                                            {input.owner}/{input.repo}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
