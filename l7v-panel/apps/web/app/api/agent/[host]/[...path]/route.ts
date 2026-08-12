import { type NextRequest } from "next/server";

// Agent base URL — injected at runtime by the NixOS systemd unit via AGENT_BASE_URL env var.
// Development fallback uses the dev socket path.
const AGENT_BASE =
    process.env.AGENT_BASE_URL ?? "http://unix:/tmp/panel-agent-dev.sock:";

export const dynamic = "force-dynamic";

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

async function proxyToAgent(
    request: NextRequest,
    _host: string,
    pathSegments: string[],
    method: string
): Promise<Response> {
    const agentPath = "/" + pathSegments.join("/");
    const search = request.nextUrl.search;
    const url = `${AGENT_BASE}${agentPath}${search}`;

    const reqId =
        request.headers.get("X-Request-ID") ?? crypto.randomUUID();

    const upstreamInit: RequestInit = {
        method,
        headers: {
            "X-Request-ID": reqId,
            ...(method === "POST"
                ? { "Content-Type": "application/json" }
                : {}),
        },
        // @ts-expect-error — Node.js fetch supports duplex for streaming
        duplex: "half",
    };

    if (method === "POST") {
        const body = await request.text();
        if (body) {
            (upstreamInit as RequestInit & { body: string }).body = body;
        }
    }

    const upstream = await fetch(url, upstreamInit);

    // Stream the response body directly — critical for SSE pass-through.
    return new Response(upstream.body, {
        status: upstream.status,
        headers: {
            "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
            "Cache-Control": upstream.headers.get("Cache-Control") ?? "no-cache",
            "X-Request-ID": upstream.headers.get("X-Request-ID") ?? reqId,
        },
    });
}
