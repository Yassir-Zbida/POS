"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import * as React from "react";
import { toast } from "sonner";
import {
  Ban,
  CheckCircle2,
  Copy,
  Eye,
  MoreHorizontal,
  Shield,
  Store,
  Trash2,
  UserCheck,
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
import { PlatformUser, UserRole, UserStatus } from "./users-types";

const STATUS_VARIANT: Record<UserStatus, "default" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  SUSPENDED: "secondary",
  BANNED: "destructive",
};

const ROLE_ICON: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  ADMIN: Shield,
  MANAGER: Store,
  CASHIER: UserCheck,
};

const ROLE_COLOR: Record<UserRole, string> = {
  ADMIN: "text-purple-600 bg-purple-500/10 dark:text-purple-400",
  MANAGER: "text-blue-600 bg-blue-500/10 dark:text-blue-400",
  CASHIER: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
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

export function useUsersColumns({
  onOpenBan,
  onActivate,
  onOpenDelete,
}: {
  onOpenBan: (u: PlatformUser) => void;
  onActivate: (u: PlatformUser) => void;
  onOpenDelete: (u: PlatformUser) => void;
}): ColumnDef<PlatformUser>[] {
  const t = useTranslations("adminUsers");
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
        accessorFn: (row: PlatformUser) => row.name ?? row.email,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.name")} />
        ),
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <Avatar className="size-7 border">
                <AvatarFallback className="bg-muted text-[0.65rem] font-semibold">
                  {getInitials(u.name, u.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{u.name ?? "—"}</p>
                <p className="truncate text-[0.7rem] text-muted-foreground">{u.email}</p>
              </div>
            </div>
          );
        },
        enableHiding: true,
      },
      {
        id: "role",
        accessorKey: "role",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.role")} />
        ),
        cell: ({ row }) => {
          const role = row.original.role;
          const Icon = ROLE_ICON[role];
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLOR[role]}`}
            >
              <Icon className="size-3" />
              {t(`roles.${role}`)}
            </span>
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
          <Badge variant={STATUS_VARIANT[row.original.status]} className="text-xs">
            {t(`userStatus.${row.original.status}`)}
          </Badge>
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
          const user = row.original;
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
                    onClick={() => router.push(`/dashboard/admin/users/${user.id}`)}
                  >
                    <Eye className="me-2 size-4" />
                    {t("actions.view")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      void navigator.clipboard.writeText(user.id);
                      toast.success(t("actions.idCopied"));
                    }}
                  >
                    <Copy className="me-2 size-4" />
                    {t("actions.copyId")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {user.status === "BANNED" || user.status === "SUSPENDED" ? (
                    <DropdownMenuItem
                      onClick={() => onActivate(user)}
                      className="text-emerald-600 focus:text-emerald-600"
                    >
                      <CheckCircle2 className="me-2 size-4" />
                      {t("actions.activate")}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => onOpenBan(user)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Ban className="me-2 size-4" />
                      {t("actions.ban")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onOpenDelete(user)}
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
