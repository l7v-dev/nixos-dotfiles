"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
    token: string | null;
    isLocked: boolean;
    pinModalOpen: boolean;
    setToken: (token: string | null) => void;
    lock: () => void;
    unlock: (token?: string) => void;
    setPinModalOpen: (open: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            isLocked: false,
            pinModalOpen: false,
            setToken: (token) => set({ token, isLocked: !token }),
            lock: () => set({ isLocked: true, pinModalOpen: true }),
            unlock: (token) =>
                set((state) => ({
                    token: token ?? state.token,
                    isLocked: false,
                    pinModalOpen: false,
                })),
            setPinModalOpen: (open) => set({ pinModalOpen: open }),
        }),
        {
            name: "l7v-panel-auth",
            partialize: (state) => ({ token: state.token }),
        }
    )
);
