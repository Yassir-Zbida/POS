"use client";

import * as React from "react";
import { ChevronsUpDown, MapPin, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { useLocationStore, type ActiveLocation } from "@/lib/stores/location-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

type ApiLocation = {
  id: string;
  name: string;
  city: string | null;
};

export function PosLocationSwitcher() {
  const locale = useLocale() as Locale;
  const isRtl = locale === "ar";
  const t = useTranslations("sidebar");

  const { activeLocation, setActiveLocation } = useLocationStore();
  const [locations, setLocations] = React.useState<ApiLocation[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchLocations() {
      try {
        const res = await fetch("/api/v1/locations?limit=50", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data: { locations: ApiLocation[] } = await res.json();
        if (cancelled) return;

        setLocations(data.locations);

        // Auto-select first location if nothing is stored yet
        if (!activeLocation && data.locations.length > 0) {
          setActiveLocation({
            id: data.locations[0].id,
            name: data.locations[0].name,
            city: data.locations[0].city,
          });
        }
      } catch {
        // Network / auth errors — fail silently, keep stored selection
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLocations();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelect(loc: ApiLocation) {
    setActiveLocation({ id: loc.id, name: loc.name, city: loc.city });
  }

  const displayName = activeLocation?.name ?? "Hssabaty POS";
  const displaySub = activeLocation?.city ?? t("selectLocation");

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground focus-visible:ring-0 focus-visible:ring-transparent"
            >
              <div className="flex size-8 shrink-0 items-center justify-center">
                <Image
                  src="/assets/brand/favicon.svg"
                  alt="Hssabaty"
                  width={32}
                  height={32}
                  className="size-8 rounded-md object-cover group-data-[collapsible=icon]:size-6"
                  priority
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                {loading ? (
                  <>
                    <Skeleton className="mb-1 h-3 w-24" />
                    <Skeleton className="h-2.5 w-16" />
                  </>
                ) : (
                  <>
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">{displaySub}</span>
                  </>
                )}
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
              {t("posLocations")}
            </DropdownMenuLabel>

            {loading && (
              <div className="space-y-1 p-2">
                <Skeleton className="h-8 w-full rounded-md" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            )}

            {!loading && locations.length === 0 && (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {t("noLocations")}
              </DropdownMenuItem>
            )}

            {!loading &&
              locations.map((loc) => (
                <DropdownMenuItem
                  key={loc.id}
                  onClick={() => handleSelect(loc)}
                  className="gap-2 p-2"
                  data-active={activeLocation?.id === loc.id}
                >
                  <div
                    className={cn(
                      "flex size-6 items-center justify-center rounded-sm border bg-background",
                      activeLocation?.id === loc.id && "border-primary bg-primary/10",
                    )}
                  >
                    <MapPin
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground",
                        activeLocation?.id === loc.id && "text-primary",
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{loc.name}</div>
                    {loc.city && (
                      <div className="truncate text-xs text-muted-foreground">{loc.city}</div>
                    )}
                  </div>
                  {activeLocation?.id === loc.id && (
                    <span className="ml-auto text-xs text-primary">✓</span>
                  )}
                </DropdownMenuItem>
              ))}

            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 p-2 text-muted-foreground">
              <Link href={`/${locale}/dashboard/settings/locations`}>
                <Plus className="size-4" />
                {t("manageLocations")}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
