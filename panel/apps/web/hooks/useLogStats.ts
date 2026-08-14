"use client";

import { useQuery } from "@tanstack/react-query";
import { useHostStore } from "@/store/host-store";
import { agentFetch } from "@/lib/agent-client";
import type { LogStatsBucket } from "@/types/api";

interface StatsResponse {
    buckets: LogStatsBucket[];
    since: string;
    until: string;
}

export function useLogStats(since?: string, until?: string, interval?: string, enabled: boolean = true) {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<LogStatsBucket[], Error>({
        queryKey: ["logs-stats", host, since, until, interval],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (since) params.set("since", since);
            if (until) params.set("until", until);
            if (interval) params.set("interval", interval);

            const qs = params.toString();
            const res = await agentFetch<StatsResponse>(
                host,
                `/api/v1/logs/stats${qs ? `?${qs}` : ""}`
            );
            return res.buckets ?? [];
        },
        refetchInterval: 15_000,
        staleTime: 10_000,
        enabled: enabled && !!host,
    });
}
