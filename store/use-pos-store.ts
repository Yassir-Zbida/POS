import { create } from "zustand";

type PosState = {
  cartCount: number;
  setCartCount: (value: number) => void;
};

export const usePosStore = create<PosState>((set) => ({
  cartCount: 0,
  setCartCount: (value) => set({ cartCount: value }),
}));
