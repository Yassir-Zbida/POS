"use client";

import * as React from "react";
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations("sidebar");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const pathname = usePathname();
  const authUser = useAuthStore((s) => s.user);
  const lock = useSessionStore((s) => s.lock);

  const user = authUser
    ? {
        name: authUser.name ?? "User",
        email: authUser.email ?? "",
        avatar: (authUser as { avatar?: string }).avatar ?? "",
      }
    : { name: "Hssabaty POS", email: "support@hssabaty.com", avatar: "" };

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const mainNav = [
    {
      key: "pos",
      href: "/dashboard/cashier/pos",
      icon: ShoppingCart,
    },
    {
      key: "cashRegister",
      href: "/dashboard/cashier/cash-register",
      icon: Landmark,
    },
    {
      key: "customers",
      href: "/dashboard/cashier/customers",
      icon: Users,
    },
    {
      key: "sales",
      href: "/dashboard/cashier/sales",
      icon: BarChart2,
    },
  ];

  const inventoryNav = [
    {
      key: "products",
      href: "/dashboard/cashier/products",
      icon: Package,
    },
    {
      key: "categories",
      href: "/dashboard/cashier/categories",
      icon: Tag,
    },
    {
      key: "inventory",
      href: "/dashboard/cashier/inventory",
      icon: Layers,
    },
  ];

  const settingsNav = [
    {
      label: t("settings.store"),
      href: "/dashboard/cashier/settings/store",
    },
    {
      label: t("settings.hardware"),
      href: "/dashboard/cashier/settings/hardware",
    },
    {
      label: t("settings.staff"),
      href: "/dashboard/cashier/settings/staff",
    },
    {
      label: t("settings.billing"),
      href: "/dashboard/cashier/settings/billing",
    },
  ];

  const settingsActive = settingsNav.some((s) => isActive(s.href));

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <PosLocationSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {/* ── Main navigation ── */}
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

        {/* ── Inventory / Products ── */}
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

        {/* ── Reports ── */}
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

        {/* ── Settings (collapsible) ── */}
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
      </SidebarContent>

      <SidebarFooter>
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
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
