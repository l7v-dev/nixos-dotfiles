"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FleetNode } from "@/types/api";

const DEFAULT_FLEET_NODES: FleetNode[] = [
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
        last_checked: new Date().toISOString(),
    },
    {
        id: "server",
        name: "Server (Core Production)",
        target_host: "server.l7v.dev",
        roles: ["web", "db", "observe", "git"],
        tags: ["production"],
        status: "offline",
        ping_ms: -1,
        mesh_ip: "100.64.0.2",
        is_local: false,
        last_checked: new Date().toISOString(),
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
        last_checked: new Date().toISOString(),
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
        last_checked: new Date().toISOString(),
    },
];

interface HostStore {
    selectedHost: string;
    availableHosts: string[];
    nodes: FleetNode[];
    setHost: (host: string) => void;
    setNodes: (nodes: FleetNode[]) => void;
    getNode: (id: string) => FleetNode | undefined;
}

export const useHostStore = create<HostStore>()(
    persist(
        (set, get) => ({
            selectedHost: "laptop",
            availableHosts: ["laptop", "server", "builder", "backup"],
            nodes: DEFAULT_FLEET_NODES,
            setHost: (host: string) => set({ selectedHost: host }),
            setNodes: (nodes: FleetNode[]) =>
                set({
                    nodes,
                    availableHosts: nodes.map((n) => n.id),
                }),
            getNode: (id: string) => get().nodes.find((n) => n.id === id),
        }),
        { name: "l7v-panel-host" }
    )
);
