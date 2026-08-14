import type {
    ChartDataPoint,
    PrometheusMatrix,
    PrometheusSeries,
} from "@/types/prometheus";

/**
 * Prometheus matrix sonucunu Recharts {time, value}[] formatına dönüştürür.
 * NaN veya sonsuz değerleri filtreler.
 *
 * Feature: native-monitoring-dashboard
 * Property 1: parseRangeData çıktısında NaN veya sonsuz değer bulunmamalıdır.
 */
export function parseRangeData(series: PrometheusSeries): ChartDataPoint[] {
    if (!series || !Array.isArray(series.values)) {
        return [];
    }

    return series.values
        .map(([ts, val]) => ({
            time: ts * 1000,
            value: parseFloat(val),
        }))
        .filter(({ value }) => typeof value === "number" && !isNaN(value) && isFinite(value));
}

/**
 * Birden fazla seriyi tek bir Recharts veri dizisine birleştirir.
 * Her zaman damgası için `{ time: timestamp_ms, [key1]: value1, [key2]: value2 }` şeklinde bir nesne oluşturur.
 */
export function mergeSeriesForRecharts(
    result: PrometheusMatrix,
    labelKey: string = "__name__"
): Record<string, number>[] {
    if (!result || !Array.isArray(result.result)) {
        return [];
    }

    const timeMap = new Map<number, Record<string, number>>();

    for (const series of result.result) {
        const key = series.metric?.[labelKey] || series.metric?.__name__ || "value";
        if (!Array.isArray(series.values)) continue;

        for (const [ts, valStr] of series.values) {
            const val = parseFloat(valStr);
            if (typeof val === "number" && !isNaN(val) && isFinite(val)) {
                const time = ts * 1000;
                const existing = timeMap.get(time) || { time };
                existing[key] = val;
                timeMap.set(time, existing);
            }
        }
    }

    return Array.from(timeMap.values()).sort((a, b) => a.time - b.time);
}
