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
import { useLocale } from "next-intl"
import type { AuthRole } from "@/types/auth"
import { AUTH_ROLES } from "@/types/auth"
import { dashboardHomeForRole } from "@/lib/dashboard"
import { authApiUrl } from "@/lib/auth-client"

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter()
  const t = useTranslations("auth")
  const locale = useLocale()
  const subtitle = t("loginSubtitle")
  const [pending, setPending] = React.useState(false)
  const [redirecting, setRedirecting] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const setSession = useAuthStore((s) => s.setSession)

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
        | {
            accessToken: string
            refreshToken: string
            user: { id: string; email: string; role: string; status: string }
          }
        | { error?: string }
      if (!res.ok) {
        const msg =
          "error" in data && typeof data.error === "string" ? data.error : t("errors.loginFailed")
        toast.error(msg)
        return
      }
      if (
        !("accessToken" in data) ||
        !data.accessToken ||
        !("refreshToken" in data) ||
        !data.refreshToken ||
        !("user" in data) ||
        !data.user
      ) {
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
        user: { ...data.user, role },
      })
      // Show the full-screen overlay first, then navigate directly to the
      // role's home — no intermediate /dashboard stop needed.
      setRedirecting(true)
      router.push(dashboardHomeForRole(role))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      {/* Fixed full-screen overlay — covers the entire viewport while Next.js loads the new route */}
      {redirecting && (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-background">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      )}
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("loginTitle")}</CardTitle>
          {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
        </CardHeader>
        <CardContent>
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
                    className="relative size-4 shrink-0 appearance-none rounded-sm border border-input bg-[hsl(var(--input-bg))] shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0 checked:border-primary checked:bg-primary checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-[12px] checked:after:font-semibold checked:after:leading-none checked:after:text-primary-foreground checked:after:content-['✓'] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Label htmlFor="rememberMe" className="text-sm font-normal text-muted-foreground">
                    {t("rememberMe")}
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={pending}>
                  <span>{pending ? t("loginPending") : t("loginButton")}</span>
                  {locale === "ar" ? (
                    <ArrowLeft className="ms-2 size-4" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="ms-2 size-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary  ">
        {t("termsPrefix")} <a href="#">{t("terms")}</a> {t("and")}{" "}
        <a href="#">{t("privacy")}</a>.
      </div>
    </div>
    </>
  )
}
