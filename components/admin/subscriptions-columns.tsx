"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import * as React from "react";
import { toast } from "sonner";
import {
  Copy,
  Eye,
  MoreHorizontal,
  RefreshCw,
  CalendarClock,
  Clock,
} from "lucide-react";
import { differenceInDays, isPast, isWithinInterval, addDays } from "date-fns";

import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { SubscriptionItem, SubscriptionStatus } from "./subscriptions-types";

const BCP47: Record<string, string> = { en: "en-US", fr: "fr-FR", ar: "ar" };

const SUB_STATUS_VARIANT: Record<
  SubscriptionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "default",
  PAST_DUE: "destructive",
  CANCELED: "outline",
  SUSPENDED: "secondary",
};

function getInitials(name: string | null, email: string) {
  if (name) {
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function ExpiryCell({
  endedAt,
  t,
}: {
  endedAt: string | null;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!endedAt) {
    return (
      <span className="text-xs text-muted-foreground">{t("expiry.noExpiry")}</span>
    );
  }

  const end = new Date(endedAt);
  const now = new Date();
  const daysLeft = differenceInDays(end, now);

  if (isPast(end)) {
    return (
      <Badge
        variant="destructive"
        className="gap-1 text-xs font-medium"
      >
        <Clock className="size-3" />
        {t("expiry.expired")}
      </Badge>
    );
  }

  if (daysLeft === 0) {
    return (
      <Badge className="gap-1 bg-orange-500 text-xs font-medium text-white hover:bg-orange-500/90">
        <Clock className="size-3" />
        {t("expiry.today")}
      </Badge>
    );
  }

  const isExpiringSoon = isWithinInterval(end, {
    start: now,
    end: addDays(now, 30),
  });

  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
          isExpiringSoon ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
        )}
      >
        {isExpiringSoon && <CalendarClock className="size-3 shrink-0" />}
        {t("expiry.daysLeft", { count: daysLeft })}
      </span>
      <span className="text-[0.65rem] text-muted-foreground/70" dir="ltr">
        {end.toLocaleDateString("en", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </span>
    </div>
  );
}

export function useSubscriptionsColumns({
  onManage,
}: {
  onManage: (item: SubscriptionItem) => void;
}): ColumnDef<SubscriptionItem>[] {
  const t = useTranslations("adminSubscriptions");
  const appLocale = useLocale();
  const router = useRouter();
  const dateLocale = BCP47[appLocale] ?? "en-US";

  const formatDate = React.useCallback(
    (dateStr: string) =>
      new Date(dateStr).toLocaleDateString(dateLocale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [dateLocale]
  );

  return React.useMemo(
    () => [
      {
        id: "merchant",
        accessorFn: (row: SubscriptionItem) => row.merchant.name ?? row.merchant.email,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.merchant")} />
        ),
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <Avatar className="size-7 border">
                <AvatarFallback className="bg-muted text-[0.65rem] font-semibold">
                  {getInitials(item.merchant.name, item.merchant.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-start">
                <p className="text-sm font-medium leading-snug">
                  {item.merchant.name ?? "—"}
                </p>
                <p className="truncate text-[0.7rem] text-muted-foreground">
                  {item.merchant.email}
                </p>
              </div>
            </div>
          );
        },
        enableHiding: true,
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.status")} />
        ),
        cell: ({ row }) => (
          <Badge
            variant={SUB_STATUS_VARIANT[row.original.status]}
            className="text-xs"
          >
            {t(`status.${row.original.status}`)}
          </Badge>
        ),
        enableHiding: true,
      },
      {
        id: "startDate",
        accessorKey: "startedAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.startDate")} />
        ),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground" dir="ltr">
            {formatDate(row.original.startedAt)}
          </span>
        ),
        enableHiding: true,
      },
      {
        id: "expiry",
        accessorKey: "endedAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.expiry")} />
        ),
        cell: ({ row }) => <ExpiryCell endedAt={row.original.endedAt} t={t} />,
        enableHiding: true,
      },
      {
        id: "lastUpdated",
        accessorKey: "updatedAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.lastUpdated")} />
        ),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground" dir="ltr">
            {formatDate(row.original.updatedAt)}
          </span>
        ),
        enableHiding: true,
      },
      {
        id: "actions",
        header: () => (
          <div className="w-full text-end">
            <span className="font-medium text-muted-foreground">{t("table.actions")}</span>
          </div>
        ),
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="text-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">{t("table.actions")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onManage(item)}>
                    <RefreshCw className="size-4 shrink-0" />
                    {t("actions.manage")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/dashboard/admin/merchants/${item.merchant.id}`)
                    }
                  >
                    <Eye className="size-4 shrink-0" />
                    {t("actions.viewMerchant")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      void navigator.clipboard.writeText(item.id);
                      toast.success(t("actions.idCopied"));
                    }}
                  >
                    <Copy className="size-4 shrink-0" />
                    {t("actions.copyId")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t, formatDate, router, onManage]
  );
}
