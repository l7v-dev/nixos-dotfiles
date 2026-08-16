"use client";

import { useState } from "react";
import {
    SunMedium,
    Moon, Lock,
    Monitor,
} from "lucide-react";
import { useDisplay } from "@/hooks/useDisplay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DisplayCard() {
    const { data: display, setBrightness, setNightLight, lockSession, isLoading } = useDisplay();
    const [localBrightness, setLocalBrightness] = useState<number | null>(null);

    const brightness = localBrightness !== null ? localBrightness : (display?.brightness_pct ?? 100);
    const nightLightOn = display?.night_light?.enabled ?? false;
    const nightLightTemp = display?.night_light?.temperature ?? 4500;

    const handleBrightnessChange = (v: number) => {
        setLocalBrightness(v);
    };

    const handleBrightnessCommit = (v: number) => {
        setLocalBrightness(null);
        setBrightness.mutate(v);
    };

    return (
        <div className="instrument-card p-4 sm:p-5 space-y-4">
            {/* ── 1. Header & Status ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
                        <Monitor className="h-4 w-4" strokeWidth={1.6} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold leading-tight text-foreground whitespace-nowrap">Display & Night Light</p>
                        <p className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                            {isLoading ? "Reading display…" : (display?.device_name || "Wayland Compositor")}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant={nightLightOn ? "warning" : "muted"} className="whitespace-nowrap font-mono text-[10px]">
                        {nightLightOn ? `${nightLightTemp}K Warm` : "Standard"}
                    </Badge>
                    <Button
                        size="xs"
                        variant="outline"
                        onClick={() => lockSession.mutate()}
                        disabled={lockSession.isPending}
                        className="gap-1 text-muted-foreground hover:text-foreground h-7 text-xs"
                    >
                        <Lock className="h-3 w-3" strokeWidth={1.5} />
                        <span>Lock</span>
                    </Button>
                </div>
            </div>

            {/* ── 2. Brightness Slider ── */}
            <div className="space-y-2 rounded-lg border border-border/60 bg-background/50 p-3">
                <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <SunMedium className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
                        Backlight Luminance
                    </span>
                    <span className="font-mono text-xs font-semibold tnum text-foreground">
                        {brightness}%
                    </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                    <input
                        type="range"
                        min="5"
                        max="100"
                        value={brightness}
                        onChange={(e) => handleBrightnessChange(parseInt(e.target.value, 10))}
                        onMouseUp={(e) => handleBrightnessCommit(parseInt((e.target as HTMLInputElement).value, 10))}
                        onTouchEnd={(e) => handleBrightnessCommit(parseInt((e.target as HTMLInputElement).value, 10))}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                    />
                </div>
            </div>

            {/* ── 3. Night Light Color Temperature ── */}
            <div className="space-y-2 rounded-lg border border-border/60 bg-background/50 p-3">
                <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <Moon className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
                        Night Light / Blue Filter
                    </span>
                    <button
                        onClick={() => setNightLight.mutate({ enabled: !nightLightOn, temperature: nightLightTemp })}
                        className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                            nightLightOn
                                ? "bg-primary/15 text-primary border border-primary/30 font-semibold"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60"
                        }`}
                    >
                        <span>{nightLightOn ? "Disable" : "Enable"}</span>
                    </button>
                </div>

                {nightLightOn && (
                    <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground font-mono">
                        <span>Color Temperature:</span>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold tnum">{nightLightTemp}K</span>
                    </div>
                )}
            </div>
        </div>
    );
}
