"use client";

import * as React from "react";
import Image from "next/image";
import {
  ShoppingCart,
  Users,
  Package,
  Tag,
  Layers,
  BarChart2,
  FileText,
  Settings,
  Landmark,
  ChevronRight,
  Lock,
  LayoutDashboard,
  Store,
  CreditCard,
  ScrollText,
  BookOpen,
  LifeBuoy,
  Mail,
  Activity,
  Bell,
  Receipt,
  TrendingUp,
  Boxes,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, Link } from "@/i18n/navigation";

import { NavUser } from "@/components/nav-user";
import { PosLocationSwitcher } from "@/components/pos-location-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuthStore } from "@/store/use-auth-store";
import { useSessionStore } from "@/store/sessionStore";
import { cn } from "@/lib/utils";

function AdminSidebarContent({
  isActive,
  isRtl,
}: {
  isActive: (href: string) => boolean;
  isRtl: boolean;
}) {
  const t = useTranslations("adminSidebar");

  const overviewNav = [
    { key: "dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
    { key: "analytics", href: "/dashboard/admin/analytics", icon: TrendingUp },
  ];

  const platformNav = [
    { key: "merchants", href: "/dashboard/admin/merchants", icon: Store },
    { key: "users", href: "/dashboard/admin/users", icon: Users },
  ];

  const billingNav = [
    { key: "subscriptions", href: "/dashboard/admin/subscriptions", icon: CreditCard },
    { key: "revenue", href: "/dashboard/admin/revenue", icon: BarChart2 },
    { key: "invoices", href: "/dashboard/admin/invoices", icon: Receipt },
  ];

  const monitoringNav = [
    { key: "auditLogs", href: "/dashboard/admin/audit-logs", icon: ScrollText },
    { key: "systemHealth", href: "/dashboard/admin/system-health", icon: Activity },
  ];

  const supportNav = [
    { key: "tickets", href: "/dashboard/admin/support/tickets", icon: LifeBuoy },
  ];

  function NavGroup({
    labelKey,
    items,
  }: {
    labelKey: string;
    items: { key: string; href: string; icon: React.ElementType }[];
  }) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{t(labelKey)}</SidebarGroupLabel>
        <SidebarMenu>
          {items.map(({ key, href, icon: Icon }) => (
            <SidebarMenuItem key={key}>
              <SidebarMenuButton
                asChild
                isActive={isActive(href)}
                tooltip={t(`nav.${key}`)}
              >
                <Link href={href}>
                  <Icon />
                  <span>{t(`nav.${key}`)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  return (
    <>
      <NavGroup labelKey="overviewGroup" items={overviewNav} />
      <NavGroup labelKey="platformGroup" items={platformNav} />
      <SidebarSeparator />
      <NavGroup labelKey="billingGroup" items={billingNav} />
      <SidebarSeparator />
      <NavGroup labelKey="monitoringGroup" items={monitoringNav} />
      <SidebarSeparator />
      <NavGroup labelKey="supportGroup" items={supportNav} />
    </>
  );
}

function ManagerSidebarContent({
  isActive,
  isRtl: _isRtl,
}: {
  isActive: (href: string) => boolean;
  isRtl: boolean;
}) {
  const t = useTranslations("managerSidebar");

  const mainNav = [
    { key: "home", href: "/dashboard/manager", icon: LayoutDashboard },
    { key: "staff", href: "/dashboard/manager/staff", icon: Users },
  ];

  const storeNav = [
    { key: "reports", href: "/dashboard/reports", icon: BarChart2 },
    { key: "sales", href: "/dashboard/sales", icon: TrendingUp },
    { key: "inventory", href: "/dashboard/inventory", icon: Package },
    { key: "products", href: "/dashboard/products", icon: Boxes },
    { key: "categories", href: "/dashboard/categories", icon: Tag },
    { key: "customers", href: "/dashboard/customers", icon: Users },
  ];

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>{t("group.main")}</SidebarGroupLabel>
        <SidebarMenu>
          {mainNav.map(({ key, href, icon: Icon }) => (
            <SidebarMenuItem key={key}>
              <SidebarMenuButton asChild isActive={isActive(href)} tooltip={t(`nav.${key}`)}>
                <Link href={href}>
                  <Icon />
                  <span>{t(`nav.${key}`)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>{t("group.store")}</SidebarGroupLabel>
        <SidebarMenu>
          {storeNav.map(({ key, href, icon: Icon }) => (
            <SidebarMenuItem key={key}>
              <SidebarMenuButton asChild isActive={isActive(href)} tooltip={t(`nav.${key}`)}>
                <Link href={href}>
                  <Icon />
                  <span>{t(`nav.${key}`)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/dashboard/settings")} tooltip={t("nav.settings")}>
              <Link href="/dashboard/settings">
                <Settings />
                <span>{t("nav.settings")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}

function CashierSidebarContent({
  isActive,
  isRtl,
}: {
  isActive: (href: string) => boolean;
  isRtl: boolean;
}) {
  const t = useTranslations("sidebar");

  const mainNav = [
    { key: "pos", href: "/dashboard/cashier/pos", icon: ShoppingCart },
    { key: "cashRegister", href: "/dashboard/cashier/cash-register", icon: Landmark },
    { key: "customers", href: "/dashboard/cashier/customers", icon: Users },
    { key: "sales", href: "/dashboard/cashier/sales", icon: BarChart2 },
  ];

  const inventoryNav = [
    { key: "products", href: "/dashboard/cashier/products", icon: Package },
    { key: "categories", href: "/dashboard/cashier/categories", icon: Tag },
    { key: "inventory", href: "/dashboard/cashier/inventory", icon: Layers },
  ];

  const settingsNav = [
    { label: t("settings.store"), href: "/dashboard/cashier/settings/store" },
    { label: t("settings.hardware"), href: "/dashboard/cashier/settings/hardware" },
    { label: t("settings.staff"), href: "/dashboard/cashier/settings/staff" },
    { label: t("settings.billing"), href: "/dashboard/cashier/settings/billing" },
  ];

  const settingsActive = settingsNav.some((s) => isActive(s.href));

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>{t("navGroup")}</SidebarGroupLabel>
        <SidebarMenu>
          {mainNav.map(({ key, href, icon: Icon }) => (
            <SidebarMenuItem key={key}>
              <SidebarMenuButton
                asChild
                isActive={isActive(href)}
                tooltip={t(`nav.${key}`)}
              >
                <Link href={href}>
                  <Icon />
                  <span>{t(`nav.${key}`)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>{t("nav.inventory")}</SidebarGroupLabel>
        <SidebarMenu>
          {inventoryNav.map(({ key, href, icon: Icon }) => (
            <SidebarMenuItem key={key}>
              <SidebarMenuButton
                asChild
                isActive={isActive(href)}
                tooltip={t(`nav.${key}`)}
              >
                <Link href={href}>
                  <Icon />
                  <span>{t(`nav.${key}`)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/dashboard/cashier/reports")}
              tooltip={t("nav.reports")}
            >
              <Link href="/dashboard/cashier/reports">
                <FileText />
                <span>{t("nav.reports")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarSeparator />

      <SidebarGroup>
        <SidebarGroupLabel>{t("settingsGroup")}</SidebarGroupLabel>
        <SidebarMenu>
          <Collapsible
            asChild
            defaultOpen={settingsActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={settingsActive}
                  tooltip={t("nav.settings")}
                >
                  <Settings />
                  <span>{t("nav.settings")}</span>
                  <ChevronRight
                    className={cn(
                      "ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90",
                      isRtl &&
                        "ml-0 mr-auto rotate-180 group-data-[state=open]/collapsible:-rotate-90"
                    )}
                  />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {settingsNav.map(({ label, href }) => (
                    <SidebarMenuSubItem key={href}>
                      <SidebarMenuSubButton asChild isActive={isActive(href)}>
                        <Link href={href}>
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const locale = useLocale();
  const isRtl = locale.toLowerCase().startsWith("ar");
  const pathname = usePathname();
  const authUser = useAuthStore((s) => s.user);
  const lock = useSessionStore((s) => s.lock);

  const isAdmin = authUser?.role === "ADMIN";
  const isManager = authUser?.role === "MANAGER";
  const adminTitle = isRtl ? "حساباتي" : "HSSABTY ADMIN";
  const adminSubtitle = isRtl ? "الإدارة" : undefined;

  const user = authUser
    ? {
        name: authUser.name ?? "User",
        email: authUser.email ?? "",
        avatar: (authUser as { avatar?: string }).avatar ?? "",
      }
    : { name: "Hssabaty POS", email: "support@hssabaty.com", avatar: "" };

  function isActive(href: string) {
    // For top-level dashboard routes, require exact match to prevent
    // showing both dashboard and sub-pages as active
    if (href === "/dashboard/admin" || href === "/dashboard/cashier") {
      return pathname === href;
    }
    // For all other routes, match exact or child routes
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <Sidebar collapsible="icon" dir={isRtl ? "rtl" : "ltr"} {...props}>
      <SidebarHeader>
        {isAdmin ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="pointer-events-none">
                <div className="flex size-8 shrink-0 items-center justify-center">
                  <Image
                    src="/assets/brand/favicon.svg"
                    alt="Hssabaty"
                    width={32}
                    height={32}
                    className="size-8 rounded-md object-cover"
                    priority
                  />
                </div>
                <div className={cn("grid flex-1 text-sm leading-tight", isRtl ? "text-right" : "text-left")}>
                  <span className="truncate font-semibold">{adminTitle}</span>
                  {adminSubtitle ? (
                    <span className="truncate text-xs text-muted-foreground">{adminSubtitle}</span>
                  ) : null}
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <PosLocationSwitcher />
        )}
      </SidebarHeader>

      <SidebarContent>
        {isAdmin ? (
          <AdminSidebarContent isActive={isActive} isRtl={isRtl} />
        ) : isManager ? (
          <ManagerSidebarContent isActive={isActive} isRtl={isRtl} />
        ) : (
          <CashierSidebarContent isActive={isActive} isRtl={isRtl} />
        )}
      </SidebarContent>

      <SidebarFooter>
        {authUser?.role === "CASHIER" && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Verrouiller"
                onClick={lock}
                className="text-muted-foreground hover:text-foreground"
              >
                <Lock className="size-4 shrink-0" />
                <span>Verrouiller</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
