import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthState = {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: import("@/types/auth").AuthUser | null;

  setSession: (session: {
    accessToken: string;
    refreshToken: string;
    user: import("@/types/auth").AuthUser;
  }) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      user: null,

      setSession: ({ accessToken, refreshToken, user }) =>
        set({
          isAuthenticated: true,
          accessToken,
          refreshToken,
          user,
        }),
      clearSession: () =>
        set({
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          user: null,
        }),
    }),
    {
      name: "hssabaty-auth",
      partialize: (s) => ({
        isAuthenticated: s.isAuthenticated,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
      }),
    },
  ),
);
