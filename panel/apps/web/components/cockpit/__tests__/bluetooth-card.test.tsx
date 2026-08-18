import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BluetoothCard } from "../BluetoothCard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockToggle = vi.fn();
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockPair = vi.fn();
const mockRemove = vi.fn();
const mockRefetch = vi.fn();

let mockBtData: any = {
    enabled: true,
    adapter_name: "Intel AX211 Bluetooth",
    adapter_addr: "00:1A:7D:DA:71:13",
    discovering: false,
    devices: [
        {
            name: "Sony WH-1000XM4",
            address: "AA:BB:CC:DD:EE:01",
            connected: true,
            paired: true,
            trusted: true,
            icon: "audio-headset",
            battery_pct: 85,
            rssi: -54,
        },
        {
            name: "Logitech MX Master 3S",
            address: "AA:BB:CC:DD:EE:02",
            connected: false,
            paired: true,
            trusted: true,
            icon: "input-mouse",
            battery_pct: 40,
            rssi: -72,
        },
        {
            name: "Keychron K2 Keyboard",
            address: "AA:BB:CC:DD:EE:03",
            connected: false,
            paired: true,
            trusted: true,
            icon: "input-keyboard",
            battery_pct: 15,
            rssi: -82,
        },
    ],
};

let mockScanData: any = [
    {
        name: "Bose QuietComfort",
        address: "11:22:33:44:55:66",
        connected: false,
        paired: false,
        trusted: false,
        icon: "audio-headphones",
        rssi: -65,
    },
];

vi.mock("@/hooks/useMetrics", () => ({
    useBluetooth: () => ({
        data: mockBtData,
        isLoading: false,
        toggle: { mutate: mockToggle, isPending: false },
    }),
    useBluetoothScan: () => ({
        data: mockScanData,
        isFetching: false,
        refetch: mockRefetch,
        scan: vi.fn(),
    }),
    useBluetoothPair: () => ({
        mutateAsync: mockPair,
        isPending: false,
    }),
    useBluetoothConnect: () => ({
        mutateAsync: mockConnect,
        isPending: false,
    }),
    useBluetoothDisconnect: () => ({
        mutateAsync: mockDisconnect,
        isPending: false,
    }),
    useBluetoothRemove: () => ({
        mutateAsync: mockRemove,
        isPending: false,
    }),
}));

vi.mock("@/store/host-store", () => ({
    useHostStore: (selector: (s: { selectedHost: string }) => string) =>
        selector({ selectedHost: "workstation-node" }),
}));

