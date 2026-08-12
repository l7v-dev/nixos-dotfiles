"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAgent, postAgent } from "@/lib/agent-client";
import { useHostStore } from "@/store/host-store";
import type { MetricsSnapshot, ServiceUnit, WifiStatus, BluetoothStatus } from "@/types/api";

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

export function usePowerMutation(action: "shutdown" | "reboot" | "sleep") {
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
