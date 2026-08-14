"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTerminalStore } from "@/store/terminal-store";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected" | "exited";

interface UseTerminalOptions {
    paneId: string;
    host: string;
    sessionId?: string | null;
    onOutput?: (data: string) => void;
    onHistory?: (data: string) => void;
    onStatusChange?: (status: ConnectionStatus) => void;
    onSessionCreated?: (sessionId: string) => void;
}

export function useTerminal({
    paneId,
    host,
    sessionId,
    onOutput,
    onHistory,
    onStatusChange,
    onSessionCreated,
}: UseTerminalOptions) {
    const [status, setStatus] = useState<ConnectionStatus>("connecting");
    const [latencyMs, setLatencyMs] = useState<number | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(sessionId ?? null);
    const [retryCount, setRetryCount] = useState<number>(0);

    const wsRef = useRef<WebSocket | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isUnmountedRef = useRef<boolean>(false);
    const retryCountRef = useRef<number>(0);

    const onOutputRef = useRef(onOutput);
    onOutputRef.current = onOutput;
    const onHistoryRef = useRef(onHistory);
    onHistoryRef.current = onHistory;
    const onStatusChangeRef = useRef(onStatusChange);
    onStatusChangeRef.current = onStatusChange;
    const onSessionCreatedRef = useRef(onSessionCreated);
    onSessionCreatedRef.current = onSessionCreated;

    const updateStatus = useCallback(
        (newStatus: ConnectionStatus) => {
            setStatus(newStatus);
            onStatusChangeRef.current?.(newStatus);
        },
        []
    );

    // Compute appropriate WebSocket URL for this specific pane/session
    const getWebSocketUrl = useCallback(() => {
        if (typeof window === "undefined") return "";
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const hostPort = window.location.host;
        const targetId = activeSessionId || paneId;

        if (process.env.NEXT_PUBLIC_AGENT_WS_URL) {
            const base = process.env.NEXT_PUBLIC_AGENT_WS_URL;
            return `${base}/api/v1/terminal/ws/${encodeURIComponent(targetId)}`;
        }

        // In standalone dev mode without reverse proxy
        if (window.location.hostname === "localhost" && (window.location.port === "3002" || window.location.port === "3000")) {
            return `ws://localhost:8080/api/v1/terminal/ws/${encodeURIComponent(targetId)}`;
        }

        // In standard environment (Nginx or production proxy)
        return `${protocol}//${hostPort}/api/agent/${encodeURIComponent(host)}/api/v1/terminal/ws/${encodeURIComponent(targetId)}`;
    }, [host, activeSessionId, paneId]);

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (isUnmountedRef.current) return;

        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }

        // Close previous socket if any
        if (wsRef.current) {
            try {
                wsRef.current.close();
            } catch {
                // ignore
            }
            wsRef.current = null;
        }

        const url = getWebSocketUrl();
        updateStatus(retryCountRef.current > 0 ? "reconnecting" : "connecting");

        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                if (isUnmountedRef.current) {
                    ws.close();
                    return;
                }
                updateStatus("connected");
                retryCountRef.current = 0;
                setRetryCount(0);

                // Start ping loop for RTT latency calculation
                if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        const now = Date.now();
                        ws.send(JSON.stringify({ type: "ping", timestamp: now }));
                    }
                }, 10000);
            };

            ws.onmessage = (event) => {
                if (isUnmountedRef.current) return;
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === "history" && typeof msg.data === "string") {
                        if (onHistoryRef.current) {
                            onHistoryRef.current(msg.data);
                        } else {
                            onOutputRef.current?.(msg.data);
                        }
                    } else if (msg.type === "output" && typeof msg.data === "string") {
                        onOutputRef.current?.(msg.data);
                    } else if (msg.type === "pong" && typeof msg.timestamp === "number") {
                        const rtt = Math.max(1, Date.now() - msg.timestamp);
                        setLatencyMs(rtt);
                    } else if (msg.type === "status") {
                        if (msg.status === "exited") {
                            updateStatus("exited");
                        }
                    } else if (msg.type === "exit") {
                        updateStatus("exited");
                    }
                } catch {
                    // Raw string fallback
                    if (typeof event.data === "string") {
                        onOutputRef.current?.(event.data);
                    }
                }
            };

            ws.onerror = () => {
                // Handled in onclose
            };

            ws.onclose = (event) => {
                if (isUnmountedRef.current) return;
                if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

                if (event.code === 1000) {
                    updateStatus("exited");
                } else {
                    updateStatus("disconnected");
                    const currentRetries = retryCountRef.current + 1;
                    retryCountRef.current = currentRetries;
                    setRetryCount(currentRetries);

                    if (currentRetries <= 10) {
                        const delay = Math.min(1000 * Math.pow(1.5, currentRetries - 1), 10000);
                        retryTimeoutRef.current = setTimeout(() => {
                            connect();
                        }, delay);
                    }
                }
            };
        } catch {
            updateStatus("disconnected");
        }
    }, [activeSessionId, getWebSocketUrl, updateStatus]);

    useEffect(() => {
        isUnmountedRef.current = false;
        connect();

        return () => {
            isUnmountedRef.current = true;
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            if (wsRef.current) {
                try {
                    wsRef.current.close();
                } catch {
                    // ignore
                }
                wsRef.current = null;
            }
        };
    }, [paneId, host, activeSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Send raw input to server
    const sendInput = useCallback((data: string) => {
        if (!data) return;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "input", data }));
        }
    }, []);

    // Send resize event (SIGWINCH)
    const sendResize = useCallback((cols: number, rows: number) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "resize", cols, rows }));
        }
    }, []);

    // Send signal (SIGINT, SIGTERM, etc.)
    const sendSignal = useCallback((signal: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "signal", signal }));
        }
    }, []);

    // Reconnect manually
    const reconnect = useCallback(() => {
        setRetryCount(0);
        connect();
    }, [connect]);

    return {
        status,
        latencyMs,
        retryCount,
        activeSessionId,
        sendInput,
        sendResize,
        sendSignal,
        reconnect,
    };
}
