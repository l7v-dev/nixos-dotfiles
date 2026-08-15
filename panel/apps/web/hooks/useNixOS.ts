"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAgent, postAgent } from "@/lib/agent-client";
import { useHostStore } from "@/store/host-store";
import type {
    NixOSStatus,
    NixOSGeneration,
    GenerationDiff,
    SwitchResult,
    FlakeInfo,
    RebuildJob,
    RebuildRequest,
    MaintenanceResult,
} from "@/types/api";

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
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["nixos-status", host] });
            queryClient.invalidateQueries({ queryKey: ["nixos-generations", host] });
        },
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

export function useNixOSGenerations() {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<{ generations: NixOSGeneration[]; total: number }>({
        queryKey: ["nixos-generations", host],
        queryFn: () => fetchAgent<{ generations: NixOSGeneration[]; total: number }>(host, "/api/v1/nixos/generations"),
        refetchInterval: 15_000,
        staleTime: 10_000,
    });
}

export function useGenerationDiff(fromGen?: number, toGen?: number) {
    const host = useHostStore((s) => s.selectedHost);

    const queryParam = fromGen && toGen
        ? `?from=${fromGen}&to=${toGen}`
        : toGen
            ? `?to=${toGen}`
            : "";

    return useQuery<GenerationDiff>({
        queryKey: ["nixos-generation-diff", host, fromGen, toGen],
        queryFn: () => fetchAgent<GenerationDiff>(host, `/api/v1/nixos/generations/diff${queryParam}`),
        enabled: toGen !== undefined || fromGen !== undefined,
        staleTime: 60_000,
    });
}

export function useSwitchGeneration() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation<SwitchResult, Error, { generation: number }>({
        mutationFn: ({ generation }) =>
            postAgent<SwitchResult>(host, "/api/v1/nixos/generations/switch", { generation }),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["nixos-status", host] });
            queryClient.invalidateQueries({ queryKey: ["nixos-generations", host] });
        },
    });
}

export function useRollback() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation<SwitchResult, Error, void>({
        mutationFn: () => postAgent<SwitchResult>(host, "/api/v1/nixos/generations/rollback"),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["nixos-status", host] });
            queryClient.invalidateQueries({ queryKey: ["nixos-generations", host] });
        },
    });
}

export function useFlakeInfo(flakePath?: string) {
    const host = useHostStore((s) => s.selectedHost);
    const queryParam = flakePath ? `?path=${encodeURIComponent(flakePath)}` : "";

    return useQuery<FlakeInfo>({
        queryKey: ["nixos-flake-info", host, flakePath],
        queryFn: () => fetchAgent<FlakeInfo>(host, `/api/v1/nixos/flake${queryParam}`),
        staleTime: 30_000,
    });
}

export function useRebuildAction() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation<RebuildJob, Error, RebuildRequest>({
        mutationFn: (body) => postAgent<RebuildJob>(host, "/api/v1/nixos/rebuild", body),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["nixos-rebuild-jobs", host] });
            queryClient.invalidateQueries({ queryKey: ["nixos-status", host] });
            queryClient.invalidateQueries({ queryKey: ["nixos-generations", host] });
        },
    });
}

export function useRebuildJobs() {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<{ jobs: RebuildJob[]; total: number }>({
        queryKey: ["nixos-rebuild-jobs", host],
        queryFn: () => fetchAgent<{ jobs: RebuildJob[]; total: number }>(host, "/api/v1/nixos/rebuild/jobs"),
        refetchInterval: 5_000,
    });
}

export function useCancelRebuildJob() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation<{ status: string; job_id: string }, Error, string>({
        mutationFn: (jobId) => postAgent<{ status: string; job_id: string }>(host, `/api/v1/nixos/rebuild/jobs/${jobId}/cancel`),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["nixos-rebuild-jobs", host] });
        },
    });
}
