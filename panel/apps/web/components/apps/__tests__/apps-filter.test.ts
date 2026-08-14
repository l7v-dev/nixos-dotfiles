import { describe, it, expect } from "vitest";
import type { Application } from "@/types/apps";

describe("Application Manager Filtering & Taxonomy", () => {
    const sampleApps: Application[] = [
        {
            id: "forgejo",
            name: "Forgejo Git Platform",
            description: "Self-hosted Git repository",
            category: "core_platform",
            status: "running",
            access_level: "public_https",
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
            category: "ai_workload",
            status: "standby",
            access_level: "internal_only",
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
            category: "core_platform",
            status: "failed",
            access_level: "public_https",
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
        {
            id: "tailscale",
            name: "Tailscale Mesh VPN",
            description: "Zero-trust encrypted WireGuard mesh",
            category: "ingress_network",
            status: "running",
            access_level: "tailscale_mesh",
            systemd_unit: "tailscaled.service",
            sandbox_tier: 0,
            metrics: {
                cpu_percent: 0.1,
                memory_mb: 45,
                tasks_current: 8,
                uptime_seconds: 7200,
            },
            provenance: {
                declared_in: "modules/infrastructure/security/default.nix",
                package_name: "tailscale",
            },
            tags: ["vpn", "mesh", "security"],
        },
    ];

    it("filters applications by enterprise category accurately", () => {
        const corePlatforms = sampleApps.filter((a) => a.category === "core_platform");
        expect(corePlatforms).toHaveLength(2);

        const aiWorkloads = sampleApps.filter((a) => a.category === "ai_workload");
        expect(aiWorkloads).toHaveLength(1);
        expect(aiWorkloads[0].id).toBe("claudebox");

        const ingress = sampleApps.filter((a) => a.category === "ingress_network");
        expect(ingress).toHaveLength(1);
        expect(ingress[0].id).toBe("tailscale");
    });

    it("filters applications by remote access level", () => {
        const publicSSL = sampleApps.filter((a) => a.access_level === "public_https");
        expect(publicSSL).toHaveLength(2);

        const tailscaleOnly = sampleApps.filter((a) => a.access_level === "tailscale_mesh");
        expect(tailscaleOnly).toHaveLength(1);
        expect(tailscaleOnly[0].id).toBe("tailscale");
    });

    it("filters applications by status", () => {
        const running = sampleApps.filter((a) => a.status === "running");
        expect(running).toHaveLength(2);

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
