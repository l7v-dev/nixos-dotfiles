// Feature: l7v-panel
// Property 10: Log Priority Colour Classifier
// Validates: Requirements 5.9
import { describe, expect, test } from "vitest";
import fc from "fast-check";
import { priorityToColor } from "../priority-color";

describe("priorityToColor", () => {
    test("Property 10 — returns non-empty string for all valid priorities (100 runs)", () => {
        fc.assert(
            fc.property(fc.integer({ min: 0, max: 7 }), (p) => {
                const color = priorityToColor(p);
                expect(color).toBeTruthy();
                expect(typeof color).toBe("string");
            }),
            { numRuns: 100 }
        );
    });

    test("0–3 (error+) → red class", () => {
        [0, 1, 2, 3].forEach((p) => {
            expect(priorityToColor(p)).toContain("red");
        });
    });

    test("4 (warning) → amber class", () => {
        expect(priorityToColor(4)).toContain("amber");
    });

    test("5–6 (notice/info) → green class", () => {
        [5, 6].forEach((p) => {
            expect(priorityToColor(p)).toContain("green");
        });
    });

    test("7 (debug) → slate/grey class", () => {
        expect(priorityToColor(7)).toContain("slate");
    });
});
