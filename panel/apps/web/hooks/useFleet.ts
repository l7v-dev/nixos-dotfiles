"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useHostStore } from "@/store/host-store";
import type {
    FleetNode,
    FleetSummary,
    ColmenaDeployJob,
    ColmenaDeployRequest,
} from "@/types/api";

export function useFleetNodes() {
    const selectedHost = useHostStore((s) => s.selectedHost);
    const setNodes = useHostStore((s) => s.setNodes);

    return useQuery<{ nodes: FleetNode[]; total: number }>({
        queryKey: ["fleet-nodes", selectedHost],
        queryFn: async () => {
            const res = await fetch(`/api/agent/${selectedHost}/api/v1/fleet/nodes`);
            if (!res.ok) {
                throw new Error(`Fleet düğümleri alınamadı: ${res.statusText}`);
            }
            const data = await res.json();
            if (data?.nodes) {
                setNodes(data.nodes);
            }
            return data;
        },
        refetchInterval: 15_000,
    });
}

export function useFleetStatus() {
    const selectedHost = useHostStore((s) => s.selectedHost);

    return useQuery<FleetSummary>({
        queryKey: ["fleet-status", selectedHost],
        queryFn: async () => {
            const res = await fetch(`/api/agent/${selectedHost}/api/v1/fleet/status`);
            if (!res.ok) {
                throw new Error(`Filo durumu alınamadı: ${res.statusText}`);
            }
            return res.json();
        },
        refetchInterval: 15_000,
    });
}

export function useColmenaJobs() {
    const selectedHost = useHostStore((s) => s.selectedHost);

    return useQuery<{ jobs: ColmenaDeployJob[]; total: number }>({
        queryKey: ["colmena-jobs", selectedHost],
        queryFn: async () => {
            const res = await fetch(`/api/agent/${selectedHost}/api/v1/fleet/deploy/jobs`);
            if (!res.ok) {
                throw new Error(`Colmena işleri alınamadı: ${res.statusText}`);
            }
            return res.json();
        },
        refetchInterval: 5_000,
    });
}

export function useColmenaDeploy() {
    const selectedHost = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation<ColmenaDeployJob, Error, ColmenaDeployRequest>({
        mutationFn: async (req) => {
            const res = await fetch(`/api/agent/${selectedHost}/api/v1/fleet/deploy`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(req),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Colmena dağıtımı başlatılamadı: ${res.statusText}`);
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["colmena-jobs", selectedHost] });
            queryClient.invalidateQueries({ queryKey: ["fleet-status", selectedHost] });
        },
    });
}

export function useCancelColmenaJob() {
    const selectedHost = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation<{ status: string; job_id: string }, Error, string>({
        mutationFn: async (jobId) => {
            const res = await fetch(`/api/agent/${selectedHost}/api/v1/fleet/deploy/jobs/${jobId}/cancel`, {
                method: "POST",
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `İş iptal edilemedi: ${res.statusText}`);
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["colmena-jobs", selectedHost] });
        },
    });
}
