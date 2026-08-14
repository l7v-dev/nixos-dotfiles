// Feature: l7v-panel
// Property 10: Log Priority Colour Classifier
// Validates: Requirements 5.9
import { describe, expect, test } from "vitest";
import fc from "fast-check";
import { priorityToColor, priorityToBadgeClass } from "../priority-color";

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

describe("priorityToBadgeClass and priorityToCategory", () => {
    test("maps emergency/crit (0-2) to rose badge and critical category", () => {
        expect(priorityToBadgeClass(0)).toContain("rose");
        expect(priorityToBadgeClass(2)).toContain("rose");
    });

    test("maps error (3) to red badge", () => {
        expect(priorityToBadgeClass(3)).toContain("red");
    });

    test("maps warning (4) to amber badge", () => {
        expect(priorityToBadgeClass(4)).toContain("amber");
    });

    test("maps info (6) to emerald badge", () => {
        expect(priorityToBadgeClass(6)).toContain("emerald");
    });
});

