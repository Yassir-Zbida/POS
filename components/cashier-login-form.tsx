"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";

import { cn } from "@/lib/utils";
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
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/use-auth-store";
import { AUTH_ROLES } from "@/types/auth";
import { dashboardHomeForRole } from "@/lib/dashboard";
import { authApiUrl } from "@/lib/auth-client";
import {
  clearRememberedCashierEmail,
  readRememberedCashierEmail,
  writeRememberedCashierEmail,
} from "@/lib/cashier-login-storage";

const OTP_LENGTH = 6;

export function CashierLoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter();
  const t = useTranslations("cashierLogin");
  const tAuth = useTranslations("auth");
  const tOtp = useTranslations("auth2fa");
  const locale = useLocale();
  const setSession = useAuthStore((s) => s.setSession);

  const [step, setStep] = React.useState<"pin" | "full" | "otp">("full");
  const [pending, setPending] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const [rememberedEmail, setRememberedEmail] = React.useState<string | null>(null);
  const [pinValue, setPinValue] = React.useState("");
  const [rememberMePin, setRememberMePin] = React.useState(true);

  const [fullEmail, setFullEmail] = React.useState("");
  const [fullPassword, setFullPassword] = React.useState("");
  const [rememberMeFull, setRememberMeFull] = React.useState(true);

  const [otpEmail, setOtpEmail] = React.useState("");
  const [otpRememberMe, setOtpRememberMe] = React.useState(false);
  const [digits, setDigits] = React.useState<string[]>(Array(OTP_LENGTH).fill(""));
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null));
  const code = digits.join("");

  React.useEffect(() => {
    const saved = readRememberedCashierEmail();
    if (saved) {
      setRememberedEmail(saved);
      setFullEmail(saved);
      setStep("pin");
    }
  }, []);

  React.useEffect(() => {
    if (step === "otp") {
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
  }, [step]);

  function maskEmail(email: string) {
    const [local, domain] = email.split("@");
    if (!domain) return email;
    const shown = local.length <= 2 ? local : `${local.slice(0, 2)}•••`;
    return `${shown}@${domain}`;
  }

  function finishSession(data: {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; role: string; status: string; mustChangePassword?: boolean };
  }) {
    const role = String(data.user.role ?? "").toUpperCase();
    if (role !== AUTH_ROLES.CASHIER) {
      toast.error(t("errors.notCashier"));
      return;
    }
    setSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: {
        ...data.user,
        role: AUTH_ROLES.CASHIER,
        mustChangePassword: Boolean(data.user.mustChangePassword),
      },
    });
    writeRememberedCashierEmail(data.user.email);
    setRedirecting(true);
    router.push(dashboardHomeForRole(AUTH_ROLES.CASHIER));
  }

  async function onPinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rememberedEmail || !/^\d{4}$/.test(pinValue)) {
      toast.error(t("errors.pinInvalid"));
      return;
    }
    setPending(true);
    try {
      const res = await fetch(authApiUrl("cashier-pin-login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: rememberedEmail,
          pin: pinValue,
          rememberMe: rememberMePin,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (res.status === 403 && data.code === "FULL_LOGIN_REQUIRED") {
        toast.message(t("errors.fullLoginRequired"));
        setStep("full");
        setPinValue("");
        return;
      }
      if (res.status === 423 && data.error === "PIN_LOCKED") {
        const sec = typeof data.remainingSeconds === "number" ? data.remainingSeconds : 0;
        toast.error(t("errors.pinLocked", { seconds: sec }));
        return;
      }
      if (!res.ok) {
        toast.error(t("errors.pinFailed"));
        return;
      }
      const accessToken = data.accessToken;
      const refreshToken = data.refreshToken;
      const user = data.user as Parameters<typeof finishSession>[0]["user"] | undefined;
      if (typeof accessToken !== "string" || typeof refreshToken !== "string" || !user) {
        toast.error(t("errors.pinFailed"));
        return;
      }
      finishSession({ accessToken, refreshToken, user });
    } finally {
      setPending(false);
    }
  }

  async function onFullSubmit(e: React.FormEvent) {
    e.preventDefault();
    const email = fullEmail.trim().toLowerCase();
    if (!email || fullPassword.length < 8) {
      toast.error(tAuth("errors.INVALID_CREDENTIALS"));
      return;
    }
    setPending(true);
    try {
      const res = await fetch(authApiUrl("login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: fullPassword,
          rememberMe: rememberMeFull,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as
        | { otpRequired: true; email: string }
        | {
            accessToken: string;
            refreshToken: string;
            user: { id: string; email: string; role: string; status: string; mustChangePassword?: boolean };
          }
        | { error?: string };

      if (!res.ok) {
        const code = "error" in data && typeof data.error === "string" ? data.error : "";
        toast.error(code ? tAuth(`errors.${code as "INVALID_CREDENTIALS"}`) : tAuth("errors.loginFailed"));
        return;
      }

      if ("otpRequired" in data && data.otpRequired) {
        setOtpEmail(data.email);
        setOtpRememberMe(rememberMeFull);
        setStep("otp");
        setDigits(Array(OTP_LENGTH).fill(""));
        return;
      }

      if (!("accessToken" in data) || !data.accessToken) {
        toast.error(tAuth("errors.loginFailed"));
        return;
      }

      const role = String(data.user.role ?? "").toUpperCase();
      if (role !== AUTH_ROLES.CASHIER) {
        toast.error(t("errors.notCashier"));
        return;
      }

      finishSession(data as Parameters<typeof finishSession>[0]);
    } finally {
      setPending(false);
    }
  }

  async function onOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error(tOtp("errors.codeInvalid"));
      return;
    }
    setPending(true);
    try {
      const res = await fetch(authApiUrl("otp/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "EMAIL",
          target: otpEmail.toLowerCase(),
          purpose: "LOGIN_2FA",
          code,
          issueSession: true,
          rememberMe: otpRememberMe,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        accessToken?: string;
        refreshToken?: string;
        user?: { id: string; email: string; role: string; status: string; mustChangePassword?: boolean };
        error?: string;
      };

      if (!res.ok) {
        toast.error(data.error ?? tOtp("errors.verifyFailed"));
        return;
      }
      if (!data.accessToken || !data.refreshToken || !data.user) {
        toast.error(tOtp("errors.verifyFailed"));
        return;
      }
      const role = String(data.user.role ?? "").toUpperCase();
      if (role !== AUTH_ROLES.CASHIER) {
        toast.error(t("errors.notCashier"));
        return;
      }
      finishSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
    } finally {
      setPending(false);
    }
  }

  function handleDigitChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const updated = [...digits];
    updated[index] = cleaned;
    setDigits(updated);
    if (cleaned && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
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
    }
  }

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
              {step === "otp" ? tOtp("title") : step === "pin" ? t("pinTitle") : t("fullTitle")}
            </CardTitle>
            <CardDescription>
              {step === "otp" ? (
                <>
                  {tOtp("subtitle")}{" "}
                  <span className="font-medium text-foreground">{otpEmail}</span>
                </>
              ) : step === "pin" ? (
                <>
                  {t("pinSubtitle")}{" "}
                  <span className="font-medium text-foreground">{rememberedEmail ? maskEmail(rememberedEmail) : ""}</span>
                </>
              ) : (
                t("fullSubtitle")
              )}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === "pin" ? (
              <form onSubmit={onPinSubmit} className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="cashier-pin">{t("pinLabel")}</Label>
                  <Input
                    id="cashier-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{4}"
                    maxLength={4}
                    value={pinValue}
                    onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="text-center font-mono text-lg tracking-[0.5em]"
                    dir="ltr"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="rememberPin"
                    type="checkbox"
                    checked={rememberMePin}
                    onChange={(e) => setRememberMePin(e.target.checked)}
                    className="relative size-4 shrink-0 rounded-sm border border-input"
                  />
                  <Label htmlFor="rememberPin" className="text-sm font-normal text-muted-foreground">
                    {tAuth("rememberMe")}
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={pending || pinValue.length < 4} dir="ltr">
                  {locale === "ar" ? (
                    <>
                      <ArrowLeft className="me-2 size-4" aria-hidden="true" />
                      <span>{pending ? tAuth("loginPending") : t("pinSubmit")}</span>
                    </>
                  ) : (
                    <>
                      <span>{pending ? tAuth("loginPending") : t("pinSubmit")}</span>
                      <ArrowRight className="ms-2 size-4" aria-hidden="true" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setStep("full");
                    setPinValue("");
                  }}
                >
                  {t("useFullLogin")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    clearRememberedCashierEmail();
                    setRememberedEmail(null);
                    setFullEmail("");
                    setStep("full");
                    setPinValue("");
                    toast.message(t("clearedEmail"));
                  }}
                >
                  {t("anotherAccount")}
                </Button>
              </form>
            ) : step === "full" ? (
              <form onSubmit={onFullSubmit} className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="c-email">{tAuth("email")}</Label>
                  <Input
                    id="c-email"
                    type="email"
                    value={fullEmail}
                    onChange={(e) => setFullEmail(e.target.value)}
                    placeholder={tAuth("emailPlaceholderHint")}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-password">{tAuth("password")}</Label>
                  <div className="relative">
                    <Input
                      id="c-password"
                      type={showPassword ? "text" : "password"}
                      value={fullPassword}
                      onChange={(e) => setFullPassword(e.target.value)}
                      placeholder={tAuth("passwordPlaceholderDots")}
                      autoComplete="current-password"
                      required
                      minLength={8}
                      className="pe-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="rememberFull"
                    type="checkbox"
                    checked={rememberMeFull}
                    onChange={(e) => setRememberMeFull(e.target.checked)}
                    className="relative size-4 shrink-0 rounded-sm border border-input"
                  />
                  <Label htmlFor="rememberFull" className="text-sm font-normal text-muted-foreground">
                    {tAuth("rememberMe")}
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={pending} dir="ltr">
                  {locale === "ar" ? (
                    <>
                      <ArrowLeft className="me-2 size-4" aria-hidden="true" />
                      <span>{pending ? tAuth("loginPending") : tAuth("loginButton")}</span>
                    </>
                  ) : (
                    <>
                      <span>{pending ? tAuth("loginPending") : tAuth("loginButton")}</span>
                      <ArrowRight className="ms-2 size-4" aria-hidden="true" />
                    </>
                  )}
                </Button>
                {rememberedEmail ? (
                  <Button type="button" variant="outline" className="w-full" onClick={() => setStep("pin")}>
                    {t("backToPin")}
                  </Button>
                ) : null}
              </form>
            ) : (
              <form onSubmit={onOtpSubmit} className="grid gap-6">
                <div className="flex items-center justify-center gap-2" dir="ltr">
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
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
                        digit ? "border-ring/40 text-foreground" : "border-input text-muted-foreground",
                      )}
                    />
                  ))}
                </div>
                <Button type="submit" className="w-full" disabled={pending || code.length < OTP_LENGTH} dir="ltr">
                  {pending ? tOtp("verifyPending") : tOtp("signIn")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setStep("full");
                    setDigits(Array(OTP_LENGTH).fill(""));
                  }}
                >
                  {tOtp("back")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("managerLoginLink")}
          </Link>
        </div>
      </div>
    </>
  );
}
