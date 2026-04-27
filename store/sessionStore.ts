import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const CLIENT_MAX_ATTEMPTS = 3;
const CLIENT_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

type SessionState = {
  isLocked: boolean;
  /** Number of consecutive wrong-PIN attempts recorded on the client. */
  pinFailCount: number;
  /** Unix timestamp (ms) until which the PIN entry is locked on the client. 0 = not locked. */
  pinLockedUntil: number;

  lock: () => void;
  unlock: () => void;
  /** Call after every failed PIN attempt (wrong PIN or auth error). */
  recordPinFailure: () => void;
  /** Sync the lockout end-time received from the server (in seconds from now). */
  applyServerLockout: (remainingSeconds: number) => void;
  /** Reset client-side attempt counters after a successful unlock. */
  resetPinState: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      isLocked: false,
      pinFailCount: 0,
      pinLockedUntil: 0,

      lock: () => set({ isLocked: true }),
      unlock: () => set({ isLocked: false, pinFailCount: 0, pinLockedUntil: 0 }),

      recordPinFailure: () =>
        set((state) => {
          const next = state.pinFailCount + 1;
          if (next >= CLIENT_MAX_ATTEMPTS) {
            return {
              pinFailCount: 0,
              pinLockedUntil: Date.now() + CLIENT_LOCKOUT_MS,
            };
          }
          return { pinFailCount: next };
        }),

      applyServerLockout: (remainingSeconds: number) =>
        set({ pinFailCount: 0, pinLockedUntil: Date.now() + remainingSeconds * 1000 }),

      resetPinState: () => set({ pinFailCount: 0, pinLockedUntil: 0 }),
    }),
    {
      name: "hssabaty-session",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
