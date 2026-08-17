import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { WifiCard } from "../WifiCard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockToggle = vi.fn();
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockForget = vi.fn();
const mockRefetch = vi.fn();

const mockAccessPoints = [
    {
        ssid: "L7V-Mesh-Ultra-5G",
        bssid: "aa:bb:cc:dd:ee:01",
        signal_dbm: -46,
        security: "wpa3" as const,
        freq_mhz: 5180,
        band: "5GHz" as const,
        active: true,
    },
    {
        ssid: "Studio-Office-Pro",
        bssid: "aa:bb:cc:dd:ee:02",
        signal_dbm: -58,
        security: "wpa2" as const,
        freq_mhz: 5240,
        band: "5GHz" as const,
        active: false,
    },
    {
        ssid: "Open-Guest-Zone",
        bssid: "aa:bb:cc:dd:ee:03",
        signal_dbm: -72,
        security: "open" as const,
        freq_mhz: 2412,
        band: "2.4GHz" as const,
        active: false,
    },
];

vi.mock("@/hooks/useMetrics", () => ({
    useWifi: () => ({
        data: {
            enabled: true,
            ssid: "L7V-Mesh-Ultra-5G",
            signal_dbm: -46,
            ip_address: "192.168.1.142",
            gateway: "192.168.1.1",
            dns: ["1.1.1.1", "8.8.8.8"],
            band: "5GHz",
            freq_mhz: 5180,
            rx_kbps: 48500,
            tx_kbps: 14200,
            rx_bytes: 524288000,
            tx_bytes: 157286400,
        },
        isLoading: false,
        toggle: { mutate: mockToggle, isPending: false },
    }),
    useWifiScan: () => ({
        data: mockAccessPoints,
        isFetching: false,
        refetch: mockRefetch,
        scan: vi.fn(),
    }),
    useSavedConnections: () => ({
        data: [
            { id: "L7V-Mesh-Ultra-5G", uuid: "uuid-mesh-01", ssid: "L7V-Mesh-Ultra-5G" },
            { id: "Studio-Office-Pro", uuid: "uuid-office-02", ssid: "Studio-Office-Pro" },
        ],
        isLoading: false,
    }),
    useWifiConnect: () => ({
        mutate: mockConnect,
        isPending: false,
    }),
    useWifiDisconnect: () => ({
        mutate: mockDisconnect,
        isPending: false,
    }),
    useWifiForget: () => ({
        mutate: mockForget,
        isPending: false,
    }),
}));

vi.mock("@/store/host-store", () => ({
    useHostStore: (selector: (s: { selectedHost: string }) => string) =>
        selector({ selectedHost: "workstation-node" }),
}));

describe("WifiCard Component", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient();
        vi.clearAllMocks();
    });

    it("renders interface header, live telemetry and active connection banner", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <WifiCard />
            </QueryClientProvider>
        );

        // Header and interface details
        expect(screen.getByText("Wi-Fi Interface")).toBeDefined();
        expect(screen.getByText("wlan0")).toBeDefined();
        expect(screen.getByText("● Connected")).toBeDefined();

        // Active connection banner
        expect(screen.getAllByText("L7V-Mesh-Ultra-5G").length).toBeGreaterThan(0);
        expect(screen.getByText("Download (RX)")).toBeDefined();
        expect(screen.getByText("Upload (TX)")).toBeDefined();
        expect(screen.getByText("47.4 Mbps")).toBeDefined(); // 48500 / 1024
        expect(screen.getByText("13.9 Mbps")).toBeDefined(); // 14200 / 1024
        expect(screen.getAllByText("-46 dBm").length).toBeGreaterThan(0);
        expect(screen.getByText("● Excellent")).toBeDefined();
    });

    it("renders available networks list embedded directly in the card with Yenile button", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <WifiCard />
            </QueryClientProvider>
        );

        // Discovered networks header
        expect(screen.getByText("Available Networks")).toBeDefined();
        expect(screen.getByText("3")).toBeDefined(); // Count badge

        // Dedicated "Yenile" button is present and clickable
        const rescanButton = screen.getByRole("button", { name: /yenile/i });
        expect(rescanButton).toBeDefined();
        fireEvent.click(rescanButton);
        expect(mockRefetch).toHaveBeenCalled();

        // All nearby networks rendered directly in the list
        expect(screen.getByText("Studio-Office-Pro")).toBeDefined();
        expect(screen.getByText("Open-Guest-Zone")).toBeDefined();
    });

    it("filters networks by search input", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <WifiCard />
            </QueryClientProvider>
        );

        const searchInput = screen.getByPlaceholderText("Filter networks…");
        fireEvent.change(searchInput, { target: { value: "Studio" } });

        expect(screen.getByText("Studio-Office-Pro")).toBeDefined();
        expect(screen.queryByText("Open-Guest-Zone")).toBeNull();
    });

    it("triggers disconnect and forget mutations", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <WifiCard />
            </QueryClientProvider>
        );

        const disconnectButton = screen.getByRole("button", { name: /disconnect/i });
        fireEvent.click(disconnectButton);
        expect(mockDisconnect).toHaveBeenCalled();

        const forgetButton = screen.getByRole("button", { name: /forget/i });
        fireEvent.click(forgetButton);
        expect(mockForget).toHaveBeenCalledWith("uuid-mesh-01", expect.anything());
    });
});
