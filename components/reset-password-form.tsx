"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react"
import { authApiUrl } from "@/lib/auth-client"

function getPasswordStrength(password: string) {
  const p = password ?? ""
  if (!p) return { score: 0, label: "" as const }

  let score = 0
  if (p.length >= 8) score += 1
  if (p.length >= 12) score += 1
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 1
  if (/\d/.test(p)) score += 1
  if (/[^a-zA-Z0-9]/.test(p)) score += 1

  // clamp into 0..4 buckets for UI
  const bucket = Math.min(4, Math.floor(score))
  const level =
    bucket <= 1
      ? ("weak" as const)
      : bucket === 2
        ? ("fair" as const)
        : bucket === 3
          ? ("good" as const)
          : ("strong" as const)
  return { score: bucket, level }
}

function getPasswordRules(password: string) {
  const p = password ?? ""
  return {
    min8: p.length >= 8,
    min12: p.length >= 12,
    upperLower: /[a-z]/.test(p) && /[A-Z]/.test(p),
    number: /\d/.test(p),
    special: /[^a-zA-Z0-9]/.test(p),
  }
}

export function ResetPasswordForm({
  token,
  className,
  ...props
}: { token: string } & React.ComponentPropsWithoutRef<"div">) {
  const t = useTranslations("resetPassword")
  const locale = useLocale()
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [password, setPassword] = React.useState("")

  const strength = React.useMemo(() => getPasswordStrength(password), [password])
  const rules = React.useMemo(() => getPasswordRules(password), [password])
  const isValidPassword = rules.min8 && rules.upperLower && rules.number && rules.special

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isValidPassword) {
      toast.error(t("validationError"))
      return
    }
    const form = e.currentTarget
    const fd = new FormData(form)
    const password = String(fd.get("password") ?? "")

    setPending(true)
    try {
      const res = await fetch(authApiUrl("reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : t("errors.generic"))
        return
      }
      toast.success(t("resetSuccess"))
      router.push("/login")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("newTitle")}</CardTitle>
          <CardDescription>{t("newSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="new-password">{t("newPassword")}</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("newPasswordPlaceholder")}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className="pe-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

                {password ? (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("strength.label")}</span>
                      <span
                        className={
                          strength.score <= 1
                            ? "text-destructive"
                            : strength.score === 2
                              ? "text-yellow-500"
                              : strength.score === 3
                                ? "text-emerald-500"
                                : "text-emerald-400"
                        }
                      >
                        {t(`strength.levels.${strength.level}`)}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1">
                      {Array.from({ length: 4 }).map((_, i) => {
                        const active = i < strength.score
                        const color =
                          strength.score <= 1
                            ? "bg-destructive"
                            : strength.score === 2
                              ? "bg-yellow-500"
                              : "bg-emerald-500"
                        return (
                          <div
                            key={i}
                            className={cn(
                              "h-1.5 rounded-full bg-muted",
                              active ? color : "opacity-40"
                            )}
                            aria-hidden="true"
                          />
                        )
                      })}
                    </div>

                    <ul className="mt-3 space-y-1 text-xs">
                      <li className={rules.min8 ? "text-emerald-500" : "text-muted-foreground"}>
                        {rules.min8 ? "✓" : "•"} {t("strength.rules.min8")}
                      </li>
                      <li
                        className={rules.upperLower ? "text-emerald-500" : "text-muted-foreground"}
                      >
                        {rules.upperLower ? "✓" : "•"} {t("strength.rules.upperLower")}
                      </li>
                      <li className={rules.number ? "text-emerald-500" : "text-muted-foreground"}>
                        {rules.number ? "✓" : "•"} {t("strength.rules.number")}
                      </li>
                      <li className={rules.special ? "text-emerald-500" : "text-muted-foreground"}>
                        {rules.special ? "✓" : "•"} {t("strength.rules.special")}
                      </li>
                    </ul>
                  </div>
                ) : null}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={pending || (password ? !isValidPassword : false)}
              >
                <span>{pending ? t("newSubmitPending") : t("newSubmit")}</span>
                {locale === "ar" ? (
                  <ArrowLeft className="ms-2 size-4" aria-hidden="true" />
                ) : (
                  <ArrowRight className="ms-2 size-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

