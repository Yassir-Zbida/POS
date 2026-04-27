"use client";

import { useEffect } from "react";
import { initErrorTracker } from "@/lib/error-tracker";
import { useAuthStore } from "@/store/use-auth-store";

/**
 * Mounts the global error tracker once on the client.
 * Passes the current access token so error reports are attributed to the user.
 */
export function ErrorTrackerProvider() {
  const getToken = () => useAuthStore.getState().accessToken ?? null;

  useEffect(() => {
    initErrorTracker(getToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
