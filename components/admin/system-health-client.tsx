"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  Activity,
  Database,
  Server,
  Cpu,
  MemoryStick,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Monitor,
  Gauge,
  HardDrive,
  Terminal,
  Table2,
  Wifi,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar as arLocale, fr as frLocale, enUS } from "date-fns/locale";

import { useAuthStore } from "@/store/use-auth-store";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ServiceStatus {
  status: "ok" | "error";
  latency: number;
  message?: string;
}

interface HealthData {
  timestamp: string;
  environment: string;
  nodeVersion: string;
  uptimeSeconds: number;
  pid: number;
  services: {
    database: ServiceStatus;
    api: ServiceStatus;
  };
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
  cpu: {
    userMs: number;
    systemMs: number;
  };
  system: {
    platform: string;
    arch: string;
    hostname: string;
    cpuCount: number;
    cpuModel: string;
    loadAvg: [number, number, number];
    totalMemoryMB: number;
    freeMemoryMB: number;
    usedMemoryMB: number;
    osUptime: number;
  };
  dbTables: Record<string, number> | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function pctColor(pct: number) {
  return pct > 85 ? "bg-red-500" : pct > 65 ? "bg-amber-500" : "bg-emerald-500";
}

function pctTextColor(pct: number) {
  return pct > 85
    ? "text-red-600 dark:text-red-400"
    : pct > 65
      ? "text-amber-600 dark:text-amber-400"
      : "text-emerald-600 dark:text-emerald-400";
}

function MiniBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", pctColor(pct))}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function InfoRow({
  label,
  value,
  loading,
  mono,
  dir: rowDir,
}: {
  label: string;
  value?: React.ReactNode;
  loading?: boolean;
  mono?: boolean;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      {loading ? (
        <Skeleton className="h-4 w-24" />
      ) : (
        <span
          className={cn("truncate text-end font-medium", mono && "font-mono")}
          dir={rowDir ?? "ltr"}
        >
          {value ?? "—"}
        </span>
      )}
    </div>
  );
}

// ── Service row ───────────────────────────────────────────────────────────────

function ServiceRow({
  icon: Icon,
  label,
  service,
  t,
}: {
  icon: React.ElementType;
  label: string;
  service: ServiceStatus | undefined;
  t: ReturnType<typeof useTranslations<"adminSystemHealth">>;
}) {
  if (!service) {
    return (
      <div className="flex items-center justify-between gap-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <Skeleton className="h-5 w-20" />
      </div>
    );
  }

  const isOk = service.status === "ok";
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon className={cn("size-4 shrink-0", isOk ? "text-emerald-500" : "text-red-500")} />
        <div className="min-w-0 text-start">
          <p className="text-sm font-medium">{label}</p>
          {service.message && (
            <p className="mt-0.5 truncate text-xs text-red-500">{service.message}</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {service.latency > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {t("services.latency", { ms: service.latency })}
          </span>
        )}
        <Badge
          variant={isOk ? "default" : "destructive"}
          className={cn(
            "h-5 px-2 text-[0.65rem]",
            isOk &&
              "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400",
          )}
        >
          {isOk ? (
            <CheckCircle2 className="me-1 size-2.5" />
          ) : (
            <XCircle className="me-1 size-2.5" />
          )}
          {t(`status.${service.status}`)}
        </Badge>
      </div>
    </div>
  );
}

// ── Load gauge ────────────────────────────────────────────────────────────────

