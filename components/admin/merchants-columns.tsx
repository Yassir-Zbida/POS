"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import * as React from "react";
import { toast } from "sonner";
import {
  Ban,
  Building2,
  CheckCircle2,
  Copy,
  Edit,
  Eye,
  MoreHorizontal,
  Trash2,
  Users,
} from "lucide-react";

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
import { Merchant, SubscriptionStatus, UserStatus } from "./merchants-types";

const USER_STATUS_VARIANT: Record<UserStatus, "default" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  SUSPENDED: "secondary",
  BANNED: "destructive",
};

const SUB_STATUS_VARIANT: Record<
  SubscriptionStatus | "none",
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "default",
  PAST_DUE: "destructive",
  CANCELED: "outline",
  SUSPENDED: "secondary",
  none: "outline",
};

const BCP47: Record<string, string> = { en: "en-US", fr: "fr-FR", ar: "ar" };

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

export function useMerchantsColumns({
  onOpenBan,
  onActivate,
  onOpenDelete,
}: {
  onOpenBan: (m: Merchant) => void;
  onActivate: (m: Merchant) => void;
  onOpenDelete: (m: Merchant) => void;
}): ColumnDef<Merchant>[] {
  const t = useTranslations("adminMerchants");
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
        id: "name",
        accessorFn: (row: Merchant) => row.name ?? row.email,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.name")} />
        ),
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <Avatar className="size-7 border">
                <AvatarFallback className="bg-muted text-[0.65rem] font-semibold">
                  {getInitials(m.name, m.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{m.name ?? "—"}</p>
                <p className="truncate text-[0.7rem] text-muted-foreground">{m.email}</p>
              </div>
            </div>
          );
        },
        enableHiding: true,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.status")} />
        ),
        cell: ({ row }) => (
          <Badge variant={USER_STATUS_VARIANT[row.original.status]} className="text-xs">
            {t(`userStatus.${row.original.status}`)}
          </Badge>
        ),
        enableHiding: true,
      },
      {
        id: "subscription",
        accessorFn: (row: Merchant) => row.subscription?.status ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.subscription")} />
        ),
        cell: ({ row }) => {
          const m = row.original;
          return (
            <Badge
              variant={
                SUB_STATUS_VARIANT[(m.subscription?.status as SubscriptionStatus) ?? "none"]
              }
              className="text-xs"
            >
              {m.subscription
                ? t(`subStatus.${m.subscription.status}`)
                : t("subStatus.none")}
            </Badge>
          );
        },
        enableHiding: true,
      },
      {
        id: "staff",
        accessorFn: (row: Merchant) => row._count.cashiers,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("table.staff")}
            className="w-full justify-start"
          />
        ),
        cell: ({ row }) => (
          <div className="text-start text-sm">
            <span className="inline-flex items-center justify-start gap-1">
              <Users className="size-3.5 text-muted-foreground" />
              {row.original._count.cashiers}
            </span>
          </div>
        ),
        enableHiding: true,
      },
      {
        id: "locations",
        accessorFn: (row: Merchant) => row._count.managedLocations,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("table.locations")}
            className="w-full justify-start"
          />
        ),
        cell: ({ row }) => (
          <div className="text-start text-sm">
            <span className="inline-flex items-center justify-start gap-1">
              <Building2 className="size-3.5 text-muted-foreground" />
              {row.original._count.managedLocations}
            </span>
          </div>
        ),
        enableHiding: true,
      },
      {
        id: "joined",
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.joined")} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.createdAt)}
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
          const merchant = row.original;
          return (
            <div className="text-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">{t("table.actions")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/dashboard/admin/merchants/${merchant.id}`)
                    }
                  >
                    <Eye className="me-2 size-4" />
                    {t("actions.view")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      void navigator.clipboard.writeText(merchant.id);
                      toast.success(t("actions.idCopied"));
                    }}
                  >
                    <Copy className="me-2 size-4" />
                    {t("actions.copyId")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {merchant.status === "BANNED" || merchant.status === "SUSPENDED" ? (
                    <DropdownMenuItem
                      onClick={() => onActivate(merchant)}
                      className="text-emerald-600 focus:text-emerald-600"
                    >
                      <CheckCircle2 className="me-2 size-4" />
                      {t("actions.activate")}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => onOpenBan(merchant)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Ban className="me-2 size-4" />
                      {t("actions.ban")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onOpenDelete(merchant)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="me-2 size-4" />
                    {t("actions.delete")}
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
    [t, formatDate, router, onOpenBan, onActivate, onOpenDelete]
  );
}
