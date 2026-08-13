// Feature: l7v-panel
// Property 4: Metric Threshold Badge Classification
// Validates: Requirements 1.8
import { describe, expect, test } from "vitest";
import fc from "fast-check";
import { classifyThreshold } from "../thresholds";

describe("classifyThreshold", () => {
    test("Property 4 — classification is mutually exclusive and exhaustive (100 runs)", () => {
        fc.assert(
            fc.property(
                fc.float({ min: 0, max: 100, noNaN: true }),
                fc.float({ min: 0, max: 99, noNaN: true }),
                fc.float({ min: 1, max: 100, noNaN: true }),
                (v, warn, crit) => {
                    fc.pre(warn < crit);
                    const result = classifyThreshold(v, warn, crit);
                    expect(["green", "amber", "red"]).toContain(result);
                    if (v < warn) expect(result).toBe("green");
                    else if (v < crit) expect(result).toBe("amber");
                    else expect(result).toBe("red");
                }
            ),
            { numRuns: 100 }
        );
    });

    test("boundary: exactly at warn threshold → amber", () => {
        expect(classifyThreshold(70, 70, 90)).toBe("amber");
    });

    test("boundary: exactly at crit threshold → red", () => {
        expect(classifyThreshold(90, 70, 90)).toBe("red");
    });

    test("below warn → green", () => {
        expect(classifyThreshold(50, 70, 90)).toBe("green");
    });
});
