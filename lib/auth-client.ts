import { defaultLocale, type Locale } from "@/i18n/routing";

/** Browser-facing auth API base (aligned with SRS `/api/v1/auth`). */
export const AUTH_API_BASE = "/api/v1/auth" as const;

export function authApiUrl(suffix: string) {
  const s = suffix.startsWith("/") ? suffix.slice(1) : suffix;
  return `${AUTH_API_BASE}/${s}`;
}

/**
 * Active locale from the URL (`localePrefix: "as-needed"` — default locale has no prefix).
 */
export function localeFromPathname(pathname: string): Locale {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (seg === "fr" || seg === "en" || seg === "ar") return seg;
  return defaultLocale;
}

/**
 * Full path for `window.location` (adds `/en` or `/ar` when the active locale is not default).
 * Do **not** use this with next-intl `router.push` / `Link` — those expect paths without a locale prefix.
 */
export function localizedAppPath(pathname: string): string {
  if (typeof window === "undefined") return pathname;
  const locale = localeFromPathname(window.location.pathname);
  if (locale === defaultLocale) return pathname;
  return `/${locale}${pathname}`;
}

/** Locale-aware path for mandatory first password change (merchant) — use with `window.location`. */
export function firstLoginPath(): string {
  return localizedAppPath("/first-login");
}

/** Locale-aware login path — use with `window.location`. */
export function loginPath(): string {
  return localizedAppPath("/login");
}
