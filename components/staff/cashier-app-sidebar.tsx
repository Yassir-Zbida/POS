"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
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

import { BrandLogo } from "@/components/brand-logo";
import { Link, usePathname } from "@/i18n/navigation";
import { type Locale } from "@/i18n/routing";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const NAV_ICONS: Record<
  "pos" | "products" | "customers" | "sales" | "inventory" | "cashRegister" | "reports" | "settings",
  React.ComponentType<{ className?: string }>
> = {
  pos: ShoppingCart,
  products: Package,
  customers: Users,
  sales: CreditCard,
  inventory: Boxes,
  cashRegister: LayoutDashboard,
  reports: BarChart3,
  settings: Settings,
};

const NAV_ORDER = [
  "pos",
  "products",
  "customers",
  "sales",
  "inventory",
  "cashRegister",
  "reports",
  "settings",
] as const;

const HREF: Record<(typeof NAV_ORDER)[number], string> = {
  pos: "/dashboard/cashier/pos",
  products: "/dashboard/cashier/products",
  customers: "/dashboard/cashier/customers",
  sales: "/dashboard/cashier/sales",
  inventory: "/dashboard/cashier/inventory",
  cashRegister: "/dashboard/cashier/cash-register-sessions",
  reports: "/dashboard/cashier/reports",
  settings: "/dashboard/cashier/settings",
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CashierAppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations("staff");
  const locale = useLocale() as Locale;
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="sidebar" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="h-12 min-w-0"
              tooltip={t("brand.name")}
            >
              <Link
                href="/dashboard/cashier/pos"
                className="flex min-w-0 items-center gap-2 overflow-hidden"
              >
                <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md">
                  <BrandLogo
                    locale={locale}
                    width={120}
                    height={30}
                    className="min-w-0"
                    imageClassName="h-7 w-auto max-w-[4.5rem] object-contain object-start md:max-w-[9rem]"
                    priority
                  />
                </span>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold text-sidebar-foreground">
                    {t("brand.name")}
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    {t("brand.tagline")}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("navGroup.label")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ORDER.map((key) => {
                const href = HREF[key];
                const active = isActivePath(pathname, href);
                const Icon = NAV_ICONS[key];
                return (
                  <SidebarMenuItem key={key}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={t(`nav.${key}`)}
                    >
                      <Link href={href}>
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        <span>{t(`nav.${key}`)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-sidebar-foreground/80">
              <span
                className="size-2 shrink-0 rounded-full bg-sidebar-foreground/40"
                aria-hidden="true"
              />
              {t("status.online")}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
