"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAgent, postAgent } from "@/lib/agent-client";
import { useHostStore } from "@/store/host-store";
import type { RemovableDisk } from "@/types/api";

export function useStorage() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    const query = useQuery<RemovableDisk[]>({
        queryKey: ["storage-removable", host],
        queryFn: () => fetchAgent<RemovableDisk[]>(host, "/api/v1/storage/removable"),
        refetchInterval: 10_000,
    });

    const unmount = useMutation({
        mutationFn: (device: string) =>
            postAgent(host, "/api/v1/storage/unmount", { device }),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["storage-removable", host] }),
    });

    return {
        ...query,
        unmount,
    };
}
