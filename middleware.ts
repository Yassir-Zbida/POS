import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/navigation";
import { defaultLocale, locales, type Locale } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const LOCALE_COOKIE = "NEXT_LOCALE";

function pathnameHasLocale(pathname: string): Locale | null {
  for (const l of locales) {
    if (pathname === `/${l}` || pathname.startsWith(`/${l}/`)) return l;
  }
  return null;
}

function detectLocaleFromAcceptLanguage(header: string | null): Locale {
  if (!header) return defaultLocale;

  // Very small, edge-safe parser for: "en-US,en;q=0.9,fr;q=0.8"
  const tags = header
    .split(",")
    .map((part) => part.trim().split(";")[0]?.toLowerCase())
    .filter(Boolean) as string[];

  for (const tag of tags) {
    const base = tag.split("-")[0] as Locale | string;
    if ((locales as readonly string[]).includes(base)) return base as Locale;
  }

  return defaultLocale;
}

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const localeInPath = pathnameHasLocale(pathname);
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value as Locale | undefined;

  // If user lands without a locale prefix and has no cookie yet,
  // pick the first locale based on browser language.
  if (!cookieLocale && !localeInPath && (request.method === "GET" || request.method === "HEAD")) {
    const detected = detectLocaleFromAcceptLanguage(request.headers.get("accept-language"));

    // Keep default locale unprefixed, but still persist the choice.
    if (detected !== defaultLocale) {
      const url = request.nextUrl.clone();
      url.pathname = `/${detected}${pathname}`;
      const res = NextResponse.redirect(url);
      res.cookies.set(LOCALE_COOKIE, detected, { path: "/" });
      return res;
    }

    const res = intlMiddleware(request);
    res.cookies.set(LOCALE_COOKIE, detected, { path: "/" });
    return res;
  }

  const res = intlMiddleware(request);

  // Persist locale choice on first request (cookie missing).
  if (!cookieLocale) {
    const next = localeInPath ?? defaultLocale;
    res.cookies.set(LOCALE_COOKIE, next, { path: "/" });
  }

  return res;
}

export const config = {
  matcher: [
    // Match all pathnames except for:
    // - API routes
    // - Next.js internals
    // - static files (e.g. favicon.svg)
    "/((?!api|_next|.*\\..*).*)",
  ],
};
