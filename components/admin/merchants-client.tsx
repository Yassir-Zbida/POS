"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Building2, CheckCircle2, AlertTriangle, Plus, BadgeCheck } from "lucide-react";

import { useAuthStore } from "@/store/use-auth-store";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { MerchantsDataTable } from "@/components/admin/merchants-data-table";
import type { Merchant, MerchantsStats, MerchantsPagination } from "@/components/admin/merchants-types";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function MerchantsClient() {
  const t = useTranslations("adminMerchants");
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  const [merchants, setMerchants] = React.useState<Merchant[]>([]);
  const [stats, setStats] = React.useState<MerchantsStats | null>(null);
  const [pagination, setPagination] = React.useState<MerchantsPagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = React.useState(true);

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [subStatusFilter, setSubStatusFilter] = React.useState("ALL");
  const [page, setPage] = React.useState(1);

  const [banTarget, setBanTarget] = React.useState<Merchant | null>(null);
  const [banning, setBanning] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<Merchant | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const hasActiveFilters =
    Boolean(debouncedSearch?.trim()) || statusFilter !== "ALL" || subStatusFilter !== "ALL";

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, subStatusFilter]);

  const fetchMerchants = React.useCallback(async () => {
    if (!accessToken && !refreshToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        ...(subStatusFilter !== "ALL" ? { subStatus: subStatusFilter } : {}),
      });
      const res = await fetchWithAuth(`/api/admin/merchants?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMerchants(data.merchants);
      setPagination(data.pagination);
      setStats(data.stats);
    } catch {
      toast.error("Failed to load merchants");
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshToken, page, debouncedSearch, statusFilter, subStatusFilter]);

  React.useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  const handleActivate = React.useCallback(
    async (merchant: Merchant) => {
      if (!accessToken && !refreshToken) return;
      try {
        const res = await fetchWithAuth(`/api/admin/merchants/${merchant.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ACTIVE", subscriptionStatus: "ACTIVE" }),
        });
        if (!res.ok) throw new Error();
        toast.success(t("detail.activateButton"));
        fetchMerchants();
      } catch {
        toast.error("Failed to activate merchant");
      }
    },
    [accessToken, refreshToken, t, fetchMerchants]
  );

  async function handleBan() {
    if (!banTarget || (!accessToken && !refreshToken)) return;
    setBanning(true);
    try {
      const res = await fetchWithAuth(`/api/admin/merchants/${banTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "BANNED", subscriptionStatus: "CANCELED" }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("confirmBan.confirm"));
      setBanTarget(null);
      fetchMerchants();
    } catch {
      toast.error("Failed to ban merchant");
    } finally {
      setBanning(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || (!accessToken && !refreshToken)) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/admin/merchants/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success(t("confirmDelete.confirm"));
      setDeleteTarget(null);
      fetchMerchants();
    } catch {
      toast.error("Failed to delete merchant");
    } finally {
      setDeleting(false);
    }
  }

  const statsDef = [
    { key: "total", label: t("stats.total"), icon: Building2, em: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10" },
    { key: "active", label: t("stats.active"), icon: CheckCircle2, em: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    { key: "subActive", label: t("stats.subActive"), icon: BadgeCheck, em: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10" },
    { key: "subPastDue", label: t("stats.subPastDue"), icon: AlertTriangle, em: "text-amber-600 dark:text-amber-500", bg: "bg-amber-500/10" },
  ] as const;

  const showOnboardingEmpty =
    !loading && merchants.length === 0 && !hasActiveFilters;

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold leading-none tracking-tight sm:text-lg">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {t("subtitle")}
          </p>
        </div>
        <Button asChild size="sm" className="h-8 gap-1.5 px-3 text-xs sm:h-9 sm:text-sm">
          <Link href="/dashboard/admin/merchants/new">
            <Plus className="size-3.5 sm:size-4" />
            {t("addMerchant")}
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        {loading && !stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-2.5",
                  i < 2 && "border-b border-border/50",
                  i % 2 === 0 && "border-e border-border/50",
                  "sm:border-b-0 sm:border-e-0",
                  i > 0 && "sm:border-s sm:border-border/50"
                )}
              >
                <Skeleton className="size-7 shrink-0 rounded-lg sm:size-8" />
                <div className="min-w-0 flex-1 space-y-1">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {statsDef.map((def, i) => {
              const v = stats?.[def.key as keyof MerchantsStats] ?? 0;
              const Icon = def.icon;
              return (
                <div
                  key={def.key}
                  className={cn(
                    "flex min-w-0 items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-2.5",
                    i < 2 && "border-b border-border/50",
                    i % 2 === 0 && "border-e border-border/50",
                    "sm:border-b-0 sm:border-e-0",
                    i > 0 && "sm:border-s sm:border-border/50"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-lg sm:size-8",
                      def.bg
                    )}
                  >
                    <Icon className={cn("size-3.5 sm:size-4", def.em)} />
                  </div>
                  <div className="min-w-0 text-start">
                    <p className="text-lg font-semibold tabular-nums leading-tight sm:text-xl">
                      {v}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[0.65rem] font-medium uppercase leading-tight tracking-wide text-muted-foreground sm:text-[0.7rem]">
                      {def.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Card className="overflow-hidden border-border/60 bg-white py-0 shadow-sm dark:bg-card">
        <CardContent className="p-0">
          <MerchantsDataTable
            data={merchants}
            pagination={pagination}
            page={page}
            onPageChange={setPage}
            onOpenBan={setBanTarget}
            onActivate={handleActivate}
            onOpenDelete={setDeleteTarget}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            subStatusFilter={subStatusFilter}
            onSubStatusFilterChange={setSubStatusFilter}
            loading={loading}
            showOnboardingEmpty={showOnboardingEmpty}
            onboardingCta={
              <>
                <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted">
                  <Building2 className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">{t("empty.title")}</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {t("empty.description")}
                </p>
                <Button asChild size="sm" className="mt-4 h-8 gap-1.5">
                  <Link href="/dashboard/admin/merchants/new">
                    <Plus className="size-3.5" />
                    {t("addMerchant")}
                  </Link>
                </Button>
              </>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={!!banTarget} onOpenChange={(open) => !open && setBanTarget(null)}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("confirmBan.title")}</DialogTitle>
            <DialogDescription asChild>
              <div>
                {t("confirmBan.description")}
                {banTarget && (
                  <span className="mt-2 block font-medium text-foreground">
                    {banTarget.name ?? banTarget.email}
                  </span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBanTarget(null)}>
              {t("confirmBan.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleBan}
              disabled={banning}
            >
              {banning ? "…" : t("confirmBan.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("confirmDelete.title")}</DialogTitle>
            <DialogDescription asChild>
              <div>
                {t("confirmDelete.description")}
                {deleteTarget && (
                  <span className="mt-2 block font-medium text-destructive">
                    {deleteTarget.name ?? deleteTarget.email}
                  </span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("confirmDelete.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "…" : t("confirmDelete.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
