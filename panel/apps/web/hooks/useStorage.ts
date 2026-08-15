"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAgent, postAgent } from "@/lib/agent-client";
import { useHostStore } from "@/store/host-store";
import type {
    RemovableDisk,
    SnapperSnapshot,
    SnapperConfig,
    CreateSnapshotRequest,
    ResticStatus,
    ResticSnapshot,
} from "@/types/api";

// ── Removable Storage ────────────────────────────────────────────────────────

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

// ── Btrfs Snapper Snapshots ──────────────────────────────────────────────────

export interface SnapperQueryResponse {
    config: string;
    configs: SnapperConfig[];
    snapshots: SnapperSnapshot[];
    total?: number;
    error?: string;
}

export function useSnapperSnapshots(config: string = "root") {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<SnapperQueryResponse>({
        queryKey: ["storage-snapshots", host, config],
        queryFn: () =>
            fetchAgent<SnapperQueryResponse>(
                host,
                `/api/v1/storage/snapshots?config=${encodeURIComponent(config)}`
            ),
        refetchInterval: 20_000,
    });
}

export function useCreateSnapshot() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation<SnapperSnapshot, Error, CreateSnapshotRequest>({
        mutationFn: (req) => postAgent(host, "/api/v1/storage/snapshots", req),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["storage-snapshots", host, variables.config || "root"],
            });
        },
    });
}

export function useDeleteSnapshot() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation<{ status: string; config: string; id: number }, Error, { config: string; id: number }>({
        mutationFn: async ({ config, id }) => {
            const res = await fetch(
                `/api/agent/${encodeURIComponent(host)}/api/v1/storage/snapshots/${encodeURIComponent(config)}/${id}`,
                { method: "DELETE" }
            );
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Snapshot silinemedi: ${res.statusText}`);
            }
            return res.json();
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["storage-snapshots", host, variables.config],
            });
        },
    });
}

// ── Restic Offsite Backup ────────────────────────────────────────────────────

export function useResticStatus() {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<ResticStatus>({
        queryKey: ["storage-restic-status", host],
        queryFn: () => fetchAgent<ResticStatus>(host, "/api/v1/storage/restic/status"),
        refetchInterval: 15_000,
    });
}

export function useResticSnapshots() {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<{ snapshots: ResticSnapshot[]; total: number }>({
        queryKey: ["storage-restic-snapshots", host],
        queryFn: () => fetchAgent<{ snapshots: ResticSnapshot[]; total: number }>(host, "/api/v1/storage/restic/snapshots"),
        refetchInterval: 30_000,
    });
}

export function useTriggerResticBackup() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation<{ status: string; service: string }, Error, void>({
        mutationFn: () => postAgent(host, "/api/v1/storage/restic/backup", {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["storage-restic-status", host] });
        },
    });
}
