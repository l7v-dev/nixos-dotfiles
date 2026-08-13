// Feature: l7v-panel
// Property 9: Log Entry Buffer Size Invariant
// Validates: Requirements 5.7
import { describe, expect, test } from "vitest";
import fc from "fast-check";
import type { LogEntry } from "@/types/api";

const MAX_BUFFER = 1000;

/** Simulates the buffer append logic from useLogs.ts */
function appendToBuffer(buf: LogEntry[], entry: LogEntry): LogEntry[] {
    const next = [...buf, entry];
    return next.length > MAX_BUFFER ? next.slice(next.length - MAX_BUFFER) : next;
}

function buildEntry(i: number): LogEntry {
    return {
        timestamp: new Date(i * 1000).toISOString(),
        unit: `unit-${i}.service`,
        priority: i % 8,
        message: `msg ${i}`,
    };
}

describe("log buffer invariant", () => {
    test("Property 9 — buffer never exceeds 1000 entries for N > 1000 appends (100 runs)", () => {
        fc.assert(
            fc.property(fc.integer({ min: 1001, max: 2000 }), (n) => {
                let buf: LogEntry[] = [];
                for (let i = 0; i < n; i++) {
                    buf = appendToBuffer(buf, buildEntry(i));
                }
                expect(buf.length).toBeLessThanOrEqual(MAX_BUFFER);
            }),
            { numRuns: 100 }
        );
    });

    test("buffer length is exactly MAX_BUFFER after exactly MAX_BUFFER+1 appends", () => {
        let buf: LogEntry[] = [];
        for (let i = 0; i <= MAX_BUFFER; i++) {
            buf = appendToBuffer(buf, buildEntry(i));
        }
        expect(buf.length).toBe(MAX_BUFFER);
    });

    test("oldest entries are discarded", () => {
        let buf: LogEntry[] = [];
        for (let i = 0; i <= MAX_BUFFER; i++) {
            buf = appendToBuffer(buf, buildEntry(i));
        }
        // First entry (i=0) should have been dropped.
        expect(buf[0].message).toBe("msg 1");
    });
});
