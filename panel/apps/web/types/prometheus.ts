export interface PrometheusMetric {
    [key: string]: string;
    __name__: string;
}

export interface PrometheusSeries {
    metric: PrometheusMetric;
    values: [number, string][]; // [unix_timestamp_sec, "value_string"]
}

export interface PrometheusMatrix {
    resultType: "matrix";
    result: PrometheusSeries[];
}

export interface PrometheusVector {
    resultType: "vector";
    result: Array<{
        metric: PrometheusMetric;
        value: [number, string];
    }>;
}

export interface PrometheusRangeResult {
    status: "success" | "error";
    data: PrometheusMatrix;
    error?: string;
    errorType?: string;
}

export interface PrometheusInstantResult {
    status: "success" | "error";
    data: PrometheusVector;
    error?: string;
    errorType?: string;
}

// Recharts data point
export interface ChartDataPoint {
    time: number; // unix timestamp in milliseconds
    value: number; // finite number (no NaN / Infinity)
    label?: string;
}
