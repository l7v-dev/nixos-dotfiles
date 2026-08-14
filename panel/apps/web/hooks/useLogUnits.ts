"use client";

import { useQuery } from "@tanstack/react-query";
import { useHostStore } from "@/store/host-store";
import { agentFetch } from "@/lib/agent-client";

interface UnitsResponse {
    units: string[];
    total: number;
}

export function useLogUnits() {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<string[], Error>({
        queryKey: ["logs-units", host],
        queryFn: async () => {
            const res = await agentFetch<UnitsResponse>(host, "/api/v1/logs/units");
            return res.units ?? [];
        },
        staleTime: 60_000,
        enabled: !!host,
    });
}
