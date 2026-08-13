"use server";

export interface PrometheusResult {
    status: string;
    data: {
        resultType: string;
        result: unknown[];
    };
}

/**
 * Queries the local Prometheus instance.
 * Used by the Integrations page for quick metric lookups.
 */
export async function queryPrometheus(query: string): Promise<PrometheusResult> {
    const url = `http://127.0.0.1:9090/api/v1/query?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
        throw new Error(`Prometheus query failed: ${res.status}`);
    }

    return res.json() as Promise<PrometheusResult>;
}
