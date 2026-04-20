import { create } from "zustand";

type SettingsState = {
  currency: string;
  setCurrency: (value: string) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  currency: "USD",
  setCurrency: (value) => set({ currency: value }),
}));
