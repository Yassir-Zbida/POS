import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/mailer";
import { generateOtpDigits, hashOtpCode, OTP_TTL_MS } from "@/lib/otp-challenge";
import { buildOtpEmail } from "@/lib/email-templates/otp-email";
import { getEmailFromByLocale, getLocaleFromRequest } from "@/lib/email-request-helpers";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const bodySchema = z.object({
  channel: z.enum(["EMAIL", "SMS"]),
  target: z.string().min(3).max(200),
  purpose: z.enum(["REGISTER", "LOGIN", "LOGIN_2FA", "VERIFY_PHONE"]).default("REGISTER"),
});

/** POST /api/v1/auth/otp/send — issue a short-lived OTP (email via SMTP; SMS via SMS_HTTP_URL if set). */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(`auth-otp-send:${ip}`);
    if (rate.limited) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please retry later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const { channel, purpose } = parsed.data;
    const target =
      channel === "EMAIL" ? parsed.data.target.trim().toLowerCase() : parsed.data.target.trim().replace(/\s+/g, "");

    const code = generateOtpDigits();
    const codeHash = hashOtpCode(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await prisma.otpChallenge.deleteMany({
      where: { target, purpose, consumedAt: null },
    });

    const challenge = await prisma.otpChallenge.create({
      data: { channel, target, purpose, codeHash, expiresAt },
    });

    if (channel === "EMAIL") {
      const locale = getLocaleFromRequest(request);
      const emailContent = buildOtpEmail({ locale, code, purpose: parsed.data.purpose });
      try {
        await sendEmail({
          to: target,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          from: getEmailFromByLocale(locale),
        });
      } catch {
        await prisma.otpChallenge.delete({ where: { id: challenge.id } });
        return NextResponse.json(
          { error: "Email could not be sent. Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM." },
          { status: 503 },
        );
      }
    } else {
      const smsUrl = process.env.SMS_HTTP_URL;
      if (!smsUrl) {
        await prisma.otpChallenge.delete({ where: { id: challenge.id } });
        return NextResponse.json(
          {
            error:
              "SMS is not configured. Set SMS_HTTP_URL to an HTTPS endpoint that accepts POST JSON { to, body } for your provider (e.g. Unifonic).",
          },
          { status: 501 },
        );
      }
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (process.env.SMS_HTTP_AUTH) headers.Authorization = process.env.SMS_HTTP_AUTH;
        const res = await fetch(smsUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({ to: target, body: `Your Hssabaty code is ${code}. Valid 10 minutes.` }),
        });
        if (!res.ok) {
          await prisma.otpChallenge.delete({ where: { id: challenge.id } });
          return NextResponse.json({ error: "SMS provider returned an error" }, { status: 502 });
        }
      } catch {
        await prisma.otpChallenge.delete({ where: { id: challenge.id } });
        return NextResponse.json({ error: "SMS request failed" }, { status: 502 });
      }
    }

    return NextResponse.json({ ok: true, expiresInSeconds: Math.floor(OTP_TTL_MS / 1000) });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/auth/otp/send");
  }
}
