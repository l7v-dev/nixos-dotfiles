import * as http from "http";
import * as https from "https";
import * as fs from "fs";
import { type NextRequest } from "next/server";

// Default host mapping matching NixOS / Colmena topology
function resolveLocalTarget(): string {
    if (process.env.AGENT_BASE_URL) {
        return process.env.AGENT_BASE_URL;
    }
    if (fs.existsSync("/tmp/panel-agent-dev.sock")) {
        return "http+unix:///tmp/panel-agent-dev.sock";
    }
    if (fs.existsSync("/run/panel-agent/panel-agent.sock")) {
        return "http+unix:///run/panel-agent/panel-agent.sock";
    }
    return "http://127.0.0.1:8080";
}

const DEFAULT_HOST_TARGETS: Record<string, string> = {
    laptop: resolveLocalTarget(),
    server: process.env.AGENT_SERVER_URL ?? "http://server.l7v.dev:8080",
    builder: process.env.AGENT_BUILDER_URL ?? "http://builder.l7v.dev:8080",
    backup: process.env.AGENT_BACKUP_URL ?? "http://backup.l7v.dev:8080",
};

/** Resolves the managed hosts map from env and defaults. */
function getManagedHosts(): Record<string, string> {
    const raw = process.env.PANEL_MANAGED_HOSTS ?? process.env.MANAGED_HOSTS;
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            return { ...DEFAULT_HOST_TARGETS, ...parsed };
        } catch {
            // ignore JSON parse error and fallback
        }
    }
    return {
        ...DEFAULT_HOST_TARGETS,
        laptop: resolveLocalTarget(),
    };
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse target URL into { socketPath?, tcpBase } */
function parseAgentBase(base: string): {
    socketPath: string | null;
    tcpBase: string | null;
} {
    // http+unix:///path/to.sock  →  socketPath = /path/to.sock
    const unixMatch = base.match(/^http\+unix:\/\/(\/[^?#]*|%2F[^?#]*)/i);
    if (unixMatch) {
        const socketPath = decodeURIComponent(unixMatch[1]);
        return { socketPath: socketPath.replace(/\/$/, ""), tcpBase: null };
    }
    // Legacy: http://unix:/path/to.sock:  →  socketPath = /path/to.sock
    const legacyMatch = base.match(/^http:\/\/unix:(\/[^:]+):/);
    if (legacyMatch) {
        return { socketPath: legacyMatch[1], tcpBase: null };
    }
    return { socketPath: null, tcpBase: base };
}

/** Make an HTTP request over a Unix socket using Node.js http module. */
function fetchUnixSocket(
    socketPath: string,
    path: string,
    method: string,
    headers: Record<string, string>,
    body?: string
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
    return new Promise((resolve, reject) => {
        const opts: http.RequestOptions = {
            socketPath,
            path,
            method,
            headers,
        };

        const req = http.request(opts, (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => chunks.push(chunk));
            res.on("end", () => {
                resolve({
                    status: res.statusCode ?? 200,
                    headers: res.headers,
                    body: Buffer.concat(chunks),
                });
            });
            res.on("error", (err) => reject(err));
        });

        req.on("error", (err) => reject(err));

        if (body) req.write(body);
        req.end();
    });
}

/** Make an HTTP/HTTPS request over TCP, returns Buffer response. */
function fetchTCP(
    base: string,
    path: string,
    method: string,
    headers: Record<string, string>,
    body?: string
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
    return new Promise((resolve, reject) => {
        const url = new URL(path, base);
        const mod = url.protocol === "https:" ? https : http;

        const opts: http.RequestOptions = {
            hostname: url.hostname,
            port: url.port || (url.protocol === "https:" ? 443 : 80),
            path: url.pathname + url.search,
            method,
            headers,
            timeout: 5000,
        };

        const req = mod.request(opts, (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => chunks.push(chunk));
            res.on("end", () => {
                resolve({
                    status: res.statusCode ?? 200,
                    headers: res.headers,
                    body: Buffer.concat(chunks),
                });
            });
            res.on("error", (err) => reject(err));
        });

        req.on("error", (err) => reject(err));
        req.on("timeout", () => {
            req.destroy(new Error(`Connection to ${base} timed out after 5000ms`));
        });

        if (body) req.write(body);
        req.end();
    });
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ host: string; path: string[] }> }
) {
    const params = await context.params;
    return proxyToAgent(request, params.host, params.path, "GET");
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ host: string; path: string[] }> }
) {
    const params = await context.params;
    return proxyToAgent(request, params.host, params.path, "POST");
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ host: string; path: string[] }> }
) {
    const params = await context.params;
    return proxyToAgent(request, params.host, params.path, "DELETE");
}

async function proxyToAgent(
    request: NextRequest,
    hostKey: string,
    pathSegments: string[],
    method: string
): Promise<Response> {
    const agentPath = "/" + (pathSegments ? pathSegments.join("/") : "") + request.nextUrl.search;
    const reqId = request.headers.get("X-Request-ID") ?? crypto.randomUUID();

    const upstreamHeaders: Record<string, string> = {
        "X-Request-ID": reqId,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    };

    let body: string | undefined;
    if (method === "POST") {
        const text = await request.text();
        if (text) body = text;
    }

    const managedHosts = getManagedHosts();
    let targetBase = managedHosts[hostKey] ?? managedHosts.laptop ?? DEFAULT_HOST_TARGETS.laptop;
    let { socketPath, tcpBase } = parseAgentBase(targetBase);

    try {
        let result: { status: number; headers: http.IncomingHttpHeaders; body: Buffer };
        try {
            if (socketPath) {
                result = await fetchUnixSocket(socketPath, agentPath, method, upstreamHeaders, body);
            } else {
                result = await fetchTCP(tcpBase!, agentPath, method, upstreamHeaders, body);
            }
        } catch (firstErr) {
            // If local socket failed, attempt fallback to local dev TCP port 8080
            if (hostKey === "laptop" || hostKey === "localhost") {
                result = await fetchTCP("http://127.0.0.1:8080", agentPath, method, upstreamHeaders, body);
            } else {
                throw firstErr;
            }
        }

        return new Response(new Uint8Array(result.body), {
            status: result.status,
            headers: {
                "Content-Type": (result.headers["content-type"] as string) ?? "application/json",
                "Cache-Control": (result.headers["cache-control"] as string) ?? "no-cache",
                "X-Request-ID": (result.headers["x-request-id"] as string) ?? reqId,
                "X-Target-Host": hostKey,
            },
        });
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return new Response(
            JSON.stringify({
                error: `Hedef düğüme (${hostKey}) bağlanılamadı`,
                message: errorMsg,
                target_base: targetBase,
                host: hostKey,
            }),
            {
                status: 502,
                headers: {
                    "Content-Type": "application/json",
                    "X-Request-ID": reqId,
                },
            }
        );
    }
}
