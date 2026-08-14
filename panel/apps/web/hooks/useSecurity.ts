"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAgent, postAgent } from "@/lib/agent-client";
import { useHostStore } from "@/store/host-store";
import type { SecurityStatus } from "@/types/api";

export function useSecurity() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    const query = useQuery<SecurityStatus>({
        queryKey: ["security", host],
        queryFn: () => fetchAgent<SecurityStatus>(host, "/api/v1/security/status"),
        refetchInterval: 10_000,
    });

    const toggleVPN = useMutation({
        mutationFn: () => postAgent(host, "/api/v1/security/vpn/toggle"),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["security", host] }),
    });

    return {
        ...query,
        toggleVPN,
    };
}
