import { describe, it, expect } from "vitest";
import type { ContainerSummary } from "@/types/containers";

describe("Container Filter & State Logic", () => {
    const mockContainers: ContainerSummary[] = [
        {
            id: "c1",
            names: ["web-frontend"],
            image: "nginx:alpine",
            imageId: "sha256:1",
            command: "nginx",
            created: 1700000000,
            state: "running",
            status: "Up 2 hours",
            ports: [{ privatePort: 80, publicPort: 8080, type: "tcp" }],
            labels: { "com.docker.compose.project": "stack-a" },
            mounts: [],
            stack: "stack-a",
            isNixos: false,
            engine: "podman",
        },
        {
            id: "c2",
            names: ["db-postgres"],
            image: "postgres:16",
            imageId: "sha256:2",
            command: "postgres",
            created: 1700000100,
            state: "exited",
            status: "Exited (0)",
            ports: [{ privatePort: 5432, type: "tcp" }],
            labels: {},
            mounts: [],
            isNixos: true,
            engine: "podman",
        },
        {
            id: "c3",
            names: ["redis-cache"],
            image: "redis:7",
            imageId: "sha256:3",
            command: "redis-server",
            created: 1700000200,
            state: "paused",
            status: "Paused",
            ports: [{ privatePort: 6379, type: "tcp" }],
            labels: {},
            mounts: [],
            isNixos: false,
            engine: "docker",
        },
    ];

    it("filters running containers correctly", () => {
        const running = mockContainers.filter((c) => c.state === "running");
        expect(running).toHaveLength(1);
        expect(running[0].names[0]).toBe("web-frontend");
    });

    it("filters stopped containers correctly", () => {
        const stopped = mockContainers.filter((c) => c.state !== "running");
        expect(stopped).toHaveLength(2);
    });

    it("searches by container name, image, and stack", () => {
        const searchName = mockContainers.filter((c) =>
            c.names.some((n) => n.toLowerCase().includes("postgres"))
        );
        expect(searchName).toHaveLength(1);
        expect(searchName[0].id).toBe("c2");

        const searchStack = mockContainers.filter((c) =>
            c.stack?.toLowerCase().includes("stack-a")
        );
        expect(searchStack).toHaveLength(1);
        expect(searchStack[0].id).toBe("c1");
    });

    it("identifies NixOS declarative container correctly", () => {
        const nixosContainers = mockContainers.filter((c) => c.isNixos);
        expect(nixosContainers).toHaveLength(1);
        expect(nixosContainers[0].names[0]).toBe("db-postgres");
    });
});
