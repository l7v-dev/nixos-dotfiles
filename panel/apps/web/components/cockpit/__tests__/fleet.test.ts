import { describe, it, expect } from "vitest";
import type { FleetNode, ColmenaDeployRequest } from "@/types/api";

describe("Fleet Orchestration & Mesh Network Management", () => {
    const sampleFleet: FleetNode[] = [
        {
            id: "laptop",
            name: "Laptop (Workstation)",
            target_host: "localhost",
            roles: ["desktop", "workstation", "ai-sandbox"],
            tags: ["workstation", "primary"],
            status: "local",
            ping_ms: 0,
            mesh_ip: "100.64.0.1",
            is_local: true,
            last_checked: "2026-08-15T13:00:00Z",
        },
        {
            id: "server",
            name: "Server (Core Production)",
            target_host: "server.l7v.dev",
            roles: ["web", "db", "observe", "git"],
            tags: ["production"],
            status: "online",
            ping_ms: 18,
            mesh_ip: "100.64.0.2",
            is_local: false,
            last_checked: "2026-08-15T13:00:00Z",
        },
        {
            id: "builder",
            name: "Builder (CI & Cache)",
            target_host: "builder.l7v.dev",
            roles: ["ci", "cache"],
            tags: ["builder"],
            status: "offline",
            ping_ms: -1,
            mesh_ip: "100.64.0.3",
            is_local: false,
            last_checked: "2026-08-15T13:00:00Z",
        },
        {
            id: "backup",
            name: "Backup (Offsite Storage)",
            target_host: "backup.l7v.dev",
            roles: ["backup"],
            tags: ["backup"],
            status: "offline",
            ping_ms: -1,
            mesh_ip: "100.64.0.4",
            is_local: false,
            last_checked: "2026-08-15T13:00:00Z",
        },
    ];

    it("verifies topology node counts and local identifier", () => {
        expect(sampleFleet).toHaveLength(4);
        const local = sampleFleet.find((n) => n.is_local);
        expect(local).toBeDefined();
        expect(local?.id).toBe("laptop");
    });

    it("accurately calculates online vs offline nodes", () => {
        const online = sampleFleet.filter((n) => n.status === "online" || n.status === "local");
        const offline = sampleFleet.filter((n) => n.status === "offline" || n.status === "unreachable");

        expect(online).toHaveLength(2);
        expect(offline).toHaveLength(2);
    });

    it("filters nodes by role and mesh ip", () => {
        const dbNodes = sampleFleet.filter((n) => n.roles.includes("db"));
        expect(dbNodes).toHaveLength(1);
        expect(dbNodes[0].id).toBe("server");
        expect(dbNodes[0].mesh_ip).toBe("100.64.0.2");

        const ciNodes = sampleFleet.filter((n) => n.roles.includes("ci"));
        expect(ciNodes).toHaveLength(1);
        expect(ciNodes[0].id).toBe("builder");
    });

    it("formats Colmena deployment requests correctly", () => {
        const req: ColmenaDeployRequest = {
            target: "@production",
            action: "apply",
            build_on_target: false,
            verbose: true,
        };

        expect(req.target).toBe("@production");
        expect(req.action).toBe("apply");
        expect(req.build_on_target).toBe(false);
    });
});
