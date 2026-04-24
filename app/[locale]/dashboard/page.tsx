"use client";

import * as React from "react";

import { useRouter } from "@/i18n/navigation";
import { useAuthPersistHydrated } from "@/hooks/use-auth-persist-hydrated";
import { useAuthStore } from "@/store/use-auth-store";
import { dashboardHomeForRole } from "@/lib/dashboard";

export default function DashboardPage() {
  const router = useRouter();
  const persistReady = useAuthPersistHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  React.useEffect(() => {
    if (!persistReady) return;
    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }
    router.replace(dashboardHomeForRole(user.role));
  }, [isAuthenticated, persistReady, router, user]);

  return null;
}

