"use client";

import { useEffect, useState } from "react";

interface NetworkInfo {
  wifi?: { ssid: string; strength: number };
  bluetooth: { enabled: boolean; connected: string[] };
}

export default function NetworkPage() {
  const [network, setNetwork] = useState<NetworkInfo | null>(null);

  useEffect(() => {
    async function fetchNetwork() {
      try {
        const res = await fetch("/api/agent/laptop/api/v1/network/status");
        const data = await res.json();
        setNetwork(data);
      } catch (error) {
        console.error("Failed to fetch network:", error);
      }
    }
    fetchNetwork();
  }, []);

  return (
    <div className="p-8">
      <h2 className="mb-4 text-2xl font-semibold">Network & Bluetooth</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-6">
          <h3 className="text-lg font-medium">WiFi</h3>
          {network?.wifi ? (
            <p className="mt-2">
              Connected to: <strong>{network.wifi.ssid}</strong> (
              {network.wifi.strength}%)
            </p>
          ) : (
            <p className="mt-2 text-gray-500">Not connected</p>
          )}
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="text-lg font-medium">Bluetooth</h3>
          <p className="mt-2">
            Status:{" "}
            {network?.bluetooth.enabled ? (
              <span className="text-green-600">Enabled</span>
            ) : (
              <span className="text-red-600">Disabled</span>
            )}
          </p>
          {network?.bluetooth.connected.length > 0 && (
            <p className="mt-2">
              Connected: {network.bluetooth.connected.join(", ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
