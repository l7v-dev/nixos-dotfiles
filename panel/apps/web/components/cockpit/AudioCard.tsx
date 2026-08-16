"use client";

import { useState } from "react";
import {
    Volume2, VolumeX, Volume1,
    Mic, MicOff,
    Headphones, Speaker,
} from "lucide-react";
import { useAudio } from "@/hooks/useAudio";
import { Badge } from "@/components/ui/badge";

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
        <div className="instrument-card p-4 sm:p-5 space-y-4">
            {/* ── 1. Header & Status ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
                        <Volume2 className="h-4 w-4" strokeWidth={1.6} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold leading-tight text-foreground whitespace-nowrap">Audio & PipeWire</p>
                        <p className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                            {isLoading ? "Connecting to daemon…" : "WirePlumber Session"}
                        </p>
                    </div>
                </div>

                <Badge variant={isOutMuted ? "destructive" : "info"} className="whitespace-nowrap font-mono text-[10px]">
                    {isOutMuted ? "Muted" : `${outVol}% Output`}
                </Badge>
            </div>

            {/* ── 2. Output Slider Section ── */}
            <div className="space-y-2 rounded-lg border border-border/60 bg-background/50 p-3">
                <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <Speaker className="h-3.5 w-3.5 text-primary" />
                        Speaker / Master Sink
                    </span>
                    <button
                        onClick={() => setMute.mutate({ target: "sink", muted: !isOutMuted })}
                        className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                            isOutMuted
                                ? "bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60"
                        }`}
                    >
                        {isOutMuted ? <VolumeX className="h-3 w-3" /> : <Volume1 className="h-3 w-3" />}
                        <span>{isOutMuted ? "Unmute" : "Mute"}</span>
                    </button>
                </div>

                <div className="flex items-center gap-3 pt-1">
                    <input
                        type="range"
                        min="0"
                        max="150"
                        value={outVol}
                        disabled={isOutMuted}
                        onChange={(e) => handleOutputVolChange(parseInt(e.target.value, 10))}
                        onMouseUp={(e) => handleOutputVolCommit(parseInt((e.target as HTMLInputElement).value, 10))}
                        onTouchEnd={(e) => handleOutputVolCommit(parseInt((e.target as HTMLInputElement).value, 10))}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary disabled:opacity-50"
                    />
                    <span className="w-12 text-right font-mono text-xs font-semibold tnum text-foreground">
                        {outVol}%
                    </span>
                </div>

                {/* Sinks selector */}
                {sinks.length > 1 && (
                    <div className="pt-2 border-t border-border/40">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1 block">
                            Active Output Sink
                        </label>
                        <select
                            value={audio?.default_sink ?? ""}
                            onChange={(e) => setDefaultDevice.mutate({ target: "sink", id: e.target.value })}
                            className="w-full rounded-md border border-border/80 bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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

            {/* ── 3. Input (Microphone) Section ── */}
            <div className="space-y-2 rounded-lg border border-border/60 bg-background/50 p-3">
                <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <Mic className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
                        Microphone Input
                    </span>
                    <button
                        onClick={() => setMute.mutate({ target: "source", muted: !isInMuted })}
                        className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                            isInMuted
                                ? "bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60"
                        }`}
                    >
                        {isInMuted ? <MicOff className="h-3 w-3" strokeWidth={1.5} /> : <Mic className="h-3 w-3" strokeWidth={1.5} />}
                        <span>{isInMuted ? "Unmute" : "Mute"}</span>
                    </button>
                </div>

                <div className="flex items-center gap-3 pt-1">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={inVol}
                        disabled={isInMuted}
                        onChange={(e) => handleInputVolChange(parseInt(e.target.value, 10))}
                        onMouseUp={(e) => handleInputVolCommit(parseInt((e.target as HTMLInputElement).value, 10))}
                        onTouchEnd={(e) => handleInputVolCommit(parseInt((e.target as HTMLInputElement).value, 10))}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary disabled:opacity-50"
                    />
                    <span className="w-12 text-right font-mono text-xs font-semibold tnum text-foreground">
                        {inVol}%
                    </span>
                </div>

                {/* Sources selector */}
                {sources.length > 1 && (
                    <div className="pt-2 border-t border-border/40">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1 block">
                            Active Input Source
                        </label>
                        <select
                            value={audio?.default_source ?? ""}
                            onChange={(e) => setDefaultDevice.mutate({ target: "source", id: e.target.value })}
                            className="w-full rounded-md border border-border/80 bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
