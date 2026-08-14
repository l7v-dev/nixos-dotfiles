"use client";

import { useState } from "react";
import {
    Sun, SunMedium,
    Moon, Lock,
    Monitor, Sparkles,
} from "lucide-react";
import { useDisplay } from "@/hooks/useDisplay";

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
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                        <Monitor className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Ekran ve Görsel</p>
                        <p className="text-[11px] text-muted-foreground">
                            {display?.device_name ? `Aygıt: ${display.device_name}` : "Parlaklık & Gece Işığı"}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => lockSession.mutate()}
                    disabled={lockSession.isPending}
                    title="Oturumu Kilitle"
                    className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                    <Lock className="h-3 w-3" />
                    Kilitle
                </button>
            </div>

            {/* Brightness Section */}
            <div className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3.5">
                <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium">
                        <SunMedium className="h-3.5 w-3.5 text-amber-500" />
                        Ekran Parlaklığı
                    </span>
                    <span className="font-mono text-xs font-semibold tabular-nums">
                        {brightness}%
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <Sun className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                        type="range"
                        min="1"
                        max="100"
                        value={brightness}
                        onChange={(e) => handleBrightnessChange(parseInt(e.target.value, 10))}
                        onMouseUp={(e) => handleBrightnessCommit(parseInt((e.target as HTMLInputElement).value, 10))}
                        onTouchEnd={(e) => handleBrightnessCommit(parseInt((e.target as HTMLInputElement).value, 10))}
                        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-amber-500"
                    />
                    <SunMedium className="h-4 w-4 text-amber-500 shrink-0" />
                </div>
            </div>

            {/* Night Light Section */}
            <div className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3.5">
                <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium">
                        <Moon className="h-3.5 w-3.5 text-indigo-400" />
                        Gece Işığı (Mavi Işık Filtresi)
                    </span>
                    <button
                        onClick={() => setNightLight.mutate({ enabled: !nightLightOn, temperature: nightLightTemp })}
                        className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                            nightLightOn
                                ? "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                    >
                        {nightLightOn ? "Devre Dışı Bırak" : "Etkinleştir"}
                    </button>
                </div>

                {nightLightOn && (
                    <div className="pt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Renk Sıcaklığı</span>
                            <span className="font-mono font-medium text-foreground">{nightLightTemp} K</span>
                        </div>
                        <input
                            type="range"
                            min="2500"
                            max="6500"
                            step="100"
                            value={nightLightTemp}
                            onChange={(e) => setNightLight.mutate({ enabled: true, temperature: parseInt(e.target.value, 10) })}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-amber-600 via-amber-300 to-blue-300 accent-amber-500"
                        />
                        <div className="flex justify-between text-[9px] text-muted-foreground/70">
                            <span>2500K (Çok Sıcak)</span>
                            <span>4500K (Dengeli)</span>
                            <span>6500K (Doğal)</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
