import { NextResponse } from "next/server";

import { forgotPasswordBodySchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { RESET_TOKEN_TTL_MINUTES, generateResetToken, getAppUrl, hashResetToken } from "@/lib/reset-password";
import { sendEmail } from "@/lib/mailer";
import { buildResetPasswordEmail } from "@/lib/email-templates/reset-password";
import { getEmailFromByLocale, getLocaleFromRequest } from "@/lib/email-request-helpers";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

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
        from: getEmailFromByLocale(locale),
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
