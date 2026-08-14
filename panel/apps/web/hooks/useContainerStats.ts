"use client";

import { useEffect, useState, useRef } from "react";
import { useHostStore } from "@/store/host-store";
import type { ContainerStats } from "@/types/containers";

export interface ChartDataPoint {
    time: string;
    cpu: number;
    memoryMB: number;
    memoryPct: number;
    netRxKb: number;
    netTxKb: number;
    blockReadKb: number;
    blockWriteKb: number;
    pids: number;
}

export function useContainerStats(containerId: string | null, enabled = true) {
    const host = useHostStore((s) => s.selectedHost);
    const [stats, setStats] = useState<ContainerStats | null>(null);
    const [history, setHistory] = useState<ChartDataPoint[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const prevNetRx = useRef<number | null>(null);
    const prevNetTx = useRef<number | null>(null);
    const prevBlockR = useRef<number | null>(null);
    const prevBlockW = useRef<number | null>(null);
    const prevTime = useRef<number | null>(null);

    useEffect(() => {
        if (!containerId || !enabled) {
            setIsConnected(false);
            return;
        }

        const url = `/api/agent/${encodeURIComponent(host)}/api/v1/containers/${encodeURIComponent(containerId)}/stats`;
        const es = new EventSource(url);

        es.onopen = () => {
            setIsConnected(true);
            setError(null);
        };

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as ContainerStats;
                setStats(data);

                const now = new Date(data.timestamp || Date.now());
                const timeLabel = now.toLocaleTimeString([], {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                });

                // Calculate rates per second if previous data exists
                let netRxRate = 0;
                let netTxRate = 0;
                let blockRRate = 0;
                let blockWRate = 0;

                const currEpoch = now.getTime();
                if (prevTime.current && currEpoch > prevTime.current) {
                    const elapsedSec = (currEpoch - prevTime.current) / 1000;
                    if (prevNetRx.current !== null && data.networkRxBytes >= prevNetRx.current) {
                        netRxRate = (data.networkRxBytes - prevNetRx.current) / 1024 / elapsedSec;
                    }
                    if (prevNetTx.current !== null && data.networkTxBytes >= prevNetTx.current) {
                        netTxRate = (data.networkTxBytes - prevNetTx.current) / 1024 / elapsedSec;
                    }
                    if (prevBlockR.current !== null && data.blockReadBytes >= prevBlockR.current) {
                        blockRRate = (data.blockReadBytes - prevBlockR.current) / 1024 / elapsedSec;
                    }
                    if (prevBlockW.current !== null && data.blockWriteBytes >= prevBlockW.current) {
                        blockWRate = (data.blockWriteBytes - prevBlockW.current) / 1024 / elapsedSec;
                    }
                }

                prevNetRx.current = data.networkRxBytes;
                prevNetTx.current = data.networkTxBytes;
                prevBlockR.current = data.blockReadBytes;
                prevBlockW.current = data.blockWriteBytes;
                prevTime.current = currEpoch;

                const point: ChartDataPoint = {
                    time: timeLabel,
                    cpu: Math.round(data.cpuPct * 100) / 100,
                    memoryMB: Math.round((data.memoryUsage / 1024 / 1024) * 10) / 10,
                    memoryPct: Math.round(data.memoryPct * 10) / 10,
                    netRxKb: Math.round(netRxRate * 10) / 10,
                    netTxKb: Math.round(netTxRate * 10) / 10,
                    blockReadKb: Math.round(blockRRate * 10) / 10,
                    blockWriteKb: Math.round(blockWRate * 10) / 10,
                    pids: data.pids,
                };

                setHistory((prev) => {
                    const next = [...prev, point];
                    if (next.length > 30) {
                        return next.slice(next.length - 30);
                    }
                    return next;
                });
            } catch (err) {
                console.error("parse container stats:", err);
            }
        };

        es.onerror = () => {
            setIsConnected(false);
            setError("Konteyner istatistik akışı bağlantısı koptu veya konteyner çalışmıyor.");
        };

        return () => {
            es.close();
            setIsConnected(false);
        };
    }, [host, containerId, enabled]);

    return { stats, history, isConnected, error };
}
