"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useHostStore } from "@/store/host-store";

export interface ColmenaStreamStatus {
    id: string;
    target: string;
    action: string;
    status: "running" | "completed" | "failed" | "cancelled" | string;
    command?: string;
    exit_code?: number;
    duration_ms?: number;
    start_time?: string;
}

export interface UseColmenaStreamResult {
    lines: string[];
    isConnected: boolean;
    status: ColmenaStreamStatus | null;
    error: string | null;
    clear: () => void;
}

export function useColmenaStream(jobId?: string | null, enabled: boolean = true): UseColmenaStreamResult {
    const host = useHostStore((s) => s.selectedHost);
    const [lines, setLines] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState<ColmenaStreamStatus | null>(null);
    const [error, setError] = useState<string | null>(null);

    const esRef = useRef<EventSource | null>(null);

    const clear = useCallback(() => {
        setLines([]);
    }, []);

    useEffect(() => {
        if (!enabled || !host) {
            if (esRef.current) {
                esRef.current.close();
                esRef.current = null;
            }
            setIsConnected(false);
            return;
        }

        const params = new URLSearchParams();
        if (jobId) {
            params.set("job_id", jobId);
        }

        const qs = params.toString();
        const path = `/api/agent/${encodeURIComponent(host)}/api/v1/fleet/deploy/stream${qs ? `?${qs}` : ""}`;

        const es = new EventSource(path);
        esRef.current = es;

        es.onopen = () => {
            setIsConnected(true);
            setError(null);
        };

        es.onerror = () => {
            if (es.readyState === EventSource.CLOSED) {
                setIsConnected(false);
            } else {
                setIsConnected(false);
                setError("Colmena akış bağlantısı kesildi.");
            }
        };

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data && typeof data.text === "string") {
                    setLines((prev) => [...prev, data.text]);
                }
            } catch {
                if (event.data) {
                    setLines((prev) => [...prev, event.data]);
                }
            }
        };

        es.addEventListener("status", (event: MessageEvent) => {
            try {
                const statusData: ColmenaStreamStatus = JSON.parse(event.data);
                setStatus(statusData);
            } catch {
                // Ignore parse errors on status
            }
        });

        return () => {
            es.close();
            esRef.current = null;
            setIsConnected(false);
        };
    }, [host, jobId, enabled]);

    return {
        lines,
        isConnected,
        status,
        error,
        clear,
    };
}
