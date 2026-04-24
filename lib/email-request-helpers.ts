/** Shared helpers for transactional emails (SMTP from line + locale from request). */

export function getEmailFromByLocale(locale: string) {
  const smtpUser = process.env.SMTP_USER ?? "no-reply@pos.hssabaty.com";
  if (locale === "ar") return `حساباتي <${smtpUser}>`;
  return `Hssabaty <${smtpUser}>`;
}

export function getLocaleFromRequest(request: Request) {
  const headerLocale = request.headers.get("x-locale");
  if (headerLocale) return headerLocale;

  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  if (match?.[1]) return decodeURIComponent(match[1]);

  return "en";
}
