"use server";

export interface ForgejoStats {
    repoCount: number;
    userCount: number;
}

export async function getForgejoStats(): Promise<ForgejoStats> {
    const token = process.env.FORGEJO_TOKEN;
    const headers: HeadersInit = token ? { Authorization: `token ${token}` } : {};

    const [reposRes, usersRes] = await Promise.allSettled([
        fetch("https://git.l7v.dev/api/v1/repos/search?limit=1&token=", {
            headers,
            next: { revalidate: 60 },
        }),
        fetch("https://git.l7v.dev/api/v1/admin/users?limit=1", {
            headers,
            next: { revalidate: 60 },
        }),
    ]);

    // Forgejo v1 /repos/search → { ok, data: [...], total_count: N }
    let repoCount = 0;
    if (reposRes.status === "fulfilled" && reposRes.value.ok) {
        const json = await reposRes.value.json();
        repoCount = typeof json.total_count === "number" ? json.total_count : (json.data?.length ?? 0);
    }

    // Forgejo v1 /admin/users → array, X-Total-Count header
    let userCount = 0;
    if (usersRes.status === "fulfilled" && usersRes.value.ok) {
        const total = usersRes.value.headers.get("X-Total-Count");
        if (total) {
            userCount = parseInt(total, 10);
        } else {
            const arr = await usersRes.value.json();
            userCount = Array.isArray(arr) ? arr.length : 0;
        }
    }

    return { repoCount, userCount };
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
