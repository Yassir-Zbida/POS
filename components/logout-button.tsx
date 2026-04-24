"use client"

import * as React from "react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/use-auth-store"
import { authApiUrl } from "@/lib/auth-client"
import { defaultLocale } from "@/i18n/routing"

export function LogoutButton() {
  const locale = useLocale()
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const clearSession = useAuthStore((s) => s.clearSession)
  const t = useTranslations("common")
  const [pending, setPending] = React.useState(false)

  function onLogout() {
    setPending(true)
    const loginPath =
      locale === defaultLocale ? "/login" : `/${locale}/login`
    if (refreshToken) {
      void fetch(authApiUrl("logout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        keepalive: true,
      }).catch(() => {})
    }
    clearSession()
    toast.success(t("loggedOut"))
    window.location.assign(loginPath)
  }

  return (
    <Button variant="outline" onClick={onLogout} disabled={pending}>
      {pending ? "Logging out…" : "Logout"}
    </Button>
  )
}

