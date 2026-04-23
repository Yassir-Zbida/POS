import { NextResponse } from "next/server";

import { forgotPasswordBodySchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { RESET_TOKEN_TTL_MINUTES, generateResetToken, getAppUrl, hashResetToken } from "@/lib/reset-password";
import { sendEmail } from "@/lib/mailer";
import { buildResetPasswordEmail } from "@/lib/email-templates/reset-password";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

function getFromByLocale(locale: string) {
  const smtpUser = process.env.SMTP_USER ?? "no-reply@pos.hssabaty.com";
  if (locale === "ar") return `حساباتي <${smtpUser}>`;
  return `Hssabaty <${smtpUser}>`;
}

function getLocaleFromRequest(request: Request) {
  const headerLocale = request.headers.get("x-locale");
  if (headerLocale) return headerLocale;

  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  if (match?.[1]) return decodeURIComponent(match[1]);

  return "en";
}

export async function POST(request: Request) {
  try {
    const ipAddress = getClientIp(request);
    const rate = checkRateLimit(`auth-forgot-password:${ipAddress}`);
    if (rate.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please retry later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } },
      );
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = forgotPasswordBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const { email } = parsed.data;

    // Always return ok to avoid account enumeration.
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ ok: true });
    }

    const token = generateResetToken();
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const baseUrl = getAppUrl();
    const locale = getLocaleFromRequest(request);
    const resetUrl = `${baseUrl}/${locale}/reset-password?token=${encodeURIComponent(token)}`;
    const emailContent = buildResetPasswordEmail({ locale, resetUrl });

    try {
      await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        from: getFromByLocale(locale),
      });
    } catch {
      // Do not leak email delivery details to the client.
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "auth/forgot-password");
  }
}
