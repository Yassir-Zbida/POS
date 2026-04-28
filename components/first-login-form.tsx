"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { useAuthStore } from "@/store/use-auth-store";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { authApiUrl } from "@/lib/auth-client";
import { dashboardHomeForRole } from "@/lib/dashboard";
import { AUTH_ROLES } from "@/types/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FirstLoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const t = useTranslations("auth.firstLogin");
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const user = useAuthStore((s) => s.user);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!currentPassword) next.currentPassword = t("errors.currentRequired");
    if (newPassword.length < 8) next.newPassword = t("errors.newMin");
    if (newPassword !== confirmPassword) next.confirmPassword = t("errors.mismatch");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!accessToken || !refreshToken || !user) {
      toast.error(t("errors.generic"));
      return;
    }

    setPending(true);
    try {
      const res = await fetchWithAuth(authApiUrl("change-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        user?: { id: string; email: string; role: string; status: string; mustChangePassword: boolean };
        error?: string;
      };

      if (res.status === 401 && data.error === "INVALID_CURRENT_PASSWORD") {
        setErrors({ currentPassword: t("errors.invalidCurrent") });
        return;
      }
      if (res.status === 400 && data.error === "NEW_PASSWORD_SAME_AS_OLD") {
        setErrors({ newPassword: t("errors.sameAsOld") });
        return;
      }
      if (!res.ok) {
        toast.error(t("errors.generic"));
        return;
      }

      if (data.user) {
        setSession({
          accessToken,
          refreshToken,
          user: {
            ...user,
            ...data.user,
            role: AUTH_ROLES.MANAGER,
            mustChangePassword: false,
          },
        });
      }

      toast.success(t("success"));
      router.push(dashboardHomeForRole(AUTH_ROLES.MANAGER));
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "h-11 w-full border border-input bg-background shadow-sm px-3 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0";

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("title")}</CardTitle>
          <CardDescription className="text-balance">{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="fl-current">{t("currentPassword")}</Label>
              <div className="relative">
                <Input
                  id="fl-current"
                  className={cn(inputClass, "pe-10")}
                  type={showCurrent ? "text" : "password"}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setErrors((p) => {
                      if (!p.currentPassword) return p;
                      const { currentPassword: _, ...r } = p;
                      return r;
                    });
                  }}
                  aria-invalid={Boolean(errors.currentPassword)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowCurrent((v) => !v)}
                  aria-label={showCurrent ? "Hide" : "Show"}
                >
                  {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              {errors.currentPassword ? (
                <p className="text-xs text-destructive">{errors.currentPassword}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fl-new">{t("newPassword")}</Label>
              <div className="relative">
                <Input
                  id="fl-new"
                  className={cn(inputClass, "pe-10")}
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrors((p) => {
                      if (!p.newPassword) return p;
                      const { newPassword: _, ...r } = p;
                      return r;
                    });
                  }}
                  aria-invalid={Boolean(errors.newPassword)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? "Hide" : "Show"}
                >
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              {errors.newPassword ? (
                <p className="text-xs text-destructive">{errors.newPassword}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fl-confirm">{t("confirmPassword")}</Label>
              <div className="relative">
                <Input
                  id="fl-confirm"
                  className={cn(inputClass, "pe-10")}
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors((p) => {
                      if (!p.confirmPassword) return p;
                      const { confirmPassword: _, ...r } = p;
                      return r;
                    });
                  }}
                  aria-invalid={Boolean(errors.confirmPassword)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Hide" : "Show"}
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              {errors.confirmPassword ? (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
              ) : null}
            </div>

            <Button type="submit" className="h-11 w-full" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="me-2 size-4 animate-spin" />
                  {t("pending")}
                </>
              ) : (
                t("submit")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
