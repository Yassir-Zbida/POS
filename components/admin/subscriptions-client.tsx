"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  CalendarClock,
  XCircle,
  User,
  Mail,
  CalendarDays,
  CalendarX,
  X,
} from "lucide-react";
import { format } from "date-fns";

import { useAuthStore } from "@/store/use-auth-store";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SubscriptionsDataTable } from "@/components/admin/subscriptions-data-table";
import type {
  SubscriptionItem,
  SubscriptionStats,
  SubscriptionPagination,
  SubscriptionStatus,
} from "@/components/admin/subscriptions-types";
import { useParams } from "next/navigation";

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

export function SubscriptionsClient() {
  const t = useTranslations("adminSubscriptions");
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const locale = useLocale();
  const params = useParams() as { locale?: string | string[] };
  const rawLocale = params?.locale;
  const paramLocale =
    typeof rawLocale === "string"
      ? rawLocale
      : Array.isArray(rawLocale)
        ? rawLocale[0]
        : null;
  const isRtl =
    paramLocale === "ar" ||
    (paramLocale != null && paramLocale.startsWith("ar-")) ||
    locale === "ar" ||
    (typeof locale === "string" && locale.startsWith("ar-"));

  const [subscriptions, setSubscriptions] = React.useState<SubscriptionItem[]>([]);
  const [stats, setStats] = React.useState<SubscriptionStats | null>(null);
  const [pagination, setPagination] = React.useState<SubscriptionPagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [page, setPage] = React.useState(1);

  // Manage dialog state
  const [manageTarget, setManageTarget] = React.useState<SubscriptionItem | null>(null);
  const [manageStatus, setManageStatus] = React.useState<SubscriptionStatus>("ACTIVE");
  const [manageEndDate, setManageEndDate] = React.useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const fetchSubscriptions = React.useCallback(async () => {
    if (!accessToken && !refreshToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      });
      const res = await fetchWithAuth(`/api/admin/subscriptions?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSubscriptions(data.subscriptions);
      setPagination(data.pagination);
      setStats(data.stats);
    } catch {
      toast.error(t("fetchError"));
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshToken, page, debouncedSearch, statusFilter, t]);

  React.useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  function handleOpenManage(item: SubscriptionItem) {
    setManageTarget(item);
    setManageStatus(item.status);
    setManageEndDate(item.endedAt ? new Date(item.endedAt) : undefined);
  }

  function handleCloseManage() {
    setManageTarget(null);
    setCalendarOpen(false);
  }

  async function handleSave() {
    if (!manageTarget) return;
    setSaving(true);
    try {
      const body: { status?: SubscriptionStatus; endedAt?: string | null } = {};
      if (manageStatus !== manageTarget.status) {
        body.status = manageStatus;
      }
      const originalEnd = manageTarget.endedAt
        ? new Date(manageTarget.endedAt).toISOString()
        : null;
      const newEnd = manageEndDate ? manageEndDate.toISOString() : null;
      if (newEnd !== originalEnd) {
        body.endedAt = newEnd;
      }

      if (Object.keys(body).length === 0) {
        handleCloseManage();
        return;
      }

      const res = await fetchWithAuth(`/api/admin/subscriptions/${manageTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error();

      toast.success(t("manageDialog.success"));
      handleCloseManage();
      fetchSubscriptions();
    } catch {
      toast.error(t("manageDialog.error"));
    } finally {
      setSaving(false);
    }
  }

  const hasActiveFilters = Boolean(debouncedSearch?.trim()) || statusFilter !== "ALL";
  const showEmpty = !loading && subscriptions.length === 0;

  const statsDef = [
    {
      key: "total",
      label: t("stats.total"),
      icon: CreditCard,
      em: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-500/10",
    },
    {
      key: "active",
      label: t("stats.active"),
      icon: CheckCircle2,
      em: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      key: "pastDue",
      label: t("stats.pastDue"),
      icon: AlertTriangle,
      em: "text-red-600 dark:text-red-400",
      bg: "bg-red-500/10",
    },
    {
      key: "expiringSoon",
      label: t("stats.expiringSoon"),
      icon: CalendarClock,
      em: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
  ] as const;

  return (
    <div className="space-y-4 md:space-y-5">
      {/* ── Header ── */}
      <div className="min-w-0 text-start">
        <h1 className="text-base font-semibold leading-none tracking-tight sm:text-lg">
          {t("title")}
        </h1>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {t("subtitle")}
        </p>
      </div>

      {/* ── Stats Cards ── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading && !stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-2.5",
                  i < 2 && "border-b border-border/80",
                  i % 2 === 0 && "border-e border-border/80",
                  "sm:border-b-0 sm:border-e-0",
                  i > 0 && "sm:border-s sm:border-border/80"
                )}
              >
                <Skeleton className="size-7 shrink-0 rounded-lg sm:size-8" />
                <div className="min-w-0 flex-1 space-y-1">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {statsDef.map((def, i) => {
              const v = stats?.[def.key as keyof SubscriptionStats] ?? 0;
              const Icon = def.icon;
              return (
                <div
                  key={def.key}
                  className={cn(
                    "flex min-w-0 items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-2.5",
                    i < 2 && "border-b border-border/80",
                    i % 2 === 0 && "border-e border-border/80",
                    "sm:border-b-0 sm:border-e-0",
                    i > 0 && "sm:border-s sm:border-border/80"
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

      {/* ── Table Card ── */}
      <Card className="overflow-hidden border-border bg-white py-0 shadow-sm dark:bg-card">
        <CardContent className="p-0">
          <SubscriptionsDataTable
            data={subscriptions}
            pagination={pagination}
            page={page}
            onPageChange={setPage}
            onManage={handleOpenManage}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            loading={loading}
            showEmpty={showEmpty && !hasActiveFilters}
          />
        </CardContent>
      </Card>

      {/* ── Manage Subscription Dialog ── */}
      <Dialog open={!!manageTarget} onOpenChange={(open) => !open && handleCloseManage()}>
        <DialogContent
          className="sm:max-w-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
          dir={isRtl ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle className="text-start">
              {t("manageDialog.title")}
            </DialogTitle>
            <DialogDescription className="text-start">
              {t("manageDialog.description")}
            </DialogDescription>
          </DialogHeader>

          {manageTarget && (
            <div className="space-y-5">
              {/* Merchant info */}
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9 border">
                    <AvatarFallback className="bg-muted text-xs font-semibold">
                      {getInitials(manageTarget.merchant.name, manageTarget.merchant.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-start">
                    <p className="text-sm font-medium">
                      {manageTarget.merchant.name ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {manageTarget.merchant.email}
                    </p>
                  </div>
                  <Badge
                    variant={SUB_STATUS_VARIANT[manageTarget.status]}
                    className="shrink-0 text-xs"
                  >
                    {t(`status.${manageTarget.status}`)}
                  </Badge>
                </div>

                {/* Info rows */}
                <Separator className="my-2.5" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5 shrink-0" />
                    <span>{t("manageDialog.startedOn")}</span>
                    <span className="font-medium text-foreground" dir="ltr">
                      {format(new Date(manageTarget.startedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarX className="size-3.5 shrink-0" />
                    <span>{t("manageDialog.expiresOn")}</span>
                    <span className="font-medium text-foreground" dir="ltr">
                      {manageTarget.endedAt
                        ? format(new Date(manageTarget.endedAt), "MMM d, yyyy")
                        : t("expiry.noExpiry")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status selector */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("manageDialog.status")}
                </Label>
                <Select
                  value={manageStatus}
                  onValueChange={(v) => setManageStatus(v as SubscriptionStatus)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        {t("status.ACTIVE")}
                      </span>
                    </SelectItem>
                    <SelectItem value="PAST_DUE">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="size-3.5 text-red-500" />
                        {t("status.PAST_DUE")}
                      </span>
                    </SelectItem>
                    <SelectItem value="SUSPENDED">
                      <span className="flex items-center gap-2">
                        <XCircle className="size-3.5 text-amber-500" />
                        {t("status.SUSPENDED")}
                      </span>
                    </SelectItem>
                    <SelectItem value="CANCELED">
                      <span className="flex items-center gap-2">
                        <XCircle className="size-3.5 text-muted-foreground" />
                        {t("status.CANCELED")}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry date */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("manageDialog.expiry")}
                </Label>
                <p className="text-[0.7rem] text-muted-foreground">
                  {t("manageDialog.expiryHint")}
                </p>
                <div className="flex items-center gap-2">
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-9 flex-1 justify-start gap-2 text-start font-normal",
                          !manageEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
                        {manageEndDate
                          ? format(manageEndDate, "PPP")
                          : t("manageDialog.pickDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={manageEndDate}
                        onSelect={(d) => {
                          setManageEndDate(d);
                          setCalendarOpen(false);
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {manageEndDate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setManageEndDate(undefined)}
                      aria-label={t("manageDialog.clearDate")}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseManage}
              disabled={saving}
            >
              {t("manageDialog.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="min-w-[7rem]"
            >
              {saving ? t("manageDialog.saving") : t("manageDialog.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
