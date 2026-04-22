"use client";

import * as React from "react";

import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/store/use-auth-store";
import { dashboardHomeForRole } from "@/lib/dashboard";

export default function DashboardPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  React.useEffect(() => {
    if (!isAuthenticated || !user) return;
    router.replace(dashboardHomeForRole(user.role));
  }, [isAuthenticated, router, user]);

  return null;
}

