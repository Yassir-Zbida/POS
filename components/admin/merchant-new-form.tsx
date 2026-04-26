"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { formatLongDate, formatYmd, parseYmd } from "@/lib/merchant-form-dates";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CalendarIcon, Eye, EyeOff, Loader2, Wand2 } from "lucide-react";

import { useAuthStore } from "@/store/use-auth-store";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { generateMerchantPassword } from "@/lib/generate-merchant-password";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "@/i18n/navigation";

type Step = 0 | 1 | 2;
const STEPS: Step[] = [0, 1, 2];
const SUB_STATUSES = ["ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED"] as const;

type FormData = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  subscriptionStatus: string;
  subscriptionEndedAt: string;
};

const INITIAL: FormData = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  subscriptionStatus: "ACTIVE",
  subscriptionEndedAt: "",
};

const inputQuiet = cn(
  "h-11 w-full min-w-0 border border-input bg-background shadow-sm",
  "transition-[border-color,box-shadow] duration-200",
  "px-3 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
  "focus-visible:border-foreground/30 dark:focus-visible:border-foreground/45",
  "focus:border-foreground/25"
);

const passwordWithActionsRight = "min-h-11 pl-3 pe-[4.5rem] sm:pe-[4.75rem]";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\d\s-]{0,32}$/;

function accountErrors(
  d: FormData,
  t: (key: string) => string
): Partial<Record<keyof FormData, string>> {
  const e: Partial<Record<keyof FormData, string>> = {};
  const name = d.name.trim();
  if (name.length === 0) e.name = t("form.account.validation.nameRequired");
  else if (name.length < 2) e.name = t("form.account.validation.nameMin");

  const em = d.email.trim();
  if (em.length === 0) e.email = t("form.account.validation.emailRequired");
  else if (!EMAIL_RE.test(em)) e.email = t("form.account.validation.emailInvalid");

  if (d.phone.trim().length > 0 && !PHONE_RE.test(d.phone.trim())) {
    e.phone = t("form.account.validation.phoneInvalid");
  }

  if (d.password.length === 0) {
    e.password = t("form.account.validation.passwordRequired");
  } else if (d.password.length < 8) {
    e.password = t("form.account.validation.passwordMin");
  }

  if (d.password.length >= 8) {
    if (d.confirmPassword.length === 0) {
      e.confirmPassword = t("form.account.validation.confirmRequired");
    } else if (d.password !== d.confirmPassword) {
      e.confirmPassword = t("form.account.validation.confirmMismatch");
    }
  } else if (d.confirmPassword.length > 0) {
    e.confirmPassword = t("form.account.validation.confirmMismatch");
  }

  return e;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-destructive">{message}</p>;
}

const stepKeys = ["account", "subscription", "review"] as const;

