"use client";

import * as React from "react";
import { Suspense } from "react";
import { useTranslations } from "next-intl";

import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/use-auth-store";
import { Bell, LogOut, Search, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StaffLanguageSwitcher } from "@/components/staff/staff-language-switcher";
import { StaffThemeToggle } from "@/components/staff/staff-theme-toggle";

function titleKeyForPath(pathname: string) {
  if (pathname.includes("/pos")) return "pos" as const;
  if (pathname.includes("/products")) return "products" as const;
  if (pathname.includes("/customers")) return "customers" as const;
  if (pathname.includes("/sales")) return "sales" as const;
  if (pathname.includes("/inventory")) return "inventory" as const;
  if (pathname.includes("/cash-register-sessions")) return "cashRegister" as const;
  if (pathname.includes("/reports")) return "reports" as const;
  if (pathname.includes("/settings")) return "settings" as const;
  return "home" as const;
}

export function StaffTopbar({ className }: { className?: string }) {
  const t = useTranslations("staff");
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const titleKey = titleKeyForPath(pathname);

  return (
    <header
      className={cn(
        "flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-[hsl(var(--cashier-canvas))] px-3 py-2 sm:px-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">{t(`titles.${titleKey}`)}</h1>
        {user?.email ? (
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        ) : null}
      </div>

      <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap sm:gap-2.5">
        <div className="order-last hidden items-center gap-2 rounded-2xl border border-border/60 bg-[hsl(var(--cashier-surface))] px-3 py-1.5 text-sm text-muted-foreground shadow-sm md:order-none md:flex">
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="text-xs">{t("topbar.searchStub")}</span>
        </div>

        <div className="flex items-center gap-1.5 sm:ms-auto">
          <Button type="button" variant="ghost" size="icon" className="rounded-xl" aria-label={t("topbar.search")}>
            <Bell className="size-4" aria-hidden="true" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="rounded-xl" aria-label={t("titles.settings")}>
            <Settings2 className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <Suspense fallback={null}>
          <StaffLanguageSwitcher />
        </Suspense>
        <StaffThemeToggle />

        <Button variant="outline" size="sm" className="rounded-xl border-border/70" onClick={() => clearSession()}>
          <LogOut className="size-4" aria-hidden="true" />
          {t("topbar.logout")}
        </Button>
      </div>
    </header>
  );
}
