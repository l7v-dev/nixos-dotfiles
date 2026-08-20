import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickControlsRail } from "../QuickControlsRail";
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
}));

vi.mock("@/hooks/useSecurity", () => ({
    useSecurity: () => ({
        data: { vpn: { active: true } },
        toggleVPN: { mutate: vi.fn(), isPending: false },
    }),
}));

vi.mock("@/store/host-store", () => ({
    useHostStore: (selector: (s: { selectedHost: string }) => string) =>
        selector({ selectedHost: "workstation-node" }),
}));

describe("QuickControlsRail", () => {
    const queryClient = new QueryClient();

    it("renders categorized clusters and responds to card selection", () => {
        const onSelect = vi.fn();
        render(
            <QueryClientProvider client={queryClient}>
                <QuickControlsRail selectedId="vitals" onSelect={onSelect} />
            </QueryClientProvider>
        );

        // Verify clusters are rendered
        expect(screen.getByText("Wireless & Peripheral Mesh")).toBeDefined();
        expect(screen.getByText("Declarative Infrastructure")).toBeDefined();
        expect(screen.getByText("Platform & Intelligence")).toBeDefined();

        // Verify items
        expect(screen.getByText("Wi-Fi Station")).toBeDefined();
        expect(screen.getByText("Bluetooth Mesh")).toBeDefined();
        expect(screen.getByText("NixOS Generations")).toBeDefined();
        expect(screen.getByText("Storage & Snapshots")).toBeDefined();
        expect(screen.getByText("Security & SOPS")).toBeDefined();
        expect(screen.getByText("AI Agent Hub")).toBeDefined();

        // Click Wi-Fi row to trigger selection
        const wifiItem = screen.getByText("Wi-Fi Station").closest("div");
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
