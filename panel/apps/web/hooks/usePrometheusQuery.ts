"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchAgent } from "@/lib/agent-client";
import { useHostStore } from "@/store/host-store";
import type {
    PrometheusInstantResult,
    PrometheusRangeResult,
} from "@/types/prometheus";

export type TimeRange = "15m" | "1h" | "6h" | "24h";

export const TIME_RANGE_SECONDS: Record<TimeRange, number> = {
    "15m": 900,
    "1h": 3600,
    "6h": 21600,
    "24h": 86400,
};

export const STEP_SECONDS: Record<TimeRange, number> = {
    "15m": 15,
    "1h": 60,
    "6h": 300,
    "24h": 900,
};

/**
 * Saf fonksiyon: TimeRange tipinden saniye cinsinden adım (step) değerini döndürür.
 * Feature: native-monitoring-dashboard, Property 2
 */
export function deriveStep(range: TimeRange): number {
    return STEP_SECONDS[range];
}

export function useQueryRange(
    query: string,
    timeRange: TimeRange,
    options?: { enabled?: boolean }
): UseQueryResult<PrometheusRangeResult, Error> {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<PrometheusRangeResult, Error>({
        queryKey: ["prometheus-range", host, query, timeRange],
        queryFn: () => {
            const step = deriveStep(timeRange);
            const now = Math.floor(Date.now() / 1000);
            const start = now - TIME_RANGE_SECONDS[timeRange];
            return fetchAgent<PrometheusRangeResult>(
                host,
                `/api/v1/metrics/query_range?query=${encodeURIComponent(query)}&start=${start}&end=${now}&step=${step}`
            );
        },
        refetchInterval: 60_000,
        staleTime: 55_000,
        enabled: options?.enabled !== false,
    });
}

export function useInstantQuery(
    query: string,
    options?: { enabled?: boolean }
): UseQueryResult<PrometheusInstantResult, Error> {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<PrometheusInstantResult, Error>({
        queryKey: ["prometheus-instant", host, query],
        queryFn: () =>
            fetchAgent<PrometheusInstantResult>(
                host,
                `/api/v1/metrics/query?query=${encodeURIComponent(query)}`
            ),
        refetchInterval: 60_000,
        staleTime: 55_000,
        enabled: options?.enabled !== false,
    });
}
