"use client";

import * as React from "react";
import { Suspense } from "react";
import { Delete } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/use-auth-store";
import { useSessionStore } from "@/store/sessionStore";
import { authApiUrl } from "@/lib/auth-client";
import { defaultLocale } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageSwitcherInline } from "@/components/language-switcher-footer";

// Numpad layout — always LTR; we force dir="ltr" on the grid
const NUMPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
] as const;

type VerifyResponse =
  | { ok: true }
  | { error: string; attemptsLeft?: number; locked?: boolean; remainingSeconds?: number };

function getInitials(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }
  // Fall back to first letter of email when no name is set
  if (email?.trim()) return email[0].toUpperCase();
  return "?";
}

export function LockScreen() {
  const t = useTranslations("lockScreen");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearSession = useAuthStore((s) => s.clearSession);
  const unlock = useSessionStore((s) => s.unlock);
  const pinLockedUntil = useSessionStore((s) => s.pinLockedUntil);
  const recordPinFailure = useSessionStore((s) => s.recordPinFailure);
  const applyServerLockout = useSessionStore((s) => s.applyServerLockout);
  const locale = useLocale();

  const [pin, setPin] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [shaking, setShaking] = React.useState(false);

  // Derive remaining locked seconds from the persisted store timestamp so the
  // lockout survives page reloads and component remounts.
  const [lockedSeconds, setLockedSeconds] = React.useState<number>(() =>
    Math.max(0, Math.ceil((pinLockedUntil - Date.now()) / 1000)),
  );

  // Keep lockedSeconds in sync when the store value changes (e.g. another tab).
  React.useEffect(() => {
    const remaining = Math.max(0, Math.ceil((pinLockedUntil - Date.now()) / 1000));
    setLockedSeconds(remaining);
  }, [pinLockedUntil]);

  // Countdown ticker for lockout display
  React.useEffect(() => {
    if (lockedSeconds <= 0) return;
    const id = setInterval(() => {
      setLockedSeconds((s) => {
        if (s <= 1) { clearInterval(id); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lockedSeconds]);

  // The lock screen lives inside app/[locale]/dashboard/layout.tsx which is
  // always mounted for every /dashboard/** route. Any client-side navigation
  // within the dashboard keeps this overlay on screen because the parent
  // layout never unmounts — no popstate trap needed, and adding one would
  // break the language switcher's router.replace() call.

  const isHardLocked = lockedSeconds > 0;
  const minutesLeft = Math.ceil(lockedSeconds / 60);

  function shake() {
    setShaking(true);
    setTimeout(() => { setShaking(false); setPin(""); }, 600);
  }

  async function verify(finalPin: string) {
    if (loading || isHardLocked) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/pin/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ pin: finalPin }),
      });
      const data = (await res.json().catch(() => ({}))) as VerifyResponse;

      if (res.ok && "ok" in data && data.ok) {
        unlock();
        setPin("");
        return;
      }

      shake();

      // 423 = already locked from a previous session
      // 401 + locked:true = just got locked on this attempt
      if (
        (res.status === 423 || ("locked" in data && data.locked)) &&
        "remainingSeconds" in data &&
        data.remainingSeconds
      ) {
        applyServerLockout(data.remainingSeconds);
        setError(null);
        return;
      }

      // Count every failed attempt (wrong PIN or expired-token 401) toward the
      // client-side lockout so the screen always blocks after 3 failures.
      recordPinFailure();

      if ("attemptsLeft" in data && typeof data.attemptsLeft === "number") {
        const left = data.attemptsLeft;
        setError(
          left > 0
            ? `${t("wrongPin")} — ${left > 1 ? t("attemptsLeftPlural", { count: left }) : t("attemptsLeft", { count: left })}`
            : t("wrongPin"),
        );
      } else {
        setError(t("wrongPin"));
      }
    } catch {
      shake();
      recordPinFailure();
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }

  function handleKey(key: string) {
    if (loading || isHardLocked) return;
    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
      setError(null);
      return;
    }
    if (!/^\d$/.test(key)) return;
    const next = pin + key;
    setPin(next);
    setError(null);
    if (next.length === 4) void verify(next);
  }

  function handleLogout() {
    const loginPath = locale === defaultLocale ? "/login" : `/${locale}/login`;
    if (refreshToken) {
      void fetch(authApiUrl("logout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        keepalive: true,
      }).catch(() => {});
    }
    clearSession();
    toast.success(tCommon("loggedOut"));
    setTimeout(() => window.location.assign(loginPath), 400);
  }

  const initials = getInitials(user?.name, user?.email);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-y-auto bg-background px-4 pb-8 pt-10">

      {/* ── Top-right controls: language + dark mode ── */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Suspense fallback={null}>
          <LanguageSwitcherInline />
        </Suspense>
        <ModeToggle />
      </div>

      {/* ── User identity ── */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-20 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 text-3xl font-bold text-primary shadow-sm">
          {initials}
        </div>
        <div className="space-y-0.5">
          <p className="text-lg font-semibold text-foreground">
            {user?.name ?? user?.email}
          </p>
          <p className="text-sm font-medium text-muted-foreground">
            {t("locked")}
          </p>
        </div>
      </div>

      {/* ── PIN area ── */}
      <div className="flex w-full max-w-xs flex-col items-center gap-6">

        {/* PIN dot indicators */}
        <div
          className={cn(
            "flex items-center gap-4 transition-transform",
            shaking && "animate-[lock-shake_0.5s_ease-in-out]",
          )}
          aria-label={`PIN: ${pin.length} / 4`}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "size-4 rounded-full border-2 transition-all duration-150",
                i < pin.length
                  ? "border-primary bg-primary scale-110"
                  : "border-muted-foreground/40 bg-transparent",
              )}
            />
          ))}
        </div>

        {/* Status message */}
        <div className="min-h-[1.5rem] text-center">
          {isHardLocked ? (
            <p className="text-sm font-medium text-destructive">
              {t("tooManyAttempts", { minutes: minutesLeft })}
            </p>
          ) : error ? (
            <p className="text-sm font-medium text-destructive">{error}</p>
          ) : null}
        </div>

        {/* Numpad — always LTR so digits never flip in Arabic */}
        <div
          dir="ltr"
          className="grid w-full grid-cols-3 gap-3"
          aria-disabled={isHardLocked || loading}
        >
          {NUMPAD_ROWS.flat().map((key, idx) => {
            if (key === "") return <div key={idx} aria-hidden />;
            const isBackspace = key === "⌫";
            const isDisabled = isHardLocked || loading || (isBackspace && pin.length === 0);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleKey(key)}
                disabled={isDisabled}
                className={cn(
                  "flex h-16 items-center justify-center rounded-2xl border text-xl font-semibold",
                  "transition-all duration-100 select-none",
                  "border-border bg-card text-foreground shadow-sm",
                  "hover:bg-accent hover:border-accent-foreground/10 active:scale-95",
                  "disabled:pointer-events-none disabled:opacity-40",
                  isBackspace && "text-muted-foreground",
                )}
                aria-label={isBackspace ? t("deleteDigit") : t("digit", { key })}
              >
                {isBackspace ? <Delete className="size-5" /> : key}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex flex-col items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          {t("switchAccount")}
        </Button>
      </div>

      {/* Shake keyframe */}
      <style>{`
        @keyframes lock-shake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-8px); }
          30%      { transform: translateX(8px); }
          45%      { transform: translateX(-6px); }
          60%      { transform: translateX(6px); }
          75%      { transform: translateX(-3px); }
          90%      { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
