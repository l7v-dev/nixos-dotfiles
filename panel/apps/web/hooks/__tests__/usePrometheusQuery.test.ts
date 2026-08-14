import { describe, expect, test } from "vitest";
import * as fc from "fast-check";
import { deriveStep, type TimeRange, STEP_SECONDS, TIME_RANGE_SECONDS } from "../usePrometheusQuery";

describe("usePrometheusQuery helpers", () => {
    test("deriveStep maps time ranges to correct step seconds", () => {
        expect(deriveStep("15m")).toBe(15);
        expect(deriveStep("1h")).toBe(60);
        expect(deriveStep("6h")).toBe(300);
        expect(deriveStep("24h")).toBe(900);
    });

    test("Property 2 — deriveStep is deterministic for all TimeRange inputs (100 runs)", () => {
        const timeRanges: TimeRange[] = ["15m", "1h", "6h", "24h"];
        fc.assert(
            fc.property(fc.constantFrom(...timeRanges), (range) => {
                const res1 = deriveStep(range);
                const res2 = deriveStep(range);
                return res1 === res2 && res1 > 0 && res1 === STEP_SECONDS[range];
            }),
            { numRuns: 100 }
        );
    });

    test("TIME_RANGE_SECONDS has valid duration definitions", () => {
        expect(TIME_RANGE_SECONDS["15m"]).toBe(900);
        expect(TIME_RANGE_SECONDS["1h"]).toBe(3600);
        expect(TIME_RANGE_SECONDS["6h"]).toBe(21600);
        expect(TIME_RANGE_SECONDS["24h"]).toBe(86400);
    });
});
