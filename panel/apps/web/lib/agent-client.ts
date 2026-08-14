import type { AgentError } from "@/types/api";

/**
 * Fetches a resource from the agent proxy.
 * All requests go through /api/agent/{host}/{path} which the Next.js route
 * handler forwards to the Unix socket on the managed host.
 */
export async function fetchAgent<T>(
    host: string,
    path: string,
    init?: RequestInit
): Promise<T> {
    const url = `/api/agent/${encodeURIComponent(host)}${path}`;
    const reqId = crypto.randomUUID();

    const res = await fetch(url, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            "X-Request-ID": reqId,
            ...(init?.headers ?? {}),
        },
    });

    if (!res.ok) {
        let errBody: AgentError = { message: `HTTP ${res.status}` };
        try {
            errBody = await res.json();
        } catch {
            // response body was not JSON — use default message
        }
        throw errBody;
    }

    return res.json() as Promise<T>;
}

/**
 * Posts to the agent. Optionally accepts a JSON body.
 * Used for mutations (power control, toggles, WoL).
 */
export async function postAgent<T>(host: string, path: string, body?: unknown): Promise<T> {
    return fetchAgent<T>(host, path, {
        method: "POST",
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
}

export const agentFetch = fetchAgent;
