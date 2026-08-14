"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAgent, postAgent } from "@/lib/agent-client";
import { useHostStore } from "@/store/host-store";
import type { DisplayStatus } from "@/types/api";

export function useDisplay() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    const query = useQuery<DisplayStatus>({
        queryKey: ["display", host],
        queryFn: () => fetchAgent<DisplayStatus>(host, "/api/v1/display/status"),
        refetchInterval: 10_000,
    });

    const setBrightness = useMutation({
        mutationFn: (percent: number) =>
            postAgent(host, "/api/v1/display/brightness", { percent }),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["display", host] }),
    });

    const setNightLight = useMutation({
        mutationFn: ({ enabled, temperature }: { enabled: boolean; temperature: number }) =>
            postAgent(host, "/api/v1/display/nightlight", { enabled, temperature }),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["display", host] }),
    });

    const lockSession = useMutation({
        mutationFn: () => postAgent(host, "/api/v1/display/lock"),
    });

    return {
        ...query,
        setBrightness,
        setNightLight,
        lockSession,
    };
}
