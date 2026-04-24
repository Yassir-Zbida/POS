"use client";

import * as React from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useAuthPersistHydrated } from "@/hooks/use-auth-persist-hydrated";
import { useAuthStore } from "@/store/use-auth-store";
import { dashboardHomeForRole, isAllowedDashboardPath } from "@/lib/dashboard";
import { AUTH_ROLES } from "@/types/auth";

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const persistReady = useAuthPersistHydrated();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  React.useEffect(() => {
    if (!persistReady) return;

    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }

    if (!pathname.startsWith("/dashboard")) return;

    if (!isAllowedDashboardPath(pathname, user.role)) {
      router.replace(dashboardHomeForRole(user.role));
    }
  }, [isAuthenticated, pathname, persistReady, router, user]);

  if (!persistReady) return null;
  if (!isAuthenticated || !user) return null;

  if (pathname.startsWith("/dashboard") && !isAllowedDashboardPath(pathname, user.role)) return null;

  // Fallback: if we ever got a role outside expected union, avoid rendering.
  if (
    user.role !== AUTH_ROLES.ADMIN &&
    user.role !== AUTH_ROLES.MANAGER &&
    user.role !== AUTH_ROLES.CASHIER
  ) {
    return null;
  }

  return <>{children}</>;
}