function LoadRow({ label, value, cpuCount }: { label: string; value: number; cpuCount: number }) {
  const pct = cpuCount > 0 ? Math.min(100, Math.round((value / cpuCount) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("tabular-nums font-semibold", pctTextColor(pct))} dir="ltr">
          {value.toFixed(2)}
        </span>
      </div>
      <MiniBar value={value} max={cpuCount} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SystemHealthClient() {
  const t = useTranslations("adminSystemHealth");
  const locale = useLocale();
  const dateFnsLocale = locale.startsWith("ar") ? arLocale : locale.startsWith("fr") ? frLocale : enUS;
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  const [data, setData] = React.useState<HealthData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastFetchedAt, setLastFetchedAt] = React.useState<Date | null>(null);

  const fetchHealth = React.useCallback(
    async (silent = false) => {
      if (!accessToken && !refreshToken) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await fetchWithAuth("/api/admin/system-health");
        if (!res.ok) throw new Error();
        const json: HealthData = await res.json();
        setData(json);
        setLastFetchedAt(new Date());
      } catch {
        toast.error(t("fetchError"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, refreshToken, t],
  );

  React.useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  React.useEffect(() => {
    const id = setInterval(() => fetchHealth(true), 30_000);
    return () => clearInterval(id);
  }, [fetchHealth]);

  const overallOk =
    !data ||
    (data.services.database.status === "ok" && data.services.api.status === "ok");

  const heapPct =
    data && data.memory.heapTotal > 0
      ? Math.min(100, Math.round((data.memory.heapUsed / data.memory.heapTotal) * 100))
      : 0;
  const sysMemPct =
    data && data.system.totalMemoryMB > 0
      ? Math.min(
          100,
          Math.round((data.system.usedMemoryMB / data.system.totalMemoryMB) * 100),
        )
      : 0;

  const DB_TABLE_KEYS = [
    "users",
    "subscriptions",
    "customers",
    "sales",
    "products",
    "locations",
    "auditLogs",
    "suppliers",
  ] as const;

  return (
    <div className="space-y-4 md:space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 text-start">
          <h1 className="text-base font-semibold leading-none tracking-tight sm:text-lg">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {lastFetchedAt && (
            <span className="hidden text-xs text-muted-foreground sm:inline-block">
              {t("lastUpdated")}{" "}
              <span>{formatDistanceToNow(lastFetchedAt, { addSuffix: true, locale: dateFnsLocale })}</span>
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchHealth(true)}
            disabled={refreshing || loading}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
            {refreshing ? t("refreshing") : t("refresh")}
          </Button>
        </div>
      </div>

      {/* ── Status Banner ── */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-4 rounded-xl border px-4 py-3 shadow-sm transition-colors",
          loading
            ? "border-border bg-card"
            : overallOk
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-red-500/30 bg-red-500/5",
        )}
      >
        <div className="flex items-center gap-3">
          {loading ? (
            <>
              <Skeleton className="size-3 rounded-full" />
              <Skeleton className="h-4 w-48" />
            </>
          ) : (
            <>
              <span className="relative flex size-3">
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                    overallOk ? "bg-emerald-500" : "bg-red-500",
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex size-3 rounded-full",
                    overallOk ? "bg-emerald-500" : "bg-red-500",
                  )}
                />
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  overallOk
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-red-700 dark:text-red-400",
                )}
              >
                {t(`statusBanner.${overallOk ? "allOk" : "degraded"}`)}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {loading ? (
            <>
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-28" />
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5 shrink-0" />
                {t("statusBanner.processUptime")}:{" "}
                <span className="font-mono font-medium text-foreground" dir="ltr">
                  {data ? formatUptime(data.uptimeSeconds) : "—"}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <Monitor className="size-3.5 shrink-0" />
                {t("statusBanner.osUptime")}:{" "}
                <span className="font-mono font-medium text-foreground" dir="ltr">
                  {data ? formatUptime(data.system.osUptime) : "—"}
                </span>
              </span>
              <Badge variant="outline" className="font-mono text-[0.65rem] capitalize">
                {data?.environment ?? "—"}
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* ── Row 1: Services · Runtime · Process Memory ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        {/* Services */}
        <Card className="overflow-hidden border-border bg-white shadow-sm dark:bg-card">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Wifi className="size-4 text-muted-foreground" />
              {t("services.title")}
              {!loading && (
                <Badge
                  variant={overallOk ? "default" : "destructive"}
                  className={cn(
                    "ms-auto h-5 px-2 text-[0.65rem]",
                    overallOk &&
                      "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400",
                  )}
                >
                  {overallOk ? (
                    <CheckCircle2 className="me-1 size-2.5" />
                  ) : (
                    <AlertTriangle className="me-1 size-2.5" />
                  )}
                  {t(`status.${overallOk ? "ok" : "error"}`)}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/60 px-4 py-0">
            <ServiceRow
              icon={Database}
              label={t("services.database")}
              service={loading ? undefined : data?.services.database}
              t={t}
            />
            <ServiceRow
              icon={Server}
              label={t("services.api")}
              service={
                loading ? undefined : (data?.services.api ?? { status: "ok", latency: 0 })
              }
              t={t}
            />
          </CardContent>
        </Card>

        {/* Runtime */}
        <Card className="overflow-hidden border-border bg-white shadow-sm dark:bg-card">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Cpu className="size-4 text-muted-foreground" />
              {t("environment")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/60 px-4 py-0">
            <InfoRow label={t("environment")} value={data?.environment} loading={loading} mono />
            <InfoRow label={t("nodeVersion")} value={data?.nodeVersion} loading={loading} mono />
            <InfoRow label={t("pid")} value={data?.pid} loading={loading} mono />
          </CardContent>
        </Card>

        {/* Process Memory */}
        <Card className="overflow-hidden border-border bg-white shadow-sm dark:bg-card sm:col-span-2 lg:col-span-1">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <MemoryStick className="size-4 text-muted-foreground" />
              {t("memory.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 py-3">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            ) : (
              <>
                {/* Heap bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t("memory.heapUsed")}</span>
                    <span className={cn("tabular-nums font-semibold", pctTextColor(heapPct))} dir="ltr">
                      {data?.memory.heapUsed ?? 0} / {data?.memory.heapTotal ?? 0} MB
                    </span>
                  </div>
                  <MiniBar value={data?.memory.heapUsed ?? 0} max={data?.memory.heapTotal ?? 1} />
                </div>
                <Separator />
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("memory.rss")}</span>
                    <span className="tabular-nums font-medium" dir="ltr">{data?.memory.rss ?? 0} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("memory.external")}</span>
                    <span className="tabular-nums font-medium" dir="ltr">{data?.memory.external ?? 0} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("memory.arrayBuffers")}</span>
                    <span className="tabular-nums font-medium" dir="ltr">{data?.memory.arrayBuffers ?? 0} MB</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: System Info · CPU Load · System Memory ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        {/* System Info */}
        <Card className="overflow-hidden border-border bg-white shadow-sm dark:bg-card">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Monitor className="size-4 text-muted-foreground" />
              {t("system.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/60 px-4 py-0">
            <InfoRow label={t("system.hostname")} value={data?.system.hostname} loading={loading} mono />
            <InfoRow label={t("system.platform")} value={data?.system.platform} loading={loading} mono />
            <InfoRow label={t("system.arch")} value={data?.system.arch} loading={loading} mono />
            <InfoRow
              label={t("system.cpuCores")}
              value={data?.system.cpuCount}
              loading={loading}
              mono
            />
          </CardContent>
        </Card>

        {/* CPU Load */}
        <Card className="overflow-hidden border-border bg-white shadow-sm dark:bg-card">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Gauge className="size-4 text-muted-foreground" />
              {t("load.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 py-3">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            ) : (
              <>
                <LoadRow
                  label={t("load.avg1m")}
                  value={data?.system.loadAvg[0] ?? 0}
                  cpuCount={data?.system.cpuCount ?? 1}
                />
                <LoadRow
                  label={t("load.avg5m")}
                  value={data?.system.loadAvg[1] ?? 0}
                  cpuCount={data?.system.cpuCount ?? 1}
                />
                <LoadRow
                  label={t("load.avg15m")}
                  value={data?.system.loadAvg[2] ?? 0}
                  cpuCount={data?.system.cpuCount ?? 1}
                />
                <p className="pt-1 text-[0.65rem] italic text-muted-foreground">
                  {t("load.hint")}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* System Memory */}
        <Card className="overflow-hidden border-border bg-white shadow-sm dark:bg-card sm:col-span-2 lg:col-span-1">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <HardDrive className="size-4 text-muted-foreground" />
              {t("sysMem.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 py-3">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t("sysMem.used")}</span>
                    <span className={cn("tabular-nums font-semibold", pctTextColor(sysMemPct))} dir="ltr">
                      {data?.system.usedMemoryMB ?? 0} / {data?.system.totalMemoryMB ?? 0} MB
                    </span>
                  </div>
                  <MiniBar
                    value={data?.system.usedMemoryMB ?? 0}
                    max={data?.system.totalMemoryMB ?? 1}
                  />
                </div>
                <Separator />
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("sysMem.total")}</span>
                    <span className="tabular-nums font-medium" dir="ltr">
                      {data?.system.totalMemoryMB ?? 0} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("sysMem.free")}</span>
                    <span className="tabular-nums font-medium" dir="ltr">
                      {data?.system.freeMemoryMB ?? 0} MB
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Process · CPU model · Database Tables ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        {/* Process */}
        <Card className="overflow-hidden border-border bg-white shadow-sm dark:bg-card">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Terminal className="size-4 text-muted-foreground" />
              {t("process.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/60 px-4 py-0">
            <InfoRow label={t("process.pid")} value={data?.pid} loading={loading} mono />
            <InfoRow
              label={t("process.cpuUser")}
              value={data ? `${data.cpu.userMs} ms` : undefined}
              loading={loading}
              mono
            />
            <InfoRow
              label={t("process.cpuSystem")}
              value={data ? `${data.cpu.systemMs} ms` : undefined}
              loading={loading}
              mono
            />
          </CardContent>
        </Card>

        {/* CPU Model */}
        <Card className="overflow-hidden border-border bg-white shadow-sm dark:bg-card">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="size-4 text-muted-foreground" />
              {t("system.cpuModel")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <p className="font-mono text-xs leading-relaxed text-foreground" dir="ltr">
                {data?.system.cpuModel ?? "—"}
              </p>
            )}
            <Separator className="my-3" />
            <InfoRow
              label={t("system.osUptime")}
              value={data ? formatUptime(data.system.osUptime) : undefined}
              loading={loading}
              mono
            />
          </CardContent>
        </Card>

        {/* Database Tables */}
        <Card className="overflow-hidden border-border bg-white shadow-sm dark:bg-card sm:col-span-2 lg:col-span-1">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Table2 className="size-4 text-muted-foreground" />
              {t("dbTables.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-0">
            {loading ? (
              <div className="divide-y divide-border/60">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3.5 w-8" />
                  </div>
                ))}
              </div>
            ) : data?.dbTables ? (
              <div className="divide-y divide-border/60">
                {DB_TABLE_KEYS.map((key) => {
                  const count = data.dbTables![key] ?? 0;
                  return (
                    <div key={key} className="flex items-center justify-between py-2 text-xs">
                      <span className="font-mono text-muted-foreground">{key}</span>
                      <Badge
                        variant="outline"
                        className="h-5 min-w-[2.5rem] justify-center px-2 font-mono text-[0.65rem] tabular-nums"
                      >
                        {count.toLocaleString()}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
