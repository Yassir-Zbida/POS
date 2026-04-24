"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";

import { RoleGuard } from "@/components/role-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { LanguageSwitcherInline } from "@/components/language-switcher-footer";
import { ModeToggle } from "@/components/mode-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { usePathname } from "@/i18n/navigation";

function titleKeyForDashboardPath(pathname: string) {
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

  return (
    <RoleGuard>
      <SidebarProvider>
        <AppSidebar side={isRtl ? "right" : "left"} />
        <SidebarInset className="bg-background">
          <header className="flex min-h-12 shrink-0 items-center justify-between gap-3 bg-background px-4 py-2">
            <div className="flex items-center gap-2">
              <SidebarTrigger className={isRtl ? "-mr-1" : "-ml-1"} />
              <Separator
                orientation="vertical"
                className="mx-2 data-[orientation=vertical]:h-4"
              />
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>{t("dashboard")}</span>
                {pageKey ? (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="text-muted-foreground">{t(pageKey)}</span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcherInline />
              <ModeToggle />
            </div>
          </header>
          <div className="flex flex-1 flex-col p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </RoleGuard>
  );
}

