"use client";

import * as React from "react";

import { useRouter } from "@/i18n/navigation";
import { useAuthPersistHydrated } from "@/hooks/use-auth-persist-hydrated";
import { dashboardHomeForRole } from "@/lib/dashboard";
import { useAuthStore } from "@/store/use-auth-store";
import { AUTH_ROLES } from "@/types/auth";

/** On the login (and similar) page, send users who already have a session to their dashboard. */
export function RedirectIfAuthenticated() {
  const router = useRouter();
  const persistReady = useAuthPersistHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  React.useEffect(() => {
    if (!persistReady) return;
    if (!isAuthenticated || !user) return;
    if (user.role === AUTH_ROLES.MANAGER && user.mustChangePassword) {
      router.replace("/first-login");
      return;
    }
    router.replace(dashboardHomeForRole(user.role));
  }, [isAuthenticated, persistReady, router, user]);

  return null;
}
