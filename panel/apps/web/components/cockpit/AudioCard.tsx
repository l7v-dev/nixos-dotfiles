"use client";

import { useState } from "react";
import {
    Volume2, VolumeX, Volume1,
    Mic, MicOff,
    Headphones, Speaker,
    Radio,
} from "lucide-react";
import { useAudio } from "@/hooks/useAudio";

export function AudioCard() {
    const { data: audio, setVolume, setMute, setDefaultDevice, isLoading } = useAudio();
    const [localOutputVol, setLocalOutputVol] = useState<number | null>(null);
    const [localInputVol, setLocalInputVol] = useState<number | null>(null);

    const outVol = localOutputVol !== null ? localOutputVol : (audio?.output_volume ?? 70);
    const inVol = localInputVol !== null ? localInputVol : (audio?.input_volume ?? 80);
    const isOutMuted = audio?.output_muted ?? false;
    const isInMuted = audio?.input_muted ?? false;

    const handleOutputVolChange = (v: number) => {
        setLocalOutputVol(v);
    };

    const handleOutputVolCommit = (v: number) => {
        setLocalOutputVol(null);
        setVolume.mutate({ target: "sink", volume: v });
    };

    const handleInputVolChange = (v: number) => {
        setLocalInputVol(v);
    };

    const handleInputVolCommit = (v: number) => {
        setLocalInputVol(null);
        setVolume.mutate({ target: "source", volume: v });
    };

    const sinks = audio?.sinks ?? [];
    const sources = audio?.sources ?? [];

    return (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                        <Volume2 className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Ses ve Medya</p>
                        <p className="text-[11px] text-muted-foreground">
                            {isLoading ? "Yükleniyor…" : "PipeWire & WirePlumber"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        isOutMuted
                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                            : "bg-primary/10 text-primary border border-primary/20"
                    }`}>
                        {isOutMuted ? "Sessiz" : `%${outVol}`}
                    </span>
                </div>
            </div>

            {/* Output (Hoparlör / Kulaklık) Volume Section */}
            <div className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3.5">
                <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium">
                        <Speaker className="h-3.5 w-3.5 text-muted-foreground" />
                        Çıkış Sesi
                    </span>
                    <button
                        onClick={() => setMute.mutate({ target: "sink", muted: !isOutMuted })}
                        className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                            isOutMuted
                                ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                    >
                        {isOutMuted ? <VolumeX className="h-3 w-3" /> : <Volume1 className="h-3 w-3" />}
                        {isOutMuted ? "Sesi Aç" : "Sessize Al"}
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min="0"
                        max="150"
                        value={outVol}
                        disabled={isOutMuted}
                        onChange={(e) => handleOutputVolChange(parseInt(e.target.value, 10))}
                        onMouseUp={(e) => handleOutputVolCommit(parseInt((e.target as HTMLInputElement).value, 10))}
                        onTouchEnd={(e) => handleOutputVolCommit(parseInt((e.target as HTMLInputElement).value, 10))}
                        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary disabled:opacity-50"
                    />
                    <span className="w-12 text-right font-mono text-xs font-semibold tabular-nums">
                        {outVol}%
                    </span>
                </div>

                {/* Output device selector */}
                {sinks.length > 1 && (
                    <div className="pt-1.5 border-t border-border/30">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1 block">
                            Çıkış Aygıtı
                        </label>
                        <select
                            value={audio?.default_sink ?? ""}
                            onChange={(e) => setDefaultDevice.mutate({ target: "sink", id: e.target.value })}
                            className="w-full rounded-md border border-border bg-background px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            {sinks.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.description || s.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Input (Mikrofon) Section */}
            <div className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3.5">
                <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium">
                        <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                        Mikrofon Girişi
                    </span>
                    <button
                        onClick={() => setMute.mutate({ target: "source", muted: !isInMuted })}
                        className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                            isInMuted
                                ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                    >
                        {isInMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                        {isInMuted ? "Mikrofonu Aç" : "Mikrofonu Kapat"}
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={inVol}
                        disabled={isInMuted}
                        onChange={(e) => handleInputVolChange(parseInt(e.target.value, 10))}
                        onMouseUp={(e) => handleInputVolCommit(parseInt((e.target as HTMLInputElement).value, 10))}
                        onTouchEnd={(e) => handleInputVolCommit(parseInt((e.target as HTMLInputElement).value, 10))}
                        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-indigo-500 disabled:opacity-50"
                    />
                    <span className="w-12 text-right font-mono text-xs font-semibold tabular-nums">
                        {inVol}%
                    </span>
                </div>

                {/* Input device selector */}
                {sources.length > 1 && (
                    <div className="pt-1.5 border-t border-border/30">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1 block">
                            Giriş Aygıtı
                        </label>
                        <select
                            value={audio?.default_source ?? ""}
                            onChange={(e) => setDefaultDevice.mutate({ target: "source", id: e.target.value })}
                            className="w-full rounded-md border border-border bg-background px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            {sources.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.description || s.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
}
