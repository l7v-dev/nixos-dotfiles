import { describe, expect, test } from "vitest";
import * as fc from "fast-check";
import { parseRangeData, mergeSeriesForRecharts } from "../prometheus";
import type { PrometheusSeries, PrometheusMatrix } from "@/types/prometheus";

describe("Prometheus Library", () => {
    describe("parseRangeData", () => {
        test("Property 1 — parseRangeData output contains only finite numbers (100 runs)", () => {
            const arbitrarySeries = fc.record({
                metric: fc.record({
                    __name__: fc.string(),
                }),
                values: fc.array(
                    fc.tuple(
                        fc.integer({ min: 0, max: 2_000_000_000 }),
                        fc.oneof(
                            fc.float().map((n) => n.toString()),
                            fc.constant("NaN"),
                            fc.constant("Inf"),
                            fc.constant("-Inf"),
                            fc.constant("invalid_number")
                        )
                    )
                ),
            }) as fc.Arbitrary<PrometheusSeries>;

            fc.assert(
                fc.property(arbitrarySeries, (series) => {
                    const result = parseRangeData(series);
                    for (const pt of result) {
                        if (!isFinite(pt.value) || isNaN(pt.value)) {
                            return false;
                        }
                        if (typeof pt.time !== "number" || isNaN(pt.time)) {
                            return false;
                        }
                    }
                    return true;
                }),
                { numRuns: 100 }
            );
        });

        test("filters out NaN, Inf, and invalid string values correctly", () => {
            const series: PrometheusSeries = {
                metric: { __name__: "test_metric" },
                values: [
                    [100, "12.34"],
                    [101, "NaN"],
                    [102, "Inf"],
                    [103, "-Inf"],
                    [104, "56.78"],
                ],
            };

            const parsed = parseRangeData(series);
            expect(parsed).toEqual([
                { time: 100000, value: 12.34 },
                { time: 104000, value: 56.78 },
            ]);
        });

        test("handles empty or null values gracefully", () => {
            expect(parseRangeData({ metric: { __name__: "" }, values: [] })).toEqual([]);
            expect(parseRangeData(null as unknown as PrometheusSeries)).toEqual([]);
        });
    });

    describe("mergeSeriesForRecharts", () => {
        test("merges multiple series by timestamp", () => {
            const matrix: PrometheusMatrix = {
                resultType: "matrix",
                result: [
                    {
                        metric: { __name__: "cpu_total", cpu: "0" },
                        values: [
                            [100, "10"],
                            [105, "20"],
                        ],
                    },
                    {
                        metric: { __name__: "cpu_total", cpu: "1" },
                        values: [
                            [100, "30"],
                            [105, "40"],
                        ],
                    },
                ],
            };

            const merged = mergeSeriesForRecharts(matrix, "cpu");
            expect(merged).toEqual([
                { time: 100000, "0": 10, "1": 30 },
                { time: 105000, "0": 20, "1": 40 },
            ]);
        });

        test("handles missing data points at different timestamps", () => {
            const matrix: PrometheusMatrix = {
                resultType: "matrix",
                result: [
                    {
                        metric: { __name__: "metric_a" },
                        values: [[100, "1.5"]],
                    },
                    {
                        metric: { __name__: "metric_b" },
                        values: [[105, "2.5"]],
                    },
                ],
            };

            const merged = mergeSeriesForRecharts(matrix);
            expect(merged).toEqual([
                { time: 100000, metric_a: 1.5 },
                { time: 105000, metric_b: 2.5 },
            ]);
        });
    });
});
