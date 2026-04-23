"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Boxes,
  CreditCard,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";

type NavItem = {
  href: string;
  messageKey: "pos" | "products" | "customers" | "sales" | "inventory" | "cashRegister" | "reports" | "settings";
  icon: React.ReactNode;
};

const nav: readonly NavItem[] = [
  { href: "/dashboard/cashier/pos", messageKey: "pos", icon: <ShoppingCart className="size-4" /> },
  { href: "/dashboard/cashier/products", messageKey: "products", icon: <Package className="size-4" /> },
  { href: "/dashboard/cashier/customers", messageKey: "customers", icon: <Users className="size-4" /> },
  { href: "/dashboard/cashier/sales", messageKey: "sales", icon: <CreditCard className="size-4" /> },
  { href: "/dashboard/cashier/inventory", messageKey: "inventory", icon: <Boxes className="size-4" /> },
  { href: "/dashboard/cashier/cash-register-sessions", messageKey: "cashRegister", icon: <LayoutDashboard className="size-4" /> },
  { href: "/dashboard/cashier/reports", messageKey: "reports", icon: <BarChart3 className="size-4" /> },
  { href: "/dashboard/cashier/settings", messageKey: "settings", icon: <Settings className="size-4" /> },
];

export function StaffSidebar() {
  const t = useTranslations("staff");
  const pathname = usePathname();

  return (
    <aside className="flex h-dvh w-[4.5rem] shrink-0 flex-col border-e border-white/10 bg-[hsl(var(--cashier-sidebar))] text-[hsl(var(--cashier-sidebar-foreground))] md:w-60 lg:w-64">
      <div className="flex h-16 items-center justify-center gap-0 border-b border-white/10 px-3 md:justify-start md:gap-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          <Package className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 max-md:hidden">
          <div className="truncate text-sm font-semibold tracking-tight">{t("brand.name")}</div>
          <div className="truncate text-xs text-[hsl(var(--cashier-sidebar-muted))]">{t("brand.tagline")}</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto p-2.5" aria-label="Staff">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={t(`nav.${item.messageKey}`)}
              className={cn(
                "flex items-center justify-center gap-3 rounded-2xl px-2 py-2.5 text-sm font-medium transition-colors md:justify-start",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                active
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-[hsl(var(--cashier-sidebar-muted))] hover:bg-white/5 hover:text-white",
              )}
            >
              <span className="shrink-0 md:ms-0">{item.icon}</span>
              <span className="hidden min-w-0 flex-1 truncate text-start md:inline">
                {t(`nav.${item.messageKey}`)}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-white/10 p-3 text-[hsl(var(--cashier-sidebar-muted))] md:block">
        <div className="flex items-center gap-2 text-xs">
          <div className="size-2 rounded-full bg-primary shadow-sm" aria-hidden="true" />
          <span>{t("status.online")}</span>
        </div>
      </div>
    </aside>
  );
}
