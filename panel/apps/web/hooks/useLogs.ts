"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { computeBackoff } from "@/lib/backoff";
import { useHostStore } from "@/store/host-store";
import type { LogEntry } from "@/types/api";

const MAX_BUFFER = 5000;
const MAX_RETRIES = 5;

interface UseLogsResult {
    entries: LogEntry[];
    isConnected: boolean;
    error: string | null;
    retryCount: number;
    clear: () => void;
    isPaused: boolean;
    togglePause: () => void;
    setPaused: (paused: boolean) => void;
}

export function useLogs(
    unit?: string,
    minPriority?: number,
    priorities?: number[],
    search?: string,
    backlog: number = 200
): UseLogsResult {
    const host = useHostStore((s) => s.selectedHost);
    const [entries, setEntries] = useState<LogEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const isPausedRef = useRef(isPaused);
    isPausedRef.current = isPaused;

    const esRef = useRef<EventSource | null>(null);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(
        (attempt: number) => {
            if (attempt > MAX_RETRIES) {
                setError(`${MAX_RETRIES} denemeden sonra bağlantı kurulamadı`);
                setIsConnected(false);
                return;
            }

            const params = new URLSearchParams();
            if (unit) params.set("unit", unit);
            if (minPriority !== undefined && minPriority > 0) params.set("priority", String(minPriority));
            if (priorities && priorities.length > 0) params.set("priorities", priorities.join(","));
            if (search) params.set("search", search);
            if (backlog > 0) params.set("backlog", String(backlog));

            const qs = params.toString();
            const path = `/api/agent/${encodeURIComponent(host)}/api/v1/logs/stream${qs ? `?${qs}` : ""}`;
            const es = new EventSource(path);
            esRef.current = es;

            es.onopen = () => {
                setIsConnected(true);
                setError(null);
                setRetryCount(0);
            };

            es.onmessage = (ev) => {
                // If paused, skip appending to state buffer
                if (isPausedRef.current) return;

                try {
                    const entry: LogEntry = JSON.parse(ev.data);
                    setEntries((prev) => {
                        const next = [...prev, entry];
                        return next.length > MAX_BUFFER ? next.slice(next.length - MAX_BUFFER) : next;
                    });
                } catch {
                    // skip malformed event or keepalive comments
                }
            };

            // Named "error" event from server
            es.addEventListener("error", (ev) => {
                const data = (ev as MessageEvent).data;
                let msg = "Journal akışı hatası";
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        msg = parsed.message ?? msg;
                    } catch {
                        // use default
                    }
                }
                setError(msg);
                es.close();
                setIsConnected(false);
            });

            // Network drops or reconnection
            es.onerror = () => {
                if (es.readyState === EventSource.CLOSED) return;
                es.close();
                setIsConnected(false);
                const nextAttempt = attempt + 1;
                setRetryCount(nextAttempt);
                const delay = computeBackoff(nextAttempt) * 1000;
                retryTimerRef.current = setTimeout(() => connect(nextAttempt), delay);
            };
        },
        [host, unit, minPriority, priorities, search, backlog]
    );

    useEffect(() => {
        setEntries([]);
        setRetryCount(0);
        setError(null);
        connect(1);

        return () => {
            esRef.current?.close();
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        };
    }, [connect]);

    const clear = useCallback(() => setEntries([]), []);
    const togglePause = useCallback(() => setIsPaused((p) => !p), []);
    const setPaused = useCallback((p: boolean) => setIsPaused(p), []);

    return {
        entries,
        isConnected,
        error,
        retryCount,
        clear,
        isPaused,
        togglePause,
        setPaused,
    };
}