export function MerchantNewForm() {
  const t = useTranslations("adminMerchants");
  const appLocale = useLocale();
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const router = useRouter();

  const [step, setStep] = React.useState<Step>(0);
  const [data, setData] = React.useState<FormData>(INITIAL);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [subscriptionEndOpen, setSubscriptionEndOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverErrors, setServerErrors] = React.useState<Partial<Record<keyof FormData, string>>>({});

  const live = React.useMemo(() => accountErrors(data, t), [data, t]);

  const fieldErr = (k: keyof FormData) => serverErrors[k] ?? live[k];

  function setField(field: keyof FormData, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
    if (serverErrors[field]) {
      setServerErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  const endDate = React.useMemo(() => {
    if (!data.subscriptionEndedAt) return undefined;
    return parseYmd(data.subscriptionEndedAt);
  }, [data.subscriptionEndedAt]);

  function generatePasswords() {
    const pwd = generateMerchantPassword(16);
    setData((prev) => ({
      ...prev,
      password: pwd,
      confirmPassword: pwd,
    }));
    setServerErrors((prev) => ({ ...prev, password: undefined, confirmPassword: undefined }));
    toast.message(t("form.account.generatePassword"), {
      description: t("form.account.validation.passwordHint"),
    });
  }

  function isStep0Valid() {
    const e = accountErrors(data, t);
    return !e.name && !e.email && !e.phone && !e.password && !e.confirmPassword;
  }

  function handleNext() {
    if (step === 0 && !isStep0Valid()) return;
    setStep((s) => (s < 2 ? ((s + 1) as Step) : s));
  }

  async function handleSubmit() {
    if (!accessToken && !refreshToken) {
      toast.error(t("form.errors.unauthorized"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchWithAuth("/api/admin/merchants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone || undefined,
          password: data.password,
          subscriptionStatus: data.subscriptionStatus,
          subscriptionEndedAt: data.subscriptionEndedAt
            ? data.subscriptionEndedAt.includes("T")
              ? new Date(data.subscriptionEndedAt).toISOString()
              : data.subscriptionEndedAt
            : undefined,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        code?: string;
        merchant?: { id: string };
      };

      if (res.status === 401) {
        toast.error(t("form.errors.unauthorized"));
        return;
      }
      if (res.status === 403) {
        toast.error(payload.error ?? t("form.errors.forbidden"));
        return;
      }
      if (res.status === 503) {
        toast.error(payload.error ?? t("form.errors.unavailable"));
        return;
      }
      if (res.status === 409) {
        setStep(0);
        if (payload.error === "EMAIL_EXISTS" || payload.code === "EMAIL_EXISTS") {
          setServerErrors({ email: t("form.errors.emailExists") });
        }
        toast.error(
          payload.error === "EMAIL_EXISTS" || payload.code === "EMAIL_EXISTS"
            ? t("form.errors.emailExists")
            : (payload.error ?? t("form.errors.generic"))
        );
        return;
      }
      if (!res.ok) {
        const msg =
          payload.message ||
          payload.error ||
          (res.status === 400
            ? t("form.errors.validation")
            : t("form.errors.generic"));
        toast.error(msg);
        return;
      }

      if (!payload.merchant?.id) {
        toast.error(t("form.errors.generic"));
        return;
      }

      toast.success(t("form.success"));
      router.push(`/dashboard/admin/merchants/${payload.merchant.id}`);
    } catch {
      toast.error(t("form.errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="mx-auto flex w-full max-w-lg items-center justify-center gap-0 sm:max-w-2xl">
        {STEPS.map((s) => {
          const isDone = step > s;
          const isActive = step === s;
          return (
            <React.Fragment key={s}>
              <div className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                    isDone
                      ? "border-primary bg-primary text-primary-foreground"
                      : isActive
                        ? "border-primary bg-primary/10 text-primary dark:bg-primary/15"
                        : "border-border bg-muted/50 text-muted-foreground"
                  )}
                >
                  {isDone ? "✓" : s + 1}
                </div>
                <span
                  className={cn(
                    "hidden text-center text-[11px] font-medium sm:block",
                    isActive ? "text-foreground" : isDone ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {t(`form.steps.${stepKeys[s]}`)}
                </span>
              </div>
              {s < 2 && (
                <div
                  className={cn(
                    "mx-1.5 h-px min-w-0 flex-1",
                    isDone ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {step === 0 && (
        <Card className="w-full max-w-full border bg-card">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-base font-semibold">{t("form.account.heading")}</CardTitle>
            <CardDescription>{t("form.account.subheading")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid w-full gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="m-name">{t("form.account.name")} *</Label>
                <Input
                  id="m-name"
                  className={inputQuiet}
                  placeholder={t("form.account.namePlaceholder")}
                  value={data.name}
                  onChange={(e) => setField("name", e.target.value)}
                />
                <FieldError message={fieldErr("name")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-phone">{t("form.account.phone")}</Label>
                <Input
                  id="m-phone"
                  className={inputQuiet}
                  placeholder={t("form.account.phonePlaceholder")}
                  value={data.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                />
                <FieldError message={fieldErr("phone")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-email">{t("form.account.email")} *</Label>
              <Input
                id="m-email"
                className={inputQuiet}
                type="email"
                autoComplete="email"
                placeholder={t("form.account.emailPlaceholder")}
                value={data.email}
                onChange={(e) => setField("email", e.target.value)}
              />
              <FieldError message={fieldErr("email")} />
            </div>

            <div className="grid w-full gap-4 sm:grid-cols-2 sm:items-start sm:gap-6">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <Label htmlFor="m-pw">{t("form.account.password")} *</Label>
                </div>
                <div className="relative">
                  <Input
                    id="m-pw"
                    className={cn(inputQuiet, passwordWithActionsRight)}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={t("form.account.passwordPlaceholder")}
                    value={data.password}
                    onChange={(e) => setField("password", e.target.value)}
                  />
                  <div
                    className="absolute end-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5"
                    role="group"
                    aria-label={t("form.account.password")}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground"
                      onClick={generatePasswords}
                      title={t("form.account.generatePassword")}
                      aria-label={t("form.account.generatePassword")}
                    >
                      <Wand2 className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                      title={showPassword ? t("form.account.hidePassword") : t("form.account.showPassword")}
                      aria-label={showPassword ? t("form.account.hidePassword") : t("form.account.showPassword")}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                </div>
                <FieldError message={fieldErr("password")} />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <Label htmlFor="m-confirm">{t("form.account.confirmPassword")} *</Label>
                </div>
                <div className="relative">
                  <Input
                    id="m-confirm"
                    className={cn(inputQuiet, "pe-10")}
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={t("form.account.confirmPlaceholder")}
                    value={data.confirmPassword}
                    onChange={(e) => setField("confirmPassword", e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute end-1.5 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowConfirm((v) => !v)}
                    title={showConfirm ? t("form.account.hidePassword") : t("form.account.showPassword")}
                    aria-label={showConfirm ? t("form.account.hidePassword") : t("form.account.showPassword")}
                    aria-pressed={showConfirm}
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
                <FieldError message={fieldErr("confirmPassword")} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card className="w-full border bg-card">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-base font-semibold">{t("form.subscription.heading")}</CardTitle>
            <CardDescription>{t("form.subscription.subheading")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="w-full space-y-1.5">
              <Label className="text-sm" htmlFor="subscription-status-select">
                {t("form.subscription.status")}
              </Label>
              <Select
                value={data.subscriptionStatus}
                onValueChange={(v) => setField("subscriptionStatus", v)}
              >
                <SelectTrigger
                  id="subscription-status-select"
                  className={cn(
                    inputQuiet,
                    "h-11 w-full [color-scheme:light] dark:[color-scheme:dark]"
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUB_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`subStatus.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full space-y-1.5">
              <Label className="text-sm" htmlFor="subscription-ended-at">
                {t("form.subscription.endDate")}
              </Label>
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch">
                <Popover open={subscriptionEndOpen} onOpenChange={setSubscriptionEndOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="subscription-ended-at"
                      type="button"
                      variant="outline"
                      className={cn(
                        inputQuiet,
                        "h-11 w-full min-w-0 justify-between text-start font-normal [color-scheme:light] dark:[color-scheme:dark]"
                      )}
                      aria-expanded={subscriptionEndOpen}
                    >
                      {endDate ? (
                        <span className="truncate">{formatLongDate(endDate, appLocale)}</span>
                      ) : (
                        <span className="truncate text-muted-foreground">{t("form.subscription.pickDate")}</span>
                      )}
                      <CalendarIcon className="ms-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(d) => {
                        setField("subscriptionEndedAt", d ? formatYmd(d) : "");
                        setSubscriptionEndOpen(false);
                      }}
                      defaultMonth={endDate ?? new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full shrink-0 px-3 text-sm sm:w-auto"
                  onClick={() => setField("subscriptionEndedAt", "")}
                >
                  {t("form.subscription.clearDate")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("form.subscription.endDateHint")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="w-full border bg-card">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-base font-semibold">{t("form.review.heading")}</CardTitle>
            <CardDescription>{t("form.review.subheading")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-lg border">
              <div className="border-b bg-muted/25 px-4 py-2.5">
                <span className="text-sm font-semibold">{t("form.review.accountInfo")}</span>
              </div>
              <div className="divide-y">
                <ReviewRow label={t("form.account.name")} value={data.name} />
                <ReviewRow label={t("form.account.email")} value={data.email} />
                {data.phone && <ReviewRow label={t("form.account.phone")} value={data.phone} />}
                <ReviewRow label={t("form.account.password")} value="••••••••" />
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <div className="border-b bg-muted/25 px-4 py-2.5">
                <span className="text-sm font-semibold">{t("form.review.subscriptionInfo")}</span>
              </div>
              <div className="divide-y">
                <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">{t("form.subscription.status")}</span>
                  <Badge
                    variant={
                      data.subscriptionStatus === "ACTIVE"
                        ? "default"
                        : data.subscriptionStatus === "PAST_DUE"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {t(`subStatus.${data.subscriptionStatus}`)}
                  </Badge>
                </div>
                <ReviewRow
                  label={t("form.subscription.endDate")}
                  value={
                    endDate
                      ? formatLongDate(endDate, appLocale)
                      : t("form.review.noExpiry")
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="shrink-0">
          <Button
            variant="outline"
            asChild={step === 0}
            onClick={step > 0 ? () => setStep((s) => (s - 1) as Step) : undefined}
            className="h-10 w-full min-w-0 sm:w-auto"
            {...(step > 0 ? { type: "button" as const } : {})}
          >
            {step === 0 ? (
              <Link href="/dashboard/admin/merchants">{t("form.cancel")}</Link>
            ) : (
              <span className="inline-flex items-center justify-center gap-2">
                <ArrowLeft className="size-3.5 opacity-70" />
                {t("form.back")}
              </span>
            )}
          </Button>
        </div>

        <div className="shrink-0">
          {step < 2 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="h-10 w-full min-w-[8rem] sm:w-auto"
              disabled={step === 0 && !isStep0Valid()}
            >
              {t("form.next")}
              <ArrowRight className="ms-1.5 size-3.5 opacity-80" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="h-10 w-full min-w-[8rem] sm:min-w-40"
            >
              {submitting && <Loader2 className="me-1.5 size-4 animate-spin" />}
              {submitting ? t("form.submitting") : t("form.submit")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-sm font-medium">{value}</span>
    </div>
  );
}
