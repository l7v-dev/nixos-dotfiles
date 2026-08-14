"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAgent, postAgent } from "@/lib/agent-client";
import { useHostStore } from "@/store/host-store";
import type { HardwareStatus } from "@/types/api";

export function useHardware() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    const query = useQuery<HardwareStatus>({
        queryKey: ["hardware", host],
        queryFn: () => fetchAgent<HardwareStatus>(host, "/api/v1/hardware/status"),
        refetchInterval: 5_000,
    });

    const setPowerProfile = useMutation({
        mutationFn: (profile: string) =>
            postAgent(host, "/api/v1/hardware/power-profile", { profile }),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["hardware", host] }),
    });

    return {
        ...query,
        setPowerProfile,
    };
}
