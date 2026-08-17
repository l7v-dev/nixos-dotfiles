import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickControlsRail, CockpitModuleId } from "../QuickControlsRail";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock hooks
vi.mock("@/hooks/useMetrics", () => ({
    useWifi: () => ({
        data: { enabled: true, ssid: "L7V-Mesh-5G" },
        toggle: { mutate: vi.fn(), isPending: false },
    }),
    useBluetooth: () => ({
        data: { enabled: false, devices: [] },
        toggle: { mutate: vi.fn(), isPending: false },
    }),
    useMetrics: () => ({
        data: {
            cpu: { usage_pct: 12.5 },
            memory: { usage_pct: 42.0, used_mib: 4096, total_mib: 16384 },
            disks: [{ mount: "/", usage_pct: 35.0, avail_gib: 250, fs_type: "ext4" }],
            network: [{ rx_kbps: 120, tx_kbps: 45 }],
        },
        isLoading: false,
    }),
    useServices: () => ({ data: [] }),
    usePowerStatus: () => ({ data: { ac_online: true, batteries: [] } }),
}));

vi.mock("@/hooks/useAudio", () => ({
    useAudio: () => ({
        data: { output_volume: 80, output_muted: false, input_muted: true },
        setMute: { mutate: vi.fn(), isPending: false },
        setVolume: { mutate: vi.fn() },
    }),
}));

vi.mock("@/hooks/useDisplay", () => ({
    useDisplay: () => ({
        data: { night_light: { enabled: false, temperature: 4500 } },
        setNightLight: { mutate: vi.fn(), isPending: false },
    }),
}));

vi.mock("@/hooks/useSecurity", () => ({
    useSecurity: () => ({
        data: { vpn: { active: true } },
        toggleVPN: { mutate: vi.fn(), isPending: false },
    }),
}));

vi.mock("@/hooks/useHardware", () => ({
    useHardware: () => ({
        data: { cpu_temp_c: 45, cpu_governor: "powersave", power_profile: "balanced" },
        setPowerProfile: { mutate: vi.fn(), isPending: false },
    }),
}));

vi.mock("@/store/host-store", () => ({
    useHostStore: (selector: (s: { selectedHost: string }) => string) =>
        selector({ selectedHost: "workstation-node" }),
}));

describe("QuickControlsRail", () => {
    const queryClient = new QueryClient();

    it("renders categorized sections and responds to card selection", () => {
        const onSelect = vi.fn();
        render(
            <QueryClientProvider client={queryClient}>
                <QuickControlsRail selectedId="vitals" onSelect={onSelect} />
            </QueryClientProvider>
        );

        // Verify categories are rendered
        expect(screen.getByText("Connectivity & Mesh")).toBeDefined();
        expect(screen.getByText("Hardware & Environment")).toBeDefined();
        expect(screen.getByText("Audio & Streams")).toBeDefined();
        expect(screen.getByText("System & Platform")).toBeDefined();

        // Verify items
        expect(screen.getByText("Wi-Fi")).toBeDefined();
        expect(screen.getByText("Bluetooth")).toBeDefined();
        expect(screen.getByText("Tailscale Mesh")).toBeDefined();

        // Click Wi-Fi row to trigger selection
        const wifiItem = screen.getByText("Wi-Fi").closest("div");
        if (wifiItem) {
            fireEvent.click(wifiItem);
            expect(onSelect).toHaveBeenCalledWith("wifi");
        }
    });

    it("triggers Master Vitals HUD selection", () => {
        const onSelect = vi.fn();
        render(
            <QueryClientProvider client={queryClient}>
                <QuickControlsRail selectedId="wifi" onSelect={onSelect} />
            </QueryClientProvider>
        );

        const vitalsButton = screen.getByText("System Vitals HUD").closest("button");
        expect(vitalsButton).toBeDefined();
        if (vitalsButton) {
            fireEvent.click(vitalsButton);
            expect(onSelect).toHaveBeenCalledWith("vitals");
        }
    });
});
