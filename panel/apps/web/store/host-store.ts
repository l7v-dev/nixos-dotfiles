"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface HostStore {
    selectedHost: string;
    availableHosts: string[];
    setHost: (host: string) => void;
}

export const useHostStore = create<HostStore>()(
    persist(
        (set) => ({
            selectedHost: "laptop",
            availableHosts: ["laptop"],
            setHost: (host: string) => set({ selectedHost: host }),
        }),
        { name: "l7v-panel-host" }
    )
);
