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
    clear: () => void;
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
                setError(`${MAX_RETRIES} denemeden sonra bağlantı kurulamadı`);
                setIsConnected(false);
                return;
            }

            const params = new URLSearchParams();
            if (unit) params.set("unit", unit);
            if (minPriority !== undefined) params.set("priority", String(minPriority));
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
                try {
                    const entry: LogEntry = JSON.parse(ev.data);
                    setEntries((prev) => {
                        const next = [...prev, entry];
                        return next.length > MAX_BUFFER ? next.slice(next.length - MAX_BUFFER) : next;
                    });
                } catch {
                    // skip malformed event
                }
            };

            // Named "error" event — sent intentionally by the backend when the journal
            // fails to open. This is a permanent failure, not a reconnectable network drop.
            es.addEventListener("error", (ev) => {
                const data = (ev as MessageEvent).data;
                let msg = "Journal akışı hatası";
                try {
                    const parsed = JSON.parse(data);
                    msg = parsed.message ?? msg;
                } catch {
                    // use default
                }
                setError(msg);
                es.close();
                setIsConnected(false);
                // No retry — this is a server-side permanent error.
            });

            // Generic onerror — network drop, agent restart, proxy disconnect.
            // Do NOT set error state here; just schedule a reconnect so transient
            // failures recover silently.
            es.onerror = () => {
                // Avoid double-firing if the named "error" listener already closed.
                if (es.readyState === EventSource.CLOSED) return;
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

    return { entries, isConnected, error, retryCount, clear: () => setEntries([]) };
}
