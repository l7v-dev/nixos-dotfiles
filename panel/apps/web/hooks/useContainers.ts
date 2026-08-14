"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAgent, postAgent } from "@/lib/agent-client";
import { useHostStore } from "@/store/host-store";
import type {
    ContainerSummary,
    ContainerDetail,
    ContainersOverview,
    ImageSummary,
    VolumeSummary,
    NetworkSummary,
    StackSummary,
    CreateContainerRequest,
    BulkActionRequest,
    BulkActionResult,
} from "@/types/containers";

export function useContainers(filters?: { all?: boolean; stack?: string }) {
    const host = useHostStore((s) => s.selectedHost);
    const params = new URLSearchParams();
    if (filters?.all) params.set("all", "1");
    if (filters?.stack) params.set("stack", filters.stack);

    const queryStr = params.toString() ? `?${params.toString()}` : "";

    return useQuery<{
        containers: ContainerSummary[];
        total: number;
        engine: string;
        available: boolean;
    }>({
        queryKey: ["containers", host, filters?.all, filters?.stack],
        queryFn: () =>
            fetchAgent<{
                containers: ContainerSummary[];
                total: number;
                engine: string;
                available: boolean;
            }>(host, `/api/v1/containers${queryStr}`),
        refetchInterval: 3_000,
        staleTime: 2_000,
    });
}

export function useContainerOverview() {
    const host = useHostStore((s) => s.selectedHost);
    return useQuery<ContainersOverview>({
        queryKey: ["containers-overview", host],
        queryFn: () => fetchAgent<ContainersOverview>(host, "/api/v1/containers/summary"),
        refetchInterval: 4_000,
        staleTime: 3_000,
    });
}

export function useContainer(id: string | null) {
    const host = useHostStore((s) => s.selectedHost);
    return useQuery<ContainerDetail>({
        queryKey: ["container-detail", host, id],
        queryFn: () => fetchAgent<ContainerDetail>(host, `/api/v1/containers/${encodeURIComponent(id!)}`),
        enabled: Boolean(id),
        refetchInterval: 3_000,
    });
}

export function useImages() {
    const host = useHostStore((s) => s.selectedHost);
    return useQuery<{ images: ImageSummary[]; total: number }>({
        queryKey: ["container-images", host],
        queryFn: () => fetchAgent<{ images: ImageSummary[]; total: number }>(host, "/api/v1/containers/images"),
        refetchInterval: 6_000,
        staleTime: 5_000,
    });
}

export function useVolumes() {
    const host = useHostStore((s) => s.selectedHost);
    return useQuery<{ volumes: VolumeSummary[]; total: number }>({
        queryKey: ["container-volumes", host],
        queryFn: () => fetchAgent<{ volumes: VolumeSummary[]; total: number }>(host, "/api/v1/containers/volumes"),
        refetchInterval: 6_000,
        staleTime: 5_000,
    });
}

export function useNetworks() {
    const host = useHostStore((s) => s.selectedHost);
    return useQuery<{ networks: NetworkSummary[]; total: number }>({
        queryKey: ["container-networks", host],
        queryFn: () => fetchAgent<{ networks: NetworkSummary[]; total: number }>(host, "/api/v1/containers/networks"),
        refetchInterval: 8_000,
        staleTime: 6_000,
    });
}

export function useStacks() {
    const host = useHostStore((s) => s.selectedHost);
    return useQuery<{ stacks: StackSummary[]; total: number }>({
        queryKey: ["container-stacks", host],
        queryFn: () => fetchAgent<{ stacks: StackSummary[]; total: number }>(host, "/api/v1/containers/stacks"),
        refetchInterval: 4_000,
        staleTime: 3_000,
    });
}

// ── Mutations ──────────────────────────────────────────────────────────

