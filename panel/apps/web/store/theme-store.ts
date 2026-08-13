"use client";

import { create } from "zustand";

type Theme = "light" | "dark" | "system";

interface ThemeStore {
    theme: Theme;
    setTheme: (t: Theme) => void;
}

export const useThemeStore = create<ThemeStore>()((set) => ({
    theme: "system",
    setTheme: (theme: Theme) => set({ theme }),
}));
