"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { ShieldCheck, ShieldOff } from "lucide-react"

import { authApiUrl } from "@/lib/auth-client"
import { useAuthStore } from "@/store/use-auth-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function TwoFactorSetting() {
  const t = useTranslations("auth2fa.settings")
  const accessToken = useAuthStore((s) => s.accessToken)

  const [otpEnabled, setOtpEnabled] = React.useState<boolean | null>(null)
  const [pending, setPending] = React.useState(false)

  // Load current state
  React.useEffect(() => {
    if (!accessToken) return
    fetch(authApiUrl("otp-settings"), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d: { otpEnabled?: boolean }) => setOtpEnabled(d.otpEnabled ?? false))
      .catch(() => setOtpEnabled(false))
  }, [accessToken])

  async function toggle() {
    if (otpEnabled === null) return
    setPending(true)
    try {
      const res = await fetch(authApiUrl("otp-settings"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ enabled: !otpEnabled }),
      })
      if (!res.ok) {
        toast.error(t("error"))
        return
      }
      const data = (await res.json()) as { otpEnabled: boolean }
      setOtpEnabled(data.otpEnabled)
      toast.success(data.otpEnabled ? t("successEnabled") : t("successDisabled"))
    } catch {
      toast.error(t("error"))
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {otpEnabled ? (
            <ShieldCheck className="size-5 text-emerald-500" />
          ) : (
            <ShieldOff className="size-5 text-muted-foreground" />
          )}
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <span className={`text-sm font-medium ${otpEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
          {otpEnabled === null ? "…" : otpEnabled ? t("enabled") : t("disabled")}
        </span>
        <Button
          variant={otpEnabled ? "outline" : "default"}
          size="sm"
          disabled={pending || otpEnabled === null}
          onClick={toggle}
        >
          {pending ? t("pending") : otpEnabled ? t("disable") : t("enable")}
        </Button>
      </CardContent>
    </Card>
  )
}
