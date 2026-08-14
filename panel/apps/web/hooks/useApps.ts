"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAgent, postAgent } from "@/lib/agent-client";
import { useHostStore } from "@/store/host-store";
import type {
    Application,
    AppsSummary,
    DependencyGraph,
    AppActionResponse,
    AppActionRequest,
    AppAuditRecord,
} from "@/types/apps";

export function useApps(filters?: { category?: string; status?: string; q?: string }) {
    const host = useHostStore((s) => s.selectedHost);
    const params = new URLSearchParams();
    if (filters?.category) params.set("category", filters.category);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.q) params.set("q", filters.q);

    const queryStr = params.toString() ? `?${params.toString()}` : "";

    return useQuery<Application[]>({
        queryKey: ["apps", host, filters?.category, filters?.status, filters?.q],
        queryFn: () => fetchAgent<Application[]>(host, `/api/v1/apps${queryStr}`),
        refetchInterval: 3_000,
        staleTime: 2_000,
    });
}

export function useAppsSummary() {
    const host = useHostStore((s) => s.selectedHost);
    return useQuery<AppsSummary>({
        queryKey: ["apps-summary", host],
        queryFn: () => fetchAgent<AppsSummary>(host, "/api/v1/apps/summary"),
        refetchInterval: 5_000,
        staleTime: 4_000,
    });
}

export function useApp(id: string | null) {
    const host = useHostStore((s) => s.selectedHost);
    return useQuery<Application>({
        queryKey: ["app-detail", host, id],
        queryFn: () => fetchAgent<Application>(host, `/api/v1/apps/${encodeURIComponent(id!)}`),
        enabled: Boolean(id),
        refetchInterval: 3_000,
    });
}

export function useAppDependencies() {
    const host = useHostStore((s) => s.selectedHost);
    return useQuery<DependencyGraph>({
        queryKey: ["apps-dependencies", host],
        queryFn: () => fetchAgent<DependencyGraph>(host, "/api/v1/apps/dependencies"),
        staleTime: 10_000,
    });
}

export function useAppAudit() {
    const host = useHostStore((s) => s.selectedHost);
    return useQuery<AppAuditRecord[]>({
        queryKey: ["apps-audit", host],
        queryFn: () => fetchAgent<AppAuditRecord[]>(host, "/api/v1/apps/audit?limit=50"),
        refetchInterval: 5_000,
    });
}

export function useAppActions(appId: string) {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["apps", host] });
        queryClient.invalidateQueries({ queryKey: ["apps-summary", host] });
        queryClient.invalidateQueries({ queryKey: ["app-detail", host, appId] });
        queryClient.invalidateQueries({ queryKey: ["apps-audit", host] });
        queryClient.invalidateQueries({ queryKey: ["services", host] });
    };

    const runAction = useMutation<AppActionResponse, Error, AppActionRequest>({
        mutationFn: (req) =>
            postAgent<AppActionResponse>(host, `/api/v1/apps/${encodeURIComponent(appId)}/action`, req),
        onSettled: invalidate,
    });

    return {
        runAction,
        start: (force = false) => runAction.mutateAsync({ action: "start", force }),
        stop: (force = false) => runAction.mutateAsync({ action: "stop", force }),
        restart: (force = false) => runAction.mutateAsync({ action: "restart", force }),
        reload: (force = false) => runAction.mutateAsync({ action: "reload", force }),
        enable: (force = false) => runAction.mutateAsync({ action: "enable", force }),
        disable: (force = false) => runAction.mutateAsync({ action: "disable", force }),
    };
}
