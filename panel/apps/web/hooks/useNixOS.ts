"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAgent, postAgent } from "@/lib/agent-client";
import { useHostStore } from "@/store/host-store";
import type { NixOSStatus, MaintenanceResult } from "@/types/api";

export function useNixOS() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    const query = useQuery<NixOSStatus>({
        queryKey: ["nixos-status", host],
        queryFn: () => fetchAgent<NixOSStatus>(host, "/api/v1/nixos/status"),
        refetchInterval: 30_000,
        staleTime: 15_000,
    });

    const garbageCollect = useMutation<MaintenanceResult, Error, { deleteOlderThan?: string } | undefined>({
        mutationFn: (body) =>
            postAgent<MaintenanceResult>(host, "/api/v1/nixos/gc", { delete_older_than: body?.deleteOlderThan ?? "14d" }),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["nixos-status", host] }),
    });

    const storeOptimise = useMutation<MaintenanceResult, Error, void>({
        mutationFn: () => postAgent<MaintenanceResult>(host, "/api/v1/nixos/optimise"),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["nixos-status", host] }),
    });

    return {
        ...query,
        garbageCollect,
        storeOptimise,
    };
}
