"use client"

import * as React from "react"
import { Link } from "@/i18n/navigation"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { useAuthStore } from "@/store/use-auth-store"
import { useSessionStore } from "@/store/sessionStore"
import { useLocale } from "next-intl"
import type { AuthRole } from "@/types/auth"
import { AUTH_ROLES } from "@/types/auth"
import { dashboardHomeForRole } from "@/lib/dashboard"
import { authApiUrl } from "@/lib/auth-client"

const OTP_LENGTH = 6

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter()
  const t = useTranslations("auth")
  const tOtp = useTranslations("auth2fa")
  const locale = useLocale()
  const subtitle = t("loginSubtitle")
  const [pending, setPending] = React.useState(false)
  const [redirecting, setRedirecting] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const setSession = useAuthStore((s) => s.setSession)
  const unlock = useSessionStore((s) => s.unlock)

  // 2FA state
  const [otpRequired, setOtpRequired] = React.useState(false)
  const [otpEmail, setOtpEmail] = React.useState("")
  const [otpRememberMe, setOtpRememberMe] = React.useState(false)
  const [digits, setDigits] = React.useState<string[]>(Array(OTP_LENGTH).fill(""))
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null))
  const code = digits.join("")

  React.useEffect(() => {
    if (otpRequired) {
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    }
  }, [otpRequired])

  function handleDigitChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "").slice(-1)
    const updated = [...digits]
    updated[index] = cleaned
    setDigits(updated)
    if (cleaned && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleDigitKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const updated = [...digits]
        updated[index] = ""
        setDigits(updated)
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleDigitPaste(e: React.ClipboardEvent<HTMLInputElement>, index: number) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH)
    if (!pasted) return
    const updated = [...digits]
    for (let i = 0; i < pasted.length; i++) {
      if (index + i < OTP_LENGTH) updated[index + i] = pasted[i]
    }
    setDigits(updated)
    const focusIdx = Math.min(index + pasted.length, OTP_LENGTH - 1)
    inputRefs.current[focusIdx]?.focus()
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const email = String(fd.get("email") ?? "")
    const password = String(fd.get("password") ?? "")
    const rememberMe = fd.get("rememberMe") === "on"
    setPending(true)
    try {
      const res = await fetch(authApiUrl("login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      })
      const data = (await res.json().catch(() => ({}))) as
        | { otpRequired: true; email: string }
        | {
            accessToken: string
            refreshToken: string
            user: {
              id: string
              email: string
              role: string
              status: string
              mustChangePassword?: boolean
            }
          }
        | { error?: string }

      if (!res.ok) {
        const code = "error" in data && typeof data.error === "string" ? data.error : ""
        const knownCodes = ["INVALID_CREDENTIALS", "ACCOUNT_LOCKED", "ACCOUNT_INACTIVE", "TOO_MANY_ATTEMPTS", "EMAIL_SEND_FAILED"] as const
        const msg = knownCodes.includes(code as typeof knownCodes[number])
          ? t(`errors.${code as typeof knownCodes[number]}`)
          : t("errors.loginFailed")
        toast.error(msg)
        return
      }

      // 2FA required — show inline OTP step
      if ("otpRequired" in data && data.otpRequired) {
        setOtpEmail(data.email)
        setOtpRememberMe(rememberMe)
        setOtpRequired(true)
        toast.success(tOtp("codeSent"))
        return
      }

      finishSession(data as { accessToken: string; refreshToken: string; user: { id: string; email: string; role: string; status: string } })
    } finally {
      setPending(false)
    }
  }

  async function onOtpSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) {
      toast.error(tOtp("errors.codeInvalid"))
      return
    }
    setPending(true)
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
      })
      const data = (await res.json().catch(() => ({}))) as
        | {
            accessToken: string
            refreshToken: string
            user: {
              id: string
              email: string
              role: string
              status: string
              mustChangePassword?: boolean
            }
          }
        | { error?: string }

      if (!res.ok) {
        toast.error("error" in data && typeof data.error === "string" ? data.error : tOtp("errors.verifyFailed"))
        return
      }

      finishSession(data as { accessToken: string; refreshToken: string; user: { id: string; email: string; role: string; status: string } })
    } finally {
      setPending(false)
    }
  }

  function finishSession(data: {
    accessToken: string
    refreshToken: string
    user: {
      id: string
      email: string
      role: string
      status: string
      mustChangePassword?: boolean
    }
  }) {
    if (!data.accessToken || !data.refreshToken || !data.user) {
      toast.error(t("errors.loginFailed"))
      return
    }
    const rawRole = String(data.user.role ?? "")
    const normalizedRole = rawRole.toUpperCase()
    const role =
      normalizedRole === AUTH_ROLES.ADMIN ||
      normalizedRole === AUTH_ROLES.MANAGER ||
      normalizedRole === AUTH_ROLES.CASHIER
        ? (normalizedRole as AuthRole)
        : null
    if (!role) {
      toast.error(t("errors.loginFailed"))
      return
    }
    setSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: {
        ...data.user,
        role,
        mustChangePassword: Boolean(data.user.mustChangePassword),
      },
    })
    if (role === AUTH_ROLES.ADMIN || role === AUTH_ROLES.MANAGER) {
      unlock()
    }
    setRedirecting(true)
    if (role === AUTH_ROLES.MANAGER && data.user.mustChangePassword) {
      router.push("/first-login")
      return
    }
    router.push(dashboardHomeForRole(role))
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
              {otpRequired ? tOtp("title") : t("loginTitle")}
            </CardTitle>
            <CardDescription>
              {otpRequired ? (
                <>
                  {tOtp("subtitle")}{" "}
                  <span className="font-medium text-foreground">{otpEmail}</span>
                </>
              ) : subtitle ? (
                subtitle
              ) : null}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!otpRequired ? (
              /* ── Step 1: email + password ── */
              <form onSubmit={onSubmit}>
                <div className="grid gap-6">
                  <div className="grid gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="email">{t("email")}</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder={t("emailPlaceholderHint")}
                        autoComplete="email"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center">
                        <Label htmlFor="password">{t("password")}</Label>
                        <Link
                          href="/forgot-password"
                          className="ms-auto text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {t("forgotPassword")}
                        </Link>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder={t("passwordPlaceholderDots")}
                          autoComplete="current-password"
                          required
                          className="pe-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" aria-hidden="true" />
                          ) : (
                            <Eye className="size-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="text-center text-sm">
                      <Link href="/otp" className="font-medium text-primary underline-offset-4 hover:underline">
                        {t("otpLink")}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="rememberMe"
                        name="rememberMe"
                        type="checkbox"
                        className="relative size-4 shrink-0 appearance-none rounded-sm border border-input bg-[hsl(var(--input-bg))] shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring/30 focus-visible:ring-offset-0 checked:border-primary checked:bg-primary checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-[12px] checked:after:font-semibold checked:after:leading-none checked:after:text-primary-foreground checked:after:content-['✓'] disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <Label htmlFor="rememberMe" className="text-sm font-normal text-muted-foreground">
                        {t("rememberMe")}
                      </Label>
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={pending}
                      dir="ltr"
                    >
                      {locale === "ar" ? (
                        <>
                          <ArrowLeft className="me-2 size-4" aria-hidden="true" />
                          <span>
                            {pending ? t("loginPending") : t("loginButton")}
                          </span>
                        </>
                      ) : (
                        <>
                          <span>
                            {pending ? t("loginPending") : t("loginButton")}
                          </span>
                          <ArrowRight className="ms-2 size-4" aria-hidden="true" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              /* ── Step 2: 2FA digit boxes ── */
              <form onSubmit={onOtpSubmit}>
                <div className="grid gap-6">
                  <div className="flex items-center justify-center gap-2" dir="ltr">
                    {digits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el }}
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

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={pending || code.length < OTP_LENGTH}
                    dir="ltr"
                  >
                    {locale === "ar" ? (
                      <>
                        <ArrowLeft className="me-2 size-4" aria-hidden="true" />
                        <span>
                          {pending ? tOtp("verifyPending") : tOtp("signIn")}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>
                          {pending ? tOtp("verifyPending") : tOtp("signIn")}
                        </span>
                        <ArrowRight className="ms-2 size-4" aria-hidden="true" />
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setOtpRequired(false)
                      setDigits(Array(OTP_LENGTH).fill(""))
                    }}
                  >
                    {tOtp("back")}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {!otpRequired && (
          <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
            {t("termsPrefix")} <a href="#">{t("terms")}</a> {t("and")}{" "}
            <a href="#">{t("privacy")}</a>.
          </div>
        )}
      </div>
    </>
  )
}
