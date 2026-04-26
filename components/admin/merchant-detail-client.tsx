"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
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
  Plus,
  Trash2,
  Loader2,
  MoreHorizontal,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CalendarClock,
  ShieldCheck,
  Building2,
  Wand2,
} from "lucide-react";

import { useAuthStore } from "@/store/use-auth-store";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { cn } from "@/lib/utils";
import { formatLongDate, formatYmd, parseYmd } from "@/lib/merchant-form-dates";
import { Link } from "@/i18n/navigation";
import { generateMerchantPassword } from "@/lib/generate-merchant-password";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "SUSPENDED";
type UserStatus = "ACTIVE" | "BANNED" | "SUSPENDED";

type Subscription = {
  id: string;
  status: SubscriptionStatus;
  startedAt: string;
  endedAt: string | null;
  updatedAt: string;
};

type StaffMember = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: UserStatus;
  createdAt: string;
};

type Location = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
};

type Merchant = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  subscription: Subscription | null;
  cashiers: StaffMember[];
  managedLocations: Location[];
};

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string | null, email: string) {
  if (name) {
    return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}

export function MerchantDetailClient({ merchantId }: { merchantId: string }) {
  const t = useTranslations("adminMerchants");
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  const [merchant, setMerchant] = React.useState<Merchant | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Edit merchant dialog
  const [editOpen, setEditOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editStatus, setEditStatus] = React.useState<UserStatus>("ACTIVE");
  const [editSaving, setEditSaving] = React.useState(false);

  // Ban confirm
  const [banOpen, setBanOpen] = React.useState(false);
  const [banning, setBanning] = React.useState(false);

  // Add staff dialog
  const [addStaffOpen, setAddStaffOpen] = React.useState(false);
  const [staffName, setStaffName] = React.useState("");
  const [staffEmail, setStaffEmail] = React.useState("");
  const [staffPhone, setStaffPhone] = React.useState("");
  const [staffPassword, setStaffPassword] = React.useState("");
  const [showStaffPwd, setShowStaffPwd] = React.useState(false);
  const [staffLockPin, setStaffLockPin] = React.useState("");
  const [staffAdding, setStaffAdding] = React.useState(false);
  const [staffErrors, setStaffErrors] = React.useState<Record<string, string | undefined>>({});

  // Remove staff confirm
  const [removeStaffTarget, setRemoveStaffTarget] = React.useState<StaffMember | null>(null);
  const [removingStaff, setRemovingStaff] = React.useState(false);

  // Subscription edit
  const [subStatus, setSubStatus] = React.useState<SubscriptionStatus>("ACTIVE");
  const [subEndDate, setSubEndDate] = React.useState("");
  const [subSaving, setSubSaving] = React.useState(false);
  const [subEndOpen, setSubEndOpen] = React.useState(false);

  const fetchMerchant = React.useCallback(async () => {
    if (!accessToken && !refreshToken) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/admin/merchants/${merchantId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMerchant(data.merchant);
      setEditName(data.merchant.name ?? "");
      setEditPhone(data.merchant.phone ?? "");
      setEditStatus(data.merchant.status);
      setSubStatus(data.merchant.subscription?.status ?? "ACTIVE");
      setSubEndDate(
        data.merchant.subscription?.endedAt
          ? new Date(data.merchant.subscription.endedAt).toISOString().split("T")[0]
          : ""
      );
    } catch {
      toast.error("Failed to load merchant");
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshToken, merchantId]);

  React.useEffect(() => {
    fetchMerchant();
  }, [fetchMerchant]);

  async function handleEditSave() {
    if (!accessToken && !refreshToken) return;
    setEditSaving(true);
    try {
      const res = await fetchWithAuth(`/api/admin/merchants/${merchantId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editName,
          phone: editPhone || null,
          status: editStatus,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("detail.editForm.success"));
      setEditOpen(false);
      fetchMerchant();
    } catch {
      toast.error(t("detail.editForm.error"));
    } finally {
      setEditSaving(false);
    }
  }

  async function handleBan() {
    if (!accessToken && !refreshToken) return;
    setBanning(true);
    try {
      const res = await fetchWithAuth(`/api/admin/merchants/${merchantId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success(t("confirmBan.confirm") + " ✓");
      setBanOpen(false);
      fetchMerchant();
    } catch {
      toast.error("Failed to ban merchant");
    } finally {
      setBanning(false);
    }
  }

  async function handleActivate() {
    if (!accessToken && !refreshToken) return;
    try {
      const res = await fetchWithAuth(`/api/admin/merchants/${merchantId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "ACTIVE", subscriptionStatus: "ACTIVE" }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("detail.activateButton") + " ✓");
      fetchMerchant();
    } catch {
      toast.error("Failed to activate");
    }
  }

  async function handleAddStaff() {
    if (!accessToken && !refreshToken) return;
    const newErrors: Record<string, string> = {};
    if (!staffName.trim() || staffName.trim().length < 2) newErrors.name = "Name required";
    if (!staffEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffEmail))
      newErrors.email = "Valid email required";
    if (!staffPassword || staffPassword.length < 8) newErrors.password = "Min. 8 characters";
    if (staffLockPin.trim() && !/^\d{4}$/.test(staffLockPin.trim()))
      newErrors.lockPin = "PIN must be 4 digits";
    if (Object.keys(newErrors).length > 0) {
      setStaffErrors(newErrors);
      return;
    }

    setStaffAdding(true);
    try {
      const res = await fetchWithAuth(`/api/admin/merchants/${merchantId}/staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: staffName,
          email: staffEmail,
          phone: staffPhone || undefined,
          password: staffPassword,
          lockPin: staffLockPin.trim() ? staffLockPin.trim() : undefined,
        }),
      });
      if (res.status === 409) {
        setStaffErrors({ email: t("detail.staff.addForm.errors.emailExists") });
        return;
      }
      if (!res.ok) throw new Error();
      toast.success(t("detail.staff.addForm.success"));
      setAddStaffOpen(false);
      setStaffName("");
      setStaffEmail("");
      setStaffPhone("");
      setStaffPassword("");
      setStaffLockPin("");
      setStaffErrors({});
      fetchMerchant();
    } catch {
      toast.error(t("detail.staff.addForm.errors.generic"));
    } finally {
      setStaffAdding(false);
    }
  }

  function generateStaffPassword() {
    const pwd = generateMerchantPassword(16);
    setStaffPassword(pwd);
    setStaffErrors((prev) => ({ ...prev, password: undefined }));
    toast.message(t("form.account.generatePassword"), {
      description: t("form.account.validation.passwordHint"),
    });
  }

  async function handleRemoveStaff() {
    if (!removeStaffTarget || (!accessToken && !refreshToken)) return;
    setRemovingStaff(true);
    try {
      const res = await fetchWithAuth(
        `/api/admin/merchants/${merchantId}/staff/${removeStaffTarget.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      toast.success(t("detail.staff.removeConfirm.confirm") + " ✓");
      setRemoveStaffTarget(null);
      fetchMerchant();
    } catch {
      toast.error("Failed to remove staff");
    } finally {
      setRemovingStaff(false);
    }
  }

  async function handleStaffStatusToggle(staff: StaffMember) {
    if (!accessToken && !refreshToken) return;
    const newStatus: UserStatus = staff.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await fetchWithAuth(
        `/api/admin/merchants/${merchantId}/staff/${staff.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!res.ok) throw new Error();
      toast.success(
        (newStatus === "ACTIVE"
          ? t("detail.staff.statusToggle.activate")
          : t("detail.staff.statusToggle.suspend"))
      );
      fetchMerchant();
    } catch {
      toast.error("Failed to update staff status");
    }
  }

  async function handleSubSave() {
    if (!accessToken && !refreshToken) return;
    setSubSaving(true);
    try {
      if (subEndDate) {
        const picked = parseYmd(subEndDate);
        if (!picked) {
          toast.error(t("detail.subscription.invalidEndDate"));
          return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        picked.setHours(0, 0, 0, 0);
        if (picked < today) {
          toast.error(t("detail.subscription.invalidEndDate"));
          return;
        }
      }

      const res = await fetchWithAuth(`/api/admin/merchants/${merchantId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionStatus: subStatus,
          subscriptionEndedAt: subEndDate
            ? new Date(subEndDate).toISOString()
            : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("detail.subscription.success"));
      fetchMerchant();
    } catch {
      toast.error(t("detail.subscription.error"));
    } finally {
      setSubSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
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

  if (!merchant) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">Merchant not found</p>
        <Button asChild variant="outline" size="sm" className="mt-4 gap-2">
          <Link href="/dashboard/admin/merchants">
            <ArrowLeft className="size-4" />
            {t("detail.backToList")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-14 border-2">
            <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
              {getInitials(merchant.name, merchant.email)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">
                {merchant.name ?? merchant.email}
              </h1>
              <Badge variant={USER_STATUS_VARIANT[merchant.status]}>
                {t(`userStatus.${merchant.status}`)}
              </Badge>
              {merchant.subscription && (
                <Badge
                  variant={SUB_STATUS_VARIANT[merchant.subscription.status]}
                  className="gap-1"
                >
                  <ShieldCheck className="size-3" />
                  {t(`subStatus.${merchant.subscription.status}`)}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{merchant.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon" className="size-9 shrink-0 rounded-md">
            <Link href="/dashboard/admin/merchants">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditOpen(true)}>
            <Edit className="size-4" />
            {t("detail.editButton")}
          </Button>
          {merchant.status !== "BANNED" ? (
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
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
              onClick={handleActivate}
            >
              <CheckCircle2 className="size-4" />
              {t("detail.activateButton")}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-flex">
          <TabsTrigger value="overview" className="gap-1.5">
            <User className="size-4" />
            <span className="hidden sm:inline">{t("detail.tabs.overview")}</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-1.5">
            <Users className="size-4" />
            <span className="hidden sm:inline">{t("detail.tabs.staff")}</span>
            {merchant.cashiers.length > 0 && (
              <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-xs">
                {merchant.cashiers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-1.5">
            <MapPin className="size-4" />
            <span className="hidden sm:inline">{t("detail.tabs.locations")}</span>
            {merchant.managedLocations.length > 0 && (
              <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-xs">
                {merchant.managedLocations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-1.5">
            <Shield className="size-4" />
            <span className="hidden sm:inline">{t("detail.tabs.subscription")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("detail.overview.heading")}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y px-4 py-0">
              <InfoRow icon={User} label={t("detail.overview.name")} value={merchant.name} />
              <InfoRow icon={Mail} label={t("detail.overview.email")} value={merchant.email} />
              <InfoRow
                icon={Phone}
                label={t("detail.overview.phone")}
                value={merchant.phone ?? t("detail.overview.notProvided")}
              />
              <InfoRow
                icon={CalendarIcon}
                label={t("detail.overview.joined")}
                value={formatDate(merchant.createdAt)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff tab */}
        <TabsContent value="staff" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">{t("detail.staff.heading")}</h2>
              <p className="text-xs text-muted-foreground">
                {merchant.cashiers.length} {t("table.staff").toLowerCase()}
              </p>
            </div>
            <Button size="sm" className="gap-2" onClick={() => setAddStaffOpen(true)}>
              <Plus className="size-4" />
              {t("detail.staff.addStaff")}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {merchant.cashiers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
                    <Users className="size-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{t("detail.staff.empty.title")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("detail.staff.empty.description")}
                  </p>
                  <Button
                    size="sm"
                    className="mt-4 gap-2"
                    onClick={() => setAddStaffOpen(true)}
                  >
                    <Plus className="size-4" />
                    {t("detail.staff.addStaff")}
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="ps-4">{t("detail.staff.name")}</TableHead>
                      <TableHead>{t("detail.staff.status")}</TableHead>
                      <TableHead>{t("detail.staff.joined")}</TableHead>
                      <TableHead className="pe-4 text-end">{t("detail.staff.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {merchant.cashiers.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell className="ps-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 border">
                              <AvatarFallback className="bg-muted text-xs font-semibold">
                                {getInitials(staff.name, staff.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{staff.name ?? "—"}</p>
                              <p className="text-xs text-muted-foreground">{staff.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={USER_STATUS_VARIANT[staff.status]} className="text-xs">
                            {t(`userStatus.${staff.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(staff.createdAt)}
                        </TableCell>
                        <TableCell className="pe-4 text-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() => handleStaffStatusToggle(staff)}
                              >
                                {staff.status === "ACTIVE" ? (
                                  <>
                                    <Ban className="me-2 size-4" />
                                    {t("detail.staff.statusToggle.suspend")}
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="me-2 size-4" />
                                    {t("detail.staff.statusToggle.activate")}
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setRemoveStaffTarget(staff)}
                              >
                                <Trash2 className="me-2 size-4" />
                                {t("detail.staff.removeConfirm.confirm")}
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

        {/* Locations tab */}
        <TabsContent value="locations" className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">{t("detail.locations.heading")}</h2>
            <p className="text-xs text-muted-foreground">
              {merchant.managedLocations.length} {t("table.locations").toLowerCase()}
            </p>
          </div>
          <Card>
            <CardContent className="p-0">
              {merchant.managedLocations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
                    <MapPin className="size-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{t("detail.locations.empty.title")}</p>
                  <p className="mt-1 max-w-[24rem] text-xs text-muted-foreground">
                    {t("detail.locations.empty.description")}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="ps-4">{t("detail.locations.name")}</TableHead>
                      <TableHead>{t("detail.locations.city")}</TableHead>
                      <TableHead>{t("detail.locations.address")}</TableHead>
                      <TableHead>{t("detail.locations.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {merchant.managedLocations.map((loc) => (
                      <TableRow key={loc.id}>
                        <TableCell className="ps-4 font-medium">{loc.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {loc.city ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {loc.address ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={loc.isActive ? "default" : "secondary"} className="text-xs">
                            {loc.isActive
                              ? t("detail.locations.active")
                              : t("detail.locations.inactive")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription tab */}
        <TabsContent value="subscription" className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">{t("detail.subscription.heading")}</h2>
          </div>

          {!merchant.subscription ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
                  <Shield className="size-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">{t("detail.subscription.noSubscription")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t("detail.subscription.heading")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                    <span className="text-sm text-muted-foreground">
                      {t("detail.subscription.status")}
                    </span>
                    <Badge
                      variant={SUB_STATUS_VARIANT[merchant.subscription.status]}
                    >
                      {t(`subStatus.${merchant.subscription.status}`)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                    <span className="text-sm text-muted-foreground">
                      {t("detail.subscription.startDate")}
                    </span>
                    <span className="text-sm font-medium">
                      {formatDate(merchant.subscription.startedAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                    <span className="text-sm text-muted-foreground">
                      {t("detail.subscription.endDate")}
                    </span>
                    <span className="text-sm font-medium">
                      {merchant.subscription.endedAt
                        ? formatDate(merchant.subscription.endedAt)
                        : t("detail.subscription.noExpiry")}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t("detail.subscription.updateStatus")}</CardTitle>
                  <CardDescription>{t("detail.subscription.updateEndDate")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>{t("detail.subscription.status")}</Label>
                    <Select
                      value={subStatus}
                      onValueChange={(v) => setSubStatus(v as SubscriptionStatus)}
                    >
                      <SelectTrigger
                        className={cn(
                          "focus:outline-none focus:ring-0 focus:ring-offset-0",
                          "focus-visible:ring-0 focus-visible:ring-offset-0",
                          "data-[state=open]:ring-0 data-[state=open]:ring-offset-0"
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED"] as const).map((s) => (
                          <SelectItem key={s} value={s}>
                            {t(`subStatus.${s}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("detail.subscription.endDate")}</Label>
                    <Popover open={subEndOpen} onOpenChange={setSubEndOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start gap-2 font-normal",
                            "h-10 px-3",
                            "focus-visible:ring-0 focus-visible:ring-offset-0",
                            !subEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarClock className="size-4 text-muted-foreground" />
                          {subEndDate
                            ? formatLongDate(parseYmd(subEndDate) ?? new Date(), "fr")
                            : t("detail.subscription.endDate")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={subEndDate ? parseYmd(subEndDate) : undefined}
                          disabled={(date) => {
                            const d = new Date(date);
                            d.setHours(0, 0, 0, 0);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return d < today;
                          }}
                          onSelect={(d) => {
                            if (!d) {
                              setSubEndDate("");
                              return;
                            }
                            setSubEndDate(formatYmd(d));
                            setSubEndOpen(false);
                          }}
                          initialFocus
                        />
                        <div className="flex items-center justify-end gap-2 border-t p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSubEndDate("");
                              setSubEndOpen(false);
                            }}
                          >
                            {t("form.cancel")}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={handleSubSave}
                    disabled={subSaving}
                  >
                    {subSaving && <Loader2 className="size-4 animate-spin" />}
                    {subSaving ? t("detail.subscription.saving") : t("detail.subscription.saveChanges")}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit merchant dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("detail.editForm.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("detail.editForm.name")}</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("detail.editForm.phone")}</Label>
              <div className="relative">
                <Phone className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="ps-9"
                  placeholder="+212..."
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("detail.editForm.status")}</Label>
              <Select
                value={editStatus}
                onValueChange={(v) => setEditStatus(v as UserStatus)}
              >
                <SelectTrigger
                  className={cn(
                    "focus:outline-none focus:ring-0 focus:ring-offset-0",
                    "focus-visible:ring-0 focus-visible:ring-offset-0",
                    "data-[state=open]:ring-0 data-[state=open]:ring-offset-0"
                  )}
                >
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
              {t("form.cancel")}
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving} className="gap-2">
              {editSaving && <Loader2 className="size-4 animate-spin" />}
              {editSaving ? t("detail.editForm.saving") : t("detail.editForm.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add staff dialog */}
      <Dialog
        open={addStaffOpen}
        onOpenChange={(open) => {
          setAddStaffOpen(open);
          if (!open) {
            setStaffName("");
            setStaffEmail("");
            setStaffPhone("");
            setStaffPassword("");
            setStaffLockPin("");
            setStaffErrors({});
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("detail.staff.addForm.title")}</DialogTitle>
            <DialogDescription>
              {merchant.name ?? merchant.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("detail.staff.addForm.name")} *</Label>
                <Input
                  placeholder={t("detail.staff.addForm.namePlaceholder")}
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                />
                {staffErrors.name && (
                  <p className="text-xs text-destructive">{staffErrors.name}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t("detail.staff.addForm.phone")}</Label>
                <div className="relative">
                  <Phone className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("detail.staff.addForm.phonePlaceholder")}
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    className="ps-9"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("detail.staff.addForm.email")} *</Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder={t("detail.staff.addForm.emailPlaceholder")}
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="ps-9"
                />
              </div>
              {staffErrors.email && (
                <p className="text-xs text-destructive">{staffErrors.email}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("detail.staff.addForm.password")} *</Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showStaffPwd ? "text" : "password"}
                  placeholder={t("detail.staff.addForm.passwordPlaceholder")}
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="ps-9 pe-[4.5rem]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={generateStaffPassword}
                  className="absolute end-9 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={t("form.account.generatePassword")}
                >
                  <Wand2 className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowStaffPwd((v) => !v)}
                  className="absolute end-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={
                    showStaffPwd ? t("form.account.hidePassword") : t("form.account.showPassword")
                  }
                >
                  {showStaffPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              {staffErrors.password && (
                <p className="text-xs text-destructive">{staffErrors.password}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>{t("detail.staff.addForm.lockPin")}</Label>
              <div className="relative">
                <KeyRound className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={4}
                  placeholder={t("detail.staff.addForm.lockPinPlaceholder")}
                  value={staffLockPin}
                  onChange={(e) =>
                    setStaffLockPin(e.target.value.replace(/[^\d]/g, "").slice(0, 4))
                  }
                  className="ps-9"
                />
              </div>
              {staffErrors.lockPin && (
                <p className="text-xs text-destructive">{staffErrors.lockPin}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStaffOpen(false)}>
              {t("form.cancel")}
            </Button>
            <Button onClick={handleAddStaff} disabled={staffAdding} className="gap-2">
              {staffAdding && <Loader2 className="size-4 animate-spin" />}
              {staffAdding ? t("detail.staff.addForm.submitting") : t("detail.staff.addForm.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove staff confirm */}
      <Dialog
        open={!!removeStaffTarget}
        onOpenChange={(open) => !open && setRemoveStaffTarget(null)}
      >
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("detail.staff.removeConfirm.title")}</DialogTitle>
            <DialogDescription asChild>
              <div>
                {t("detail.staff.removeConfirm.description")}
                {removeStaffTarget && (
                  <span className="mt-1 block font-medium text-foreground">
                    {removeStaffTarget.name ?? removeStaffTarget.email}
                  </span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemoveStaffTarget(null)}
            >
              {t("detail.staff.removeConfirm.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemoveStaff}
              disabled={removingStaff}
            >
              {removingStaff ? "…" : t("detail.staff.removeConfirm.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban merchant confirm */}
      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("confirmBan.title")}</DialogTitle>
            <DialogDescription asChild>
              <div>
                {t("confirmBan.description")}
                <span className="mt-1 block font-medium text-foreground">
                  {merchant.name ?? merchant.email}
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBanOpen(false)}>
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
    </div>
  );
}
