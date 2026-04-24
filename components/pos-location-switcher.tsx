"use client";

import * as React from "react";
import { ChevronsUpDown, MapPin } from "lucide-react";
import { useLocale } from "next-intl";
import Image from "next/image";

import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

type PosLocation = {
  id: string;
  storeName: string;
  locationName: string;
  storeType: string;
};

const DEMO_LOCATIONS: readonly PosLocation[] = [
  { id: "loc-1", storeName: "Hssabaty POS", storeType: "Retail", locationName: "Casablanca" },
  { id: "loc-2", storeName: "Hssabaty POS", storeType: "Retail", locationName: "Rabat" },
  { id: "loc-3", storeName: "Hssabaty POS", storeType: "Retail", locationName: "Marrakesh" },
];

export function PosLocationSwitcher() {
  const locale = useLocale() as Locale;
  const isRtl = locale === "ar";
  const [active, setActive] = React.useState<PosLocation>(DEMO_LOCATIONS[0]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground focus-visible:ring-0 focus-visible:ring-transparent"
            >
              <Image
                src="/assets/brand/favicon.svg"
                alt="Hssabaty"
                width={32}
                height={32}
                className="size-8 rounded-md object-cover"
                priority
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{active.storeName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {active.storeType} - {active.locationName}
                </span>
              </div>
              <ChevronsUpDown className={cn("ml-auto", isRtl && "ml-0 mr-auto")} />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isRtl ? "left" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              POS locations
            </DropdownMenuLabel>
            {DEMO_LOCATIONS.map((loc) => (
              <DropdownMenuItem
                key={loc.id}
                onClick={() => setActive(loc)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border bg-background">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{loc.locationName}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {loc.storeType} - {loc.storeName}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2 text-muted-foreground">
              Manage locations…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