export function useContainerAction() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            action,
            timeout,
            signal,
        }: {
            id: string;
            action: "start" | "stop" | "restart" | "pause" | "unpause" | "kill";
            timeout?: number;
            signal?: string;
        }) => {
            const params = new URLSearchParams();
            if (timeout) params.set("t", String(timeout));
            if (signal) params.set("signal", signal);
            const queryStr = params.toString() ? `?${params.toString()}` : "";
            return postAgent(host, `/api/v1/containers/${encodeURIComponent(id)}/${action}${queryStr}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["containers", host] });
            queryClient.invalidateQueries({ queryKey: ["containers-overview", host] });
            queryClient.invalidateQueries({ queryKey: ["container-stacks", host] });
        },
    });
}

export function useCreateContainer() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (req: CreateContainerRequest) =>
            postAgent<{ id: string; message: string }>(host, "/api/v1/containers", req),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["containers", host] });
            queryClient.invalidateQueries({ queryKey: ["containers-overview", host] });
            queryClient.invalidateQueries({ queryKey: ["container-stacks", host] });
        },
    });
}

export function useRemoveContainer() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, force, volumes }: { id: string; force?: boolean; volumes?: boolean }) => {
            const params = new URLSearchParams();
            if (force) params.set("force", "1");
            if (volumes) params.set("volumes", "1");
            const queryStr = params.toString() ? `?${params.toString()}` : "";
            return fetchAgent(host, `/api/v1/containers/${encodeURIComponent(id)}${queryStr}`, {
                method: "DELETE",
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["containers", host] });
            queryClient.invalidateQueries({ queryKey: ["containers-overview", host] });
            queryClient.invalidateQueries({ queryKey: ["container-stacks", host] });
        },
    });
}

export function useBulkContainerAction() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (req: BulkActionRequest) =>
            postAgent<BulkActionResult>(host, "/api/v1/containers/bulk-action", req),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["containers", host] });
            queryClient.invalidateQueries({ queryKey: ["containers-overview", host] });
            queryClient.invalidateQueries({ queryKey: ["container-stacks", host] });
        },
    });
}

export function useRemoveImage() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
            fetchAgent(host, `/api/v1/containers/images/${encodeURIComponent(id)}?force=${force ? "1" : "0"}`, {
                method: "DELETE",
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["container-images", host] });
            queryClient.invalidateQueries({ queryKey: ["containers-overview", host] });
        },
    });
}

export function usePruneImages() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (danglingOnly: boolean) =>
            postAgent<{ spaceReclaimed: number; imagesDeleted: string[] }>(
                host,
                `/api/v1/containers/images/prune?dangling=${danglingOnly ? "1" : "0"}`
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["container-images", host] });
            queryClient.invalidateQueries({ queryKey: ["containers-overview", host] });
        },
    });
}

export function useCreateVolume() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (req: { name: string; driver?: string; labels?: Record<string, string> }) =>
            postAgent<VolumeSummary>(host, "/api/v1/containers/volumes", req),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["container-volumes", host] });
            queryClient.invalidateQueries({ queryKey: ["containers-overview", host] });
        },
    });
}

export function useRemoveVolume() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ name, force }: { name: string; force?: boolean }) =>
            fetchAgent(host, `/api/v1/containers/volumes/${encodeURIComponent(name)}?force=${force ? "1" : "0"}`, {
                method: "DELETE",
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["container-volumes", host] });
            queryClient.invalidateQueries({ queryKey: ["containers-overview", host] });
        },
    });
}

export function usePruneVolumes() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () =>
            postAgent<{ spaceReclaimed: number; volumesDeleted: string[] }>(
                host,
                "/api/v1/containers/volumes/prune"
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["container-volumes", host] });
            queryClient.invalidateQueries({ queryKey: ["containers-overview", host] });
        },
    });
}

export function useCreateNetwork() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (req: {
            name: string;
            driver?: string;
            subnet?: string;
            gateway?: string;
            internal?: boolean;
        }) => postAgent<NetworkSummary>(host, "/api/v1/containers/networks", req),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["container-networks", host] });
            queryClient.invalidateQueries({ queryKey: ["containers-overview", host] });
        },
    });
}

export function useRemoveNetwork() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) =>
            fetchAgent(host, `/api/v1/containers/networks/${encodeURIComponent(id)}`, {
                method: "DELETE",
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["container-networks", host] });
            queryClient.invalidateQueries({ queryKey: ["containers-overview", host] });
        },
    });
}
