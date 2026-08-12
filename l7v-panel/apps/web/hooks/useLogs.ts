"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { computeBackoff } from "@/lib/backoff";
import { useHostStore } from "@/store/host-store";
import type { LogEntry } from "@/types/api";

const MAX_BUFFER = 1000;
const MAX_RETRIES = 5;

interface UseLogsResult {
    entries: LogEntry[];
    isConnected: boolean;
    error: string | null;
    retryCount: number;
}

export function useLogs(unit?: string, minPriority?: number): UseLogsResult {
    const host = useHostStore((s) => s.selectedHost);
    const [entries, setEntries] = useState<LogEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const esRef = useRef<EventSource | null>(null);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(
        (attempt: number) => {
            if (attempt > MAX_RETRIES) {
                setError(`Connection failed after ${MAX_RETRIES} attempts`);
                setIsConnected(false);
                return;
            }

            const params = new URLSearchParams();
            if (unit) params.set("unit", unit);
            if (minPriority !== undefined) params.set("priority", String(minPriority));

            const path = `/api/agent/${encodeURIComponent(host)}/api/v1/logs/stream?${params}`;
            const es = new EventSource(path);
            esRef.current = es;

            es.onopen = () => {
                setIsConnected(true);
                setError(null);
                setRetryCount(0);
            };

            es.onmessage = (ev) => {
                try {
                    const entry: LogEntry = JSON.parse(ev.data);
                    setEntries((prev) => {
                        const next = [...prev, entry];
                        // Keep only the most recent MAX_BUFFER entries.
                        return next.length > MAX_BUFFER ? next.slice(next.length - MAX_BUFFER) : next;
                    });
                } catch {
                    // skip malformed event
                }
            };

            es.addEventListener("error", (ev) => {
                const data = (ev as MessageEvent).data;
                let msg = "Stream error";
                try {
                    msg = JSON.parse(data).message ?? msg;
                } catch {
                    // use default
                }
                setError(msg);
                es.close();
                setIsConnected(false);
            });

            es.onerror = () => {
                es.close();
                setIsConnected(false);
                const nextAttempt = attempt + 1;
                setRetryCount(nextAttempt);
                const delay = computeBackoff(nextAttempt) * 1000;
                retryTimerRef.current = setTimeout(() => connect(nextAttempt), delay);
            };
        },
        [host, unit, minPriority]
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

    return { entries, isConnected, error, retryCount };
}
