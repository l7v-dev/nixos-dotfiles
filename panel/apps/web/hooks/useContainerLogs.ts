"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useHostStore } from "@/store/host-store";
import type { LogLine } from "@/types/containers";

export function useContainerLogs(
    containerId: string | null,
    options?: { tail?: string; timestamps?: boolean; enabled?: boolean }
) {
    const host = useHostStore((s) => s.selectedHost);
    const [rawLogs, setRawLogs] = useState<LogLine[]>([]);
    const [filterText, setFilterText] = useState("");
    const [streamFilter, setStreamFilter] = useState<"all" | "stdout" | "stderr">("all");
    const [isPaused, setIsPaused] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const isPausedRef = useRef(isPaused);
    isPausedRef.current = isPaused;

    const tail = options?.tail || "200";
    const timestamps = options?.timestamps !== false;
    const enabled = options?.enabled !== false;

    useEffect(() => {
        if (!containerId || !enabled) {
            setIsConnected(false);
            return;
        }

        setRawLogs([]);

        const params = new URLSearchParams({
            follow: "1",
            tail,
            timestamps: timestamps ? "1" : "0",
        });

        const url = `/api/agent/${encodeURIComponent(host)}/api/v1/containers/${encodeURIComponent(
            containerId
        )}/logs?${params.toString()}`;

        const es = new EventSource(url);

        es.onopen = () => {
            setIsConnected(true);
        };

        es.onmessage = (event) => {
            if (isPausedRef.current) return;

            try {
                const log = JSON.parse(event.data) as LogLine;
                setRawLogs((prev) => {
                    const next = [...prev, log];
                    if (next.length > 2000) {
                        return next.slice(next.length - 2000);
                    }
                    return next;
                });
            } catch (err) {
                console.error("parse container log line:", err);
            }
        };

        es.onerror = () => {
            setIsConnected(false);
        };

        return () => {
            es.close();
            setIsConnected(false);
        };
    }, [host, containerId, tail, timestamps, enabled]);

    const filteredLogs = useMemo(() => {
        return rawLogs.filter((log) => {
            if (streamFilter !== "all" && log.stream !== streamFilter) {
                return false;
            }
            if (filterText) {
                const q = filterText.toLowerCase();
                return log.message.toLowerCase().includes(q);
            }
            return true;
        });
    }, [rawLogs, streamFilter, filterText]);

    const clearLogs = () => setRawLogs([]);

    const downloadLogs = () => {
        const text = filteredLogs
            .map((l) => `${l.timestamp ? `[${l.timestamp}] ` : ""}[${l.stream.toUpperCase()}] ${l.message}`)
            .join("\n");
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `container-${containerId?.slice(0, 12)}-logs.log`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return {
        logs: filteredLogs,
        totalLogs: rawLogs.length,
        filterText,
        setFilterText,
        streamFilter,
        setStreamFilter,
        isPaused,
        setIsPaused,
        isConnected,
        clearLogs,
        downloadLogs,
    };
}
