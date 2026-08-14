"use server";

export interface ServiceHealthProbe {
    id: string;
    name: string;
    targetUrl: string;
    accessType: "public_https" | "tailscale_mesh" | "internal";
    status: "healthy" | "unhealthy" | "unreachable";
    latencyMs?: number;
    httpStatus?: number;
    details?: string;
    lastChecked: string;
}

export interface WebhookPayload {
    targetUrl: string;
    event: "alert" | "info" | "test";
    title: string;
    message: string;
    severity?: "info" | "warning" | "critical";
}

/**
 * Runs synthetic health checks across enterprise ingress & internal endpoints.
 */
export async function runHealthProbes(): Promise<ServiceHealthProbe[]> {
    const probes: { id: string; name: string; url: string; accessType: "public_https" | "tailscale_mesh" | "internal" }[] = [
        { id: "forgejo", name: "Forgejo Git", url: "https://git.l7v.dev", accessType: "public_https" },
        { id: "vaultwarden", name: "Vaultwarden Vault", url: "https://vault.l7v.dev/api/health_check", accessType: "public_https" },
        { id: "conduit", name: "Conduit Matrix", url: "https://matrix.l7v.dev/_matrix/client/versions", accessType: "public_https" },
    ];

    const results = await Promise.allSettled(
        probes.map(async (p): Promise<ServiceHealthProbe> => {
            const start = Date.now();
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                const res = await fetch(p.url, {
                    method: "GET",
                    signal: controller.signal,
                    cache: "no-store",
                });
                clearTimeout(timeoutId);
                const latency = Date.now() - start;

                return {
                    id: p.id,
                    name: p.name,
                    targetUrl: p.url,
                    accessType: p.accessType,
                    status: res.ok || res.status === 401 ? "healthy" : "unhealthy",
                    latencyMs: latency,
                    httpStatus: res.status,
                    details: res.ok ? "HTTP 200 OK" : `HTTP ${res.status}`,
                    lastChecked: new Date().toISOString(),
                };
            } catch (err: any) {
                return {
                    id: p.id,
                    name: p.name,
                    targetUrl: p.url,
                    accessType: p.accessType,
                    status: "unreachable",
                    latencyMs: Date.now() - start,
                    details: err.name === "AbortError" ? "Zaman Aşımı (Timeout)" : "Erişilemedi (Unreachable)",
                    lastChecked: new Date().toISOString(),
                };
            }
        })
    );

    return results.map((r, i) =>
        r.status === "fulfilled"
            ? r.value
            : {
                  id: probes[i].id,
                  name: probes[i].name,
                  targetUrl: probes[i].url,
                  accessType: probes[i].accessType,
                  status: "unreachable",
                  details: "Hata oluştu",
                  lastChecked: new Date().toISOString(),
              }
    );
}

/**
 * Dispatches an enterprise webhook or alert notification.
 */
export async function sendWebhook(payload: WebhookPayload): Promise<{ success: boolean; message: string }> {
    if (!payload.targetUrl) {
        throw new Error("Hedef Webhook URL'si belirtilmelidir.");
    }

    try {
        const res = await fetch(payload.targetUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "L7V-Panel-Ops-Notifier/1.0",
            },
            body: JSON.stringify({
                event: payload.event,
                title: payload.title,
                message: payload.message,
                severity: payload.severity || "info",
                timestamp: new Date().toISOString(),
                origin: "l7v-panel",
            }),
            cache: "no-store",
        });

        if (!res.ok) {
            return {
                success: false,
                message: `Webhook sunucusu hata döndürdü: HTTP ${res.status} ${res.statusText}`,
            };
        }

        return {
            success: true,
            message: "Webhook başarıyla iletildi (HTTP 200 OK)",
        };
    } catch (err: any) {
        return {
            success: false,
            message: `Webhook iletim hatası: ${err.message}`,
        };
    }
}
