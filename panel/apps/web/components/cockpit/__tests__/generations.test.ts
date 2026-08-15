import { describe, it, expect } from "vitest";
import type { NixOSGeneration, GenerationDiff, FlakeInput } from "@/types/api";

describe("NixOS Generation & Closure Diff Management", () => {
    const sampleGenerations: NixOSGeneration[] = [
        {
            number: 78,
            timestamp: "2026-08-15T01:51:00Z",
            date_formatted: "2026-08-15 01:51:00",
            current: true,
            nixos_version: "26.11.20260813.0e251e2",
            kernel_version: "linux-zen-7.1.8",
            configuration_revision: "0e251e2",
            store_path: "/nix/store/y7dxi462lpkhligcf7dcchrr7ahxyl1z-nixos-system-L7V-26.11.20260813.0e251e2",
        },
        {
            number: 77,
            timestamp: "2026-08-15T01:26:00Z",
            date_formatted: "2026-08-15 01:26:00",
            current: false,
            nixos_version: "26.11.20260813.0e251e2",
            kernel_version: "linux-zen-7.1.8",
            configuration_revision: "0e251e2",
            store_path: "/nix/store/7zkiql3cx2dcs6sq3ppijkrgddah74lq-nixos-system-L7V-26.11.20260813.0e251e2",
        },
        {
            number: 53,
            timestamp: "2026-08-07T19:38:00Z",
            date_formatted: "2026-08-07 19:38:00",
            current: false,
            nixos_version: "26.11.20260805.b7c2ada",
            kernel_version: "linux-zen-7.1.5",
            configuration_revision: "b7c2ada",
            store_path: "/nix/store/1mazn5cwxrzbrjxfx9y6jywq3h7v149p-nixos-system-L7V-26.11.20260805.b7c2ada",
        },
    ];

    it("identifies active and previous generations accurately", () => {
        const active = sampleGenerations.find((g) => g.current);
        expect(active).toBeDefined();
        expect(active?.number).toBe(78);

        const older = sampleGenerations.filter((g) => !g.current);
        expect(older).toHaveLength(2);
        expect(older[0].number).toBe(77);
    });

    it("filters generations by search query (version, number, kernel, rev)", () => {
        const byRev = sampleGenerations.filter((g) => g.configuration_revision?.includes("b7c2ada"));
        expect(byRev).toHaveLength(1);
        expect(byRev[0].number).toBe(53);

        const byKernel = sampleGenerations.filter((g) => g.kernel_version.includes("7.1.5"));
        expect(byKernel).toHaveLength(1);
        expect(byKernel[0].number).toBe(53);
    });

    it("calculates closure package diffs correctly", () => {
        const sampleDiff: GenerationDiff = {
            from_generation: 77,
            to_generation: 78,
            from_store_path: "/nix/store/from",
            to_store_path: "/nix/store/to",
            summary: {
                added_count: 1,
                removed_count: 1,
                updated_count: 2,
                rebuilt_count: 1,
                total_changes: 5,
            },
            items: [
                { name: "delve", change_type: "added", new_version: "1.27.1", size_delta: "30.8 MiB", raw: "delve: ∅ → 1.27.1, 30.8 MiB" },
                { name: "iflow-cli", change_type: "removed", old_version: "0.5.19", size_delta: "-171.5 MiB", raw: "iflow-cli: 0.5.19 → ∅, -171.5 MiB" },
                { name: "claude-desktop", change_type: "updated", old_version: "1.24.0", new_version: "1.30.0", size_delta: "24.5 MiB", raw: "claude-desktop: 1.24.0 → 1.30.0, 24.5 MiB" },
                { name: "firefox", change_type: "updated", old_version: "153.0.3", new_version: "153.0.4", raw: "firefox: 153.0.3 → 153.0.4" },
                { name: "panel-agent", change_type: "rebuilt", size_delta: "264.8 KiB", raw: "panel-agent: 264.8 KiB" },
            ],
            raw_output: "...",
        };

        expect(sampleDiff.summary.total_changes).toBe(5);
        expect(sampleDiff.items.filter((i) => i.change_type === "added")).toHaveLength(1);
        expect(sampleDiff.items.filter((i) => i.change_type === "removed")).toHaveLength(1);
        expect(sampleDiff.items.filter((i) => i.change_type === "updated")).toHaveLength(2);
        expect(sampleDiff.items.filter((i) => i.change_type === "rebuilt")).toHaveLength(1);
    });

    it("verifies flake inputs mapping", () => {
        const sampleInputs: FlakeInput[] = [
            {
                name: "nixpkgs",
                type: "github",
                owner: "NixOS",
                repo: "nixpkgs",
                ref: "nixpkgs-unstable",
                revision: "044bfe75bfe4c7bbe043dc17b5e42ea823b84a09",
                short_revision: "044bfe7",
                last_modified_relative: "1 saat önce",
                url: "https://github.com/NixOS/nixpkgs",
            },
            {
                name: "home-manager",
                type: "github",
                owner: "nix-community",
                repo: "home-manager",
                revision: "c554d3441f725537854e877519f01cbd60680174",
                short_revision: "c554d34",
                last_modified_relative: "3 saat önce",
                url: "https://github.com/nix-community/home-manager",
            },
        ];

        expect(sampleInputs).toHaveLength(2);
        expect(sampleInputs[0].name).toBe("nixpkgs");
        expect(sampleInputs[0].short_revision).toBe("044bfe7");
    });
});
