"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Users,
  ArrowLeft,
  MoreHorizontal,
  Ban,
  CheckCircle2,
  Pencil,
  UserPlus,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
} from "lucide-react";

import type { CashierPermissions } from "@/lib/cashier-permissions-model";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/store/use-auth-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

type CashierRow = {
  id: string;
  email: string;
  name: string | null;
  status: "ACTIVE" | "BANNED" | "SUSPENDED";
  createdAt: string;
  hasPin: boolean;
  pinQuickLoginActive: boolean;
  cashierPermissions: CashierPermissions;
};

const USER_STATUS_VARIANT: Record<CashierRow["status"], "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  SUSPENDED: "secondary",
  BANNED: "destructive",
};

function getInitials(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }
  if (email?.trim()) return email[0].toUpperCase();
  return "?";
}

function formatCashierDate(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function enforcePermissionHierarchy(p: CashierPermissions): CashierPermissions {
  const next = { ...p };
  if (next.productAdd || next.productEdit || next.productDelete || next.categoriesManage) {
    next.catalogView = true;
  }
  if (next.customersEdit || next.creditCollect) {
    next.customersView = true;
  }
  if (next.saleLookupById) {
    next.salesView = true;
  }
  return next;
}

export function ManagerStaffClient() {
  const t = useTranslations("managerStaff");
  const params = useParams() as { locale?: string | string[] };
  const rawLocale = params?.locale;
  const paramLocale =
    typeof rawLocale === "string" ? rawLocale : Array.isArray(rawLocale) ? rawLocale[0] : null;
  const hookLocale = useLocale();
  const isRtl =
    paramLocale === "ar" ||
    (paramLocale != null && paramLocale.startsWith("ar-")) ||
    hookLocale === "ar" ||
    (typeof hookLocale === "string" && hookLocale.startsWith("ar-"));
  const pageDir: "rtl" | "ltr" = isRtl ? "rtl" : "ltr";
  const pageDirProps: React.ComponentProps<"div"> = {
    dir: pageDir,
    style: { direction: pageDir },
  };

  const authUser = useAuthStore((s) => s.user);

  const [loading, setLoading] = React.useState(true);
  const [cashiers, setCashiers] = React.useState<CashierRow[]>([]);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CashierRow | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [statusSavingId, setStatusSavingId] = React.useState<string | null>(null);

  const [permOpen, setPermOpen] = React.useState(false);
  const [permSubject, setPermSubject] = React.useState<CashierRow | null>(null);
  const [permDraft, setPermDraft] = React.useState<CashierPermissions | null>(null);
  const [permSaving, setPermSaving] = React.useState(false);

  const [cEmail, setCEmail] = React.useState("");
  const [cName, setCName] = React.useState("");
  const [cPassword, setCPassword] = React.useState("");
  const [cPin, setCPin] = React.useState("");

  const [eEmail, setEEmail] = React.useState("");
  const [eName, setEName] = React.useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/manager/cashiers");
      if (!res.ok) {
        toast.error(t("errors.loadFailed"));
        return;
      }
      const data = (await res.json()) as { cashiers: CashierRow[] };
      setCashiers(data.cashiers ?? []);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  function openEdit(row: CashierRow) {
    setEditing(row);
    setEEmail(row.email);
    setEName(row.name ?? "");
    setEditOpen(true);
  }

  function openPermissions(row: CashierRow) {
    setPermSubject(row);
    setPermDraft(enforcePermissionHierarchy({ ...row.cashierPermissions }));
    setPermOpen(true);
  }

  async function savePermissions(e: React.FormEvent) {
    e.preventDefault();
    if (!permSubject || !permDraft) return;
    setPermSaving(true);
    try {
      const res = await fetchWithAuth(`/api/manager/cashiers/${permSubject.id}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enforcePermissionHierarchy(permDraft)),
      });
      if (!res.ok) {
        toast.error(t("errors.permFailed"));
        return;
      }
      toast.success(t("toast.permSaved"));
      setPermOpen(false);
      setPermSubject(null);
      setPermDraft(null);
      await load();
    } finally {
      setPermSaving(false);
    }
  }

  async function handleStatusToggle(row: CashierRow) {
    const newStatus: CashierRow["status"] = row.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setStatusSavingId(row.id);
    try {
      const res = await fetchWithAuth(`/api/manager/cashiers/${row.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        toast.error(t("errors.statusFailed"));
        return;
      }
      toast.success(newStatus === "ACTIVE" ? t("statusToggle.activated") : t("statusToggle.suspended"));
      await load();
    } finally {
      setStatusSavingId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const email = cEmail.trim().toLowerCase();
    const name = cName.trim();
    const password = cPassword;
    const pin = cPin.replace(/\D/g, "").slice(0, 4);
    if (!email || name.length < 2 || password.length < 8 || pin.length !== 4) {
      toast.error(t("errors.validation"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetchWithAuth("/api/manager/cashiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, pin }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 409 && data.error === "EMAIL_IN_USE") {
        toast.error(t("errors.emailInUse"));
        return;
      }
      if (!res.ok) {
        toast.error(t("errors.createFailed"));
        return;
      }
      toast.success(t("toast.created"));
      setCreateOpen(false);
      setCEmail("");
      setCName("");
      setCPassword("");
      setCPin("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const email = eEmail.trim().toLowerCase();
    const name = eName.trim();
    if (!email || name.length < 2) {
      toast.error(t("errors.validation"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetchWithAuth(`/api/manager/cashiers/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 409 && data.error === "EMAIL_IN_USE") {
        toast.error(t("errors.emailInUse"));
        return;
      }
      if (!res.ok) {
        toast.error(t("errors.updateFailed"));
        return;
      }
      toast.success(t("toast.updated"));
      setEditOpen(false);
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  const activeCount = cashiers.filter((c) => c.status === "ACTIVE").length;
  const pinReadyCount = cashiers.filter((c) => c.pinQuickLoginActive).length;
  const canManageProducts = Boolean(
    permDraft?.productAdd || permDraft?.productEdit || permDraft?.productDelete || permDraft?.categoriesManage,
  );

  const createDialog = (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>{t("create.title")}</DialogTitle>
            <DialogDescription>{t("create.description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="staff-email">{t("fields.email")}</Label>
              <Input
                id="staff-email"
                type="email"
                value={cEmail}
                onChange={(e) => setCEmail(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="staff-name">{t("fields.name")}</Label>
              <Input
                id="staff-name"
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                minLength={2}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="staff-password">{t("fields.password")}</Label>
              <Input
                id="staff-password"
                type="password"
                value={cPassword}
                onChange={(e) => setCPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="staff-pin">{t("fields.pin")}</Label>
              <Input
                id="staff-pin"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={cPin}
                onChange={(e) => setCPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="0000"
                className="font-mono tracking-widest"
                dir="ltr"
                required
              />
              <p className="text-xs text-muted-foreground">{t("fields.pinHint")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : t("create.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="w-full max-w-full space-y-6" {...pageDirProps}>
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-6 text-start" {...pageDirProps}>
      {createDialog}

      {/* Header — aligned with admin merchant detail */}
      <div className="flex w-full max-w-full flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 max-w-full items-center gap-3">
          <Avatar className="size-14 border-2">
            <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
              {getInitials(authUser?.name, authUser?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <Button asChild variant="outline" size="icon" className="size-9 shrink-0 rounded-md">
          <Link href="/dashboard/manager" aria-label={t("backToDashboard")}>
            <ArrowLeft className="size-4 shrink-0" />
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="cashiers" className="w-full max-w-full space-y-4" dir={pageDir}>
        <div className="flex w-full max-w-full items-center justify-start">
          <TabsList className="inline-flex h-auto min-h-10 w-auto max-w-full flex-wrap items-center !justify-start gap-0.5 sm:flex-nowrap">
            <TabsTrigger value="overview" className="gap-1.5 [&>svg]:shrink-0">
              <ShieldCheck className="size-4" />
              <span className="hidden sm:inline">{t("tabs.overview")}</span>
            </TabsTrigger>
            <TabsTrigger value="cashiers" className="gap-1.5 [&>svg]:shrink-0">
              <Users className="size-4" />
              <span className="hidden sm:inline">{t("tabs.cashiers")}</span>
              {cashiers.length > 0 ? (
                <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-xs">
                  {cashiers.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <Users className="size-4 text-muted-foreground" />
                  {t("overview.statTotal")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{cashiers.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("overview.statTotalHint")}</p>
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  {t("overview.statActive")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {activeCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{t("overview.statActiveHint")}</p>
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <Timer className="size-4 text-muted-foreground" />
                  {t("overview.statPinReady")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{pinReadyCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("overview.statPinReadyHint")}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-dashed bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">{t("overview.hintTitle")}</CardTitle>
              <CardDescription>{t("overview.hintBody")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" className="gap-2" onClick={() => setCreateOpen(true)}>
                <UserPlus className="size-4" />
                {t("addStaff")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashiers" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 text-start">
              <h2 className="text-base font-semibold">{t("staffTab.heading")}</h2>
              <p className="text-xs text-muted-foreground">
                {cashiers.length} {t("staffTab.countSuffix")}
              </p>
            </div>
            <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4 shrink-0" />
              {t("addStaff")}
            </Button>
          </div>

          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardContent className="p-0">
              {cashiers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
                    <Users className="size-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{t("emptyTitle")}</p>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">{t("emptyDescription")}</p>
                  <Button size="sm" className="mt-4 gap-2" onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4 shrink-0" />
                    {t("addStaff")}
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="ps-4">{t("table.member")}</TableHead>
                      <TableHead>{t("table.status")}</TableHead>
                      <TableHead>{t("table.quickPin")}</TableHead>
                      <TableHead>{t("table.joined")}</TableHead>
                      <TableHead className="pe-4 text-end">{t("table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashiers.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="ps-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 border">
                              <AvatarFallback className="bg-muted text-xs font-semibold">
                                {getInitials(row.name, row.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{row.name ?? "—"}</p>
                              <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={USER_STATUS_VARIANT[row.status]} className="text-xs">
                            {t(`status.${row.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "text-xs",
                              row.pinQuickLoginActive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground",
                            )}
                          >
                            {row.hasPin
                              ? row.pinQuickLoginActive
                                ? t("quickPin.active")
                                : t("quickPin.needsFullLogin")
                              : t("quickPin.noPin")}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatCashierDate(row.createdAt, hookLocale)}
                        </TableCell>
                        <TableCell className="pe-4 text-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onClick={() => openEdit(row)}>
                                <Pencil className="size-4 shrink-0" />
                                {t("editLabel")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openPermissions(row)}>
                                <SlidersHorizontal className="size-4 shrink-0" />
                                {t("permissions.menu")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={statusSavingId === row.id}
                                onClick={() => void handleStatusToggle(row)}
                              >
                                {row.status === "ACTIVE" ? (
                                  <>
                                    <Ban className="size-4 shrink-0" />
                                    {t("statusToggle.suspendAction")}
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="size-4 shrink-0" />
                                    {t("statusToggle.activateAction")}
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 p-0 sm:max-w-lg">
          <form onSubmit={savePermissions} className="flex max-h-[inherit] flex-col">
            <DialogHeader className="border-b px-6 py-4 text-start">
              <DialogTitle>{t("permissions.title")}</DialogTitle>
              <DialogDescription>
                {permSubject ? t("permissions.subtitle", { name: permSubject.name ?? permSubject.email }) : null}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[55vh] px-6 py-4">
              <div className="space-y-4 pe-2">
                {permDraft ? (
                  <>
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{t("permissions.groups.products")}</p>
                        <Switch
                          id="perm-products-master"
                          checked={canManageProducts}
                          onCheckedChange={(checked) => {
                            setPermDraft((d) =>
                              d
                                ? enforcePermissionHierarchy({
                                    ...d,
                                    productAdd: Boolean(checked),
                                    productEdit: Boolean(checked),
                                    productDelete: Boolean(checked),
                                    categoriesManage: Boolean(checked),
                                  })
                                : d,
                            );
                          }}
                        />
                      </div>
                      {canManageProducts ? (
                        <div className="space-y-2 border-t pt-3">
                          {(["productAdd", "productEdit", "productDelete", "categoriesManage"] as const).map((key) => (
                            <div key={key} className="flex items-center justify-between gap-3">
                              <Label htmlFor={`perm-${key}`} className="cursor-pointer text-sm">
                                {(t as (k: string) => string)(`permKeys.${key}`)}
                              </Label>
                              <Switch
                                id={`perm-${key}`}
                                checked={permDraft[key]}
                                onCheckedChange={(checked) =>
                                  setPermDraft((d) => (d ? enforcePermissionHierarchy({ ...d, [key]: Boolean(checked) }) : d))
                                }
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <p className="mb-3 text-sm font-medium">{t("permissions.groups.sales")}</p>
                      <div className="space-y-2">
                        {(["posCheckout", "salesView", "saleLookupById", "sessionsManage"] as const).map((key) => (
                          <div key={key} className="flex items-center justify-between gap-3">
                            <Label htmlFor={`perm-${key}`} className="cursor-pointer text-sm">
                              {(t as (k: string) => string)(`permKeys.${key}`)}
                            </Label>
                            <Switch
                              id={`perm-${key}`}
                              checked={permDraft[key]}
                              onCheckedChange={(checked) =>
                                setPermDraft((d) => (d ? enforcePermissionHierarchy({ ...d, [key]: Boolean(checked) }) : d))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <p className="mb-3 text-sm font-medium">{t("permissions.groups.customers")}</p>
                      <div className="space-y-2">
                        {(["customersView", "customersEdit", "creditCollect"] as const).map((key) => (
                          <div key={key} className="flex items-center justify-between gap-3">
                            <Label htmlFor={`perm-${key}`} className="cursor-pointer text-sm">
                              {(t as (k: string) => string)(`permKeys.${key}`)}
                            </Label>
                            <Switch
                              id={`perm-${key}`}
                              checked={permDraft[key]}
                              onCheckedChange={(checked) =>
                                setPermDraft((d) => (d ? enforcePermissionHierarchy({ ...d, [key]: Boolean(checked) }) : d))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="perm-catalogView" className="cursor-pointer text-sm font-medium">
                          {(t as (k: string) => string)("permKeys.catalogView")}
                        </Label>
                        <Switch
                          id="perm-catalogView"
                          checked={permDraft.catalogView}
                          disabled={canManageProducts}
                          onCheckedChange={(checked) =>
                            setPermDraft((d) => (d ? enforcePermissionHierarchy({ ...d, catalogView: Boolean(checked) }) : d))
                          }
                        />
                      </div>
                      {canManageProducts ? (
                        <p className="mt-2 text-xs text-muted-foreground">{t("permissions.catalogForced")}</p>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            </ScrollArea>
            <DialogFooter className="border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setPermOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={permSaving}>
                {permSaving ? <Loader2 className="size-4 animate-spin" /> : t("permissions.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>{t("editDialog.title")}</DialogTitle>
              <DialogDescription>{t("editDialog.description")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-email">{t("fields.email")}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={eEmail}
                  onChange={(e) => setEEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-name">{t("fields.name")}</Label>
                <Input id="edit-name" value={eName} onChange={(e) => setEName(e.target.value)} minLength={2} required />
              </div>
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
                {t("editDialog.emailWarning")}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : t("editDialog.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
