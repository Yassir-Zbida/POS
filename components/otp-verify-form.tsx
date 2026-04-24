"use client";

import * as React from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { authApiUrl } from "@/lib/auth-client";
import { dashboardHomeForRole } from "@/lib/dashboard";
import { useAuthStore } from "@/store/use-auth-store";
import { AUTH_ROLES, type AuthRole } from "@/types/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OtpVerifyForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("otp");
  const locale = useLocale();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = React.useState(() => searchParams.get("email")?.trim() ?? "");
  const [code, setCode] = React.useState("");
  const [codeSent, setCodeSent] = React.useState(false);
  const [pendingSend, setPendingSend] = React.useState(false);
  const [pendingVerify, setPendingVerify] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error(t("errors.emailRequired"));
      return;
    }
    setPendingSend(true);
    try {
      const res = await fetch(authApiUrl("otp/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-locale": locale },
        body: JSON.stringify({
          channel: "EMAIL",
          target: email.trim().toLowerCase(),
          purpose: "LOGIN",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : t("errors.sendFailed"));
        return;
      }
      toast.success(t("codeSent"));
      setCodeSent(true);
    } finally {
      setPendingSend(false);
    }
  }

  async function verifyAndSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error(t("errors.codeInvalid"));
      return;
    }
    setPendingVerify(true);
    try {
      const res = await fetch(authApiUrl("otp/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "EMAIL",
          target: email.trim().toLowerCase(),
          purpose: "LOGIN",
          code: code.trim(),
          issueSession: true,
          rememberMe,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as
        | {
            accessToken: string;
            refreshToken: string;
            user: { id: string; email: string; role: string; status: string };
            verified?: boolean;
          }
        | { error?: string };

      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : t("errors.verifyFailed"));
        return;
      }
      if (!("accessToken" in data) || !data.accessToken || !("refreshToken" in data) || !data.refreshToken || !data.user) {
        toast.error(t("errors.verifyFailed"));
        return;
      }
      const rawRole = String(data.user.role ?? "");
      const normalized = rawRole.toUpperCase();
      const role =
        normalized === AUTH_ROLES.ADMIN ||
        normalized === AUTH_ROLES.MANAGER ||
        normalized === AUTH_ROLES.CASHIER
          ? (normalized as AuthRole)
          : null;
      if (!role) {
        toast.error(t("errors.verifyFailed"));
        return;
      }
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: { ...data.user, role },
      });
      setRedirecting(true);
      router.push(dashboardHomeForRole(role));
    } finally {
      setPendingVerify(false);
    }
  }

  return (
    <>
      {redirecting && (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-background">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      )}
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{t("title")}</CardTitle>
            <CardDescription>{t("subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <form onSubmit={sendCode} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="otp-email">{t("email")}</Label>
                <Input
                  id="otp-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  required
                  disabled={codeSent}
                />
              </div>
              {!codeSent ? (
                <Button type="submit" className="w-full" disabled={pendingSend}>
                  <span>{pendingSend ? t("sendPending") : t("sendCode")}</span>
                  {locale === "ar" ? (
                    <ArrowLeft className="ms-2 size-4" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="ms-2 size-4" aria-hidden="true" />
                  )}
                </Button>
              ) : null}
            </form>

            {codeSent ? (
              <form onSubmit={verifyAndSignIn} className="grid gap-4 border-t pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="otp-code">{t("codeLabel")}</Label>
                  <Input
                    id="otp-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="text-center font-mono text-lg tracking-widest"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="otp-remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="relative size-4 shrink-0 appearance-none rounded-sm border border-input bg-[hsl(var(--input-bg))] shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0 checked:border-primary checked:bg-primary checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-[12px] checked:after:font-semibold checked:after:leading-none checked:after:text-primary-foreground checked:after:content-['✓'] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Label htmlFor="otp-remember" className="text-sm font-normal text-muted-foreground">
                    {t("rememberMe")}
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={pendingVerify}>
                  <span>{pendingVerify ? t("verifyPending") : t("signIn")}</span>
                  {locale === "ar" ? (
                    <ArrowLeft className="ms-2 size-4" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="ms-2 size-4" aria-hidden="true" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={pendingSend}
                  onClick={() => {
                    setCodeSent(false);
                    setCode("");
                  }}
                >
                  {t("useDifferentEmail")}
                </Button>
              </form>
            ) : null}

            <div className="text-center text-sm">
              <Link href="/login" className="underline underline-offset-4">
                {t("backToLogin")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
