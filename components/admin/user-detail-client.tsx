"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar as CalendarIcon,
  Shield,
  Users,
  MapPin,
  Edit,
  Ban,
  CheckCircle2,
  Trash2,
  Loader2,
  Monitor,
  Wifi,
  Clock,
  AlertTriangle,
  Store,
  UserCheck,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Lock,
  KeyRound,
  Activity,
  Building2,
} from "lucide-react";

import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { adminUserEditFormSchema, zodIssuesToFieldMap } from "@/lib/validations/admin-forms";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UserRole = "ADMIN" | "MANAGER" | "CASHIER";
type UserStatus = "ACTIVE" | "BANNED" | "SUSPENDED";

type SubStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "SUSPENDED";

type Subscription = {
  id: string;
  status: SubStatus;
  startedAt: string;
  endedAt: string | null;
};

type RelatedUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: UserStatus;
  createdAt: string;
};

type RelatedLocation = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
};

type UserDetail = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  otpEnabled: boolean;
  failedLoginAttempts: number;
  lockoutUntil: string | null;
  createdAt: string;
  updatedAt: string;
  ownerManager: { id: string; name: string | null; email: string; status: UserStatus } | null;
  location: { id: string; name: string; city: string | null; address: string | null; isActive: boolean } | null;
  cashiers: RelatedUser[];
  managedLocations: RelatedLocation[];
  subscription: Subscription | null;
  _count: { cashiers: number; managedLocations: number };
};

type ActivityLog = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type ActivityPagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

const STATUS_VARIANT: Record<UserStatus, "default" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  SUSPENDED: "secondary",
  BANNED: "destructive",
};

const SUB_STATUS_VARIANT: Record<SubStatus, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  PAST_DUE: "destructive",
  CANCELED: "outline",
  SUSPENDED: "secondary",
};

const ROLE_COLOR: Record<UserRole, string> = {
  ADMIN: "text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400",
  MANAGER: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400",
  CASHIER: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400",
};

const ROLE_ICON: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  ADMIN: Shield,
  MANAGER: Store,
  CASHIER: UserCheck,
};

const ACTION_LABEL: Record<string, string> = {
  AUTH_LOGIN: "Login",
  AUTH_LOGIN_FAILED: "Failed login",
  AUTH_LOGIN_2FA_SENT: "2FA sent",
  USER_UPDATED: "Profile updated",
  USER_STATUS_UPDATED: "Status changed",
  USER_DELETED: "Deleted",
  MERCHANT_CREATED: "Merchant created",
  MERCHANT_UPDATED: "Merchant updated",
  MERCHANT_DELETED: "Merchant deleted",
};

const ACTION_COLOR: Record<string, string> = {
  AUTH_LOGIN: "text-emerald-600",
  AUTH_LOGIN_FAILED: "text-destructive",
  AUTH_LOGIN_2FA_SENT: "text-yellow-600",
};

