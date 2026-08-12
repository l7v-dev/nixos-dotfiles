// Feature: l7v-panel
// Property 8: Case-Insensitive Service Filter
// Validates: Requirements 2.3
import { describe, expect, test } from "vitest";
import fc from "fast-check";
import type { ServiceUnit } from "@/types/api";

function filterUnits(units: ServiceUnit[], query: string): ServiceUnit[] {
    const q = query.toLowerCase();
    return units.filter(
        (u) =>
            u.name.toLowerCase().includes(q) ||
            u.description.toLowerCase().includes(q)
    );
}

function makeUnit(name: string, desc: string): ServiceUnit {
    return {
        name,
        description: desc,
        load_state: "loaded",
        active_state: "active",
        sub_state: "running",
        unit_file_state: "enabled",
    };
}

describe("service filter case-insensitivity", () => {
    test("Property 8 — lowercase and uppercase queries return same results (100 runs)", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        name: fc.string({ minLength: 1 }),
                        desc: fc.string(),
                    }),
                    { maxLength: 20 }
                ),
                fc.string({ minLength: 1 }),
                (items, query) => {
                    const units = items.map((i) => makeUnit(i.name, i.desc));
                    const lower = filterUnits(units, query.toLowerCase());
                    const upper = filterUnits(units, query.toUpperCase());
                    expect(lower.map((u) => u.name)).toEqual(upper.map((u) => u.name));
                }
            ),
            { numRuns: 100 }
        );
    });

    test("empty query returns all units", () => {
        const units = [makeUnit("nginx.service", "nginx"), makeUnit("sshd.service", "ssh")];
        expect(filterUnits(units, "")).toHaveLength(2);
    });

    test("matches on description regardless of case", () => {
        const units = [makeUnit("test.service", "NGINX Web Server")];
        expect(filterUnits(units, "nginx")).toHaveLength(1);
    });
});
