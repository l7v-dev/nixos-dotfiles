import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SystemVitalsHUD } from "../SystemVitalsHUD";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockShutdown = vi.fn();
const mockReboot = vi.fn();
const mockCancelSchedule = vi.fn();

vi.mock("@/hooks/useMetrics", () => ({
    useMetrics: () => ({
        data: {
            cpu: { usage_pct: 25.0 },
            memory: { usage_pct: 50.0, used_mib: 8192, total_mib: 16384 },
            disks: [{ mount: "/", usage_pct: 45.0, avail_gib: 500, fs_type: "ext4" }],
            network: [{ rx_kbps: 250, tx_kbps: 110 }],
        },
        isLoading: false,
        isFetching: false,
    }),
    useServices: () => ({
        data: [
            { unit: "systemd-journald.service", active_state: "active" },
            { unit: "nginx.service", active_state: "active" },
        ],
    }),
    usePowerStatus: () => ({
        data: {
            ac_online: false,
            batteries: [
                {
                    name: "BAT0",
                    status: "Discharging",
                    capacity_pct: 88,
                    power_w: 12.4,
                    voltage_v: 15.2,
                    health_pct: 97.5,
                    cycle_count: 35,
                    time_remaining_min: 240,
                },
            ],
        },
    }),
    usePowerCapabilities: () => ({
        data: {
            can_power_off: true,
            can_reboot: true,
            can_suspend: true,
            can_hibernate: true,
            can_hybrid_sleep: false,
        },
    }),
    usePowerMutation: (action: string) => ({
        mutate: (args?: any, options?: any) => {
            if (action === "shutdown") mockShutdown();
            if (action === "reboot") mockReboot();
            options?.onSettled?.();
        },
        isPending: false,
    }),
    useScheduledShutdown: () => ({
        data: {
            scheduled: true,
            action: "poweroff",
            remaining_min: 30,
            execute_at: "2026-08-19T18:00:00Z",
        },
        cancel: {
            mutate: mockCancelSchedule,
            isPending: false,
        },
    }),
    useWifi: () => ({ data: { enabled: true, ssid: "L7V-Mesh" } }),
    useBluetooth: () => ({ data: { enabled: true, devices: [] } }),
}));

vi.mock("@/hooks/useHardware", () => ({
    useHardware: () => ({
        data: {
            cpu_temp_c: 48,
            cpu_governor: "powersave",
            power_profile: "balanced",
            fans: [{ name: "cpu_fan", rpm: 1200 }],
            sensors: [],
        },
        setPowerProfile: { mutate: vi.fn(), isPending: false },
        isLoading: false,
    }),
}));

vi.mock("@/hooks/useAudio", () => ({
    useAudio: () => ({
        data: { output_volume: 75, output_muted: false, input_volume: 80, input_muted: false, sinks: [], sources: [] },
        setVolume: { mutate: vi.fn(), isPending: false },
        setMute: { mutate: vi.fn(), isPending: false },
        setDefaultDevice: { mutate: vi.fn(), isPending: false },
    }),
}));

vi.mock("@/hooks/useDisplay", () => ({
    useDisplay: () => ({
        data: { brightness_pct: 100, night_light: { enabled: false, temperature: 4500 } },
        setBrightness: { mutate: vi.fn(), isPending: false },
        setNightLight: { mutate: vi.fn(), isPending: false },
        lockSession: { mutate: vi.fn(), isPending: false },
    }),
}));

vi.mock("@/hooks/useSecurity", () => ({
    useSecurity: () => ({
        data: { vpn: { active: true }, open_ports: [22, 80], firewall_on: true },
        toggleVPN: { mutate: vi.fn(), isPending: false },
    }),
    useSecurityAudit: () => ({
        data: {
            sops_report: { decryption_ok: true },
        },
    }),
}));

vi.mock("@/store/host-store", () => ({
    useHostStore: (selector: (s: { selectedHost: string }) => string) =>
        selector({ selectedHost: "workstation-node" }),
}));

describe("SystemVitalsHUD Component", () => {
    const queryClient = new QueryClient();

    it("renders live heartbeat telemetry, gauges, and vitality score", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <SystemVitalsHUD />
            </QueryClientProvider>
        );

        expect(screen.getByText("System Vitals & Heartbeat Telemetry")).toBeDefined();
        expect(screen.getByText(/OPTIMAL VITALITY|ELEVATED LOAD/)).toBeDefined();
        expect(screen.getByText("Live Electro-Systemic Rhythm Waveform")).toBeDefined();
        expect(screen.getByText("CPU Load")).toBeDefined();
        expect(screen.getByText("RAM Usage")).toBeDefined();
        expect(screen.getByText("Storage Root")).toBeDefined();
        expect(screen.getByText("Network I/O")).toBeDefined();
    });

    it("renders Power & Energy Control station with Network I/O styled telemetry cards", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <SystemVitalsHUD />
            </QueryClientProvider>
        );

        // Header & Section
        expect(screen.getByText("Power & Energy Control")).toBeDefined();
        expect(screen.getByText("Internal Battery Mode")).toBeDefined();

        // 4 Network I/O style telemetry cards
        expect(screen.getByText("Power Source")).toBeDefined();
        expect(screen.getByText("Power Draw Rate")).toBeDefined();
        expect(screen.getByText("Accumulator State")).toBeDefined();
        expect(screen.getByText("Estimated Runtime")).toBeDefined();

        // Metrics inside cards
        expect(screen.getByText("DC Battery Rail")).toBeDefined();
        expect(screen.getByText(/12.4 W/)).toBeDefined();
        expect(screen.getByText("15.2 V")).toBeDefined();
        expect(screen.getAllByText(/88%/).length).toBeGreaterThan(0);
        expect(screen.getByText(/98% Health|97% Health/)).toBeDefined();
        expect(screen.getByText(/4h 0m/)).toBeDefined();
        expect(screen.getByText("35 Cycles")).toBeDefined();

        // Scheduled Shutdown Banner and cancel button
        expect(screen.getByText(/POWEROFF in approximately/)).toBeDefined();
        const abortBtn = screen.getByText("Abort Schedule");
        fireEvent.click(abortBtn);
        expect(mockCancelSchedule).toHaveBeenCalled();
    });

    it("opens safety confirmation dialog when power action is clicked and confirms execution", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <SystemVitalsHUD />
            </QueryClientProvider>
        );

        // Click Power Off button
        const powerOffBtn = screen.getByText("Power Off").closest("button");
        expect(powerOffBtn).toBeDefined();
        if (powerOffBtn) {
            fireEvent.click(powerOffBtn);
        }

        // Safety Dialog should be visible
        expect(screen.getByText("Confirm SHUTDOWN Operation")).toBeDefined();
        expect(screen.getByText(/You are requesting to/)).toBeDefined();

        // Confirm
        const confirmBtn = screen.getByText("Confirm SHUTDOWN");
        fireEvent.click(confirmBtn);
        expect(mockShutdown).toHaveBeenCalled();
    });
});
