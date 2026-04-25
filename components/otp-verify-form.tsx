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

const OTP_LENGTH = 6;

export function OtpVerifyForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("otp");
  const tAuth = useTranslations("auth");
  const locale = useLocale();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = React.useState(() => searchParams.get("email")?.trim() ?? "");
  const [digits, setDigits] = React.useState<string[]>(Array(OTP_LENGTH).fill(""));
  // Restore step from URL so language switches don't reset the form
  const [codeSent, setCodeSent] = React.useState(
    () => searchParams.get("step") === "verify" && !!searchParams.get("email")?.trim()
  );
  const [pendingSend, setPendingSend] = React.useState(false);
  const [pendingVerify, setPendingVerify] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);

  const inputRefs = React.useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null));

  const code = digits.join("");

  function handleDigitChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const updated = [...digits];
    updated[index] = cleaned;
    setDigits(updated);
    if (cleaned && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  // onPaste must be used because maxLength=1 truncates clipboard data before onChange fires
  function handleDigitPaste(e: React.ClipboardEvent<HTMLInputElement>, index: number) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const updated = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      if (index + i < OTP_LENGTH) updated[index + i] = pasted[i];
    }
    setDigits(updated);
    const focusIdx = Math.min(index + pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  }

  function handleDigitKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const updated = [...digits];
        updated[index] = "";
        setDigits(updated);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  // Auto-focus first digit box when code step appears
  React.useEffect(() => {
    if (codeSent) {
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
  }, [codeSent]);

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
      // Persist step in URL so language switches don't reset the form
      const params = new URLSearchParams(searchParams.toString());
      params.set("email", email.trim().toLowerCase());
      params.set("step", "verify");
      router.replace(`/otp?${params.toString()}`);
      setCodeSent(true);
    } finally {
      setPendingSend(false);
    }
  }

  async function verifyAndSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
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
          code,
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
      if (
        !("accessToken" in data) ||
        !data.accessToken ||
        !("refreshToken" in data) ||
        !data.refreshToken ||
        !data.user
      ) {
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
            <CardTitle className="text-xl">
              {codeSent ? t("codeTitle") : t("title")}
            </CardTitle>
            <CardDescription>
              {codeSent ? (
                <>
                  {t("codeSubtitle")}{" "}
                  <span className="font-medium text-foreground">{email}</span>
                </>
              ) : (
                t("subtitle")
              )}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!codeSent ? (
              /* ── Step 1: Email ── */
              <form onSubmit={sendCode}>
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="otp-email">{t("email")}</Label>
                    <Input
                      id="otp-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={tAuth("emailPlaceholderHint")}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={pendingSend}>
                    <span>{pendingSend ? t("sendPending") : t("sendCode")}</span>
                    {locale === "ar" ? (
                      <ArrowLeft className="ms-2 size-4" aria-hidden="true" />
                    ) : (
                      <ArrowRight className="ms-2 size-4" aria-hidden="true" />
                    )}
                  </Button>
                  <div className="text-center text-sm">
                    <Link href="/login" className="underline underline-offset-4">
                      {t("backToLogin")}
                    </Link>
                  </div>
                </div>
              </form>
            ) : (
              /* ── Step 2: OTP digit boxes ── */
              <form onSubmit={verifyAndSignIn}>
                <div className="grid gap-6">
                  <div
                    className="flex items-center justify-center gap-2"
                    dir="ltr"
                  >
                    {digits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        value={digit}
                        onChange={(e) => handleDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(i, e)}
                        onPaste={(e) => handleDigitPaste(e, i)}
                        onFocus={(e) => e.target.select()}
                        className={cn(
                          "h-12 w-10 rounded-lg border bg-background text-center font-mono text-lg font-semibold transition-colors",
                          "focus:outline-none focus:ring-1 focus:ring-ring/50 focus:border-ring/60",
                          digit
                            ? "border-ring/40 text-foreground"
                            : "border-input text-muted-foreground"
                        )}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="otp-remember"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="relative size-4 shrink-0 appearance-none rounded-sm border border-input bg-[hsl(var(--input-bg))] shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring/30 focus-visible:ring-offset-0 checked:border-primary checked:bg-primary checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-[12px] checked:after:font-semibold checked:after:leading-none checked:after:text-primary-foreground checked:after:content-['✓'] disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <Label
                      htmlFor="otp-remember"
                      className="text-sm font-normal text-muted-foreground"
                    >
                      {t("rememberMe")}
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={pendingVerify || code.length < OTP_LENGTH}
                  >
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
                      setDigits(Array(OTP_LENGTH).fill(""));
                      // Clear step from URL
                      const params = new URLSearchParams(searchParams.toString());
                      params.delete("step");
                      router.replace(`/otp?${params.toString()}`);
                    }}
                  >
                    {t("useDifferentEmail")}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
