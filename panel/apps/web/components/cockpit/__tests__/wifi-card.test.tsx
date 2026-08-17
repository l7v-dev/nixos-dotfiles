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
            { id: "Out-Of-Range-Home", uuid: "uuid-home-03", ssid: "Out-Of-Range-Home" },
        ],
        isLoading: false,
        refetch: vi.fn(),
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
        expect(screen.getByRole("heading", { name: "Wi-Fi" })).toBeDefined();
        expect(screen.getByText("wlan0")).toBeDefined();
        expect(screen.getByText("● Bağlı")).toBeDefined();

        // Active connection banner
        expect(screen.getAllByText("L7V-Mesh-Ultra-5G").length).toBeGreaterThan(0);
        expect(screen.getByText("İndirme")).toBeDefined();
        expect(screen.getByText("Yükleme")).toBeDefined();
        expect(screen.getByText("47.4 Mbps")).toBeDefined();
        expect(screen.getByText("13.9 Mbps")).toBeDefined();
        expect(screen.getAllByText("-46 dBm").length).toBeGreaterThan(0);
    });

    it("renders ONLY in-range, non-connected saved networks in saved list and hides out-of-range networks", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <WifiCard />
            </QueryClientProvider>
        );

        // Saved networks table header is present because Studio-Office-Pro is in range and not connected
        expect(screen.getByText("Menzildeki Kayıtlı Ağlar")).toBeDefined();
        expect(screen.getByText("Studio-Office-Pro")).toBeDefined();

        // Out-of-range saved network must NOT be rendered
        expect(screen.queryByText("Out-Of-Range-Home")).toBeNull();
    });

    it("renders available networks list with dedicated Yenile button", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <WifiCard />
            </QueryClientProvider>
        );

        // Discovered networks header
        expect(screen.getByText("Keşfedilen Kablosuz Ağlar")).toBeDefined();

        // Dedicated "Yenile" button is present and clickable
        const rescanButton = screen.getByRole("button", { name: /yenile/i });
        expect(rescanButton).toBeDefined();
        fireEvent.click(rescanButton);
        expect(mockRefetch).toHaveBeenCalled();

        // Nearby networks rendered in list
        expect(screen.getByText("Open-Guest-Zone")).toBeDefined();
    });

    it("filters networks by search input", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <WifiCard />
            </QueryClientProvider>
        );

        const searchInput = screen.getByPlaceholderText("Ağ ara…");
        fireEvent.change(searchInput, { target: { value: "Open-Guest" } });

        expect(screen.getByText("Open-Guest-Zone")).toBeDefined();
    });

    it("triggers disconnect and forget mutations", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <WifiCard />
            </QueryClientProvider>
        );

        const disconnectButton = screen.getByRole("button", { name: /bağlantıyı kes/i });
        fireEvent.click(disconnectButton);
        expect(mockDisconnect).toHaveBeenCalled();

        const forgetButtons = screen.getAllByRole("button", { name: /unut/i });
        expect(forgetButtons.length).toBeGreaterThan(0);
        fireEvent.click(forgetButtons[0]);
        expect(mockForget).toHaveBeenCalledWith("uuid-mesh-01", expect.anything());
    });
});
