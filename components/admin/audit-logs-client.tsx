"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ar as arLocale, fr as frLocale, enUS } from "date-fns/locale";
import {
  Activity,
  AlertTriangle,
  Bug,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Filter,
  Info,
  LogIn,
  LogOut,
  Monitor,
  MoreHorizontal,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  TrendingUp,
  User,
  X,
  Zap,
  PenLine,
  Plus,
} from "lucide-react";
import type { Locale } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useAuthStore } from "@/store/use-auth-store";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Actor {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuditLogEntry {
  id: string;
  actorUserId: string;
  actor: Actor;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface StatsData {
  total: number;
  last24hCount: number;
  last7dCount: number;
  errorCount: number;
  errorLast24h: number;
  byAction: { action: string; count: number }[];
  byTargetType: { targetType: string; count: number }[];
  topActors: { actorUserId: string; count: number; actor: Actor | null }[];
  recentErrors: AuditLogEntry[];
  dailyActivity: { date: string; count: number }[];
}

interface LogsResponse {
  logs: AuditLogEntry[];
  pagination: Pagination;
}

// ── Action colour map ─────────────────────────────────────────────────────────

function getActionConfig(action: string): {
  color: string;
  bg: string;
  icon: React.ElementType;
  label?: string;
} {
  const a = action.toUpperCase();
  if (a.includes("CLIENT_ERROR") || a.includes("ERROR"))
    return { color: "text-red-700 dark:text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: Bug };
  if (a.includes("CLIENT_WARNING"))
    return { color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: AlertTriangle };
  if (a.includes("LOGIN_FAILED"))
    return { color: "text-red-700 dark:text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: ShieldAlert };
  if (a.includes("LOGIN"))
    return { color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: LogIn };
  if (a.includes("LOGOUT"))
    return { color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-500/10 border-slate-500/20", icon: LogOut };
  if (a.includes("DELETE") || a.includes("REMOVE"))
    return { color: "text-red-700 dark:text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: Trash2 };
  if (a.includes("CREATE") || a.includes("ADD"))
    return { color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: Plus };
  if (a.includes("UPDATE") || a.includes("EDIT") || a.includes("CHANGE"))
    return { color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: PenLine };
  if (a.includes("REFUND"))
    return { color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", icon: Zap };
  if (a.includes("CLIENT_INFO"))
    return { color: "text-sky-700 dark:text-sky-400", bg: "bg-sky-500/10 border-sky-500/20", icon: Info };
  return { color: "text-muted-foreground", bg: "bg-muted border-border", icon: Activity };
}

function ActionBadge({ action }: { action: string }) {
  const { color, bg, icon: Icon } = getActionConfig(action);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
        color,
        bg,
      )}
    >
      <Icon className="size-3 shrink-0" />
      {action}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  loading,
  variant = "default",
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  loading?: boolean;
  variant?: "default" | "error" | "success" | "warning";
}) {
  const variantCls = {
    default: "text-foreground",
    error: "text-red-600 dark:text-red-400",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
  }[variant];

  const iconCls = {
    default: "text-muted-foreground",
    error: "text-red-500",
    success: "text-emerald-500",
    warning: "text-amber-500",
  }[variant];

  return (
    <Card className="overflow-hidden border-border bg-white shadow-sm dark:bg-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="mt-1.5 h-7 w-20" />
            ) : (
              <p className={cn("mt-1 text-2xl font-bold tabular-nums", variantCls)}>
                {value}
              </p>
            )}
            {sub && !loading && (
              <p className="mt-0.5 text-[0.65rem] text-muted-foreground">{sub}</p>
            )}
          </div>
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              variant === "error" && "bg-red-500/10",
              variant === "success" && "bg-emerald-500/10",
              variant === "warning" && "bg-amber-500/10",
              variant === "default" && "bg-muted",
            )}
          >
            <Icon className={cn("size-4", iconCls)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Detail Dialog ─────────────────────────────────────────────────────────────

function LogDetailDialog({
  log,
  open,
  onClose,
}: {
  log: AuditLogEntry | null;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("auditLogs");
  const locale = useLocale();
  const dateFnsLocale =
    locale.startsWith("ar") ? arLocale : locale.startsWith("fr") ? frLocale : enUS;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    toast.success("Copied to clipboard");
  };

  if (!log) return null;

  const { color, icon: ActionIcon } = getActionConfig(log.action);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="size-4 text-muted-foreground" />
            {t("detail.title")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4 p-1">
            {/* Action badge hero */}
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <div className={cn("flex size-10 items-center justify-center rounded-full bg-muted", color)}>
                <ActionIcon className="size-5" />
              </div>
              <div>
                <ActionBadge action={log.action} />
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {format(new Date(log.createdAt), "PPpp", { locale: dateFnsLocale })}
                </p>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-0 divide-y divide-border rounded-lg border">
              {[
                { label: t("detail.id"), value: log.id, mono: true, copy: true },
                {
                  label: t("detail.timestamp"),
                  value: format(new Date(log.createdAt), "PPpp", { locale: dateFnsLocale }),
                  mono: true,
                },
                { label: t("detail.actor"), value: `${log.actor.name} (${log.actor.email})` },
                { label: t("detail.actorRole"), value: log.actor.role },
                { label: t("detail.targetType"), value: log.targetType, mono: true },
                { label: t("detail.targetId"), value: log.targetId, mono: true, copy: true },
                { label: t("detail.ip"), value: log.ipAddress ?? "—", mono: true },
              ].map(({ label, value, mono, copy }) => (
                <div key={label} className="flex items-start justify-between gap-2 px-3 py-2.5">
                  <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "break-all text-end text-xs font-medium",
                        mono && "font-mono",
                      )}
                    >
                      {value}
                    </span>
                    {copy && value !== "—" && (
                      <button
                        onClick={() => copyToClipboard(String(value))}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="size-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* User Agent */}
            {log.userAgent && (
              <div className="rounded-lg border p-3">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium">
                  <Monitor className="size-3.5 text-muted-foreground" />
                  {t("detail.userAgent")}
                </p>
                <p className="break-all font-mono text-[0.65rem] text-muted-foreground" dir="ltr">
                  {log.userAgent}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="rounded-lg border">
              <p className="flex items-center gap-1.5 border-b px-3 py-2 text-xs font-medium">
                <Info className="size-3.5 text-muted-foreground" />
                {t("detail.metadata")}
              </p>
              {log.metadata ? (
                <pre className="max-h-60 overflow-auto p-3 font-mono text-[0.65rem] leading-relaxed text-foreground">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              ) : (
                <p className="px-3 py-3 text-xs text-muted-foreground">{t("detail.noMetadata")}</p>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ── Filters bar ───────────────────────────────────────────────────────────────

interface Filters {
  search: string;
  action: string;
  targetType: string;
  from: string;
  to: string;
}

function FiltersBar({
  filters,
  searchInput,
  onSearchChange,
  onChange,
  onReset,
  actionOptions,
  targetTypeOptions,
  loading,
}: {
  filters: Filters;
  searchInput: string;
  onSearchChange: (value: string) => void;
  onChange: (f: Partial<Omit<Filters, "search">>) => void;
  onReset: () => void;
  actionOptions: string[];
  targetTypeOptions: string[];
  loading: boolean;
}) {
  const t = useTranslations("auditLogs");
  const hasFilters =
    searchInput || filters.action || filters.targetType || filters.from || filters.to;

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="relative min-w-[180px] flex-1">
        <Search className="absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-8 ps-8 text-xs"
          placeholder={t("filters.search")}
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <Select
        value={filters.action || "__all__"}
        onValueChange={(v) => onChange({ action: v === "__all__" ? "" : v })}
        disabled={loading}
      >
        <SelectTrigger className="h-8 w-[160px] text-xs">
          <SelectValue placeholder={t("filters.allActions")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t("filters.allActions")}</SelectItem>
          {actionOptions.map((a) => (
            <SelectItem key={a} value={a} className="text-xs font-mono">
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.targetType || "__all__"}
        onValueChange={(v) => onChange({ targetType: v === "__all__" ? "" : v })}
        disabled={loading}
      >
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue placeholder={t("filters.allTargets")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t("filters.allTargets")}</SelectItem>
          {targetTypeOptions.map((tt) => (
            <SelectItem key={tt} value={tt} className="text-xs font-mono">
              {tt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <input
          type="date"
          value={filters.from}
          onChange={(e) => onChange({ from: e.target.value })}
          disabled={loading}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <input
          type="date"
          value={filters.to}
          onChange={(e) => onChange({ to: e.target.value })}
          disabled={loading}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-muted-foreground"
          onClick={onReset}
        >
          <X className="size-3" />
          {t("filters.reset")}
        </Button>
      )}
    </div>
  );
}

// ── Log row ───────────────────────────────────────────────────────────────────

function LogRow({
  log,
  onClick,
  dateFnsLocale,
}: {
  log: AuditLogEntry;
  onClick: () => void;
  dateFnsLocale: Locale;
}) {
  const { color, icon: ActionIcon, bg } = getActionConfig(log.action);
  const initials = (log.actor.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <tr
      className="group cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/40"
      onClick={onClick}
    >
      {/* Time */}
      <td className="w-[130px] whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground" dir="ltr">
        <div className="flex flex-col">
          <span className="font-mono tabular-nums text-foreground">
            {format(new Date(log.createdAt), "HH:mm:ss")}
          </span>
          <span className="text-[0.6rem]">
            {format(new Date(log.createdAt), "MMM d, yyyy")}
          </span>
        </div>
      </td>

      {/* Actor */}
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Avatar className="size-6 shrink-0">
            <AvatarFallback className="text-[0.55rem] font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{log.actor.name}</p>
            <p className="truncate text-[0.6rem] text-muted-foreground">{log.actor.role}</p>
          </div>
        </div>
      </td>

      {/* Action */}
      <td className="px-4 py-2.5">
        <ActionBadge action={log.action} />
      </td>

      {/* Target */}
      <td className="px-4 py-2.5">
        <div className="flex flex-col">
          <span className="text-xs font-mono text-muted-foreground">{log.targetType}</span>
          <span className="max-w-[160px] truncate font-mono text-[0.6rem] text-foreground/60" dir="ltr">
            {log.targetId}
          </span>
        </div>
      </td>

      {/* IP */}
      <td className="hidden px-4 py-2.5 lg:table-cell">
        {log.ipAddress ? (
          <span className="font-mono text-xs text-muted-foreground" dir="ltr">
            {log.ipAddress}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-2.5 text-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onClick}>
              <Info className="me-2 size-3.5" />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(log.id).catch(() => {});
                toast.success("ID copied");
              }}
            >
              <Copy className="me-2 size-3.5" />
              Copy ID
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function SkeletonRows({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          <td className="px-4 py-2.5">
            <Skeleton className="h-8 w-24" />
          </td>
          <td className="px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
          </td>
          <td className="px-4 py-2.5">
            <Skeleton className="h-5 w-20 rounded-md" />
          </td>
          <td className="px-4 py-2.5">
            <Skeleton className="h-4 w-32" />
          </td>
          <td className="hidden px-4 py-2.5 lg:table-cell">
            <Skeleton className="h-4 w-24" />
          </td>
          <td className="px-4 py-2.5" />
        </tr>
      ))}
    </>
  );
}

// ── CSV Export ────────────────────────────────────────────────────────────────

function exportToCsv(logs: AuditLogEntry[]) {
  const headers = ["ID", "Timestamp", "Actor", "Actor Email", "Role", "Action", "Target Type", "Target ID", "IP", "User Agent"];
  const rows = logs.map((l) => [
    l.id,
    l.createdAt,
    l.actor.name,
    l.actor.email,
    l.actor.role,
    l.action,
    l.targetType,
    l.targetId,
    l.ipAddress ?? "",
    l.userAgent ?? "",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ────────────────────────────────────────────────────────────

const EMPTY_FILTERS: Filters = {
  search: "",
  action: "",
  targetType: "",
  from: "",
  to: "",
};

export function AuditLogsClient() {
  const t = useTranslations("auditLogs");
  const locale = useLocale();
  const dateFnsLocale =
    locale.startsWith("ar") ? arLocale : locale.startsWith("fr") ? frLocale : enUS;

  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  // ── State ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = React.useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = React.useState(true);

  const [logs, setLogs] = React.useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = React.useState<Pagination | null>(null);
  const [logsLoading, setLogsLoading] = React.useState(true);

  const [page, setPage] = React.useState(1);
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS);
  // Separate controlled value for the search input so it never gets disabled
  const [searchInput, setSearchInput] = React.useState("");
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [refreshingStats, setRefreshingStats] = React.useState(false);

  const [selectedLog, setSelectedLog] = React.useState<AuditLogEntry | null>(null);

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const fetchStats = React.useCallback(
    async (silent = false) => {
      if (!accessToken && !refreshToken) return;
      if (silent) setRefreshingStats(true);
      else setStatsLoading(true);
      try {
        const res = await fetchWithAuth("/api/admin/audit-logs/stats");
        if (!res.ok) throw new Error();
        setStats(await res.json());
      } catch {
        if (!silent) toast.error(t("statsError"));
      } finally {
        setStatsLoading(false);
        setRefreshingStats(false);
      }
    },
    [accessToken, refreshToken, t],
  );

  // ── Fetch logs ─────────────────────────────────────────────────────────────
  const fetchLogs = React.useCallback(
    async (pageNum: number, f: Filters) => {
      if (!accessToken && !refreshToken) return;
      setLogsLoading(true);
      try {
        const params = new URLSearchParams({ page: String(pageNum) });
        if (f.search) params.set("search", f.search);
        if (f.action) params.set("action", f.action);
        if (f.targetType) params.set("targetType", f.targetType);
        if (f.from) params.set("from", f.from);
        if (f.to) params.set("to", f.to);

        const res = await fetchWithAuth(`/api/admin/audit-logs?${params}`);
        if (!res.ok) throw new Error();
        const data: LogsResponse = await res.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      } catch {
        toast.error(t("fetchError"));
      } finally {
        setLogsLoading(false);
      }
    },
    [accessToken, refreshToken, t],
  );

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh stats every 60s
  React.useEffect(() => {
    const id = setInterval(() => fetchStats(true), 60_000);
    return () => clearInterval(id);
  }, [fetchStats]);

  // Re-fetch logs when page / applied filters change
  React.useEffect(() => {
    fetchLogs(page, filters);
  }, [fetchLogs, page, filters]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSearchChange = React.useCallback((value: string) => {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      setFilters((prev) => ({ ...prev, search: value }));
    }, 400);
  }, []);

  const handleFilterChange = React.useCallback(
    (partial: Partial<Omit<Filters, "search">>) => {
      setPage(1);
      setFilters((prev) => ({ ...prev, ...partial }));
    },
    [],
  );

  const resetFilters = React.useCallback(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchInput("");
    setPage(1);
    setFilters(EMPTY_FILTERS);
  }, []);

  // ── Derived options ────────────────────────────────────────────────────────
  const actionOptions = React.useMemo(
    () => (stats?.byAction ?? []).map((b) => b.action),
    [stats],
  );
  const targetTypeOptions = React.useMemo(
    () => (stats?.byTargetType ?? []).map((b) => b.targetType),
    [stats],
  );

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = React.useMemo(() => {
    if (!stats?.dailyActivity) return [];
    return stats.dailyActivity.map((d) => ({
      date: format(new Date(d.date), "MMM d"),
      count: d.count,
    }));
  }, [stats]);

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
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => exportToCsv(logs)}
            disabled={logs.length === 0}
          >
            <Download className="size-3.5" />
            {t("exportCsv")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              fetchStats(true);
              fetchLogs(page, filters);
            }}
            disabled={refreshingStats || logsLoading}
          >
            <RefreshCw className={cn("size-3.5", refreshingStats && "animate-spin")} />
            {refreshingStats ? t("refreshing") : t("refresh")}
          </Button>
        </div>
      </div>

      {/* ── Chart + Top Actors ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Activity Chart */}
        <Card className="overflow-hidden border-border bg-white shadow-sm dark:bg-card lg:col-span-2">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="size-4 text-muted-foreground" />
              {t("chart.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-4">
            {statsLoading ? (
              <Skeleton className="h-40 w-full rounded-lg" />
            ) : chartData.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                {t("chart.noData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="auditGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name={t("chart.events")}
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#auditGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Actors */}
        <Card className="overflow-hidden border-border bg-white shadow-sm dark:bg-card">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <User className="size-4 text-muted-foreground" />
              {t("topActors.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/60 px-4 py-0">
            {statsLoading ? (
              <div className="space-y-3 py-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="size-7 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                ))}
              </div>
            ) : (
              (stats?.topActors ?? []).map((a) => {
                const initials = (a.actor?.name ?? "?")
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <div key={a.actorUserId} className="flex items-center gap-2.5 py-2.5">
                    <Avatar className="size-7 shrink-0">
                      <AvatarFallback className="text-[0.6rem] font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {a.actor?.name ?? a.actorUserId}
                      </p>
                      <p className="truncate text-[0.6rem] text-muted-foreground">
                        {a.actor?.role ?? "—"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[0.6rem]">
                      {a.count}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Errors ── */}
      {!statsLoading && (stats?.recentErrors ?? []).length > 0 && (
        <Card className="overflow-hidden border-red-200/60 bg-red-50/30 shadow-sm dark:border-red-900/30 dark:bg-red-950/10">
          <CardHeader className="border-b border-red-200/60 px-4 py-3 dark:border-red-900/30">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
              <ShieldAlert className="size-4" />
              {t("recentErrors.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-red-200/40 px-4 py-0 dark:divide-red-900/30">
            {stats!.recentErrors.map((err) => (
              <div
                key={err.id}
                className="flex cursor-pointer items-start gap-3 py-2.5 hover:bg-red-50/60 dark:hover:bg-red-950/20"
                onClick={() => setSelectedLog(err)}
              >
                <Bug className="mt-0.5 size-3.5 shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-red-800 dark:text-red-300">
                    {(err.metadata as { message?: string } | null)?.message ?? err.action}
                  </p>
                  <p className="text-[0.6rem] text-muted-foreground">
                    {err.actor.name} ·{" "}
                    {formatDistanceToNow(new Date(err.createdAt), {
                      addSuffix: true,
                      locale: dateFnsLocale,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Logs Table ── */}
      <Card className="overflow-hidden border-border bg-white shadow-sm dark:bg-card">
        {/* Toolbar */}
        <div className="border-b border-border/60 px-4 py-3">
          <div className="mb-3 flex items-center gap-2">
            <Filter className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-sm font-semibold">{t("filters.searchLabel")}</span>
            {pagination && (
              <Badge variant="secondary" className="ms-auto text-[0.65rem]">
                {pagination.total.toLocaleString()} events
              </Badge>
            )}
          </div>
          <FiltersBar
            filters={filters}
            searchInput={searchInput}
            onSearchChange={handleSearchChange}
            onChange={handleFilterChange}
            onReset={resetFilters}
            actionOptions={actionOptions}
            targetTypeOptions={targetTypeOptions}
            loading={logsLoading}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground">
                  {t("table.timestamp")}
                </th>
                <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground">
                  {t("table.actor")}
                </th>
                <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground">
                  {t("table.action")}
                </th>
                <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground">
                  {t("table.target")}
                </th>
                <th className="hidden px-4 py-2.5 text-start text-xs font-medium text-muted-foreground lg:table-cell">
                  {t("table.ip")}
                </th>
                <th className="w-10 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <SkeletonRows />
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Activity className="size-8 text-muted-foreground/30" />
                      <p className="text-sm font-medium">{t("empty.title")}</p>
                      <p className="text-xs text-muted-foreground">{t("empty.description")}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    onClick={() => setSelectedLog(log)}
                    dateFnsLocale={dateFnsLocale}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {t("table.page", {
                page: pagination.page,
                total: pagination.totalPages,
              })}
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                disabled={page === 1 || logsLoading}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum =
                  pagination.totalPages <= 5
                    ? i + 1
                    : page <= 3
                      ? i + 1
                      : page >= pagination.totalPages - 2
                        ? pagination.totalPages - 4 + i
                        : page - 2 + i;
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "default" : "outline"}
                    size="icon"
                    className="size-7 text-xs"
                    onClick={() => setPage(pageNum)}
                    disabled={logsLoading}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                disabled={page === pagination.totalPages || logsLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Detail Dialog ── */}
      <LogDetailDialog
        log={selectedLog}
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
