import { create } from "zustand";
import { persist } from "zustand/middleware";

export const SIDEBAR_WIDTH_MIN = 180;
export const SIDEBAR_WIDTH_MAX = 400;
export const SIDEBAR_WIDTH_DEFAULT = 256; // 16rem

type SettingsState = {
  currency: string;
  setCurrency: (value: string) => void;
  sidebarWidth: number;
  setSidebarWidth: (px: number) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      currency: "USD",
      setCurrency: (value) => set({ currency: value }),
      sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
      setSidebarWidth: (px) =>
        set({
          sidebarWidth: Math.min(
            SIDEBAR_WIDTH_MAX,
            Math.max(SIDEBAR_WIDTH_MIN, Math.round(px))
          ),
        }),
    }),
    { name: "hssabaty-settings" }
  )
);
