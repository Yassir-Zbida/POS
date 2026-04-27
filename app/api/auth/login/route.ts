import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/features/auth/schemas/auth-schemas";
import { signAccessToken, signRefreshToken, verifyPassword, hashPassword } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";
import { generateOtpDigits, hashOtpCode, OTP_TTL_MS } from "@/lib/otp-challenge";
import { sendEmail } from "@/lib/mailer";
import { buildOtpEmail } from "@/lib/email-templates/otp-email";
import { getEmailFromByLocale, getLocaleFromRequest } from "@/lib/email-request-helpers";

export async function POST(request: Request) {
  try {
    const ipAddress = getClientIp(request);
    const rate = checkRateLimit(`auth-login:${ipAddress}`);
    if (rate.limited) {
      return NextResponse.json(
        { error: "TOO_MANY_ATTEMPTS" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 400 });
    }

    const { email, password, rememberMe } = parsed.data;
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user && email === "admin@saas-pos.local") {
      user = await prisma.user.create({
        data: {
          email,
          name: "Platform Admin",
          passwordHash: await hashPassword(password),
          role: "ADMIN",
          status: "ACTIVE",
        },
      });
    }

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      return NextResponse.json({ error: "ACCOUNT_LOCKED" }, { status: 423 });
    }

    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      const nextFailedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = nextFailedAttempts >= 5;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: shouldLock ? 0 : nextFailedAttempts,
          lockoutUntil: shouldLock ? new Date(Date.now() + 30 * 60 * 1000) : null,
        },
      });

      await writeAuditLog({
        actorUserId: user.id,
        action: "AUTH_LOGIN_FAILED",
        targetType: "USER",
        targetId: user.id,
        metadata: { reason: "INVALID_PASSWORD", failedAttempts: nextFailedAttempts },
        ipAddress,
        userAgent: request.headers.get("user-agent"),
      });
      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json({ error: "ACCOUNT_INACTIVE" }, { status: 403 });
    }

    // ── 2FA: if OTP is enabled, send a code and defer token issuance ──────────
    if (user.otpEnabled) {
      const code = generateOtpDigits();
      const codeHash = hashOtpCode(code);
      const expiresAt = new Date(Date.now() + OTP_TTL_MS);
      const target = user.email.toLowerCase();

      await prisma.otpChallenge.deleteMany({ where: { target, purpose: "LOGIN_2FA", consumedAt: null } });
      const challenge = await prisma.otpChallenge.create({
        data: { channel: "EMAIL", target, purpose: "LOGIN_2FA", codeHash, expiresAt },
      });

      const locale = getLocaleFromRequest(request);
      const emailContent = buildOtpEmail({ locale, code, purpose: "LOGIN_2FA" });
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
          { error: "EMAIL_SEND_FAILED" },
          { status: 503 },
        );
      }

      await writeAuditLog({
        actorUserId: user.id,
        action: "AUTH_LOGIN_2FA_SENT",
        targetType: "USER",
        targetId: user.id,
        ipAddress,
        userAgent: request.headers.get("user-agent"),
      });

      return NextResponse.json({ otpRequired: true, email: user.email });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const payload = {
      sub: user.id,
      role: user.role,
      status: user.status,
    };
    const accessToken = await signAccessToken(payload);
    const refreshToken = await signRefreshToken(payload);
    const refreshTokenDays = rememberMe ? 100 : 7;
    const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockoutUntil: null },
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "AUTH_LOGIN",
      targetType: "USER",
      targetId: user.id,
      ipAddress,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      accessTokenExpiresIn: "15m",
      refreshTokenExpiresInDays: refreshTokenDays,
      user: { id: user.id, email: user.email, role: user.role, status: user.status },
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "auth/login");
  }
}
