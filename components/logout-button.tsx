"use client"

import * as React from "react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

import { useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/use-auth-store"

export function LogoutButton() {
  const router = useRouter()
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const clearSession = useAuthStore((s) => s.clearSession)
  const t = useTranslations("common")
  const [pending, setPending] = React.useState(false)

  async function onLogout() {
    setPending(true)
    try {
      if (refreshToken) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => null)
      }
      clearSession()
      router.push("/login")
      toast.success(t("loggedOut"))
    } finally {
      setPending(false)
    }
  }

  return (
    <Button variant="outline" onClick={onLogout} disabled={pending}>
      {pending ? "Logging out…" : "Logout"}
    </Button>
  )
}

