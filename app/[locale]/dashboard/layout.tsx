"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";

import { RoleGuard } from "@/components/role-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { LanguageSwitcherInline } from "@/components/language-switcher-footer";
import { ModeToggle } from "@/components/mode-toggle";
import { SidebarResizeHandle } from "@/components/sidebar-resize-handle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { usePathname } from "@/i18n/navigation";
import { useSettingsStore } from "@/store/use-settings-store";
import { useSessionStore } from "@/store/sessionStore";
import { useAuthStore } from "@/store/use-auth-store";
import { LockScreen } from "@/components/cashier/LockScreen";

function titleKeyForDashboardPath(pathname: string) {
  if (pathname.includes("/dashboard/admin/merchants/new")) return "adminMerchantsNew" as const;
  if (
    pathname.match(/\/dashboard\/admin\/merchants\/[^/]+/) &&
    !pathname.includes("/merchants/new")
  ) {
    return "adminMerchantDetail" as const;
  }
  if (pathname.includes("/dashboard/admin/merchants")) return "adminMerchants" as const;
  if (pathname.includes("/dashboard/admin")) return "admin" as const;
  if (pathname.includes("/dashboard/cashier/pos")) return "cashierPos" as const;
  if (pathname.includes("/dashboard/cashier")) return "cashier" as const;
  if (pathname.includes("/dashboard/sales")) return "dashboardSales" as const;
  if (pathname.includes("/dashboard/reports")) return "dashboardReports" as const;
  if (pathname.includes("/dashboard/settings")) return "dashboardSettings" as const;
  if (pathname.includes("/dashboard/customers")) return "dashboardCustomers" as const;
  if (pathname.includes("/dashboard/products")) return "dashboardProducts" as const;
  if (pathname.includes("/dashboard/categories")) return "dashboardCategories" as const;
  if (pathname.includes("/dashboard/inventory")) return "dashboardInventory" as const;
  if (pathname.includes("/dashboard/cash-register")) return "dashboardCashRegister" as const;
  return null;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const pathname = usePathname();
  const t = useTranslations("meta.titles");
  const pageKey = titleKeyForDashboardPath(pathname);
  const sidebarWidth = useSettingsStore((s) => s.sidebarWidth);
  const isLocked = useSessionStore((s) => s.isLocked);
  const userRole = useAuthStore((s) => s.user?.role);
  const showLockScreen = isLocked && userRole === "CASHIER";

  return (
    <RoleGuard>
      <SidebarProvider
        style={
          { "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties
        }
      >
        <AppSidebar side={isRtl ? "right" : "left"} />
        <SidebarInset className="flex min-h-screen flex-col bg-background">
          {/* Drag handle — sits at the sidebar edge, hidden when collapsed */}
          <SidebarResizeHandle side={isRtl ? "right" : "left"} />
          {/* ── Sticky top header ── */}
          <header className="sticky top-0 z-20 flex min-h-12 shrink-0 items-center justify-between gap-2 bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
              <SidebarTrigger className={isRtl ? "-mr-1 shrink-0" : "-ml-1 shrink-0"} />
              <Separator
                orientation="vertical"
                className="mx-1 hidden data-[orientation=vertical]:h-4 sm:block"
              />
              <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium sm:gap-2">
                <span className="shrink-0">{t("dashboard")}</span>
                {pageKey ? (
                  <>
                    <Separator orientation="vertical" className="hidden h-4 sm:block" />
                    <span className="truncate text-muted-foreground">{t(pageKey)}</span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <LanguageSwitcherInline />
              <ModeToggle />
            </div>
          </header>
          {/* ── Page content ── */}
          <div className="flex flex-1 flex-col p-3 sm:p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>

      {/* Lock screen — only for cashier role; admin and manager bypass it */}
      {showLockScreen && <LockScreen />}
    </RoleGuard>
  );
}

