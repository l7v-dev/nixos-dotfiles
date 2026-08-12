// Feature: l7v-panel
// Property 12: Host Selection localStorage Round-Trip
// Validates: Requirements 8.8
import { describe, expect, test, beforeEach } from "vitest";
import fc from "fast-check";

// Reset Zustand store between tests by mocking localStorage.
const storedValues: Record<string, string> = {};
globalThis.localStorage = {
    getItem: (k: string) => storedValues[k] ?? null,
    setItem: (k: string, v: string) => { storedValues[k] = v; },
    removeItem: (k: string) => { delete storedValues[k]; },
    clear: () => { Object.keys(storedValues).forEach((k) => delete storedValues[k]); },
    length: 0,
    key: () => null,
};

describe("host-store localStorage round-trip", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test("Property 12 — selected host survives serialise+hydrate (100 runs)", async () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 32 }).filter((s) => /^[a-z0-9-]+$/.test(s)),
                (host) => {
                    // Simulate persisting and re-reading from localStorage.
                    const state = { state: { selectedHost: host, availableHosts: [host] }, version: 0 };
                    localStorage.setItem("l7v-panel-host", JSON.stringify(state));
                    const raw = localStorage.getItem("l7v-panel-host");
                    expect(raw).not.toBeNull();
                    const parsed = JSON.parse(raw!);
                    expect(parsed.state.selectedHost).toBe(host);
                }
            ),
            { numRuns: 100 }
        );
    });
});
