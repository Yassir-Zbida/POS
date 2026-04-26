import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, locales, type Locale } from "@/i18n/routing";

const LOCALE_COOKIE = "NEXT_LOCALE";
const LOCALE_HEADER = "x-locale";

function pathnameLocale(pathname: string): Locale | null {
  for (const l of locales) {
    if (pathname === `/${l}` || pathname.startsWith(`/${l}/`)) return l;
  }
  return null;
}

function detectFromAcceptLanguage(header: string | null): Locale {
  if (!header) return defaultLocale;
  const tags = header
    .split(",")
    .map((p) => p.trim().split(";")[0]?.toLowerCase())
    .filter(Boolean) as string[];
  for (const tag of tags) {
    const base = tag.split("-")[0];
    if ((locales as readonly string[]).includes(base!)) return base as Locale;
  }
  return defaultLocale;
}

/**
 * Locale routing for `localePrefix: "as-needed"`:
 *
 *  • /en/...  or  /ar/...  → locale is in the URL segment, Next.js routes fine.
 *  • /...  (no prefix)     → ALWAYS the default locale (fr). We internally
 *    rewrite to /fr/... so Next.js can resolve app/[locale]/... correctly,
 *    while keeping the display URL unchanged.
 *
 * We never let the stale NEXT_LOCALE cookie override what the URL says.
 */
export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Skip Next.js internals and static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    /\.(.+)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const localeInPath = pathnameLocale(pathname);
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value as Locale | undefined;

  // ── With localePrefix:"as-needed" the URL is the single source of truth:
  //    • prefix present  → use it
  //    • no prefix       → it is ALWAYS the default locale (fr), regardless of cookie
  const resolvedLocale: Locale = localeInPath ?? defaultLocale;

  // Build augmented request headers for RSC (app/layout.tsx reads x-locale)
  const reqHeaders = new Headers(request.headers);
  reqHeaders.set(LOCALE_HEADER, resolvedLocale);

  // Helper: stamp the locale cookie on any response so future requests agree
  function stamp(res: NextResponse): NextResponse {
    if (cookieLocale !== resolvedLocale) {
      res.cookies.set(LOCALE_COOKIE, resolvedLocale, { path: "/" });
    }
    return res;
  }

  // ── Case A: explicit locale prefix in URL (/en/… or /ar/…) ───────────────
  if (localeInPath) {
    const res = NextResponse.next({ request: { headers: reqHeaders } });
    return stamp(res);
  }

  // ── Case B: no locale prefix → default locale (fr) ────────────────────────
  //
  // First-visit redirect: if the user has no cookie yet and their browser
  // prefers a non-default locale, send them to the prefixed version.
  if (!cookieLocale) {
    const detected = detectFromAcceptLanguage(request.headers.get("accept-language"));
    if (detected !== defaultLocale) {
      const url = request.nextUrl.clone();
      url.pathname = `/${detected}${pathname}`;
      const res = NextResponse.redirect(url);
      res.cookies.set(LOCALE_COOKIE, detected, { path: "/" });
      return res;
    }
  }

  // Internal rewrite: keep the display URL (/dashboard/…) but route Next.js
  // to app/[locale]/dashboard/… with locale = fr.
  const rewriteUrl = new URL(`/${defaultLocale}${pathname}${search}`, request.url);
  const res = NextResponse.rewrite(rewriteUrl, { request: { headers: reqHeaders } });
  return stamp(res);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)" ],
};
