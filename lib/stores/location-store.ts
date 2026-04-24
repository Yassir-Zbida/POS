"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActiveLocation = {
  id: string;
  name: string;
  city: string | null;
};

type LocationState = {
  activeLocation: ActiveLocation | null;
  setActiveLocation: (loc: ActiveLocation | null) => void;
};

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      activeLocation: null,
      setActiveLocation: (loc) => set({ activeLocation: loc }),
    }),
    { name: "hssabaty-active-location" },
  ),
);
