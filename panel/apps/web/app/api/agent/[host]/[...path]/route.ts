import * as http from "http";
import * as https from "https";
import { type NextRequest } from "next/server";

// Agent base URL — injected at runtime by the NixOS systemd unit via AGENT_BASE_URL env var.
// Formats supported:
//   Unix socket (dev):  http+unix:///tmp/panel-agent-dev.sock   (or legacy http://unix:/tmp/...sock:)
//   TCP (production):   http://127.0.0.1:8080
const AGENT_BASE_URL =
    process.env.AGENT_BASE_URL ?? "http+unix:///tmp/panel-agent-dev.sock";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse AGENT_BASE_URL into { socketPath?, tcpBase } */
function parseAgentBase(base: string): {
    socketPath: string | null;
    tcpBase: string | null;
} {
    // http+unix:///path/to.sock  →  socketPath = /path/to.sock
    const unixMatch = base.match(/^http\+unix:\/\/(\/[^?#]*)/);
    if (unixMatch) {
        return { socketPath: unixMatch[1], tcpBase: null };
    }
    // Legacy: http://unix:/path/to.sock:  →  socketPath = /path/to.sock
    const legacyMatch = base.match(/^http:\/\/unix:(\/[^:]+):/);
    if (legacyMatch) {
        return { socketPath: legacyMatch[1], tcpBase: null };
    }
    return { socketPath: null, tcpBase: base };
}

/** Make an HTTP request over a Unix socket using Node.js http module.
 *  Returns a ReadableStream so SSE responses can be streamed through. */
function fetchUnixSocket(
    socketPath: string,
    path: string,
    method: string,
    headers: Record<string, string>,
    body?: string
): Promise<{ status: number; headers: http.IncomingHttpHeaders; stream: ReadableStream }> {
    return new Promise((resolve, reject) => {
        const opts: http.RequestOptions = {
            socketPath,
            path,
            method,
            headers,
        };

        const req = http.request(opts, (res) => {
            const stream = new ReadableStream({
                start(controller) {
                    res.on("data", (chunk: Buffer) => controller.enqueue(chunk));
                    res.on("end", () => controller.close());
                    res.on("error", (err) => controller.error(err));
                },
            });
            resolve({
                status: res.statusCode ?? 200,
                headers: res.headers,
                stream,
            });
        });

        req.on("error", reject);

        if (body) req.write(body);
        req.end();
    });
}

/** Make an HTTP/HTTPS request over TCP, returns a ReadableStream. */
function fetchTCP(
    base: string,
    path: string,
    method: string,
    headers: Record<string, string>,
    body?: string
): Promise<{ status: number; headers: http.IncomingHttpHeaders; stream: ReadableStream }> {
    return new Promise((resolve, reject) => {
        const url = new URL(path, base);
        const mod = url.protocol === "https:" ? https : http;

        const opts: http.RequestOptions = {
            hostname: url.hostname,
            port: url.port || (url.protocol === "https:" ? 443 : 80),
            path: url.pathname + url.search,
            method,
            headers,
        };

        const req = mod.request(opts, (res) => {
            const stream = new ReadableStream({
                start(controller) {
                    res.on("data", (chunk: Buffer) => controller.enqueue(chunk));
                    res.on("end", () => controller.close());
                    res.on("error", (err) => controller.error(err));
                },
            });
            resolve({
                status: res.statusCode ?? 200,
                headers: res.headers,
                stream,
            });
        });

        req.on("error", reject);

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
    return proxyToAgent(request, params.path, "GET");
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ host: string; path: string[] }> }
) {
    const params = await context.params;
    return proxyToAgent(request, params.path, "POST");
}

async function proxyToAgent(
    request: NextRequest,
    pathSegments: string[],
    method: string
): Promise<Response> {
    const agentPath = "/" + pathSegments.join("/") + request.nextUrl.search;
    const reqId =
        request.headers.get("X-Request-ID") ?? crypto.randomUUID();

    const upstreamHeaders: Record<string, string> = {
        "X-Request-ID": reqId,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    };

    let body: string | undefined;
    if (method === "POST") {
        const text = await request.text();
        if (text) body = text;
    }

    const { socketPath, tcpBase } = parseAgentBase(AGENT_BASE_URL);

    let result: { status: number; headers: http.IncomingHttpHeaders; stream: ReadableStream };
    if (socketPath) {
        result = await fetchUnixSocket(socketPath, agentPath, method, upstreamHeaders, body);
    } else {
        result = await fetchTCP(tcpBase!, agentPath, method, upstreamHeaders, body);
    }

    return new Response(result.stream, {
        status: result.status,
        headers: {
            "Content-Type":
                (result.headers["content-type"] as string) ?? "application/json",
            "Cache-Control":
                (result.headers["cache-control"] as string) ?? "no-cache",
            "X-Request-ID":
                (result.headers["x-request-id"] as string) ?? reqId,
        },
    });
}
