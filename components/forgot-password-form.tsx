"use client"

import * as React from "react"
import { Link } from "@/i18n/navigation"
import { useLocale, useTranslations } from "next-intl"

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
import { toast } from "sonner"
import { authApiUrl } from "@/lib/auth-client"
import { ArrowLeft, ArrowRight } from "lucide-react"

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const t = useTranslations("resetPassword")
  const locale = useLocale()
  const subtitle = t("subtitle")
  const [pending, setPending] = React.useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const email = String(fd.get("email") ?? "")
    setPending(true)
    try {
      const res = await fetch(authApiUrl("forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-locale": locale },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        const msg =
          typeof data.error === "string" ? data.error : t("errors.generic")
        toast.error(msg)
        return
      }
      toast.success(t("success"))
      form.reset()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("title")}</CardTitle>
          {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="reset-email">{t("email")}</Label>
                <Input
                  id="reset-email"
                  name="email"
                  type="email"
                  placeholder={t("emailPlaceholderHint")}
                  autoComplete="email"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={pending} dir="ltr">
                {locale === "ar" ? (
                  <>
                    <ArrowLeft className="me-2 size-4" aria-hidden="true" />
                    <span>
                      {pending ? t("submitPending") : t("submit")}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {pending ? t("submitPending") : t("submit")}
                    </span>
                    <ArrowRight className="ms-2 size-4" aria-hidden="true" />
                  </>
                )}
              </Button>
              <div className="text-center text-sm">
                <Link href="/login" className="underline underline-offset-4">
                  {t("backToLogin")}
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