describe("BluetoothCard Component", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient();
        vi.clearAllMocks();
        mockPair.mockResolvedValue({});
        mockConnect.mockResolvedValue({});
        mockDisconnect.mockResolvedValue({});
        mockRemove.mockResolvedValue({});
        mockBtData = {
            enabled: true,
            adapter_name: "Intel AX211 Bluetooth",
            adapter_addr: "00:1A:7D:DA:71:13",
            discovering: false,
            devices: [
                {
                    name: "Sony WH-1000XM4",
                    address: "AA:BB:CC:DD:EE:01",
                    connected: true,
                    paired: true,
                    trusted: true,
                    icon: "audio-headset",
                    battery_pct: 85,
                    rssi: -54,
                },
                {
                    name: "Logitech MX Master 3S",
                    address: "AA:BB:CC:DD:EE:02",
                    connected: false,
                    paired: true,
                    trusted: true,
                    icon: "input-mouse",
                    battery_pct: 40,
                    rssi: -72,
                },
                {
                    name: "Keychron K2 Keyboard",
                    address: "AA:BB:CC:DD:EE:03",
                    connected: false,
                    paired: true,
                    trusted: true,
                    icon: "input-keyboard",
                    battery_pct: 15,
                    rssi: -82,
                },
            ],
        };
        mockScanData = [
            {
                name: "Bose QuietComfort",
                address: "11:22:33:44:55:66",
                connected: false,
                paired: false,
                trusted: false,
                icon: "audio-headphones",
                rssi: -65,
            },
        ];
    });

    it("renders Bluetooth controller info, metrics, and paired peripherals", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <BluetoothCard />
            </QueryClientProvider>
        );

        expect(screen.getByText("Bluetooth Controller")).toBeDefined();
        expect(screen.getByText("1 Connected · 3 Paired")).toBeDefined();
        expect(screen.getByText("Intel AX211 Bluetooth")).toBeDefined();
        expect(screen.getAllByText("Sony WH-1000XM4").length).toBeGreaterThan(0);
        expect(screen.getByText("85%")).toBeDefined();
        expect(screen.getByText("Logitech MX Master 3S")).toBeDefined();
        expect(screen.getByText("40%")).toBeDefined();
        expect(screen.getByText("Keychron K2 Keyboard")).toBeDefined();
        expect(screen.getByText("15%")).toBeDefined();
    });

    it("handles toggle switch click", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <BluetoothCard />
            </QueryClientProvider>
        );

        const toggleBtn = screen.getByLabelText("Disable Bluetooth");
        fireEvent.click(toggleBtn);
        expect(mockToggle).toHaveBeenCalledTimes(1);
    });

    it("filters peripherals by category tabs", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <BluetoothCard />
            </QueryClientProvider>
        );

        // Click "audio" filter
        const audioTab = screen.getByRole("button", { name: "audio" });
        fireEvent.click(audioTab);

        expect(screen.getAllByText("Sony WH-1000XM4").length).toBeGreaterThan(0);
        expect(screen.queryByText("Logitech MX Master 3S")).toBeNull();
        expect(screen.queryByText("Keychron K2 Keyboard")).toBeNull();

        // Click "input" filter
        const inputTab = screen.getByRole("button", { name: "input" });
        fireEvent.click(inputTab);

        // In input category, Sony is not in the list (though might be in active peripherals metric box)
        expect(screen.getByText("Logitech MX Master 3S")).toBeDefined();
        expect(screen.getByText("Keychron K2 Keyboard")).toBeDefined();
    });

    it("filters peripherals by search query", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <BluetoothCard />
            </QueryClientProvider>
        );

        const searchInput = screen.getByPlaceholderText("Search peripheral name or MAC...");
        fireEvent.change(searchInput, { target: { value: "Keychron" } });

        expect(screen.getByText("Keychron K2 Keyboard")).toBeDefined();
        expect(screen.queryByText("Logitech MX Master 3S")).toBeNull();
    });

    it("triggers scan and shows discovered devices with Pair & Connect", async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <BluetoothCard />
            </QueryClientProvider>
        );

        const scanBtn = screen.getByText("Scan Nearby Devices");
        fireEvent.click(scanBtn);

        expect(mockRefetch).toHaveBeenCalled();
        expect(screen.getByText("Discovered Nearby Devices")).toBeDefined();
        expect(screen.getByText("Bose QuietComfort")).toBeDefined();

        const pairBtn = screen.getByText("Pair & Connect");
        fireEvent.click(pairBtn);

        expect(mockPair).toHaveBeenCalledWith("11:22:33:44:55:66");
    });

    it("handles connect, disconnect, and unpair actions", async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <BluetoothCard />
            </QueryClientProvider>
        );

        // Disconnect connected device
        const disconnectBtn = screen.getByRole("button", { name: "Disconnect" });
        fireEvent.click(disconnectBtn);
        expect(mockDisconnect).toHaveBeenCalledWith("AA:BB:CC:DD:EE:01");

        // Connect disconnected device
        const connectBtns = screen.getAllByRole("button", { name: "Connect" });
        fireEvent.click(connectBtns[0]);
        expect(mockConnect).toHaveBeenCalledWith("AA:BB:CC:DD:EE:02");

        // Unpair device
        const unpairBtn = screen.getByTitle("Unpair Sony WH-1000XM4");
        fireEvent.click(unpairBtn);
        expect(mockRemove).toHaveBeenCalledWith("AA:BB:CC:DD:EE:01");
    });

    it("shows empty state when Bluetooth is disabled", () => {
        mockBtData = {
            enabled: false,
            devices: [],
        };

        render(
            <QueryClientProvider client={queryClient}>
                <BluetoothCard />
            </QueryClientProvider>
        );

        expect(screen.getByText("Bluetooth is Powered Off")).toBeDefined();
        expect(screen.getByText("Power On Bluetooth")).toBeDefined();
    });
});
