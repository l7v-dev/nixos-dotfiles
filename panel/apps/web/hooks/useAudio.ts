"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAgent, postAgent } from "@/lib/agent-client";
import { useHostStore } from "@/store/host-store";
import type { AudioStatus } from "@/types/api";

export function useAudio() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    const query = useQuery<AudioStatus>({
        queryKey: ["audio", host],
        queryFn: () => fetchAgent<AudioStatus>(host, "/api/v1/audio/status"),
        refetchInterval: 5_000,
    });

    const setVolume = useMutation({
        mutationFn: ({ target, volume }: { target: "sink" | "source"; volume: number }) =>
            postAgent(host, "/api/v1/audio/volume", { target, volume }),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["audio", host] }),
    });

    const setMute = useMutation({
        mutationFn: ({ target, muted }: { target: "sink" | "source"; muted: boolean }) =>
            postAgent(host, "/api/v1/audio/mute", { target, muted }),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["audio", host] }),
    });

    const setDefaultDevice = useMutation({
        mutationFn: ({ target, id }: { target: "sink" | "source"; id: string }) =>
            postAgent(host, "/api/v1/audio/default", { target, id }),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["audio", host] }),
    });

    return {
        ...query,
        setVolume,
        setMute,
        setDefaultDevice,
    };
}
