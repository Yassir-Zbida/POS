"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuthPersistHydrated } from "@/hooks/use-auth-persist-hydrated";
import { dashboardHomeForRole } from "@/lib/dashboard";
import { useAuthStore } from "@/store/use-auth-store";
import { AUTH_ROLES } from "@/types/auth";
import { FirstLoginForm } from "@/components/first-login-form";

export function FirstLoginPageClient() {
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
    const needsFirstLogin =
      user.role === AUTH_ROLES.MANAGER && Boolean(user.mustChangePassword);
    if (!needsFirstLogin) {
      router.replace(dashboardHomeForRole(user.role));
    }
  }, [isAuthenticated, persistReady, router, user]);

  if (!persistReady) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  const needsFirstLogin =
    user.role === AUTH_ROLES.MANAGER && Boolean(user.mustChangePassword);
  if (!needsFirstLogin) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return <FirstLoginForm />;
}
