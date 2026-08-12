"use server";

export interface ForgejoStats {
    repoCount: number;
}

export async function getForgejoStats(): Promise<ForgejoStats> {
    const token = process.env.FORGEJO_TOKEN;
    const headers: HeadersInit = token ? { Authorization: `token ${token}` } : {};

    const res = await fetch("https://git.l7v.dev/api/v1/repos/search?limit=1", {
        headers,
        next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error(`Forgejo API ${res.status}`);

    const json = await res.json();
    return { repoCount: json.ok ? (json.data?.length ?? 0) : 0 };
}

export async function getVaultwardenHealth(): Promise<{ alive: boolean }> {
    try {
        const res = await fetch("https://vault.l7v.dev/api/health_check", {
            next: { revalidate: 30 },
        });
        return { alive: res.ok };
    } catch {
        return { alive: false };
    }
}
