"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAgent, postAgent } from "@/lib/agent-client";
import { useHostStore } from "@/store/host-store";
import type { MetricsSnapshot, ServiceUnit, WifiStatus, BluetoothStatus, PowerCapabilities, WoLHost, PowerStatus, ScheduledShutdownInfo, AccessPoint, SavedConnection } from "@/types/api";

export function usePowerCapabilities() {
    const host = useHostStore((s) => s.selectedHost);
    return useQuery<PowerCapabilities>({
        queryKey: ["power-capabilities", host],
        queryFn: () => fetchAgent<PowerCapabilities>(host, "/api/v1/power/capabilities"),
        // Capabilities rarely change — refetch only on mount
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useMetrics() {
    const host = useHostStore((s) => s.selectedHost);
    return useQuery<MetricsSnapshot>({
        queryKey: ["metrics", host],
        queryFn: () => fetchAgent<MetricsSnapshot>(host, "/api/v1/metrics"),
        refetchInterval: 5_000,
        staleTime: 4_000,
    });
}

export function useServices() {
    const host = useHostStore((s) => s.selectedHost);
    return useQuery<ServiceUnit[]>({
        queryKey: ["services", host],
        queryFn: () => fetchAgent<ServiceUnit[]>(host, "/api/v1/services"),
        refetchInterval: 2_000,
        staleTime: 1_500,
    });
}

export function useServiceAction(unit: string, action: "start" | "stop" | "enable" | "disable") {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () =>
            postAgent(host, `/api/v1/services/${encodeURIComponent(unit)}/${action}`),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["services", host] });
        },
    });
}

export function usePowerMutation(action: "shutdown" | "reboot" | "sleep" | "hibernate" | "hybrid-sleep") {
    const host = useHostStore((s) => s.selectedHost);
    return useMutation({
        mutationFn: () => postAgent(host, `/api/v1/power/${action}`),
    });
}

export function useWifi() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();
    const query = useQuery<WifiStatus>({
        queryKey: ["wifi", host],
        queryFn: () => fetchAgent<WifiStatus>(host, "/api/v1/network/wifi"),
        refetchInterval: 5_000,
    });
    const toggle = useMutation({
        mutationFn: () => postAgent<WifiStatus>(host, "/api/v1/network/wifi/toggle"),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["wifi", host] }),
    });
    return { ...query, toggle };
}

export function useWifiScan() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();
    const query = useQuery<AccessPoint[]>({
        queryKey: ["wifi-scan", host],
        queryFn: () => fetchAgent<AccessPoint[]>(host, "/api/v1/network/wifi/scan"),
        enabled: false, // only fetch on demand
        staleTime: 30_000,
    });
    const scan = () => queryClient.invalidateQueries({ queryKey: ["wifi-scan", host] });
    const refetch = () => query.refetch();
    return { ...query, scan, refetch };
}

export function useWifiConnect() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ ssid, password }: { ssid: string; password: string }) =>
            postAgent(host, "/api/v1/network/wifi/connect", { ssid, password }),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["wifi", host] });
            queryClient.invalidateQueries({ queryKey: ["wifi-scan", host] });
        },
    });
}

export function useWifiDisconnect() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => postAgent(host, "/api/v1/network/wifi/disconnect"),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["wifi", host] }),
    });
}

export function useSavedConnections() {
    const host = useHostStore((s) => s.selectedHost);
    return useQuery<SavedConnection[]>({
        queryKey: ["wifi-connections", host],
        queryFn: () => fetchAgent<SavedConnection[]>(host, "/api/v1/network/wifi/connections"),
        staleTime: 30_000,
    });
}

export function useBluetooth() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();
    const query = useQuery<BluetoothStatus>({
        queryKey: ["bluetooth", host],
        queryFn: () => fetchAgent<BluetoothStatus>(host, "/api/v1/network/bluetooth"),
        refetchInterval: 10_000,
    });
    const toggle = useMutation({
        mutationFn: () => postAgent<BluetoothStatus>(host, "/api/v1/network/bluetooth/toggle"),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["bluetooth", host] }),
    });
    return { ...query, toggle };
}

export function useWoLHosts() {
    const host = useHostStore((s) => s.selectedHost);
    return useQuery<WoLHost[]>({
        queryKey: ["wol-hosts", host],
        queryFn: () => fetchAgent<WoLHost[]>(host, "/api/v1/power/wol/hosts"),
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useWoLMutation() {
    const host = useHostStore((s) => s.selectedHost);
    return useMutation({
        mutationFn: ({ mac, broadcast }: { mac: string; broadcast?: string }) =>
            postAgent(host, "/api/v1/power/wol", { mac, broadcast }),
    });
}

export function usePowerStatus() {
    const host = useHostStore((s) => s.selectedHost);
    return useQuery<PowerStatus>({
        queryKey: ["power-status", host],
        queryFn: () => fetchAgent<PowerStatus>(host, "/api/v1/power/status"),
        refetchInterval: 15_000,
        staleTime: 10_000,
    });
}

export function useScheduledShutdown() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();
    const query = useQuery<ScheduledShutdownInfo>({
        queryKey: ["scheduled-shutdown", host],
        queryFn: () => fetchAgent<ScheduledShutdownInfo>(host, "/api/v1/power/schedule"),
        refetchInterval: 10_000,
        staleTime: 8_000,
    });
    const schedule = useMutation({
        mutationFn: (body: { action: string; delay_minutes?: number; at_time?: string }) =>
            postAgent<ScheduledShutdownInfo>(host, "/api/v1/power/schedule", body),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["scheduled-shutdown", host] }),
    });
    const cancel = useMutation({
        mutationFn: () =>
            fetchAgent<ScheduledShutdownInfo>(host, "/api/v1/power/schedule", { method: "DELETE" }),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["scheduled-shutdown", host] }),
    });
    return { ...query, schedule, cancel };
}
