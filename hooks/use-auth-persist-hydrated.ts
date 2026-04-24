"use client";

import { useSyncExternalStore } from "react";

import { useAuthStore } from "@/store/use-auth-store";

/**
 * True once the persisted auth slice has been read from storage.
 * Until then, `isAuthenticated` / `user` may still reflect initial defaults.
 */
export function useAuthPersistHydrated(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (useAuthStore.persist.hasHydrated()) {
        queueMicrotask(onStoreChange);
        return () => {};
      }
      return useAuthStore.persist.onFinishHydration(() => {
        onStoreChange();
      });
    },
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  );
}
