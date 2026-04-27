"use client";

import * as React from "react";
import { Suspense } from "react";
import { useTranslations } from "next-intl";

import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/use-auth-store";
import { Bell, LogOut, Search, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/mode-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { StaffLanguageSwitcher } from "@/components/staff/staff-language-switcher";

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
        "sticky top-0 z-20 flex min-h-14 items-center justify-between gap-2 border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4",
        className,
      )}
    >
      {/* ── Left: trigger + title ── */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger className="shrink-0" />
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold tracking-tight sm:text-xl">{t(`titles.${titleKey}`)}</h1>
          {user?.email ? (
            <p className="hidden truncate text-xs text-muted-foreground sm:block">{user.email}</p>
          ) : null}
        </div>
      </div>

      {/* ── Center: search bar (md+) ── */}
      <div className="relative hidden w-full min-w-0 max-w-xs md:flex lg:max-w-sm">
        <Search
          className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          readOnly
          aria-readonly
          className="h-9 rounded-2xl border-border/50 bg-muted/50 ps-9 text-xs shadow-sm"
          placeholder={t("topbar.searchStub")}
          tabIndex={-1}
        />
      </div>

      {/* ── Right: actions ── */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <Button type="button" variant="ghost" size="icon" className="rounded-xl" aria-label={t("topbar.search")}>
          <Bell className="size-4" aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="hidden rounded-xl sm:inline-flex" aria-label={t("titles.settings")}>
          <Settings2 className="size-4" aria-hidden="true" />
        </Button>

        <Suspense fallback={null}>
          <StaffLanguageSwitcher />
        </Suspense>
        <ModeToggle />

        <Button
          variant="outline"
          size="sm"
          className="rounded-xl border-border/70 px-2 sm:px-3"
          onClick={() => clearSession()}
        >
          <LogOut className="size-4" aria-hidden="true" />
          <span className="ms-1 hidden sm:inline">{t("topbar.logout")}</span>
        </Button>
      </div>
    </header>
  );
}
