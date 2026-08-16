"use client";

import React from "react";
import {
    Wifi, WifiOff,
    Bluetooth, BluetoothOff,
    Shield, ShieldAlert,
    Volume2, VolumeX,
    Mic, MicOff,
    SunMedium, Moon,
    Zap,
} from "lucide-react";
import { useWifi, useBluetooth } from "@/hooks/useMetrics";
import { useAudio } from "@/hooks/useAudio";
import { useDisplay } from "@/hooks/useDisplay";
import { useSecurity } from "@/hooks/useSecurity";
import { useHardware } from "@/hooks/useHardware";
import { cn } from "@/lib/utils";

export function QuickTogglesBar() {
    const { data: wifi, toggle: toggleWifi } = useWifi();
    const { data: bt, toggle: toggleBt } = useBluetooth();
    const { data: audio, setMute: setAudioMute } = useAudio();
    const { data: display, setNightLight } = useDisplay();
    const { data: security, toggleVPN } = useSecurity();
    const { data: hardware, setPowerProfile } = useHardware();

    const isWifiOn = wifi?.enabled ?? false;
    const isBtOn = bt?.enabled ?? false;
    const isVpnOn = security?.vpn?.active ?? false;
    const isAudioMuted = audio?.output_muted ?? false;
    const isMicMuted = audio?.input_muted ?? false;
    const isNightLightOn = display?.night_light?.enabled ?? false;
    const currentProfile = hardware?.power_profile ?? "balanced";

    const nextProfile = () => {
        if (currentProfile === "powersave") setPowerProfile.mutate("balanced");
        else if (currentProfile === "balanced") setPowerProfile.mutate("performance");
        else setPowerProfile.mutate("powersave");
    };

    return (
        <div className="instrument-card p-4 sm:p-5 space-y-3 font-sans">
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Quick Controls & Peripheral Toggles
                </p>
                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                    Hardware Bus
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {/* 1. WiFi Toggle */}
                <button
                    onClick={() => toggleWifi.mutate()}
                    disabled={toggleWifi.isPending}
                    className={cn(
                        "braun-toggle",
                        isWifiOn ? "braun-toggle-active" : "braun-toggle-inactive"
                    )}
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 shadow-xs border border-border/40">
                        {isWifiOn ? (
                            <Wifi className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                        ) : (
                            <WifiOff className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                        )}
                    </div>
                    <div className="w-full min-w-0">
                        <p className="text-xs font-semibold leading-tight text-foreground whitespace-nowrap truncate">Wi-Fi</p>
                        <p className="text-[10px] truncate font-mono text-muted-foreground">
                            {isWifiOn ? (wifi?.ssid ?? "Connected") : "Disabled"}
                        </p>
                    </div>
                </button>

                {/* 2. Bluetooth Toggle */}
                <button
                    onClick={() => toggleBt.mutate()}
                    disabled={toggleBt.isPending}
                    className={cn(
                        "braun-toggle",
                        isBtOn ? "braun-toggle-active" : "braun-toggle-inactive"
                    )}
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 shadow-xs border border-border/40">
                        {isBtOn ? (
                            <Bluetooth className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                        ) : (
                            <BluetoothOff className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                        )}
                    </div>
                    <div className="w-full min-w-0">
                        <p className="text-xs font-semibold leading-tight text-foreground whitespace-nowrap truncate">Bluetooth</p>
                        <p className="text-[10px] truncate font-mono text-muted-foreground">
                            {isBtOn ? `${bt?.devices?.filter(d => d.connected).length ?? 0} paired` : "Disabled"}
                        </p>
                    </div>
                </button>

                {/* 3. VPN / Tailscale Toggle */}
                <button
                    onClick={() => toggleVPN.mutate()}
                    disabled={toggleVPN.isPending}
                    className={cn(
                        "braun-toggle",
                        isVpnOn ? "braun-toggle-active" : "braun-toggle-inactive"
                    )}
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 shadow-xs border border-border/40">
                        {isVpnOn ? (
                            <Shield className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                        ) : (
                            <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                        )}
                    </div>
                    <div className="w-full min-w-0">
                        <p className="text-xs font-semibold leading-tight text-foreground whitespace-nowrap truncate">Tailscale VPN</p>
                        <p className="text-[10px] truncate font-mono text-muted-foreground">
                            {isVpnOn ? "Active Mesh" : "Offline"}
                        </p>
                    </div>
                </button>

                {/* 4. Audio Mute Toggle */}
                <button
                    onClick={() => setAudioMute.mutate({ target: "sink", muted: !isAudioMuted })}
                    disabled={setAudioMute.isPending}
                    className={cn(
                        "braun-toggle",
                        isAudioMuted ? "border-destructive/40 bg-destructive/10 text-destructive" : "braun-toggle-inactive"
                    )}
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 shadow-xs border border-border/40">
                        {isAudioMuted ? (
                            <VolumeX className="h-3.5 w-3.5 text-destructive" strokeWidth={1.75} />
                        ) : (
                            <Volume2 className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
                        )}
                    </div>
                    <div className="w-full min-w-0">
                        <p className="text-xs font-semibold leading-tight text-foreground whitespace-nowrap truncate">Audio Output</p>
                        <p className="text-[10px] font-mono text-muted-foreground whitespace-nowrap truncate">
                            {isAudioMuted ? "Muted" : `${audio?.output_volume ?? 70}%`}
                        </p>
                    </div>
                </button>

                {/* 5. Mic Mute Toggle */}
                <button
                    onClick={() => setAudioMute.mutate({ target: "source", muted: !isMicMuted })}
                    disabled={setAudioMute.isPending}
                    className={cn(
                        "braun-toggle",
                        isMicMuted ? "border-destructive/40 bg-destructive/10 text-destructive" : "braun-toggle-inactive"
                    )}
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 shadow-xs border border-border/40">
                        {isMicMuted ? (
                            <MicOff className="h-3.5 w-3.5 text-destructive" strokeWidth={1.75} />
                        ) : (
                            <Mic className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
                        )}
                    </div>
                    <div className="w-full min-w-0">
                        <p className="text-xs font-semibold leading-tight text-foreground whitespace-nowrap truncate">Microphone</p>
                        <p className="text-[10px] font-mono text-muted-foreground whitespace-nowrap truncate">
                            {isMicMuted ? "Muted" : "Active"}
                        </p>
                    </div>
                </button>

                {/* 6. Night Light Toggle */}
                <button
                    onClick={() =>
                        setNightLight.mutate({
                            enabled: !isNightLightOn,
                            temperature: display?.night_light?.temperature ?? 4500,
                        })
                    }
                    disabled={setNightLight.isPending}
                    className={cn(
                        "braun-toggle",
                        isNightLightOn ? "braun-toggle-active" : "braun-toggle-inactive"
                    )}
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 shadow-xs border border-border/40">
                        {isNightLightOn ? (
                            <Moon className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                        ) : (
                            <SunMedium className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                        )}
                    </div>
                    <div className="w-full min-w-0">
                        <p className="text-xs font-semibold leading-tight text-foreground whitespace-nowrap truncate">Night Light</p>
                        <p className="text-[10px] font-mono text-muted-foreground whitespace-nowrap truncate">
                            {isNightLightOn ? `${display?.night_light?.temperature ?? 4500}K` : "Off"}
                        </p>
                    </div>
                </button>

                {/* 7. Power Profile Toggle */}
                <button
                    onClick={nextProfile}
                    disabled={setPowerProfile.isPending}
                    className="braun-toggle braun-toggle-inactive hover:border-primary/40"
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 shadow-xs border border-border/40 text-primary">
                        <Zap className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </div>
                    <div className="w-full min-w-0">
                        <p className="text-xs font-semibold leading-tight text-foreground whitespace-nowrap truncate">Power Profile</p>
                        <p className="text-[10px] capitalize font-mono text-primary font-semibold whitespace-nowrap truncate">
                            {currentProfile}
                        </p>
                    </div>
                </button>
            </div>
        </div>
    );
}
