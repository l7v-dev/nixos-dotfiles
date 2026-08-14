"use client";

import { useQuery } from "@tanstack/react-query";
import { useHostStore } from "@/store/host-store";
import { agentFetch } from "@/lib/agent-client";
import type { LogQueryResult, LogQueryParams } from "@/types/api";

export function useLogQuery(params: LogQueryParams, enabled: boolean = true) {
    const host = useHostStore((s) => s.selectedHost);

    const queryKey = [
        "logs-query",
        host,
        params.unit,
        params.priority,
        params.priorities?.join(","),
        params.since,
        params.until,
        params.search,
        params.limit,
        params.cursor,
        params.reverse,
    ];

    return useQuery<LogQueryResult, Error>({
        queryKey,
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params.unit) searchParams.set("unit", params.unit);
            if (params.priority !== undefined && params.priority > 0) {
                searchParams.set("priority", String(params.priority));
            }
            if (params.priorities && params.priorities.length > 0) {
                searchParams.set("priorities", params.priorities.join(","));
            }
            if (params.since) searchParams.set("since", params.since);
            if (params.until) searchParams.set("until", params.until);
            if (params.search) searchParams.set("search", params.search);
            if (params.limit) searchParams.set("limit", String(params.limit));
            if (params.cursor) searchParams.set("cursor", params.cursor);
            if (params.reverse !== undefined) searchParams.set("reverse", String(params.reverse));

            const qs = searchParams.toString();
            const res = await agentFetch<LogQueryResult>(
                host,
                `/api/v1/logs/query${qs ? `?${qs}` : ""}`
            );
            return res;
        },
        enabled: enabled && !!host,
        staleTime: 10_000,
    });
}
