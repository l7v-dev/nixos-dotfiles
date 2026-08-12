// Feature: l7v-panel
// Property 5: SSE Reconnect Back-Off Bounds
// Validates: Requirements 5.6
import { describe, expect, test } from "vitest";
import fc from "fast-check";
import { computeBackoff } from "../backoff";

describe("computeBackoff", () => {
    test("Property 5 — delay is in [1, 30] for all attempts 1–5 (100 runs)", () => {
        fc.assert(
            fc.property(fc.integer({ min: 1, max: 5 }), (n) => {
                const delay = computeBackoff(n);
                expect(delay).toBeGreaterThanOrEqual(1);
                expect(delay).toBeLessThanOrEqual(30);
            }),
            { numRuns: 100 }
        );
    });

    test("Property 5 — delay is monotonically non-decreasing for attempts 1–4", () => {
        fc.assert(
            fc.property(fc.integer({ min: 1, max: 4 }), (n) => {
                expect(computeBackoff(n + 1)).toBeGreaterThanOrEqual(computeBackoff(n));
            }),
            { numRuns: 100 }
        );
    });

    test("attempt 1 → 1 second", () => {
        expect(computeBackoff(1)).toBe(1);
    });

    test("attempt 5 → capped at 30 seconds", () => {
        expect(computeBackoff(5)).toBeLessThanOrEqual(30);
    });
});
