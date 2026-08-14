import { describe, it, expect } from "vitest";
import type { Application } from "@/types/apps";

describe("Application Manager Filtering & Taxonomy", () => {
    const sampleApps: Application[] = [
        {
            id: "forgejo",
            name: "Forgejo Git Forge",
            description: "Self-hosted Git repository",
            category: "core_service",
            status: "running",
            systemd_unit: "forgejo.service",
            sandbox_tier: 0,
            metrics: {
                cpu_percent: 1.2,
                memory_mb: 180,
                tasks_current: 24,
                uptime_seconds: 3600,
            },
            provenance: {
                declared_in: "modules/services/forgejo/default.nix",
                package_name: "forgejo",
            },
            tags: ["git", "vcs", "core"],
        },
        {
            id: "claudebox",
            name: "Claudebox Runner",
            description: "Sandboxed Anthropic Claude Code runner",
            category: "ai_agent",
            status: "standby",
            binary_name: "claudebox",
            sandbox_tier: 1,
            metrics: {
                cpu_percent: 0,
                memory_mb: 0,
                tasks_current: 0,
                uptime_seconds: 0,
            },
            provenance: {
                declared_in: "home/profiles/ai-tools.nix",
                package_name: "claudebox",
            },
            tags: ["ai", "claude", "sandbox"],
        },
        {
            id: "vaultwarden",
            name: "Vaultwarden",
            description: "Password manager",
            category: "core_service",
            status: "failed",
            systemd_unit: "vaultwarden.service",
            sandbox_tier: 0,
            metrics: {
                cpu_percent: 0,
                memory_mb: 0,
                tasks_current: 0,
                uptime_seconds: 0,
            },
            provenance: {
                declared_in: "modules/services/vaultwarden/default.nix",
                package_name: "vaultwarden",
            },
            tags: ["security", "passwords"],
        },
    ];

    it("filters applications by category accurately", () => {
        const coreServices = sampleApps.filter((a) => a.category === "core_service");
        expect(coreServices).toHaveLength(2);

        const aiAgents = sampleApps.filter((a) => a.category === "ai_agent");
        expect(aiAgents).toHaveLength(1);
        expect(aiAgents[0].id).toBe("claudebox");
    });

    it("filters applications by status", () => {
        const running = sampleApps.filter((a) => a.status === "running");
        expect(running).toHaveLength(1);
        expect(running[0].id).toBe("forgejo");

        const failed = sampleApps.filter((a) => a.status === "failed");
        expect(failed).toHaveLength(1);
        expect(failed[0].id).toBe("vaultwarden");
    });

    it("searches applications by keyword in name, description, tags and unit", () => {
        const query = "git";
        const matches = sampleApps.filter(
            (a) =>
                a.name.toLowerCase().includes(query) ||
                a.description.toLowerCase().includes(query) ||
                (a.tags && a.tags.some((t) => t.includes(query)))
        );
        expect(matches).toHaveLength(1);
        expect(matches[0].id).toBe("forgejo");
    });

    it("identifies sandbox tiers correctly", () => {
        const sandboxed = sampleApps.filter((a) => a.sandbox_tier > 0);
        expect(sandboxed).toHaveLength(1);
        expect(sandboxed[0].sandbox_tier).toBe(1);
    });
});