function getInitials(name: string | null, email: string) {
  if (name) return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return "—";
  // Simplified: try to extract browser + OS
  const browsers = [
    { re: /Edg\//, name: "Edge" },
    { re: /Chrome\//, name: "Chrome" },
    { re: /Firefox\//, name: "Firefox" },
    { re: /Safari\//, name: "Safari" },
  ];
  const os = [
    { re: /Windows NT/, name: "Windows" },
    { re: /Macintosh/, name: "macOS" },
    { re: /Linux/, name: "Linux" },
    { re: /Android/, name: "Android" },
    { re: /iPhone|iPad/, name: "iOS" },
  ];
  const browser = browsers.find((b) => b.re.test(ua))?.name ?? "Unknown";
  const operatingSystem = os.find((o) => o.re.test(ua))?.name ?? "";
  return operatingSystem ? `${browser} · ${operatingSystem}` : browser;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1 text-start">
        <p className="text-xs text-muted-foreground">{label}</p>
        {children ?? <p className="text-sm font-medium break-words">{value ?? "—"}</p>}
      </div>
    </div>
  );
}

export function UserDetailClient({ userId }: { userId: string }) {
  const t = useTranslations("adminUsers");
  const locale = useLocale();
  const params = useParams() as { locale?: string | string[] };
  const rawLocale = params?.locale;
  const paramLocale =
    typeof rawLocale === "string" ? rawLocale : Array.isArray(rawLocale) ? rawLocale[0] : null;
  const isRtl =
    paramLocale === "ar" ||
    (paramLocale != null && paramLocale.startsWith("ar-")) ||
    locale === "ar" ||
    (typeof locale === "string" && locale.startsWith("ar-"));
  const pageDir: "rtl" | "ltr" = isRtl ? "rtl" : "ltr";
  const pageDirProps: React.ComponentProps<"div"> = {
    dir: pageDir,
    style: { direction: pageDir },
  };

  const [user, setUser] = React.useState<UserDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Activity
  const [activityLogs, setActivityLogs] = React.useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = React.useState(false);
  const [activityPagination, setActivityPagination] = React.useState<ActivityPagination>({
    page: 1,
    limit: 30,
    total: 0,
    pages: 1,
  });
  const [activityPage, setActivityPage] = React.useState(1);
  const [activityFetched, setActivityFetched] = React.useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editStatus, setEditStatus] = React.useState<UserStatus>("ACTIVE");
  const [editSaving, setEditSaving] = React.useState(false);
  const [editErrors, setEditErrors] = React.useState<Record<string, string>>({});

  // Ban dialog
  const [banOpen, setBanOpen] = React.useState(false);
  const [banning, setBanning] = React.useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const fetchUser = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/admin/users/${userId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUser(data.user);
      setEditName(data.user.name ?? "");
      setEditPhone(data.user.phone ?? "");
      setEditStatus(data.user.status);
    } catch {
      toast.error("Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchActivity = React.useCallback(
    async (page: number) => {
      setActivityLoading(true);
      try {
        const res = await fetchWithAuth(
          `/api/admin/users/${userId}/activity?page=${page}&limit=30`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setActivityLogs(data.logs);
        setActivityPagination(data.pagination);
        setActivityFetched(true);
      } catch {
        toast.error("Failed to load activity");
      } finally {
        setActivityLoading(false);
      }
    },
    [userId]
  );

  React.useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  async function handleEditSave() {
    const parsed = adminUserEditFormSchema.safeParse({
      name: editName,
      phone: editPhone,
    });
    if (!parsed.success) {
      const map = zodIssuesToFieldMap(parsed.error);
      const next: Record<string, string> = {};
      for (const [k, code] of Object.entries(map)) {
        next[k] = t(`detail.editForm.validation.${code}`);
      }
      setEditErrors(next);
      return;
    }
    setEditErrors({});
    setEditSaving(true);
    try {
      const res = await fetchWithAuth(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsed.data.name.trim() === "" ? null : parsed.data.name.trim(),
          phone: parsed.data.phone.trim() === "" ? null : parsed.data.phone.trim(),
          status: editStatus,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("detail.editForm.success"));
      setEditOpen(false);
      fetchUser();
    } catch {
      toast.error(t("detail.editForm.error"));
    } finally {
      setEditSaving(false);
    }
  }

  async function handleBan() {
    setBanning(true);
    try {
      const res = await fetchWithAuth(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "BANNED" }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("confirmBan.confirm"));
      setBanOpen(false);
      fetchUser();
    } catch {
      toast.error("Failed to ban user");
    } finally {
      setBanning(false);
    }
  }

  async function handleActivate() {
    try {
      const res = await fetchWithAuth(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("detail.activateButton"));
      fetchUser();
    } catch {
      toast.error("Failed to activate");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t("confirmDelete.confirm"));
      window.location.href = window.location.href.replace(/\/[^/]+$/, "");
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" {...pageDirProps}>
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center" {...pageDirProps}>
        <p className="text-sm text-muted-foreground">User not found</p>
        <Button asChild variant="outline" size="sm" className="mt-4 gap-2">
          <Link href="/dashboard/admin/users" className="inline-flex items-center gap-2">
            <ArrowLeft className="size-4 shrink-0" />
            {t("detail.backToList")}
          </Link>
        </Button>
      </div>
    );
  }

  const RoleIcon = ROLE_ICON[user.role];

  return (
    <div className="w-full max-w-full space-y-6 text-start" {...pageDirProps}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-14 border-2">
            <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
              {getInitials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 text-start">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{user.name ?? user.email}</h1>
              <Badge variant={STATUS_VARIANT[user.status]}>
                {t(`userStatus.${user.status}`)}
              </Badge>
              <span
                dir="ltr"
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLOR[user.role]}`}
              >
                <RoleIcon className="size-3" />
                {t(`roles.${user.role}`)}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user.status !== "BANNED" ? (
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              dir="ltr"
              onClick={() => setBanOpen(true)}
            >
              <Ban className="size-4" />
              {t("detail.banButton")}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-emerald-600"
              dir="ltr"
              onClick={handleActivate}
            >
              <CheckCircle2 className="size-4" />
              {t("detail.activateButton")}
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2" dir="ltr" onClick={() => setEditOpen(true)}>
            <Edit className="size-4" />
            {t("detail.editButton")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-9">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="me-2 size-4" />
                {t("detail.deleteButton")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild variant="outline" size="icon" className="size-9 shrink-0 rounded-md">
            <Link href="/dashboard/admin/users" aria-label={t("detail.backToList")}>
              <ArrowLeft className="size-4 shrink-0" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="overview"
        className="w-full max-w-full space-y-4"
        dir={pageDir}
        onValueChange={(v) => {
          if (v === "activity" && !activityFetched) {
            fetchActivity(activityPage);
          }
        }}
      >
        <div className="flex w-full max-w-full items-center justify-start">
          <TabsList className="inline-flex h-auto min-h-10 w-auto max-w-full flex-wrap items-center !justify-start gap-0.5 sm:flex-nowrap">
            <TabsTrigger value="overview" className="gap-1.5 [&>svg]:shrink-0">
            <User className="size-4" />
            <span className="hidden sm:inline">{t("detail.tabs.overview")}</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5 [&>svg]:shrink-0">
            <Activity className="size-4" />
            <span className="hidden sm:inline">{t("detail.tabs.activity")}</span>
            </TabsTrigger>
            <TabsTrigger value="relations" className="gap-1.5 [&>svg]:shrink-0">
            <Users className="size-4" />
            <span className="hidden sm:inline">{t("detail.tabs.relations")}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="text-start">
            <CardHeader className="pb-2">
              <CardTitle className="text-start text-base">{t("detail.overview.heading")}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y px-4 py-0">
              <InfoRow icon={User} label={t("detail.overview.name")} value={user.name} />
              <InfoRow icon={Mail} label={t("detail.overview.email")} value={user.email} />
              <InfoRow
                icon={Phone}
                label={t("detail.overview.phone")}
                value={user.phone ?? t("detail.overview.notProvided")}
              />
              <InfoRow icon={RoleIcon} label={t("detail.overview.role")}>
                <span
                  dir="ltr"
                  className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLOR[user.role]}`}
                >
                  <RoleIcon className="size-3" />
                  {t(`roles.${user.role}`)}
                </span>
              </InfoRow>
              <InfoRow icon={Shield} label={t("detail.overview.status")}>
                <Badge variant={STATUS_VARIANT[user.status]} className="mt-0.5">
                  {t(`userStatus.${user.status}`)}
                </Badge>
              </InfoRow>
              <InfoRow
                icon={CalendarIcon}
                label={t("detail.overview.joined")}
                value={formatDate(user.createdAt)}
              />
              <InfoRow
                icon={CalendarIcon}
                label={t("detail.overview.lastUpdated")}
                value={formatDate(user.updatedAt)}
              />
              <InfoRow icon={KeyRound} label={t("detail.overview.twoFactor")}>
                <Badge
                  variant={user.otpEnabled ? "default" : "secondary"}
                  className="mt-0.5 text-xs"
                >
                  {user.otpEnabled
                    ? t("detail.overview.enabled")
                    : t("detail.overview.disabled")}
                </Badge>
              </InfoRow>
              <InfoRow
                icon={AlertTriangle}
                label={t("detail.overview.failedLogins")}
                value={String(user.failedLoginAttempts)}
              />
              <InfoRow icon={Lock} label={t("detail.overview.lockedUntil")}>
                {user.lockoutUntil ? (
                  <p className="text-sm font-medium text-destructive">
                    {formatDateTime(user.lockoutUntil)}
                  </p>
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("detail.overview.notLocked")}
                  </p>
                )}
              </InfoRow>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ACTIVITY ── */}
        <TabsContent value="activity" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">{t("detail.activity.heading")}</h2>
              <p className="text-xs text-muted-foreground">{t("detail.activity.description")}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => fetchActivity(activityPage)}
              disabled={activityLoading}
            >
              {activityLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {activityLoading && activityLogs.length === 0 ? (
                <div className="space-y-0 divide-y">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                      <Skeleton className="size-8 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
                    <Activity className="size-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{t("detail.activity.empty.title")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("detail.activity.empty.description")}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="ps-4">{t("detail.activity.action")}</TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1.5">
                          <Wifi className="size-3.5" />
                          {t("detail.activity.ip")}
                        </span>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        <span className="flex items-center gap-1.5">
                          <Monitor className="size-3.5" />
                          {t("detail.activity.device")}
                        </span>
                      </TableHead>
                      <TableHead className="pe-4 text-end">
                        <span className="flex items-center justify-end gap-1.5">
                          <Clock className="size-3.5" />
                          {t("detail.activity.time")}
                        </span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="ps-4">
                          <span
                            className={`text-sm font-medium ${ACTION_COLOR[log.action] ?? ""}`}
                          >
                            {ACTION_LABEL[log.action] ?? log.action}
                          </span>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                            {log.ipAddress ?? "—"}
                          </code>
                        </TableCell>
                        <TableCell className="hidden max-w-[200px] truncate text-xs text-muted-foreground md:table-cell">
                          {parseUserAgent(log.userAgent)}
                        </TableCell>
                        <TableCell className="pe-4 text-end text-xs text-muted-foreground">
                          {formatDateTime(log.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Activity pagination */}
          {activityPagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {activityPagination.total} events
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activityPage <= 1 || activityLoading}
                  onClick={() => {
                    const newPage = activityPage - 1;
                    setActivityPage(newPage);
                    fetchActivity(newPage);
                  }}
                  className="gap-1"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {activityPage} / {activityPagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activityPage >= activityPagination.pages || activityLoading}
                  onClick={() => {
                    const newPage = activityPage + 1;
                    setActivityPage(newPage);
                    fetchActivity(newPage);
                  }}
                  className="gap-1"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── RELATIONS ── */}
        <TabsContent value="relations" className="space-y-4">
          {/* Cashier: manager + location */}
          {user.role === "CASHIER" && (
            <>
              {user.ownerManager && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t("detail.relations.manager")}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 py-0">
                    <div className="flex items-center gap-3 py-3">
                      <Avatar className="size-9 border">
                        <AvatarFallback className="bg-muted text-xs font-semibold">
                          {getInitials(user.ownerManager.name, user.ownerManager.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {user.ownerManager.name ?? user.ownerManager.email}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.ownerManager.email}</p>
                      </div>
                      <Badge variant={STATUS_VARIANT[user.ownerManager.status]} className="text-xs">
                        {t(`userStatus.${user.ownerManager.status}`)}
                      </Badge>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/admin/users/${user.ownerManager.id}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {user.location && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t("detail.relations.location")}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 py-0 pb-3">
                    <div className="flex items-start gap-3 py-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <MapPin className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.location.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[user.location.city, user.location.address].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                      <Badge
                        variant={user.location.isActive ? "default" : "secondary"}
                        className="ms-auto text-xs"
                      >
                        {user.location.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!user.ownerManager && !user.location && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="mb-3 size-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t("detail.relations.none")}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Manager: cashiers + locations + subscription */}
          {user.role === "MANAGER" && (
            <div className="space-y-4">
              {/* Subscription */}
              {user.subscription && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t("detail.relations.subscription")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 px-4 pb-4">
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                      <span className="text-sm text-muted-foreground">
                        {t("detail.relations.subscriptionStatus")}
                      </span>
                      <Badge variant={SUB_STATUS_VARIANT[user.subscription.status]}>
                        {t(`subStatus.${user.subscription.status}`)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                      <span className="text-sm text-muted-foreground">
                        {t("detail.relations.subscriptionStarted")}
                      </span>
                      <span className="text-sm font-medium">
                        {formatDate(user.subscription.startedAt)}
                      </span>
                    </div>
                    {user.subscription.endedAt && (
                      <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                        <span className="text-sm text-muted-foreground">Expires</span>
                        <span className="text-sm font-medium">
                          {formatDate(user.subscription.endedAt)}
                        </span>
                      </div>
                    )}
                    <div className="pt-1">
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link href={`/dashboard/admin/merchants/${user.id}`}>
                          {t("detail.relations.viewMerchantProfile")}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cashiers */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{t("detail.relations.cashiers")}</span>
                    <Badge variant="secondary">{user.cashiers.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {user.cashiers.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                      {t("detail.relations.emptyCashiers")}
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead className="ps-4">
                            {t("detail.relations.table.name")}
                          </TableHead>
                          <TableHead>{t("detail.relations.table.status")}</TableHead>
                          <TableHead className="pe-4 text-end">
                            {t("detail.relations.table.joined")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {user.cashiers.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="ps-4">
                              <div className="flex items-center gap-2">
                                <Avatar className="size-7 border">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(c.name, c.email)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{c.name ?? "—"}</p>
                                  <p className="text-xs text-muted-foreground">{c.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={STATUS_VARIANT[c.status]} className="text-xs">
                                {t(`userStatus.${c.status}`)}
                              </Badge>
                            </TableCell>
                            <TableCell className="pe-4 text-end text-xs text-muted-foreground">
                              {formatDate(c.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Locations */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{t("detail.relations.locations")}</span>
                    <Badge variant="secondary">{user.managedLocations.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {user.managedLocations.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                      {t("detail.relations.emptyLocations")}
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead className="ps-4">
                            {t("detail.relations.table.location")}
                          </TableHead>
                          <TableHead>{t("detail.relations.table.city")}</TableHead>
                          <TableHead className="pe-4 text-end">
                            {t("detail.relations.table.status")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {user.managedLocations.map((loc) => (
                          <TableRow key={loc.id}>
                            <TableCell className="ps-4 font-medium">{loc.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {loc.city ?? "—"}
                            </TableCell>
                            <TableCell className="pe-4 text-end">
                              <Badge
                                variant={loc.isActive ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {loc.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Admin: minimal */}
          {user.role === "ADMIN" && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Shield className="mb-3 size-10 text-purple-400" />
                <p className="text-sm font-medium">Platform administrator</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Admins are not linked to merchant or cashier accounts.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Edit dialog ── */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditErrors({});
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("detail.editForm.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("detail.editForm.name")}</Label>
              <div className="relative">
                <User className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    setEditErrors((p) => {
                      if (!p.name) return p;
                      const { name: _, ...rest } = p;
                      return rest;
                    });
                  }}
                  placeholder="Full name"
                  className="ps-9"
                  aria-invalid={Boolean(editErrors.name)}
                />
              </div>
              {editErrors.name ? (
                <p className="text-xs text-destructive">{editErrors.name}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>{t("detail.editForm.phone")}</Label>
              <div className="relative">
                <Phone className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={editPhone}
                  onChange={(e) => {
                    setEditPhone(e.target.value);
                    setEditErrors((p) => {
                      if (!p.phone) return p;
                      const { phone: _, ...rest } = p;
                      return rest;
                    });
                  }}
                  className="ps-9"
                  placeholder="+212..."
                  aria-invalid={Boolean(editErrors.phone)}
                />
              </div>
              {editErrors.phone ? (
                <p className="text-xs text-destructive">{editErrors.phone}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>{t("detail.editForm.status")}</Label>
              <Select
                value={editStatus}
                onValueChange={(v) => setEditStatus(v as UserStatus)}
              >
                <SelectTrigger className="focus:ring-0 focus:ring-offset-0 focus-visible:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["ACTIVE", "SUSPENDED", "BANNED"] as const).map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`userStatus.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t("detail.editForm.cancel")}
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving} className="gap-2">
              {editSaving && <Loader2 className="size-4 animate-spin" />}
              {editSaving ? t("detail.editForm.saving") : t("detail.editForm.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Ban confirm ── */}
      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("confirmBan.title")}</DialogTitle>
            <DialogDescription asChild>
              <div>
                {t("confirmBan.description")}
                <span className="mt-1 block font-medium text-foreground">
                  {user.name ?? user.email}
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanOpen(false)}>
              {t("confirmBan.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleBan} disabled={banning}>
              {banning ? "…" : t("confirmBan.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("confirmDelete.title")}</DialogTitle>
            <DialogDescription asChild>
              <div>
                {t("confirmDelete.description")}
                <span className="mt-1 block font-medium text-foreground">
                  {user.name ?? user.email}
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
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
