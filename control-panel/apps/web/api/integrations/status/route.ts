import { NextResponse } from "next/server";

export async function GET() {
  // Check external service health
  const services = await Promise.all([
    checkService("forgejo", "https://git.l7v.dev/api/health"),
    checkService("vaultwarden", "https://vault.l7v.dev/admin/status"),
    checkService("prometheus", "http://127.0.0.1:9090/-/healthy"),
    checkService("ntfy", "https://ntfy.l7v.dev/v1/health"),
  ]);

  return NextResponse.json({ services: services.flat() });
}

async function checkService(name: string, url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return { name, healthy: res.ok };
  } catch {
    return { name, healthy: false };
  }
}
