"use server";

/**
 * Publishes a message to an ntfy topic.
 * Requires NTFY_TOKEN env var for authenticated topics.
 */
export async function publishNtfy(topic: string, message: string): Promise<void> {
    const token = process.env.NTFY_TOKEN;
    const headers: HeadersInit = {
        "Content-Type": "text/plain",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`https://ntfy.l7v.dev/${encodeURIComponent(topic)}`, {
        method: "POST",
        headers,
        body: message,
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error(`ntfy publish failed: ${res.status} ${res.statusText}`);
    }
}
