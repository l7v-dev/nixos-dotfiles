"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useHostStore } from "@/store/host-store";
import type {
    AgentTask,
    StartTaskRequest,
    AIToolInfo,
    MicroVMInfo,
    MicroVMHostStatus,
} from "@/types/api";

export function useAITasks() {
    const selectedHost = useHostStore((s) => s.selectedHost);

    return useQuery<{ tasks: AgentTask[]; total: number }>({
        queryKey: ["ai-tasks", selectedHost],
        queryFn: async () => {
            const res = await fetch(`/api/agent/${selectedHost}/api/v1/ai/tasks`);
            if (!res.ok) {
                throw new Error(`AI görevleri alınamadı: ${res.statusText}`);
            }
            return res.json();
        },
        refetchInterval: 5_000,
    });
}

export function useAITask(id: string) {
    const selectedHost = useHostStore((s) => s.selectedHost);

    return useQuery<AgentTask>({
        queryKey: ["ai-task", selectedHost, id],
        queryFn: async () => {
            const res = await fetch(`/api/agent/${selectedHost}/api/v1/ai/tasks/${id}`);
            if (!res.ok) {
                throw new Error(`Görev detayı alınamadı: ${res.statusText}`);
            }
            return res.json();
        },
        enabled: Boolean(id),
        refetchInterval: 3_000,
    });
}

export function useStartAITask() {
    const selectedHost = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation<AgentTask, Error, StartTaskRequest>({
        mutationFn: async (req) => {
            const res = await fetch(`/api/agent/${selectedHost}/api/v1/ai/tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(req),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `AI görevi başlatılamadı: ${res.statusText}`);
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ai-tasks", selectedHost] });
        },
    });
}

export function useCancelAITask() {
    const selectedHost = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation<{ status: string; task_id: string }, Error, { id: string; cleanupWorktree?: boolean }>({
        mutationFn: async ({ id, cleanupWorktree }) => {
            const cleanupQuery = cleanupWorktree ? "?cleanup=true" : "";
            const res = await fetch(`/api/agent/${selectedHost}/api/v1/ai/tasks/${id}/cancel${cleanupQuery}`, {
                method: "POST",
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Görev iptal edilemedi: ${res.statusText}`);
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ai-tasks", selectedHost] });
        },
    });
}

export function useAITools() {
    const selectedHost = useHostStore((s) => s.selectedHost);

    return useQuery<{ tools: AIToolInfo[]; total: number }>({
        queryKey: ["ai-tools", selectedHost],
        queryFn: async () => {
            const res = await fetch(`/api/agent/${selectedHost}/api/v1/ai/tools`);
            if (!res.ok) {
                throw new Error(`AI araçları alınamadı: ${res.statusText}`);
            }
            return res.json();
        },
        staleTime: 60_000,
    });
}

export function useMicroVMs() {
    const selectedHost = useHostStore((s) => s.selectedHost);

    return useQuery<{ microvms: MicroVMInfo[]; total: number }>({
        queryKey: ["ai-microvms", selectedHost],
        queryFn: async () => {
            const res = await fetch(`/api/agent/${selectedHost}/api/v1/ai/microvms`);
            if (!res.ok) {
                throw new Error(`MicroVM listesi alınamadı: ${res.statusText}`);
            }
            return res.json();
        },
        refetchInterval: 10_000,
    });
}

export function useMicroVMHostStatus() {
    const selectedHost = useHostStore((s) => s.selectedHost);

    return useQuery<MicroVMHostStatus>({
        queryKey: ["ai-microvm-host", selectedHost],
        queryFn: async () => {
            const res = await fetch(`/api/agent/${selectedHost}/api/v1/ai/microvms/host-status`);
            if (!res.ok) {
                throw new Error(`Host sanallaştırma durumu alınamadı: ${res.statusText}`);
            }
            return res.json();
        },
        staleTime: 60_000,
    });
}

export function useMicroVMAction() {
    const selectedHost = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation<{ status: string; name: string; action: string }, Error, { name: string; action: "start" | "stop" | "restart" }>({
        mutationFn: async ({ name, action }) => {
            const res = await fetch(`/api/agent/${selectedHost}/api/v1/ai/microvms/${name}/${action}`, {
                method: "POST",
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `MicroVM işlemi (${action}) başarısız: ${res.statusText}`);
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ai-microvms", selectedHost] });
        },
    });
}

export function useAITaskLogStream(taskId: string | null, enabled: boolean = true) {
    const selectedHost = useHostStore((s) => s.selectedHost);
    const [lines, setLines] = useState<string[]>([]);
    const [connected, setConnected] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!enabled || !taskId) {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            setConnected(false);
            return;
        }

        setLines([]);
        const url = `/api/agent/${selectedHost}/api/v1/ai/tasks/${taskId}/stream`;
        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onopen = () => {
            setConnected(true);
        };

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.text) {
                    setLines((prev) => [...prev, data.text]);
                }
            } catch {
                if (event.data) {
                    setLines((prev) => [...prev, event.data]);
                }
            }
        };

        es.onerror = () => {
            setConnected(false);
            es.close();
        };

        return () => {
            es.close();
            setConnected(false);
        };
    }, [taskId, enabled, selectedHost]);

    return { lines, connected, clearLogs: () => setLines([]) };
}
