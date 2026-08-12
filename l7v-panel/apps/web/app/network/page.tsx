"use client";

import { useWifi, useBluetooth } from "@/hooks/useMetrics";
import { Wifi, WifiOff, Bluetooth, BluetoothOff } from "lucide-react";

export default function NetworkPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-xl font-semibold">Network &amp; Bluetooth</h1>
            <div className="grid gap-4 md:grid-cols-2">
                <WifiCard />
                <BluetoothCard />
            </div>
        </div>
    );
}

function WifiCard() {
    const { data, isLoading, toggle } = useWifi();

    if (isLoading) return <Card title="WiFi">Loading…</Card>;

    return (
        <Card title="WiFi">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {data?.enabled ? (
                        <Wifi className="h-5 w-5 text-green-500" />
                    ) : (
                        <WifiOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">{data?.enabled ? "Enabled" : "Disabled"}</span>
                </div>
                <Toggle
                    checked={data?.enabled ?? false}
                    disabled={toggle.isPending}
                    onChange={() => toggle.mutate()}
                />
            </div>
            {data?.ssid && (
                <div className="mt-3 space-y-1 text-sm">
                    <p><span className="text-muted-foreground">SSID:</span> {data.ssid}</p>
                    {data.ip_address && <p><span className="text-muted-foreground">IP:</span> {data.ip_address}</p>}
                    {data.signal_dbm !== null && (
                        <p><span className="text-muted-foreground">Signal:</span> {data.signal_dbm} dBm</p>
                    )}
                </div>
            )}
        </Card>
    );
}

function BluetoothCard() {
    const { data, isLoading, toggle } = useBluetooth();

    if (isLoading) return <Card title="Bluetooth">Loading…</Card>;

    return (
        <Card title="Bluetooth">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {data?.enabled ? (
                        <Bluetooth className="h-5 w-5 text-blue-500" />
                    ) : (
                        <BluetoothOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">{data?.enabled ? "Enabled" : "Disabled"}</span>
                </div>
                <Toggle
                    checked={data?.enabled ?? false}
                    disabled={toggle.isPending}
                    onChange={() => toggle.mutate()}
                />
            </div>
            {data?.devices && data.devices.length > 0 && (
                <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Paired devices</p>
                    <table className="w-full text-sm">
                        <tbody>
                            {data.devices.map((d) => (
                                <tr key={d.address} className="border-t border-border">
                                    <td className="py-1 pr-2">{d.name}</td>
                                    <td className="py-1 pr-2 font-mono text-xs text-muted-foreground">{d.address}</td>
                                    <td className="py-1">
                                        <span className={`text-xs font-medium ${d.connected ? "text-green-600" : "text-muted-foreground"}`}>
                                            {d.connected ? "Connected" : "Paired"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">{title}</h2>
            {children}
        </div>
    );
}

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled: boolean; onChange: () => void }) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={onChange}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${checked ? "bg-primary" : "bg-muted"
                }`}
        >
            <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${checked ? "translate-x-4" : "translate-x-0"
                    }`}
            />
        </button>
    );
}
