"use client";

import {
    Wifi, WifiOff,
    Bluetooth, BluetoothOff,
    Shield, ShieldAlert,
    Volume2, VolumeX,
    Mic, MicOff,
    SunMedium, Moon,
    Lock, Zap,
} from "lucide-react";
import { useWifi, useBluetooth } from "@/hooks/useMetrics";
import { useAudio } from "@/hooks/useAudio";
import { useDisplay } from "@/hooks/useDisplay";
import { useSecurity } from "@/hooks/useSecurity";
import { useHardware } from "@/hooks/useHardware";

export function QuickTogglesBar() {
    const { data: wifi, toggle: toggleWifi } = useWifi();
    const { data: bt, toggle: toggleBt } = useBluetooth();
    const { data: audio, setMute: setAudioMute } = useAudio();
    const { data: display, setNightLight, lockSession } = useDisplay();
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
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <p className="mb-2.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Hızlı Kontroller
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {/* 1. WiFi Toggle */}
                <button
                    onClick={() => toggleWifi.mutate()}
                    disabled={toggleWifi.isPending}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-2.5 text-center transition-all ${
                        isWifiOn
                            ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                            : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                    }`}
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 shadow-xs">
                        {isWifiOn ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                        <p className="text-xs font-semibold leading-tight">WiFi</p>
                        <p className="text-[10px] truncate max-w-[80px] opacity-80">
                            {isWifiOn ? (wifi?.ssid ?? "Açık") : "Kapalı"}
                        </p>
                    </div>
                </button>

                {/* 2. Bluetooth Toggle */}
                <button
                    onClick={() => toggleBt.mutate()}
                    disabled={toggleBt.isPending}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-2.5 text-center transition-all ${
                        isBtOn
                            ? "border-blue-500/40 bg-blue-500/10 text-blue-500 hover:bg-blue-500/15"
                            : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                    }`}
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 shadow-xs">
                        {isBtOn ? <Bluetooth className="h-3.5 w-3.5" /> : <BluetoothOff className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                        <p className="text-xs font-semibold leading-tight">Bluetooth</p>
                        <p className="text-[10px] truncate max-w-[80px] opacity-80">
                            {isBtOn ? `${bt?.devices?.filter(d => d.connected).length ?? 0} bağlı` : "Kapalı"}
                        </p>
                    </div>
                </button>

                {/* 3. VPN / Tailscale Toggle */}
                <button
                    onClick={() => toggleVPN.mutate()}
                    disabled={toggleVPN.isPending}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-2.5 text-center transition-all ${
                        isVpnOn
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15"
                            : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                    }`}
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 shadow-xs">
                        {isVpnOn ? <Shield className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                        <p className="text-xs font-semibold leading-tight">VPN</p>
                        <p className="text-[10px] truncate max-w-[80px] opacity-80">
                            {isVpnOn ? "Tailscale Aktif" : "Bağlı Değil"}
                        </p>
                    </div>
                </button>

                {/* 4. Audio Mute Toggle */}
                <button
                    onClick={() => setAudioMute.mutate({ target: "sink", muted: !isAudioMuted })}
                    disabled={setAudioMute.isPending}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-2.5 text-center transition-all ${
                        isAudioMuted
                            ? "border-orange-500/40 bg-orange-500/10 text-orange-500 hover:bg-orange-500/15"
                            : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                    }`}
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 shadow-xs">
                        {isAudioMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                        <p className="text-xs font-semibold leading-tight">Ses</p>
                        <p className="text-[10px] opacity-80">
                            {isAudioMuted ? "Sessiz" : `%${audio?.output_volume ?? 70}`}
                        </p>
                    </div>
                </button>

                {/* 5. Mic Mute Toggle */}
                <button
                    onClick={() => setAudioMute.mutate({ target: "source", muted: !isMicMuted })}
                    disabled={setAudioMute.isPending}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-2.5 text-center transition-all ${
                        isMicMuted
                            ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
                            : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                    }`}
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 shadow-xs">
                        {isMicMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                        <p className="text-xs font-semibold leading-tight">Mikrofon</p>
                        <p className="text-[10px] opacity-80">
                            {isMicMuted ? "Kapalı" : "Açık"}
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
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-2.5 text-center transition-all ${
                        isNightLightOn
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/15"
                            : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                    }`}
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 shadow-xs">
                        {isNightLightOn ? <Moon className="h-3.5 w-3.5" /> : <SunMedium className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                        <p className="text-xs font-semibold leading-tight">Gece Işığı</p>
                        <p className="text-[10px] opacity-80">
                            {isNightLightOn ? `${display?.night_light?.temperature ?? 4500}K` : "Kapalı"}
                        </p>
                    </div>
                </button>

                {/* 7. Power Profile Toggle */}
                <button
                    onClick={nextProfile}
                    disabled={setPowerProfile.isPending}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-background/50 p-2.5 text-center text-muted-foreground transition-all hover:bg-muted"
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 shadow-xs text-primary">
                        <Zap className="h-3.5 w-3.5" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold leading-tight">Güç Modu</p>
                        <p className="text-[10px] capitalize opacity-80">
                            {currentProfile}
                        </p>
                    </div>
                </button>
            </div>
        </div>
    );
}
