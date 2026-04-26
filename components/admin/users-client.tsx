"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Users,
  CheckCircle2,
  Ban,
  Shield,
  Store,
  UserCheck,
  AlertTriangle,
} from "lucide-react";

import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UsersDataTable } from "@/components/admin/users-data-table";
import type { PlatformUser, UsersStats, UsersPagination } from "@/components/admin/users-types";

export function UsersClient() {
  const t = useTranslations("adminUsers");

  const [users, setUsers] = React.useState<PlatformUser[]>([]);
  const [stats, setStats] = React.useState<UsersStats | null>(null);
  const [pagination, setPagination] = React.useState<UsersPagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = React.useState(true);

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [page, setPage] = React.useState(1);

  const [banTarget, setBanTarget] = React.useState<PlatformUser | null>(null);
  const [banning, setBanning] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<PlatformUser | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter]);

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(roleFilter !== "ALL" ? { role: roleFilter } : {}),
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      });
      const res = await fetchWithAuth(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.users);
      setPagination(data.pagination);
      setStats(data.stats);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, roleFilter, statusFilter]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleActivate = React.useCallback(
    async (user: PlatformUser) => {
      try {
        const res = await fetchWithAuth(`/api/admin/users/${user.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ACTIVE" }),
        });
        if (!res.ok) throw new Error();
        toast.success(t("actions.activate"));
        fetchUsers();
      } catch {
        toast.error("Failed to activate user");
      }
    },
    [t, fetchUsers]
  );

  async function handleBan() {
    if (!banTarget) return;
    setBanning(true);
    try {
      const res = await fetchWithAuth(`/api/admin/users/${banTarget.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "BANNED" }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("confirmBan.confirm"));
      setBanTarget(null);
      fetchUsers();
    } catch {
      toast.error("Failed to ban user");
    } finally {
      setBanning(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success(t("confirmDelete.confirm"));
      setDeleteTarget(null);
      fetchUsers();
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setDeleting(false);
    }
  }

  const allStats = [
    { key: "total" as const,     label: t("stats.total"),     icon: Users,        em: "text-sky-600 dark:text-sky-400",     bg: "bg-sky-500/10" },
    { key: "active" as const,    label: t("stats.active"),    icon: CheckCircle2, em: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    { key: "banned" as const,    label: t("stats.banned"),    icon: Ban,          em: "text-red-600 dark:text-red-400",     bg: "bg-red-500/10" },
    { key: "suspended" as const, label: t("stats.suspended"), icon: AlertTriangle,em: "text-amber-600 dark:text-amber-500", bg: "bg-amber-500/10" },
    { key: "admins" as const,    label: t("stats.admins"),    icon: Shield,       em: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
    { key: "managers" as const,  label: t("stats.managers"),  icon: Store,        em: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-500/10" },
    { key: "cashiers" as const,  label: t("stats.cashiers"),  icon: UserCheck,    em: "text-teal-600 dark:text-teal-400",   bg: "bg-teal-500/10" },
  ] as const;

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-start">
          <h1 className="text-base font-semibold leading-none tracking-tight sm:text-lg">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Stats — single scrollable row */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <div className="flex min-w-max [&>div]:not(:first-child):border-s [&>div]:not(:first-child):border-border/70">
          {loading && !stats
            ? Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex flex-1 items-center gap-3 px-5 py-5 text-start">
                  <Skeleton className="size-8 shrink-0 rounded-lg" />
                  <div className="min-w-0 space-y-1.5">
                    <Skeleton className="h-5 w-8" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                </div>
              ))
            : allStats.map((def) => {
                const v = stats?.[def.key] ?? 0;
                const Icon = def.icon;
                return (
                  <div
                    key={def.key}
                    className="flex flex-1 items-center gap-3 px-5 py-5 text-start"
                  >
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        def.bg
                      )}
                    >
                      <Icon className={cn("size-4", def.em)} />
                    </div>
                    <div className="min-w-0 text-start">
                      <p className="text-xl font-bold tabular-nums leading-none">
                        {v}
                      </p>
                      <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                        {def.label}
                      </p>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Data table card */}
      <Card className="overflow-hidden border-border bg-white py-0 shadow-sm dark:bg-card">
        <CardContent className="p-0">
          <UsersDataTable
            data={users}
            pagination={pagination}
            page={page}
            onPageChange={setPage}
            onOpenBan={setBanTarget}
            onActivate={handleActivate}
            onOpenDelete={setDeleteTarget}
            search={search}
            onSearchChange={setSearch}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* Ban confirm dialog */}
      <Dialog open={!!banTarget} onOpenChange={(o) => !o && setBanTarget(null)}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("confirmBan.title")}</DialogTitle>
            <DialogDescription asChild>
              <div>
                {t("confirmBan.description")}
                {banTarget && (
                  <span className="mt-1 block font-medium text-foreground">
                    {banTarget.name ?? banTarget.email}
                  </span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanTarget(null)}>
              {t("confirmBan.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleBan} disabled={banning}>
              {banning ? "…" : t("confirmBan.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("confirmDelete.title")}</DialogTitle>
            <DialogDescription asChild>
              <div>
                {t("confirmDelete.description")}
                {deleteTarget && (
                  <span className="mt-1 block font-medium text-foreground">
                    {deleteTarget.name ?? deleteTarget.email}
                  </span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("confirmDelete.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "…" : t("confirmDelete.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
