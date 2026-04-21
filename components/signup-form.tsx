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

export function SignupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter()
  const t = useTranslations("auth")
  const subtitle = t("signupSubtitle")
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    const email = String(fd.get("email") ?? "")
    const password = String(fd.get("password") ?? "")
    setPending(true)
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : t("errors.signupFailed")
        )
        return
      }
      router.push("/dashboard")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("signupTitle")}</CardTitle>
          {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <div className="grid gap-6">
              {error ? (
                <p className="text-center text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="signup-email">{t("email")}</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signup-password">{t("password")}</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? t("signupPending") : t("signupButton")}
                </Button>
              </div>
              <div className="text-center text-sm">
                {t("haveAccount")}{" "}
                <Link href="/login" className="underline underline-offset-4">
                  {t("goToLogin")}
                </Link>
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
  )
}
