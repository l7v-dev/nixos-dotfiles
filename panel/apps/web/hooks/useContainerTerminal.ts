"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useHostStore } from "@/store/host-store";
import { postAgent } from "@/lib/agent-client";

export type TerminalStatus = "idle" | "creating" | "connected" | "disconnected" | "error";

interface UseContainerTerminalOptions {
    containerId: string | null;
    shell?: string; // "/bin/sh", "/bin/bash", "/bin/zsh"
    onData?: (data: string) => void;
    onStatusChange?: (status: TerminalStatus) => void;
    enabled?: boolean;
}

export function useContainerTerminal({
    containerId,
    shell = "/bin/sh",
    onData,
    onStatusChange,
    enabled = true,
}: UseContainerTerminalOptions) {
    const host = useHostStore((s) => s.selectedHost);
    const [status, setStatus] = useState<TerminalStatus>("idle");
    const [execId, setExecId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const onDataRef = useRef(onData);
    onDataRef.current = onData;
    const onStatusChangeRef = useRef(onStatusChange);
    onStatusChangeRef.current = onStatusChange;

    const setStatusWithCb = useCallback((newStatus: TerminalStatus) => {
        setStatus(newStatus);
        onStatusChangeRef.current?.(newStatus);
    }, []);

    const connectWS = useCallback(
        (id: string) => {
            if (typeof window === "undefined") return;
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const wsHost = window.location.host;
            const url = `${protocol}//${wsHost}/api/agent/${encodeURIComponent(
                host
            )}/api/v1/containers/exec/${encodeURIComponent(id)}/ws`;

            if (wsRef.current) {
                wsRef.current.close();
            }

            const ws = new WebSocket(url);
            ws.binaryType = "arraybuffer";
            wsRef.current = ws;

            ws.onopen = () => {
                setStatusWithCb("connected");
                setErrorMessage(null);
            };

            ws.onmessage = (event) => {
                if (typeof event.data === "string") {
                    onDataRef.current?.(event.data);
                } else if (event.data instanceof ArrayBuffer) {
                    const dec = new TextDecoder();
                    const text = dec.decode(event.data);
                    onDataRef.current?.(text);
                }
            };

            ws.onerror = (e) => {
                console.error("container terminal ws error:", e);
                setStatusWithCb("error");
                setErrorMessage("WebSocket terminal bağlantı hatası.");
            };

            ws.onclose = () => {
                setStatusWithCb("disconnected");
            };
        },
        [host, setStatusWithCb]
    );

    const startSession = useCallback(async () => {
        if (!containerId || !enabled) return;

        setStatusWithCb("creating");
        setErrorMessage(null);

        try {
            const res = await postAgent<{ execId: string }>(
                host,
                `/api/v1/containers/${encodeURIComponent(containerId)}/exec`,
                {
                    cmd: [shell],
                    tty: true,
                    attachStdin: true,
                    attachStdout: true,
                    attachStderr: true,
                }
            );

            if (res.execId) {
                setExecId(res.execId);
                connectWS(res.execId);
            } else {
                throw new Error("Exec ID alınamadı.");
            }
        } catch (err: unknown) {
            const errObj = err as { message?: string };
            const msg = errObj?.message || "Exec oturumu başlatılamadı.";
            setStatusWithCb("error");
            setErrorMessage(msg);
        }
    }, [containerId, host, shell, enabled, setStatusWithCb, connectWS]);

    useEffect(() => {
        if (containerId && enabled) {
            startSession();
        }

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [containerId, enabled, shell]); // restart on shell or container change

    const sendInput = useCallback((input: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
                JSON.stringify({
                    type: "input",
                    data: input,
                })
            );
        }
    }, []);

    const sendResize = useCallback((cols: number, rows: number) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
                JSON.stringify({
                    type: "resize",
                    cols,
                    rows,
                })
            );
        }
    }, []);

    const reconnect = useCallback(() => {
        startSession();
    }, [startSession]);

    return {
        status,
        execId,
        errorMessage,
        sendInput,
        sendResize,
        reconnect,
    };
}
