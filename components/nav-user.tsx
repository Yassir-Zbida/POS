"use client"

import * as React from "react"
import {
  BadgeCheck,
  Bell,
  CreditCard,
  EllipsisVertical,
  LogOut,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "next-intl"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/store/use-auth-store"
import { authApiUrl } from "@/lib/auth-client"
import { defaultLocale } from "@/i18n/routing"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const locale = useLocale()
  const isRtl = locale.toLowerCase().startsWith("ar")
  const userRole = useAuthStore((s) => s.user?.role)
  const isAdmin = userRole === "ADMIN"
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const clearSession = useAuthStore((s) => s.clearSession)
  const t = useTranslations("common")
  const [pendingLogout, setPendingLogout] = React.useState(false)
  const avatarSrc = user.avatar?.startsWith("/") || user.avatar?.startsWith("http") ? user.avatar : ""
  const initials = getInitials(user.name)

  function onLogout() {
    if (pendingLogout) return
    setPendingLogout(true)
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
    // Short delay lets the toast render before the page navigates away
    setTimeout(() => window.location.assign(loginPath), 1200)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground focus-visible:ring-0 focus-visible:ring-transparent"
            >
              {isRtl ? (
                /* RTL: parent dir=rtl flips flex, so DOM order = visual right→left
                   DOM: [avatar] [text] [⋯]  →  visual: avatar(right) text ⋯(left) */
                <>
                  <Avatar className="h-8 w-8 shrink-0 rounded-lg border border-sidebar-border">
                    <AvatarImage src={avatarSrc} alt={user.name} />
                    <AvatarFallback className="rounded-lg font-semibold text-sidebar-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-right text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                  <EllipsisVertical className="shrink-0 size-4 text-muted-foreground" />
                </>
              ) : (
                /* LTR: DOM: [avatar] [text] [⋯]  →  visual: avatar(left) text ⋯(right) */
                <>
                  <Avatar className="h-8 w-8 shrink-0 rounded-lg border border-sidebar-border">
                    <AvatarImage src={avatarSrc} alt={user.name} />
                    <AvatarFallback className="rounded-lg font-semibold text-sidebar-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                  <EllipsisVertical className="shrink-0 size-4 text-muted-foreground" />
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg text-start"
            side={isMobile ? "bottom" : isRtl ? "left" : "right"}
            align={isRtl ? "start" : "end"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              {/* Dropdown content has dir="rtl", so same rule: first DOM child = rightmost visual */}
              <div className="flex items-center gap-2 px-1 py-1.5 text-sm">
                <Avatar className="h-8 w-8 shrink-0 rounded-lg border border-border">
                  <AvatarImage src={avatarSrc} alt={user.name} />
                  <AvatarFallback className="rounded-lg font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            {!isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Sparkles className="size-4 shrink-0" />
                    {t("upgradePro")}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheck className="size-4 shrink-0" />
                {t("account")}
              </DropdownMenuItem>
              {!isAdmin && (
                <DropdownMenuItem>
                  <CreditCard className="size-4 shrink-0" />
                  {t("billing")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Bell className="size-4 shrink-0" />
                {t("notifications")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              onClick={onLogout}
              disabled={pendingLogout}
            >
              <LogOut className="size-4 shrink-0" />
              {pendingLogout ? t("loggingOut") : t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  const letters = parts.map((p) => p[0]).join("")
  return letters ? letters.toUpperCase() : "?"
}
